import os
from pathlib import Path
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
ROOT = Path(__file__).parent
SKIP_DIRS = ['word', 'images', 'mock-tests_backup']

def should_skip(filepath):
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return True
    return False

def main():
    cutoff = datetime.now() - timedelta(days=180)
    outdated = []

    for filepath in ROOT.rglob('*.html'):
        if should_skip(filepath):
            continue
        try:
            mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
            if mtime < cutoff:
                outdated.append((filepath, mtime))
        except:
            continue

    print(f"📊 Found {len(outdated)} outdated pages (>6 months old).\n")
    if outdated:
        print("📌 RECOMMENDED ACTIONS:\n")
        for filepath, mtime in outdated[:20]:
            print(f"  ⏳ {filepath.relative_to(ROOT)} – {mtime.strftime('%Y-%m-%d')}")
            print(f"     → Review and update content\n")
        if len(outdated) > 20:
            print(f"  ... and {len(outdated)-20} more")

    # Generate a checklist
    with open("content_update_checklist.md", "w", encoding='utf-8') as f:
        f.write("# Content Update Checklist\n\n")
        f.write("| Page | Last Updated | Action |\n")
        f.write("|------|--------------|--------|\n")
        for filepath, mtime in outdated:
            f.write(f"| {filepath.relative_to(ROOT)} | {mtime.strftime('%Y-%m-%d')} | Needs review |\n")

    print("📄 Checklist saved to: content_update_checklist.md")

if __name__ == "__main__":
    main()