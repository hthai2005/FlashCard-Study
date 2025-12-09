from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

# Flashcard schemas
class FlashcardBase(BaseModel):
    front: str
    back: str

class FlashcardCreate(FlashcardBase):
    pass

class FlashcardResponse(FlashcardBase):
    id: int
    set_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class FlashcardWithProgress(FlashcardResponse):
    ease_factor: Optional[float] = None
    interval: Optional[int] = None
    next_review_date: Optional[datetime] = None
    total_reviews: Optional[int] = None
    correct_count: Optional[int] = None
    incorrect_count: Optional[int] = None

# FlashcardSet schemas
class FlashcardSetBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = False

class FlashcardSetCreate(FlashcardSetBase):
    pass

class FlashcardSetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class FlashcardSetResponse(FlashcardSetBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FlashcardSetWithCards(FlashcardSetResponse):
    flashcards: List[FlashcardResponse]

# Study schemas
class StudyAnswer(BaseModel):
    flashcard_id: int
    quality: int  # 0-5 rating for SM-2 algorithm

class StudySessionCreate(BaseModel):
    set_id: int

class StudySessionComplete(BaseModel):
    cards_studied: int
    cards_correct: int
    cards_incorrect: int
    duration_minutes: int

class StudySessionResponse(BaseModel):
    id: int
    user_id: int
    set_id: int
    cards_studied: int
    cards_correct: int
    cards_incorrect: int
    duration_minutes: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StudyProgress(BaseModel):
    total_cards: int
    cards_to_review: int
    cards_mastered: int
    daily_goal: int
    daily_progress: int
    streak_days: int

# Leaderboard schemas
class LeaderboardEntry(BaseModel):
    username: str
    points: int
    total_study_time: int
    total_cards_studied: int
    streak_days: int
    
    class Config:
        from_attributes = True

# AI schemas
class AIGenerateRequest(BaseModel):
    topic: str
    number_of_cards: int = 10
    difficulty: str = "medium"  # easy, medium, hard

class ImportRequest(BaseModel):
    set_id: int
    file_content: str  # CSV or JSON content

# Chart schemas
class StudySessionDataPoint(BaseModel):
    date: str  # YYYY-MM-DD
    cards_studied: int
    cards_correct: int
    accuracy: float
    sessions_count: int

class StudyActivityDataPoint(BaseModel):
    date: str  # YYYY-MM-DD
    cards_studied: int
    intensity: int  # 0-4 for heatmap intensity

# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

