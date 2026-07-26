import os
from pathlib import Path
from datetime import datetime, timedelta
ROOT = Path(__file__).parent
SKIP_DIRS = ['word', 'images', 'mock-tests_backup']

def should_skip(filepath):
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return True
    return False

def main():
    cutoff = datetime.now() - timedelta(days=180)
    stale = []
    for filepath in ROOT.rglob('*.html'):
        if should_skip(filepath):
            continue
        try:
            mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
            if mtime < cutoff:
                stale.append((filepath, mtime))
        except:
            continue

    stale.sort(key=lambda x: x[1])
    print(f"📊 Found {len(stale)} stale pages (>6 months old).\n")
    for filepath, mtime in stale[:20]:
        print(f"  {filepath.relative_to(ROOT)} – {mtime.strftime('%Y-%m-%d')}")
    if len(stale) > 20:
        print(f"  ... and {len(stale)-20} more")

    # Save report
    with open('stale_pages_report.txt', 'w', encoding='utf-8') as f:
        f.write("STALE PAGES REPORT\n")
        f.write("="*60 + "\n\n")
        for filepath, mtime in stale:
            f.write(f"{filepath.relative_to(ROOT)} – {mtime.strftime('%Y-%m-%d')}\n")

if __name__ == "__main__":
    main()