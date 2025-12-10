from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from app.database import get_db
from app import models, schemas, auth
from app.schemas import (
    FlashcardSetResponse, FlashcardSetCreate, FlashcardSetUpdate, FlashcardSetWithCards,
    FlashcardResponse, FlashcardCreate, FlashcardBase
)

router = APIRouter()

@router.post("/sets", response_model=FlashcardSetResponse)
def create_flashcard_set(
    set_data: FlashcardSetCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_set = models.FlashcardSet(
        **set_data.dict(),
        owner_id=current_user.id
    )
    db.add(db_set)
    db.commit()
    db.refresh(db_set)
    # Reload with owner relationship
    db_set = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner)).filter(models.FlashcardSet.id == db_set.id).first()
    # Add username
    if db_set.owner:
        db_set.owner_username = db_set.owner.username
    return db_set

@router.get("/sets", response_model=List[FlashcardSetResponse])
def get_flashcard_sets(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # All users (including admin) see only their own sets
    # "My Decks" should only show sets owned by the user
    # Admin can use /api/admin/sets endpoint to see all sets for management
    query = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner))
    sets = query.filter(
        models.FlashcardSet.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    # Add username to each set
    for set_item in sets:
        if set_item.owner:
            set_item.owner_username = set_item.owner.username
    
    return sets

@router.get("/sets/my", response_model=List[FlashcardSetResponse])
def get_my_flashcard_sets(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's flashcard sets + public sets from other users (for 'My Decks' page)"""
    try:
        query = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner))
        # Get user's own sets OR public sets from other users
        sets = query.filter(
            or_(
                models.FlashcardSet.owner_id == current_user.id,
                and_(
                    models.FlashcardSet.is_public == True,
                    models.FlashcardSet.owner_id != current_user.id
                )
            )
        ).offset(skip).limit(limit).all()
        
        # Add username to each set
        for set_item in sets:
            if set_item.owner:
                set_item.owner_username = set_item.owner.username
        
        return sets
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching flashcard sets: {str(e)}"
        )

@router.get("/sets/{set_id}", response_model=FlashcardSetWithCards)
def get_flashcard_set(
    set_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_set = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner)).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    # Admin can access any set, regular users can only access their own or public sets
    if not current_user.is_admin:
        if db_set.owner_id != current_user.id and not db_set.is_public:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Add username
    if db_set.owner:
        db_set.owner_username = db_set.owner.username
    
    return db_set

@router.put("/sets/{set_id}", response_model=FlashcardSetResponse)
def update_flashcard_set(
    set_id: int,
    set_data: FlashcardSetUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_set = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner)).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    # Admin can update any set, regular users can only update their own sets
    if not current_user.is_admin:
        if db_set.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only update fields that are provided (not None)
    update_data = set_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_set, key, value)
    
    db.commit()
    db.refresh(db_set)
    # Reload with owner relationship
    db_set = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner)).filter(models.FlashcardSet.id == set_id).first()
    # Add username
    if db_set.owner:
        db_set.owner_username = db_set.owner.username
    return db_set

@router.delete("/sets/{set_id}")
def delete_flashcard_set(
    set_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    if db_set.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(db_set)
    db.commit()
    return {"message": "Flashcard set deleted"}

@router.post("/sets/{set_id}/cards", response_model=FlashcardResponse)
def create_flashcard(
    set_id: int,
    card: FlashcardCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    if db_set.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_card = models.Flashcard(**card.dict(), set_id=set_id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

@router.get("/sets/{set_id}/cards", response_model=List[FlashcardResponse])
def get_flashcards(
    set_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    # Admin can access any set, regular users can only access their own or public sets
    if not current_user.is_admin:
        if db_set.owner_id != current_user.id and not db_set.is_public:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return db_set.flashcards

@router.put("/cards/{card_id}", response_model=FlashcardResponse)
def update_flashcard(
    card_id: int,
    card: FlashcardBase,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    if db_card.set.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for key, value in card.dict().items():
        setattr(db_card, key, value)
    
    db.commit()
    db.refresh(db_card)
    return db_card

@router.delete("/cards/{card_id}")
def delete_flashcard(
    card_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    db_card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    if db_card.set.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(db_card)
    db.commit()
    return {"message": "Flashcard deleted"}

