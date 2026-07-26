import os
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).parent
BACKUP_DIR = ROOT / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

FILES_TO_BACKUP = [
    "styles.css",
    "header.html",
    "footer.html",
    "robots.txt",
    "sitemap.xml",
    "search-index.json",
    "content-map.json",
    "inject_layout.py",
    "generate_search_index.py",
    "generate_sitemap_fast.py",
]

def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = BACKUP_DIR / f"core_backup_{timestamp}.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in FILES_TO_BACKUP:
            src = ROOT / file
            if src.exists():
                zipf.write(src, file)
                print(f"✅ Added: {file}")
            else:
                print(f"⚠️ Missing: {file}")

    print(f"\n📦 Backup saved to: {zip_path}")

    # Delete backups older than 30 days
    cutoff = datetime.now().timestamp() - (30 * 86400)
    for backup in BACKUP_DIR.glob("*.zip"):
        if backup.stat().st_mtime < cutoff:
            backup.unlink()
            print(f"🗑️ Deleted old backup: {backup.name}")

if __name__ == "__main__":
    main()