"""
Script to fix flashcard sets status in database
This will approve all existing sets that are public or owned by seed users
"""
from app.database import SessionLocal
from app import models

def fix_set_status():
    db = SessionLocal()
    try:
        # Get all sets
        sets = db.query(models.FlashcardSet).all()
        print(f"Found {len(sets)} flashcard sets")
        
        updated_count = 0
        for set_item in sets:
            # Approve all sets (for development/testing purposes)
            if set_item.status != 'approved':
                old_status = set_item.status
                set_item.status = 'approved'
                updated_count += 1
                print(f"[OK] Updated set {set_item.id} ({set_item.title}): {old_status} -> approved")
        
        if updated_count > 0:
            db.commit()
            print(f"\n[OK] Successfully updated {updated_count} sets to 'approved' status")
        else:
            print("\n[INFO] All sets already have 'approved' status")
            
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_set_status()
