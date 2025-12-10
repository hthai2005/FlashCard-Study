from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        if len(v.encode('utf-8')) > 72:
            raise ValueError("Password cannot be longer than 72 bytes")
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
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
    owner_username: Optional[str] = None
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

class StudySessionComplete(BaseModel):
    cards_studied: int
    cards_correct: int
    cards_incorrect: int
    duration_minutes: int

class StudyProgress(BaseModel):
    total_cards: int
    cards_to_review: int
    cards_mastered: int
    daily_goal: int
    daily_progress: int
    streak_days: int

class StudySessionDataPoint(BaseModel):
    date: str
    cards_studied: int
    cards_correct: int
    accuracy: float
    sessions_count: int

class StudyActivityDataPoint(BaseModel):
    date: str
    cards_studied: int
    intensity: int  # 0-4 for heatmap visualization

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

# Auth schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

