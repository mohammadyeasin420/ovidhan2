import os
import shutil
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
BACKUP_DIR = ROOT / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

# Folders to exclude (to keep backup size small)
EXCLUDE_DIRS = [
    "word",          # 50k+ pages – you can skip or include depending on space
    "images",
    "mock-tests_backup",
    "backups",
    ".git",
    "__pycache__",
]

# Files to exclude
EXCLUDE_FILES = [
    "*.log",
    "*.tmp",
    "*.pyc",
]

def should_include(filepath):
    """Check if a file should be included in the backup."""
    rel = filepath.relative_to(ROOT)
    # Skip excluded directories
    for exclude in EXCLUDE_DIRS:
        if exclude in rel.parts:
            return False
    # Skip excluded file patterns
    for pattern in EXCLUDE_FILES:
        if filepath.match(pattern):
            return False
    return True

def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = BACKUP_DIR / f"full_backup_{timestamp}.zip"

    print(f"📦 Creating full backup: {zip_path}")
    print("⏳ This may take a few minutes...\n")

    count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for filepath in ROOT.rglob('*'):
            if filepath.is_file() and should_include(filepath):
                arcname = filepath.relative_to(ROOT)
                zipf.write(filepath, arcname)
                count += 1
                if count % 1000 == 0:
                    print(f"   ... {count} files backed up")

    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"\n✅ Backup complete! {count} files, {size_mb:.1f} MB")
    print(f"📁 Saved to: {zip_path}")

    # Keep only the last 5 backups
    backups = sorted(BACKUP_DIR.glob("full_backup_*.zip"), key=lambda x: x.stat().st_mtime, reverse=True)
    for old_backup in backups[5:]:
        old_backup.unlink()
        print(f"🗑️ Removed old backup: {old_backup.name}")

if __name__ == "__main__":
    main()