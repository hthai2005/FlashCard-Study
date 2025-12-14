from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from app.schemas import LoginRequest, Token, UserResponse, UserCreate
import os
import shutil
from pathlib import Path
import time

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Check if username exists
        if auth.get_user_by_username(db, user.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email exists
        if auth.get_user_by_email(db, user.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = auth.get_password_hash(user.password)
        db_user = models.User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create leaderboard entry
        try:
            leaderboard_entry = models.Leaderboard(user_id=db_user.id)
            db.add(leaderboard_entry)
            db.commit()
        except Exception as e:
            # Nếu leaderboard đã tồn tại, bỏ qua
            db.rollback()
        
        return db_user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    # Update username if provided
    if user_update.username is not None:
        new_username = user_update.username.strip()
        if not new_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username cannot be empty"
            )
        # Check if username already exists (excluding current user)
        existing_user = db.query(models.User).filter(
            models.User.username == new_username,
            models.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        current_user.username = new_username
    
    # Update email if provided
    if user_update.email is not None:
        new_email = user_update.email.strip()
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
            models.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        current_user.email = new_email
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    password_data: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify old password
    if not auth.verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Update password
    current_user.hashed_password = auth.get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar"""
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
    filename = f"avatar_{current_user.id}_{timestamp}{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Update user avatar URL
    avatar_url = f"/uploads/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    
    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}
