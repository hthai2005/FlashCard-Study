import json
import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from app.schemas import AIGenerateRequest, ImportRequest
import os
from openai import OpenAI

router = APIRouter()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None

@router.post("/generate")
def generate_flashcards(
    request: AIGenerateRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate flashcards using AI"""
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured"
        )
    
    try:
        prompt = f"""Generate {request.number_of_cards} flashcards about {request.topic} with {request.difficulty} difficulty level.
Return the response as a JSON array with the following format:
[
  {{"front": "Question or term", "back": "Answer or definition"}},
  ...
]

Make sure the flashcards are educational and cover important aspects of {request.topic}."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates educational flashcards. Always return valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        # Try to extract JSON from the response
        try:
            flashcards_data = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            flashcards_data = json.loads(content.strip())
        
        return {"flashcards": flashcards_data}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating flashcards: {str(e)}"
        )

@router.post("/import")
def import_flashcards(
    request: ImportRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Import flashcards from CSV or JSON file content (paste text)
    
    If set_id is provided, import to existing set.
    If set_id is None, create new set with title, description, and is_public.
    """
    # If set_id is provided, use existing set
    if request.set_id:
        db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == request.set_id).first()
        if not db_set:
            raise HTTPException(status_code=404, detail="Flashcard set not found")
        
        if db_set.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        set_id = request.set_id
    else:
        # Create new set
        if not request.title:
            raise HTTPException(status_code=400, detail="Title is required when creating new set")
        
        # Logic: 
        # - Private sets (is_public=False): Always approved (no need for admin review)
        # - Public sets (is_public=True): Approved if admin, otherwise pending (needs admin review)
        if request.is_public:
            # Public set: needs admin approval unless user is admin
            if current_user.is_admin:
                status = 'approved'
                print(f"✅ Admin created public set - auto approved")
            else:
                status = 'pending'
                print(f"⏳ Non-admin created public set - status: pending (needs admin review)")
        else:
            # Private set: always approved (no review needed)
            status = 'approved'
            print(f"✅ Private set created - auto approved (no review needed)")
        
        print(f"📝 Creating set: title={request.title}, is_public={request.is_public}, status={status}, user_is_admin={current_user.is_admin}")
        
        db_set = models.FlashcardSet(
            title=request.title,
            description=request.description or "",
            is_public=request.is_public,
            owner_id=current_user.id,
            status=status
        )
        db.add(db_set)
        db.flush()  # Get the set_id
        set_id = db_set.id
    
    flashcards_created = []
    
    try:
        # Try to parse as JSON first
        try:
            data = json.loads(request.file_content)
            if isinstance(data, list):
                for item in data:
                    if "front" in item and "back" in item:
                        card = models.Flashcard(
                            set_id=set_id,
                            front=item["front"],
                            back=item["back"]
                        )
                        db.add(card)
                        flashcards_created.append(card)
        except json.JSONDecodeError:
            # Try to parse as CSV
            csv_reader = csv.DictReader(io.StringIO(request.file_content))
            for row in csv_reader:
                front = row.get("front") or row.get("Front") or row.get("question") or row.get("Question")
                back = row.get("back") or row.get("Back") or row.get("answer") or row.get("Answer")
                
                if front and back:
                    card = models.Flashcard(
                        set_id=set_id,
                        front=front,
                        back=back
                    )
                    db.add(card)
                    flashcards_created.append(card)
        
        db.commit()
        db.refresh(db_set)
        
        return {
            "message": f"Successfully imported {len(flashcards_created)} flashcards",
            "count": len(flashcards_created),
            "set_id": set_id,
            "set": {
                "id": db_set.id,
                "title": db_set.title,
                "description": db_set.description,
                "is_public": db_set.is_public
            }
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error importing flashcards: {str(e)}"
        )

@router.post("/import/file")
async def import_flashcards_from_file(
    file: UploadFile = File(...),
    set_id: Optional[int] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_public: bool = Form(False),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Import flashcards from uploaded CSV or JSON file
    
    If set_id is provided, import to existing set.
    If set_id is None, create new set with title, description, and is_public.
    """
    # If set_id is provided, use existing set
    if set_id:
        db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
        if not db_set:
            raise HTTPException(status_code=404, detail="Flashcard set not found")
        
        if db_set.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        # Create new set
        if not title:
            raise HTTPException(status_code=400, detail="Title is required when creating new set")
        
        # Logic: 
        # - Private sets (is_public=False): Always approved (no need for admin review)
        # - Public sets (is_public=True): Approved if admin, otherwise pending (needs admin review)
        if is_public:
            # Public set: needs admin approval unless user is admin
            if current_user.is_admin:
                status = 'approved'
                print(f"✅ Admin created public set - auto approved")
            else:
                status = 'pending'
                print(f"⏳ Non-admin created public set - status: pending (needs admin review)")
        else:
            # Private set: always approved (no review needed)
            status = 'approved'
            print(f"✅ Private set created - auto approved (no review needed)")
        
        print(f"📝 Creating set: title={title}, is_public={is_public}, status={status}, user_is_admin={current_user.is_admin}")
        
        db_set = models.FlashcardSet(
            title=title,
            description=description or "",
            is_public=is_public,
            owner_id=current_user.id,
            status=status
        )
        db.add(db_set)
        db.flush()  # Get the set_id
        set_id = db_set.id
    
    # Check file extension
    file_extension = file.filename.split('.')[-1].lower() if file.filename else ''
    if file_extension not in ['csv', 'json']:
        raise HTTPException(
            status_code=400,
            detail="File must be CSV or JSON format"
        )
    
    flashcards_created = []
    
    try:
        # Read file content
        content = await file.read()
        file_content = content.decode('utf-8')
        
        # Try to parse as JSON first
        if file_extension == 'json':
            try:
                data = json.loads(file_content)
                if isinstance(data, list):
                    for item in data:
                        if "front" in item and "back" in item:
                            card = models.Flashcard(
                                set_id=set_id,
                                front=item["front"],
                                back=item["back"]
                            )
                            db.add(card)
                            flashcards_created.append(card)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="JSON file must contain an array of flashcards"
                    )
            except json.JSONDecodeError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid JSON format: {str(e)}"
                )
        else:
            # Parse as CSV
            try:
                csv_reader = csv.DictReader(io.StringIO(file_content))
                for row in csv_reader:
                    front = row.get("front") or row.get("Front") or row.get("question") or row.get("Question")
                    back = row.get("back") or row.get("Back") or row.get("answer") or row.get("Answer")
                    
                    if front and back:
                        card = models.Flashcard(
                            set_id=set_id,
                            front=front,
                            back=back
                        )
                        db.add(card)
                        flashcards_created.append(card)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error parsing CSV: {str(e)}"
                )
        
        db.commit()
        db.refresh(db_set)
        
        return {
            "message": f"Successfully imported {len(flashcards_created)} flashcards",
            "count": len(flashcards_created),
            "set_id": set_id,
            "set": {
                "id": db_set.id,
                "title": db_set.title,
                "description": db_set.description,
                "is_public": db_set.is_public
            }
        }
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error importing flashcards: {str(e)}"
        )

