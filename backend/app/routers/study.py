from typing import List
from datetime import datetime, timedelta, date, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, distinct
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
    
    # Check if set is pending - không cho học nếu pending (trừ admin)
    if not current_user.is_admin:
        if db_set.status == 'pending':
            raise HTTPException(
                status_code=403, 
                detail="Bộ thẻ này đang chờ admin duyệt. Vui lòng đợi admin duyệt trước khi học."
            )
    
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
    
    # Check if set is pending - không cho học nếu pending (trừ admin)
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == flashcard.set_id).first()
    if db_set and not current_user.is_admin:
        if db_set.status == 'pending':
            raise HTTPException(
                status_code=403, 
                detail="Bộ thẻ này đang chờ admin duyệt. Vui lòng đợi admin duyệt trước khi học."
            )
    
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
    
    # Check if set is pending - không cho học nếu pending (trừ admin)
    if not current_user.is_admin:
        if db_set.status == 'pending':
            raise HTTPException(
                status_code=403, 
                detail="Bộ thẻ này đang chờ admin duyệt. Vui lòng đợi admin duyệt trước khi học."
            )
    
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
    
    # Count total unique cards studied by this user
    # A card is considered "studied" if it has a study record with total_reviews > 0
    # This means the user has reviewed it at least once
    # Use distinct on flashcard_id to count unique cards, not study records
    from sqlalchemy import distinct
    cards_studied_count = db.query(func.count(distinct(models.StudyRecord.flashcard_id))).filter(
        models.StudyRecord.user_id == current_user.id,
        models.StudyRecord.flashcard.has(models.Flashcard.set_id == set_id),
        models.StudyRecord.total_reviews > 0
    ).scalar() or 0
    
    # Count cards with correct answers (cards where correct_count > 0)
    # This represents cards the user has answered correctly at least once
    cards_correct_count = db.query(func.count(distinct(models.StudyRecord.flashcard_id))).filter(
        models.StudyRecord.user_id == current_user.id,
        models.StudyRecord.flashcard.has(models.Flashcard.set_id == set_id),
        models.StudyRecord.correct_count > 0
    ).scalar() or 0
    
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
        cards_correct=cards_correct_count,
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

@router.get("/sessions", response_model=List[StudySessionResponse])
def get_study_sessions(
    set_id: int = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get study sessions for current user, optionally filtered by set_id"""
    query = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user.id,
        models.StudySession.completed_at.isnot(None)
    )
    
    if set_id:
        query = query.filter(models.StudySession.set_id == set_id)
    
    sessions = query.order_by(models.StudySession.started_at.asc()).all()
    return sessions

@router.get("/correct-streak")
def get_correct_streak(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current consecutive correct answer streak"""
    # Get all study sessions ordered by time (oldest first)
    sessions = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user.id,
        models.StudySession.completed_at.isnot(None)
    ).order_by(models.StudySession.started_at.asc()).all()
    
    current_streak = 0
    max_streak = 0
    
    # Calculate streak by going through sessions chronologically
    # If a session has all cards correct, add to streak
    # If a session has any incorrect, reset streak
    for session in sessions:
        if session.cards_studied > 0:
            # Check if all cards in this session were correct
            if session.cards_correct >= session.cards_studied:
                # All correct - add to streak
                current_streak += session.cards_correct
                max_streak = max(max_streak, current_streak)
            else:
                # Some incorrect - streak broken
                current_streak = 0
    
    # Also calculate current active streak from most recent sessions
    # Get recent sessions (newest first) and work backwards
    recent_sessions = db.query(models.StudySession).filter(
        models.StudySession.user_id == current_user.id,
        models.StudySession.completed_at.isnot(None)
    ).order_by(models.StudySession.started_at.desc()).limit(200).all()
    
    # Reverse to process from oldest to newest
    active_streak = 0
    for session in reversed(recent_sessions):
        if session.cards_studied > 0:
            if session.cards_correct >= session.cards_studied:
                # All correct - continue streak
                active_streak += session.cards_correct
            else:
                # Streak broken - this is the current active streak
                break
    
    # Use the active streak (from most recent sessions) as current_streak
    return {
        "current_streak": active_streak,
        "max_streak": max_streak
    }

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

@router.post("/sets/{set_id}/reset")
def reset_study_progress(
    set_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Reset study progress for a flashcard set (mark all cards as needing review)"""
    db_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == set_id).first()
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    # Check access permission
    if not current_user.is_admin:
        if db_set.owner_id != current_user.id and not db_set.is_public:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all flashcards in the set
    all_flashcards = db.query(models.Flashcard).filter(
        models.Flashcard.set_id == set_id
    ).all()
    
    flashcard_ids = [card.id for card in all_flashcards]
    
    # Reset all study records for this user and set
    study_records = db.query(models.StudyRecord).filter(
        models.StudyRecord.user_id == current_user.id,
        models.StudyRecord.flashcard_id.in_(flashcard_ids)
    ).all()
    
    for record in study_records:
        # Reset to initial state (like a new card)
        record.ease_factor = 2.5
        record.interval = 1
        record.repetitions = 0
        record.next_review_date = None
        record.last_reviewed = None
        record.total_reviews = 0  # Reset total_reviews so cards_studied count resets
        # Keep correct_count and incorrect_count for overall statistics if needed
        # But reset them too for a clean restart
        record.correct_count = 0
        record.incorrect_count = 0
    
    db.commit()
    
    return {"message": "Study progress reset successfully", "cards_reset": len(study_records)}

