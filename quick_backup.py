# quick_backup.py
import shutil
import zipfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
BACKUP_DIR = ROOT / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

CRITICAL_FILES = [
    "styles.css",
    "header.html",
    "footer.html",
    "robots.txt",
    "sitemap.xml",
    "search-index.json",
    "content-map.json",
    "dictionary.json",
    "enriched-dictionary.json",
    ".gitignore",
]

CRITICAL_FOLDERS = [
    "mock-tests",
    "tools",
]

def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_path = BACKUP_DIR / f"critical_backup_{timestamp}.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add individual files
        for file in CRITICAL_FILES:
            src = ROOT / file
            if src.exists():
                zipf.write(src, file)
                print(f"✅ Added: {file}")

        # Add folders
        for folder in CRITICAL_FOLDERS:
            src = ROOT / folder
            if src.exists():
                for filepath in src.rglob('*'):
                    if filepath.is_file():
                        arcname = str(filepath.relative_to(ROOT))
                        zipf.write(filepath, arcname)
                print(f"✅ Added folder: {folder}/")

    print(f"\n📦 Critical backup saved to: {zip_path}")

if __name__ == "__main__":
    main()