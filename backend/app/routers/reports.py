from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas, auth
from app.routers.admin import require_admin
from app.routers.notifications import create_notification

router = APIRouter()

@router.post("/", response_model=schemas.ReportResponse)
def create_report(
    report_data: schemas.ReportCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """User creates a report for a deck or card"""
    # Validate report_type
    if report_data.report_type not in ['deck', 'card']:
        raise HTTPException(status_code=400, detail="report_type must be 'deck' or 'card'")
    
    # Validate reason
    valid_reasons = ['inappropriate', 'copyright', 'spam', 'misinformation', 'other']
    if report_data.reason not in valid_reasons:
        raise HTTPException(status_code=400, detail=f"reason must be one of: {', '.join(valid_reasons)}")
    
    # Get the reported item and owner info
    item_title = None
    item_owner_id = None
    item_owner_username = None
    
    if report_data.report_type == 'deck':
        reported_item = db.query(models.FlashcardSet).options(
            joinedload(models.FlashcardSet.owner)
        ).filter(
            models.FlashcardSet.id == report_data.reported_item_id
        ).first()
        if not reported_item:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        # User cannot report their own deck
        if reported_item.owner_id == current_user.id:
            raise HTTPException(status_code=403, detail="Cannot report your own content")
        
        # User can only report public decks
        if not reported_item.is_public:
            raise HTTPException(status_code=403, detail="Cannot report private content")
        
        # Save snapshot info
        item_title = reported_item.title
        item_owner_id = reported_item.owner_id
        if reported_item.owner:
            item_owner_username = reported_item.owner.username
    else:  # card
        reported_item = db.query(models.Flashcard).options(
            joinedload(models.Flashcard.set).joinedload(models.FlashcardSet.owner)
        ).filter(models.Flashcard.id == report_data.reported_item_id).first()
        if not reported_item:
            raise HTTPException(status_code=404, detail="Card not found")
        
        # User cannot report their own card
        if reported_item.set.owner_id == current_user.id:
            raise HTTPException(status_code=403, detail="Cannot report your own content")
        
        # User can only report cards from public decks
        if not reported_item.set.is_public:
            raise HTTPException(status_code=403, detail="Cannot report private content")
        
        # Save snapshot info
        item_title = f"{reported_item.front} / {reported_item.back}"
        item_owner_id = reported_item.set.owner_id
        if reported_item.set.owner:
            item_owner_username = reported_item.set.owner.username
    
    # Check if user already reported this item (pending)
    existing_report = db.query(models.Report).filter(
        models.Report.report_type == report_data.report_type,
        models.Report.reported_item_id == report_data.reported_item_id,
        models.Report.reporter_id == current_user.id,
        models.Report.status == 'pending'
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=400, detail="You have already reported this item")
    
    # Create report with snapshot info
    db_report = models.Report(
        report_type=report_data.report_type,
        reported_item_id=report_data.reported_item_id,
        reporter_id=current_user.id,
        reason=report_data.reason,
        description=report_data.description,
        status='pending',
        item_title=item_title,
        item_owner_id=item_owner_id,
        item_owner_username=item_owner_username
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    # Reload with relationships
    db_report = db.query(models.Report).options(
        joinedload(models.Report.reporter),
        joinedload(models.Report.resolver)
    ).filter(models.Report.id == db_report.id).first()
    
    # Add usernames
    if db_report.reporter:
        db_report.reporter_username = db_report.reporter.username
    if db_report.resolver:
        db_report.resolver_username = db_report.resolver.username
    
    # Check if item should be auto-hidden (5+ pending reports)
    if report_data.report_type == 'deck':
        pending_count = db.query(func.count(models.Report.id)).filter(
            models.Report.report_type == 'deck',
            models.Report.reported_item_id == report_data.reported_item_id,
            models.Report.status == 'pending'
        ).scalar()
        
        if pending_count >= 5:
            # Auto-hide the deck by changing status to 'rejected' temporarily
            # Or add a new field 'is_hidden' - for now, we'll use status
            reported_item.status = 'rejected'
            db.commit()
    
    return db_report

@router.get("/admin", response_model=List[schemas.ReportResponse])
def get_all_reports(
    skip: int = 0,
    limit: int = 100,
    status_filter: str = None,
    report_type: str = None,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all reports (admin only)"""
    query = db.query(models.Report).options(
        joinedload(models.Report.reporter),
        joinedload(models.Report.resolver)
    )
    
    # Apply filters
    if status_filter:
        query = query.filter(models.Report.status == status_filter)
    if report_type:
        query = query.filter(models.Report.report_type == report_type)
    
    reports = query.order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add usernames
    for report in reports:
        if report.reporter:
            report.reporter_username = report.reporter.username
        if report.resolver:
            report.resolver_username = report.resolver.username
    
    return reports

@router.get("/admin/{report_id}", response_model=schemas.ReportResponse)
def get_report_detail(
    report_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get report detail (admin only)"""
    report = db.query(models.Report).options(
        joinedload(models.Report.reporter),
        joinedload(models.Report.resolver)
    ).filter(models.Report.id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Add usernames
    if report.reporter:
        report.reporter_username = report.reporter.username
    if report.resolver:
        report.resolver_username = report.resolver.username
    
    return report

@router.put("/admin/{report_id}/resolve", response_model=schemas.ReportResponse)
def resolve_report(
    report_id: int,
    resolve_data: schemas.ReportResolve,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Resolve a report (admin only) - delete content or warn user"""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != 'pending':
        raise HTTPException(status_code=400, detail="Report is not pending")
    
    # Save snapshot info if not already saved (before deletion)
    if not report.item_title or not report.item_owner_id:
        if report.report_type == 'deck':
            deck = db.query(models.FlashcardSet).options(
                joinedload(models.FlashcardSet.owner)
            ).filter(
                models.FlashcardSet.id == report.reported_item_id
            ).first()
            if deck:
                report.item_title = deck.title
                report.item_owner_id = deck.owner_id
                if deck.owner:
                    report.item_owner_username = deck.owner.username
        else:  # card
            card = db.query(models.Flashcard).options(
                joinedload(models.Flashcard.set).joinedload(models.FlashcardSet.owner)
            ).filter(models.Flashcard.id == report.reported_item_id).first()
            if card:
                report.item_title = f"{card.front} / {card.back}"
                report.item_owner_id = card.set.owner_id
                if card.set.owner:
                    report.item_owner_username = card.set.owner.username
    
    # Save owner info before deletion
    item_owner_id = None
    item_title = None
    
    # Perform action based on resolve_data.action
    if resolve_data.action == 'delete_deck':
        if report.report_type != 'deck':
            raise HTTPException(status_code=400, detail="Action 'delete_deck' only applies to deck reports")
        deck = db.query(models.FlashcardSet).options(
            joinedload(models.FlashcardSet.flashcards),
            joinedload(models.FlashcardSet.owner)
        ).filter(
            models.FlashcardSet.id == report.reported_item_id
        ).first()
        if deck:
            item_owner_id = deck.owner_id
            item_title = deck.title
            
            # Delete all study_sessions related to this deck first
            db.query(models.StudySession).filter(
                models.StudySession.set_id == deck.id
            ).delete()
            # Delete all study_records related to cards in this deck
            # Get all card IDs in this deck
            card_ids = [card.id for card in deck.flashcards]
            if card_ids:
                db.query(models.StudyRecord).filter(
                    models.StudyRecord.flashcard_id.in_(card_ids)
                ).delete()
            # Now delete the deck (this will cascade delete flashcards)
            db.delete(deck)
    
    elif resolve_data.action == 'delete_card':
        if report.report_type != 'card':
            raise HTTPException(status_code=400, detail="Action 'delete_card' only applies to card reports")
        card = db.query(models.Flashcard).options(
            joinedload(models.Flashcard.set).joinedload(models.FlashcardSet.owner)
        ).filter(
            models.Flashcard.id == report.reported_item_id
        ).first()
        if card:
            item_owner_id = card.set.owner_id
            item_title = f"Thẻ: {card.front}"
            db.delete(card)
    
    # Update report status
    report.status = 'resolved'
    report.resolved_by = current_user.id
    report.resolved_at = func.now()
    report.admin_notes = resolve_data.admin_notes
    db.flush()
    
    # Create notification for reporter (người báo cáo)
    if report.reporter_id:
        action_text = "xóa bộ thẻ" if resolve_data.action == 'delete_deck' else "xóa thẻ"
        create_notification(
            db=db,
            user_id=report.reporter_id,
            type='report_resolved',
            title='Báo cáo đã được xử lý',
            message=f'Báo cáo của bạn đã được admin xử lý bằng cách {action_text}.',
            item_id=report.id,
            action_path=f'/admin/moderation?tab=resolved'
        )
    
    # Create notification for item owner (người sở hữu bị xóa)
    if item_owner_id and item_owner_id != report.reporter_id:
        if resolve_data.action == 'delete_deck':
            create_notification(
                db=db,
                user_id=item_owner_id,
                type='item_deleted',
                title='Bộ thẻ đã bị xóa',
                message=f'Bộ thẻ "{item_title}" của bạn đã bị admin xóa do vi phạm quy tắc cộng đồng.',
                item_id=report.reported_item_id,
                action_path='/sets'  # Navigate to sets page (deck đã bị xóa nên không thể navigate đến deck đó)
            )
        elif resolve_data.action == 'delete_card':
            create_notification(
                db=db,
                user_id=item_owner_id,
                type='item_deleted',
                title='Thẻ đã bị xóa',
                message=f'Thẻ "{item_title}" của bạn đã bị admin xóa do vi phạm quy tắc cộng đồng.',
                item_id=report.reported_item_id,
                action_path='/sets'  # Navigate to sets page
            )
    
    db.commit()
    db.refresh(report)
    
    # Reload with relationships
    report = db.query(models.Report).options(
        joinedload(models.Report.reporter),
        joinedload(models.Report.resolver)
    ).filter(models.Report.id == report_id).first()
    
    # Add usernames
    if report.reporter:
        report.reporter_username = report.reporter.username
    if report.resolver:
        report.resolver_username = report.resolver.username
    
    return report

@router.put("/admin/{report_id}/reject", response_model=schemas.ReportResponse)
def reject_report(
    report_id: int,
    reject_data: schemas.ReportReject,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reject a report (admin only) - content is not violating"""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != 'pending':
        raise HTTPException(status_code=400, detail="Report is not pending")
    
    # Update report status
    report.status = 'rejected'
    report.resolved_by = current_user.id
    report.resolved_at = func.now()
    report.admin_notes = reject_data.admin_notes
    db.flush()
    
    # Create notification for reporter (người báo cáo)
    if report.reporter_id:
        create_notification(
            db=db,
            user_id=report.reporter_id,
            type='report_rejected',
            title='Báo cáo đã bị từ chối',
            message=f'Báo cáo của bạn đã bị admin từ chối. Nội dung được báo cáo không vi phạm quy tắc.',
            item_id=report.id,
            action_path=f'/admin/moderation?tab=resolved'
        )
    
    db.commit()
    db.refresh(report)
    
    # Reload with relationships
    report = db.query(models.Report).options(
        joinedload(models.Report.reporter),
        joinedload(models.Report.resolver)
    ).filter(models.Report.id == report_id).first()
    
    # Add usernames
    if report.reporter:
        report.reporter_username = report.reporter.username
    if report.resolver:
        report.resolver_username = report.resolver.username
    
    return report

@router.delete("/admin/{report_id}")
def delete_report(
    report_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a report (admin only)"""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(report)
    db.commit()
    
    return {"message": "Report deleted successfully"}

@router.get("/admin/stats/summary")
def get_report_stats(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get report statistics for admin dashboard"""
    total_reports = db.query(func.count(models.Report.id)).scalar()
    pending_reports = db.query(func.count(models.Report.id)).filter(
        models.Report.status == 'pending'
    ).scalar()
    resolved_reports = db.query(func.count(models.Report.id)).filter(
        models.Report.status == 'resolved'
    ).scalar()
    rejected_reports = db.query(func.count(models.Report.id)).filter(
        models.Report.status == 'rejected'
    ).scalar()
    
    # Reports in last 24 hours
    yesterday = datetime.utcnow() - timedelta(days=1)
    reports_24h = db.query(func.count(models.Report.id)).filter(
        models.Report.created_at >= yesterday
    ).scalar()
    
    # Reports in last 7 days
    week_ago = datetime.utcnow() - timedelta(days=7)
    reports_7d = db.query(func.count(models.Report.id)).filter(
        models.Report.created_at >= week_ago
    ).scalar()
    
    return {
        "total": total_reports,
        "pending": pending_reports,
        "resolved": resolved_reports,
        "rejected": rejected_reports,
        "last_24h": reports_24h,
        "last_7d": reports_7d
    }

