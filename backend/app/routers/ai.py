import json
import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
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
    """Import flashcards from CSV or JSON file content"""
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == request.set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    if db_set.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    flashcards_created = []
    
    try:
        # Try to parse as JSON first
        try:
            data = json.loads(request.file_content)
            if isinstance(data, list):
                for item in data:
                    if "front" in item and "back" in item:
                        card = models.Flashcard(
                            set_id=request.set_id,
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
                        set_id=request.set_id,
                        front=front,
                        back=back
                    )
                    db.add(card)
                    flashcards_created.append(card)
        
        db.commit()
        
        return {
            "message": f"Successfully imported {len(flashcards_created)} flashcards",
            "count": len(flashcards_created)
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error importing flashcards: {str(e)}"
        )

