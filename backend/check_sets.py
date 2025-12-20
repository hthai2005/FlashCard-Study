"""
Script to check flashcard sets in database
"""
import sys
import io
from app.database import SessionLocal
from app import models

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_sets():
    db = SessionLocal()
    try:
        # Get all sets
        sets = db.query(models.FlashcardSet).all()
        print(f"Found {len(sets)} flashcard sets:\n")
        
        for set_item in sets:
            print(f"ID: {set_item.id}")
            try:
                print(f"  Title: {set_item.title}")
            except:
                print(f"  Title: (encoding error)")
            print(f"  Owner ID: {set_item.owner_id}")
            print(f"  Is Public: {set_item.is_public}")
            print(f"  Status: {set_item.status}")
            print(f"  Cards count: {len(set_item.flashcards)}")
            print()
            
    except Exception as e:
        print(f"[ERROR] Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_sets()






