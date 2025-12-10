from typing import List
from datetime import datetime, timedelta, date, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.database import get_db
from app import models, schemas, auth, spaced_repetition
from app.schemas import (
    FlashcardWithProgress, StudyAnswer, StudySessionCreate, StudySessionResponse,
    StudySessionComplete, StudyProgress, StudySessionDataPoint, StudyActivityDataPoint
)

router = APIRouter()

@router.get("/sets/{set_id}/due", response_model=List[FlashcardWithProgress])
def get_cards_due_for_review(
    set_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get flashcards that are due for review"""
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    # Check access permission
    if not current_user.is_admin:
        if db_set.owner_id != current_user.id and not db_set.is_public:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    due_cards = spaced_repetition.get_cards_due_for_review(db, current_user.id, set_id)
    
    # If no cards are due, return all cards in the set (for new users or first-time study)
    if not due_cards:
        all_cards = db.query(models.Flashcard).filter(models.Flashcard.set_id == set_id).all()
        due_cards = all_cards
    
    result = []
    for card in due_cards:
        # Get or create study record
        study_record = db.query(models.StudyRecord).filter(
            models.StudyRecord.flashcard_id == card.id,
            models.StudyRecord.user_id == current_user.id
        ).first()
        
        if not study_record:
            study_record = models.StudyRecord(
                flashcard_id=card.id,
                user_id=current_user.id
            )
            db.add(study_record)
            db.commit()
            db.refresh(study_record)
        
        card_data = FlashcardWithProgress(
            id=card.id,
            set_id=card.set_id,
            front=card.front,
            back=card.back,
            created_at=card.created_at,
            ease_factor=study_record.ease_factor,
            interval=study_record.interval,
            next_review_date=study_record.next_review_date,
            total_reviews=study_record.total_reviews,
            correct_count=study_record.correct_count,
            incorrect_count=study_record.incorrect_count
        )
        result.append(card_data)
    
    return result

@router.post("/answer")
def submit_answer(
    answer: StudyAnswer,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Submit answer for a flashcard and update spaced repetition data"""
    flashcard = db.query(models.Flashcard).filter(models.Flashcard.id == answer.flashcard_id).first()
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    # Get or create study record
    study_record = db.query(models.StudyRecord).filter(
        models.StudyRecord.flashcard_id == answer.flashcard_id,
        models.StudyRecord.user_id == current_user.id
    ).first()
    
    if not study_record:
        study_record = models.StudyRecord(
            flashcard_id=answer.flashcard_id,
            user_id=current_user.id
        )
        db.add(study_record)
        db.commit()
        db.refresh(study_record)
    
    # Update with spaced repetition algorithm
    spaced_repetition.update_study_record(db, study_record, answer.quality)
    
    return {
        "message": "Answer recorded",
        "ease_factor": study_record.ease_factor,
        "interval": study_record.interval,
        "next_review_date": study_record.next_review_date
    }

@router.post("/sessions", response_model=StudySessionResponse)
def create_study_session(
    session_data: StudySessionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new study session"""
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == session_data.set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    db_session = models.StudySession(
        user_id=current_user.id,
        set_id=session_data.set_id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.put("/sessions/{session_id}", response_model=StudySessionResponse)
def complete_study_session(
    session_id: int,
    session_data: StudySessionComplete,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a study session"""
    db_session = db.query(models.StudySession).filter(
        models.StudySession.id == session_id,
        models.StudySession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Study session not found")
    
    db_session.cards_studied = session_data.cards_studied
    db_session.cards_correct = session_data.cards_correct
    db_session.cards_incorrect = session_data.cards_incorrect
    db_session.duration_minutes = session_data.duration_minutes
    db_session.completed_at = datetime.now(timezone.utc)
    
    # Update leaderboard
    leaderboard = db.query(models.Leaderboard).filter(
        models.Leaderboard.user_id == current_user.id
    ).first()
    
    if leaderboard:
        # Ensure values are not None
        duration_minutes = session_data.duration_minutes or 0
        cards_studied = session_data.cards_studied or 0
        cards_correct = session_data.cards_correct or 0
        
        leaderboard.total_study_time = (leaderboard.total_study_time or 0) + duration_minutes
        leaderboard.total_cards_studied = (leaderboard.total_cards_studied or 0) + cards_studied
        leaderboard.total_correct = (leaderboard.total_correct or 0) + cards_correct
        
        # Calculate points (simple scoring system)
        leaderboard.points = (
            leaderboard.total_cards_studied * 10 +
            leaderboard.total_correct * 5 +
            leaderboard.streak_days * 20
        )
        
        # Update streak
        today = datetime.now(timezone.utc).date()
        if leaderboard.last_study_date:
            last_date = leaderboard.last_study_date.date()
            if (today - last_date).days == 1:
                leaderboard.streak_days += 1
            elif (today - last_date).days > 1:
                leaderboard.streak_days = 1
        else:
            leaderboard.streak_days = 1
        
        leaderboard.last_study_date = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/progress/{set_id}", response_model=StudyProgress)
def get_study_progress(
    set_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get study progress for a flashcard set"""
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    total_cards = len(db_set.flashcards)
    due_cards = spaced_repetition.get_cards_due_for_review(db, current_user.id, set_id)
    cards_to_review = len(due_cards)
    
    # Count mastered cards (interval > 30 days and correct_count > 5)
    mastered = db.query(models.StudyRecord).filter(
        models.StudyRecord.user_id == current_user.id,
        models.StudyRecord.flashcard.has(models.Flashcard.set_id == set_id),
        models.StudyRecord.interval > 30,
        models.StudyRecord.correct_count > 5
    ).count()
    
    # Count total cards studied by this user (cards with at least one study record)
    cards_studied_count = db.query(models.StudyRecord).filter(
        models.StudyRecord.user_id == current_user.id,
        models.StudyRecord.flashcard.has(models.Flashcard.set_id == set_id),
        models.StudyRecord.total_reviews > 0
    ).count()
    
    # Get daily progress
    today = datetime.utcnow().date()
    today_sessions = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user.id,
        models.StudySession.set_id == set_id,
        models.StudySession.started_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    daily_progress = sum(session.cards_studied for session in today_sessions)
    daily_goal = 20  # Default daily goal
    
    # Get streak from leaderboard
    leaderboard = db.query(models.Leaderboard).filter(
        models.Leaderboard.user_id == current_user.id
    ).first()
    streak_days = leaderboard.streak_days if leaderboard else 0
    
    return StudyProgress(
        total_cards=total_cards,
        cards_to_review=cards_to_review,
        cards_mastered=mastered,
        cards_studied=cards_studied_count,
        daily_goal=daily_goal,
        daily_progress=daily_progress,
        streak_days=streak_days
    )

@router.get("/sets/last-studied")
def get_last_studied_dates(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get last studied date for all sets that the user has studied"""
    # Get the most recent completed session for each set
    sessions = db.query(
        models.StudySession.set_id,
        func.max(models.StudySession.completed_at).label('last_studied')
    ).filter(
        and_(
            models.StudySession.user_id == current_user.id,
            models.StudySession.completed_at.isnot(None)
        )
    ).group_by(
        models.StudySession.set_id
    ).all()
    
    # Convert to dictionary
    result = {}
    for session in sessions:
        if session.last_studied:
            result[session.set_id] = session.last_studied.isoformat()
    
    return result

@router.get("/sessions/history", response_model=List[StudySessionDataPoint])
def get_study_sessions_history(
    days: int = 30,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get study sessions history for chart visualization"""
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    # Query sessions grouped by date
    sessions = db.query(
        func.date(models.StudySession.started_at).label('date'),
        func.sum(models.StudySession.cards_studied).label('cards_studied'),
        func.sum(models.StudySession.cards_correct).label('cards_correct'),
        func.count(models.StudySession.id).label('sessions_count')
    ).filter(
        and_(
            models.StudySession.user_id == current_user.id,
            models.StudySession.completed_at.isnot(None),
            func.date(models.StudySession.started_at) >= start_date,
            func.date(models.StudySession.started_at) <= end_date
        )
    ).group_by(
        func.date(models.StudySession.started_at)
    ).order_by(
        func.date(models.StudySession.started_at)
    ).all()
    
    # Create a dictionary for quick lookup
    sessions_dict = {}
    for session in sessions:
        date_str = session.date.strftime('%Y-%m-%d')
        cards_studied = int(session.cards_studied or 0)
        cards_correct = int(session.cards_correct or 0)
        accuracy = (cards_correct / cards_studied * 100) if cards_studied > 0 else 0
        
        sessions_dict[date_str] = StudySessionDataPoint(
            date=date_str,
            cards_studied=cards_studied,
            cards_correct=cards_correct,
            accuracy=round(accuracy, 2),
            sessions_count=int(session.sessions_count or 0)
        )
    
    # Fill in missing dates with zero values
    result = []
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        if date_str in sessions_dict:
            result.append(sessions_dict[date_str])
        else:
            result.append(StudySessionDataPoint(
                date=date_str,
                cards_studied=0,
                cards_correct=0,
                accuracy=0.0,
                sessions_count=0
            ))
        current_date += timedelta(days=1)
    
    return result

@router.get("/activity", response_model=List[StudyActivityDataPoint])
def get_study_activity(
    days: int = 365,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get study activity data for heatmap calendar"""
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    # Query sessions grouped by date
    sessions = db.query(
        func.date(models.StudySession.started_at).label('date'),
        func.sum(models.StudySession.cards_studied).label('cards_studied')
    ).filter(
        and_(
            models.StudySession.user_id == current_user.id,
            models.StudySession.completed_at.isnot(None),
            func.date(models.StudySession.started_at) >= start_date,
            func.date(models.StudySession.started_at) <= end_date
        )
    ).group_by(
        func.date(models.StudySession.started_at)
    ).all()
    
    # Find max cards studied for intensity calculation
    max_cards = max([int(s.cards_studied or 0) for s in sessions], default=1)
    
    # Create result
    result = []
    sessions_dict = {s.date.strftime('%Y-%m-%d'): int(s.cards_studied or 0) for s in sessions}
    
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        cards_studied = sessions_dict.get(date_str, 0)
        
        # Calculate intensity (0-4) based on cards studied
        if cards_studied == 0:
            intensity = 0
        elif max_cards > 0:
            intensity = min(4, int((cards_studied / max_cards) * 4) + 1)
        else:
            intensity = 0
        
        result.append(StudyActivityDataPoint(
            date=date_str,
            cards_studied=cards_studied,
            intensity=intensity
        ))
        current_date += timedelta(days=1)
    
    return result

