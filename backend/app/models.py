from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # Admin flag
    avatar_url = Column(String, nullable=True)  # URL to avatar image
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    flashcard_sets = relationship("FlashcardSet", back_populates="owner", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    leaderboard_entry = relationship("Leaderboard", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_public = Column(Boolean, default=False)
    status = Column(String, default='pending')  # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="flashcard_sets")
    flashcards = relationship("Flashcard", back_populates="set", cascade="all, delete-orphan")

class Flashcard(Base):
    __tablename__ = "flashcards"
    
    id = Column(Integer, primary_key=True, index=True)
    set_id = Column(Integer, ForeignKey("flashcard_sets.id"), nullable=False)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    set = relationship("FlashcardSet", back_populates="flashcards")
    study_records = relationship("StudyRecord", back_populates="flashcard", cascade="all, delete-orphan")

class StudyRecord(Base):
    __tablename__ = "study_records"
    
    id = Column(Integer, primary_key=True, index=True)
    flashcard_id = Column(Integer, ForeignKey("flashcards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Spaced repetition fields
    ease_factor = Column(Float, default=2.5)  # SM-2 algorithm ease factor
    interval = Column(Integer, default=1)  # Days until next review
    repetitions = Column(Integer, default=0)  # Number of successful reviews
    next_review_date = Column(DateTime(timezone=True))
    last_reviewed = Column(DateTime(timezone=True))
    
    # Performance tracking
    total_reviews = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    incorrect_count = Column(Integer, default=0)
    
    # Relationships
    flashcard = relationship("Flashcard", back_populates="study_records")
    user = relationship("User")

class StudySession(Base):
    __tablename__ = "study_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    set_id = Column(Integer, ForeignKey("flashcard_sets.id"), nullable=False)
    cards_studied = Column(Integer, default=0)
    cards_correct = Column(Integer, default=0)
    cards_incorrect = Column(Integer, default=0)
    duration_minutes = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="study_sessions")

class Leaderboard(Base):
    __tablename__ = "leaderboard"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    total_study_time = Column(Integer, default=0)  # in minutes
    total_cards_studied = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_study_date = Column(DateTime(timezone=True))
    points = Column(Integer, default=0)  # Calculated score
    
    # Relationships
    user = relationship("User", back_populates="leaderboard_entry")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String, nullable=False)  # 'deck' or 'card'
    reported_item_id = Column(Integer, nullable=False)  # ID of deck or card
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String, nullable=False)  # 'inappropriate', 'copyright', 'spam', 'misinformation', 'other'
    description = Column(Text, nullable=True)  # Optional detailed description
    status = Column(String, default='pending')  # 'pending', 'resolved', 'rejected'
    admin_notes = Column(Text, nullable=True)  # Admin's notes
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who resolved
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Snapshot fields to preserve info even after item is deleted
    item_title = Column(Text, nullable=True)  # Title of deck or card content
    item_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Owner of the reported item
    item_owner_username = Column(String, nullable=True)  # Username of the owner
    
    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    item_owner = relationship("User", foreign_keys=[item_owner_id])

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False)  # 'set_pending', 'set_approved', 'set_rejected', 'report_resolved', etc.
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    item_id = Column(Integer, nullable=True)  # ID of related item (set_id, report_id, etc.)
    read = Column(Boolean, default=False)
    action_path = Column(String, nullable=True)  # Path to navigate when clicked
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")

