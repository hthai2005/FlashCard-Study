from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app import models, schemas, auth
from app.schemas import NotificationResponse, NotificationItem, UserNotificationResponse, UserNotification
from datetime import datetime

router = APIRouter()

def require_admin(current_user: models.User = Depends(auth.get_current_user)):
    """Dependency to require admin access"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/", response_model=NotificationResponse)
def get_notifications(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get notifications for admin:
    - Pending flashcard sets that need approval
    - Pending reports that need review
    """
    # Get pending sets
    pending_sets = db.query(models.FlashcardSet).options(
        joinedload(models.FlashcardSet.owner)
    ).filter(
        models.FlashcardSet.status == 'pending'
    ).order_by(models.FlashcardSet.created_at.desc()).all()
    
    # Get pending reports
    pending_reports = db.query(models.Report).options(
        joinedload(models.Report.reporter)
    ).filter(
        models.Report.status == 'pending'
    ).order_by(models.Report.created_at.desc()).all()
    
    # Build notification items
    notifications = []
    
    # Add pending sets notifications
    for set_item in pending_sets:
        owner_username = set_item.owner.username if set_item.owner else "Unknown"
        notifications.append(NotificationItem(
            id=set_item.id,
            type='pending_set',
            title=f"Bộ thẻ cần duyệt: {set_item.title}",
            message=f"Người dùng {owner_username} đã tạo bộ thẻ công khai cần được duyệt",
            item_id=set_item.id,
            created_at=set_item.created_at or datetime.utcnow()
        ))
    
    # Add pending reports notifications
    for report in pending_reports:
        reporter_username = report.reporter.username if report.reporter else "Unknown"
        report_type_text = "bộ thẻ" if report.report_type == 'deck' else "thẻ"
        notifications.append(NotificationItem(
            id=report.id,
            type='pending_report',
            title=f"Báo cáo cần xử lý: {report_type_text} #{report.reported_item_id}",
            message=f"Người dùng {reporter_username} đã báo cáo {report.reason}",
            item_id=report.id,
            created_at=report.created_at
        ))
    
    # Sort by created_at descending
    notifications.sort(key=lambda x: x.created_at, reverse=True)
    
    return NotificationResponse(
        pending_sets_count=len(pending_sets),
        pending_reports_count=len(pending_reports),
        total_count=len(notifications),
        notifications=notifications
    )

@router.get("/user", response_model=UserNotificationResponse)
def get_user_notifications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get notifications for current user:
    - Set pending approval
    - Set approved/rejected
    - Other user-specific notifications
    """
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(50).all()
    
    unread_count = sum(1 for n in notifications if not n.read)
    
    return UserNotificationResponse(
        notifications=[UserNotification.model_validate(n) for n in notifications],
        unread_count=unread_count
    )

@router.put("/user/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.put("/user/read-all")
def mark_all_notifications_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user"""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.read == False
    ).update({"read": True})
    db.commit()
    
    return {"message": "All notifications marked as read"}

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    item_id: int = None,
    action_path: str = None
):
    """Helper function to create a notification"""
    notification = models.Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        item_id=item_id,
        action_path=action_path,
        read=False
    )
    db.add(notification)
    db.flush()
    return notification



