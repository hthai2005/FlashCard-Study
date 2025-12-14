from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from app.database import get_db
from app import models, schemas, auth
from app.routers.admin import require_admin

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
    
    # Get the reported item
    if report_data.report_type == 'deck':
        reported_item = db.query(models.FlashcardSet).filter(
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
    else:  # card
        reported_item = db.query(models.Flashcard).options(
            joinedload(models.Flashcard.set)
        ).filter(models.Flashcard.id == report_data.reported_item_id).first()
        if not reported_item:
            raise HTTPException(status_code=404, detail="Card not found")
        
        # User cannot report their own card
        if reported_item.set.owner_id == current_user.id:
            raise HTTPException(status_code=403, detail="Cannot report your own content")
        
        # User can only report cards from public decks
        if not reported_item.set.is_public:
            raise HTTPException(status_code=403, detail="Cannot report private content")
    
    # Check if user already reported this item (pending)
    existing_report = db.query(models.Report).filter(
        models.Report.report_type == report_data.report_type,
        models.Report.reported_item_id == report_data.reported_item_id,
        models.Report.reporter_id == current_user.id,
        models.Report.status == 'pending'
    ).first()
    
    if existing_report:
        raise HTTPException(status_code=400, detail="You have already reported this item")
    
    # Create report
    db_report = models.Report(
        report_type=report_data.report_type,
        reported_item_id=report_data.reported_item_id,
        reporter_id=current_user.id,
        reason=report_data.reason,
        description=report_data.description,
        status='pending'
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
    
    # Perform action based on resolve_data.action
    if resolve_data.action == 'delete_deck':
        if report.report_type != 'deck':
            raise HTTPException(status_code=400, detail="Action 'delete_deck' only applies to deck reports")
        deck = db.query(models.FlashcardSet).filter(
            models.FlashcardSet.id == report.reported_item_id
        ).first()
        if deck:
            db.delete(deck)
    
    elif resolve_data.action == 'delete_card':
        if report.report_type != 'card':
            raise HTTPException(status_code=400, detail="Action 'delete_card' only applies to card reports")
        card = db.query(models.Flashcard).filter(
            models.Flashcard.id == report.reported_item_id
        ).first()
        if card:
            db.delete(card)
    
    # Update report status
    report.status = 'resolved'
    report.resolved_by = current_user.id
    report.resolved_at = func.now()
    report.admin_notes = resolve_data.admin_notes
    
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

