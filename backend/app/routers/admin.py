from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app import models, schemas, auth
from pathlib import Path
import time
from app.schemas import UserResponse

router = APIRouter()

def require_admin(current_user: models.User = Depends(auth.get_current_user)):
    """Dependency to require admin access"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/admins", response_model=List[dict])
def get_admins(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all admin users (admin only)"""
    admins = db.query(models.User).filter(models.User.is_admin == True).all()
    
    return [
        {
            "id": admin.id,
            "username": admin.username,
            "email": admin.email
        }
        for admin in admins
    ]

@router.get("/users", response_model=dict)
def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(models.User).offset(skip).limit(limit).all()
    total = db.query(models.User).count()
    
    # Get last active date for each user from study_sessions
    from sqlalchemy import func
    from app.models import StudySession
    
    users_with_activity = []
    for user in users:
        # Get most recent study session
        last_session = db.query(StudySession).filter(
            StudySession.user_id == user.id
        ).order_by(StudySession.started_at.desc()).first()
        
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "last_active": last_session.started_at if last_session else None
        }
        users_with_activity.append(user_dict)
    
    return {
        "users": users_with_activity,
        "total": total,
        "count": len(users_with_activity)
    }

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get user by ID (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete user (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: dict,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update username if provided
    if "username" in user_update:
        new_username = user_update["username"].strip()
        if not new_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty"
            )
        # Check if username already exists (excluding current user)
        existing_user = db.query(models.User).filter(
            models.User.username == new_username,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        user.username = new_username
    
    # Update email if provided
    if "email" in user_update:
        new_email = user_update["email"].strip()
        if not new_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email cannot be empty"
            )
        if "@" not in new_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        # Check if email already exists (excluding current user)
        existing_user = db.query(models.User).filter(
            models.User.email == new_email,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        user.email = new_email
    
    # Update is_active if provided
    if "is_active" in user_update:
        user.is_active = user_update["is_active"]
    
    # Update is_admin if provided
    if "is_admin" in user_update:
        user.is_admin = user_update["is_admin"]
    
    db.commit()
    db.refresh(user)
    return user

@router.post("/users/{user_id}/avatar")
async def upload_user_avatar(
    user_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Upload avatar for a user (admin only)"""
    # Get the target user
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only images are allowed."
        )
    
    # Validate file size (max 5MB)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum size is 5MB."
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    timestamp = int(time.time() * 1000)  # Use milliseconds for better uniqueness
    filename = f"avatar_{target_user.id}_{timestamp}{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{filename}"
    target_user.avatar_url = avatar_url
    db.commit()
    db.refresh(target_user)
    
    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}

@router.get("/sets", response_model=List[schemas.FlashcardSetResponse])
def get_all_sets(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all flashcard sets (admin only) - for management purposes"""
    query = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner))
    sets = query.offset(skip).limit(limit).all()
    
    # Add username to each set
    for set_item in sets:
        if set_item.owner:
            set_item.owner_username = set_item.owner.username
    
    return sets

@router.put("/sets/{set_id}/approve", response_model=schemas.FlashcardSetResponse)
def approve_flashcard_set(
    set_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve a flashcard set (admin only)"""
    db_set = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner)).filter(
        models.FlashcardSet.id == set_id
    ).first()
    
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    db_set.status = 'approved'
    db.commit()
    db.refresh(db_set)
    
    # Add username
    if db_set.owner:
        db_set.owner_username = db_set.owner.username
    
    return db_set

@router.put("/sets/{set_id}/reject", response_model=schemas.FlashcardSetResponse)
def reject_flashcard_set(
    set_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reject a flashcard set (admin only)"""
    db_set = db.query(models.FlashcardSet).options(joinedload(models.FlashcardSet.owner)).filter(
        models.FlashcardSet.id == set_id
    ).first()
    
    if not db_set:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    
    db_set.status = 'rejected'
    db.commit()
    db.refresh(db_set)
    
    # Add username
    if db_set.owner:
        db_set.owner_username = db_set.owner.username
    
    return db_set

@router.get("/activities", response_model=List[dict])
def get_recent_activities(
    limit: int = 20,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get recent activities from users (admin only)"""
    from sqlalchemy import desc
    
    activities = []
    
    # Get recently created decks
    recent_decks = db.query(models.FlashcardSet).options(
        joinedload(models.FlashcardSet.owner)
    ).order_by(desc(models.FlashcardSet.created_at)).limit(limit // 3).all()
    
    for deck in recent_decks:
        activities.append({
            "type": "deck_created",
            "user_id": deck.owner_id,
            "username": deck.owner.username if deck.owner else "Unknown",
            "description": f"đã tạo deck '{deck.title}'",
            "timestamp": deck.created_at.isoformat() if deck.created_at else None,
            "item_id": deck.id,
            "item_type": "deck"
        })
    
    # Get recent study sessions
    from app.models import StudySession
    recent_sessions = db.query(StudySession).options(
        joinedload(StudySession.user)
    ).order_by(desc(StudySession.started_at)).limit(limit // 3).all()
    
    for session in recent_sessions:
        activities.append({
            "type": "study_session",
            "user_id": session.user_id,
            "username": session.user.username if session.user else "Unknown",
            "description": f"đã học {session.cards_studied} thẻ",
            "timestamp": session.started_at.isoformat() if session.started_at else None,
            "item_id": session.set_id,
            "item_type": "study"
        })
    
    # Get recent reports
    from app.models import Report
    recent_reports = db.query(Report).options(
        joinedload(Report.reporter)
    ).order_by(desc(Report.created_at)).limit(limit // 3).all()
    
    for report in recent_reports:
        activities.append({
            "type": "report",
            "user_id": report.reporter_id,
            "username": report.reporter.username if report.reporter else "Unknown",
            "description": f"đã báo cáo {report.report_type}",
            "timestamp": report.created_at.isoformat() if report.created_at else None,
            "item_id": report.reported_item_id,
            "item_type": "report"
        })
    
    # Sort by timestamp and limit
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    return activities[:limit]

@router.get("/stats/user-growth", response_model=List[dict])
def get_user_growth_stats(
    days: int = 30,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get user growth statistics over time (admin only)"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date
    
    end_date = datetime.utcnow().date()
    
    # If days is very large (like 365 for "all"), get all users
    if days >= 365:
        # Get the earliest user registration date
        earliest_user = db.query(func.min(cast(models.User.created_at, Date))).scalar()
        if earliest_user:
            start_date = earliest_user
        else:
            start_date = end_date - timedelta(days=30)  # Fallback to 30 days
    else:
        start_date = end_date - timedelta(days=days)
    
    # Get user registrations grouped by date
    user_stats = db.query(
        cast(models.User.created_at, Date).label('date'),
        func.count(models.User.id).label('count')
    ).filter(
        cast(models.User.created_at, Date) >= start_date,
        cast(models.User.created_at, Date) <= end_date
    ).group_by(
        cast(models.User.created_at, Date)
    ).order_by('date').all()
    
    # For "all" view, group by week or month if too many days
    if days >= 365:
        # Group by week for better visualization
        week_stats = {}
        for stat in user_stats:
            # Get week number
            week_start = stat.date - timedelta(days=stat.date.weekday())
            week_key = week_start.isoformat()
            if week_key not in week_stats:
                week_stats[week_key] = 0
            week_stats[week_key] += stat.count
        
        # Create date range by weeks
        date_range = []
        current_date = start_date
        # Round to start of week
        current_date = current_date - timedelta(days=current_date.weekday())
        while current_date <= end_date:
            date_range.append(current_date)
            current_date += timedelta(days=7)
        
        # Map stats to weeks
        stats_dict = week_stats
        
        # Build result with cumulative count
        result = []
        cumulative = 0
        for week_start in date_range:
            week_key = week_start.isoformat()
            count = stats_dict.get(week_key, 0)
            cumulative += count
            result.append({
                "date": week_start.isoformat(),
                "new_users": count,
                "total_users": cumulative
            })
    else:
        # Create a complete date range
        date_range = []
        current_date = start_date
        while current_date <= end_date:
            date_range.append(current_date)
            current_date += timedelta(days=1)
        
        # Map stats to dates
        stats_dict = {stat.date: stat.count for stat in user_stats}
        
        # Build result with cumulative count
        result = []
        cumulative = 0
        for date in date_range:
            count = stats_dict.get(date, 0)
            cumulative += count
            result.append({
                "date": date.isoformat(),
                "new_users": count,
                "total_users": cumulative
            })
    
    return result

@router.get("/stats/cards-created", response_model=dict)
def get_cards_created_stats(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get statistics about cards created (admin only)"""
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Total cards
    total_cards = db.query(func.count(models.Flashcard.id)).scalar() or 0
    
    # Cards created today
    today = datetime.utcnow().date()
    cards_today = db.query(func.count(models.Flashcard.id)).filter(
        func.date(models.Flashcard.created_at) == today
    ).scalar() or 0
    
    # Cards created this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    cards_this_week = db.query(func.count(models.Flashcard.id)).filter(
        models.Flashcard.created_at >= week_ago
    ).scalar() or 0
    
    # Cards created this month
    month_ago = datetime.utcnow() - timedelta(days=30)
    cards_this_month = db.query(func.count(models.Flashcard.id)).filter(
        models.Flashcard.created_at >= month_ago
    ).scalar() or 0
    
    # Cards per deck (average)
    total_decks = db.query(func.count(models.FlashcardSet.id)).scalar() or 1
    avg_cards_per_deck = round(total_cards / total_decks, 1) if total_decks > 0 else 0
    
    return {
        "total_cards": total_cards,
        "cards_today": cards_today,
        "cards_this_week": cards_this_week,
        "cards_this_month": cards_this_month,
        "avg_cards_per_deck": avg_cards_per_deck,
        "total_decks": total_decks
    }

