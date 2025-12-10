from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app import models, schemas, auth
from app.schemas import LeaderboardEntry

router = APIRouter()

@router.get("/", response_model=List[LeaderboardEntry])
def get_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get top users from leaderboard"""
    entries = db.query(models.Leaderboard).join(models.User).order_by(
        desc(models.Leaderboard.points)
    ).limit(limit).all()
    
    result = []
    for entry in entries:
        result.append(LeaderboardEntry(
            username=entry.user.username,
            points=entry.points,
            total_study_time=entry.total_study_time,
            total_cards_studied=entry.total_cards_studied,
            streak_days=entry.streak_days
        ))
    
    return result

@router.get("/my-rank")
def get_my_rank(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's rank and stats"""
    leaderboard = db.query(models.Leaderboard).filter(
        models.Leaderboard.user_id == current_user.id
    ).first()
    
    if not leaderboard:
        return {
            "rank": None,
            "points": 0,
            "total_study_time": 0,
            "total_cards_studied": 0,
            "streak_days": 0
        }
    
    # Calculate rank
    users_above = db.query(models.Leaderboard).filter(
        models.Leaderboard.points > leaderboard.points
    ).count()
    rank = users_above + 1
    
    return {
        "rank": rank,
        "points": leaderboard.points,
        "total_study_time": leaderboard.total_study_time,
        "total_cards_studied": leaderboard.total_cards_studied,
        "streak_days": leaderboard.streak_days
    }

