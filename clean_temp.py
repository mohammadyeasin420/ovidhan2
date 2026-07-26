import os
from pathlib import Path
ROOT = Path(__file__).parent

TEMPORARY_PATTERNS = [
    "*.tmp",
    "*.log",
    "*.pyc",
    "__pycache__",
    "*.bak",
    "*.orig",
    "*.rej",
]

def main():
    deleted = 0
    for pattern in TEMPORARY_PATTERNS:
        for filepath in ROOT.rglob(pattern):
            try:
                if filepath.is_file():
                    filepath.unlink()
                    deleted += 1
                    print(f"🗑️ Deleted: {filepath.relative_to(ROOT)}")
                elif filepath.is_dir():
                    import shutil
                    shutil.rmtree(filepath)
                    deleted += 1
                    print(f"🗑️ Deleted folder: {filepath.relative_to(ROOT)}")
            except Exception as e:
                print(f"⚠️ Error deleting {filepath}: {e}")
    print(f"\n✅ Deleted {deleted} temporary items.")

if __name__ == "__main__":
    main()