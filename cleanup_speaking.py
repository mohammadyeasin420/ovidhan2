import os
from pathlib import Path

SPEAKING_DIR = Path("speaking")

def delete_flat_speaking_files():
    if not SPEAKING_DIR.exists():
        print("❌ Speaking folder not found.")
        return
    
    deleted_count = 0
    for item in SPEAKING_DIR.iterdir():
        # Only delete files (not directories) that end with .html
        if item.is_file() and item.suffix == ".html":
            os.remove(item)
            print(f"🗑️ Deleted: {item}")
            deleted_count += 1
    
    print(f"\n✅ Done! Deleted {deleted_count} flat HTML files. Subfolders kept safe.")

if __name__ == "__main__":
    delete_flat_speaking_files()