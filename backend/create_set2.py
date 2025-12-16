"""
Script to create flashcard set ID 2 if it doesn't exist
"""
import sys
import io
from app.database import SessionLocal
from app import models

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def create_set2():
    db = SessionLocal()
    try:
        # Check if set 2 exists
        existing_set = db.query(models.FlashcardSet).filter(models.FlashcardSet.id == 2).first()
        if existing_set:
            print(f"Set ID 2 already exists: {existing_set.title}")
            return
        
        # Find a user to own the set (use user ID 2 if exists, otherwise first user)
        owner = db.query(models.User).filter(models.User.id == 2).first()
        if not owner:
            owner = db.query(models.User).first()
        
        if not owner:
            print("[ERROR] No users found in database")
            return
        
        print(f"Creating set ID 2 owned by user {owner.id} ({owner.username})")
        
        # Create set 2
        set2 = models.FlashcardSet(
            id=2,  # Explicitly set ID
            title="Toan hoc co ban",
            description="Cac cong thuc va khai niem toan hoc co ban",
            owner_id=owner.id,
            is_public=True,
            status='approved'
        )
        db.add(set2)
        db.flush()
        
        # Create cards for set 2
        cards_data = [
            {"front": "2 + 2 = ?", "back": "4"},
            {"front": "5 x 3 = ?", "back": "15"},
            {"front": "10 / 2 = ?", "back": "5"},
            {"front": "Dien tich hinh vuong", "back": "Canh x Canh"},
            {"front": "Chu vi hinh chu nhat", "back": "(Dai + Rong) x 2"}
        ]
        
        for card_data in cards_data:
            flashcard = models.Flashcard(
                set_id=2,
                front=card_data["front"],
                back=card_data["back"]
            )
            db.add(flashcard)
        
        db.commit()
        print("[OK] Successfully created set ID 2 with cards")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_set2()
