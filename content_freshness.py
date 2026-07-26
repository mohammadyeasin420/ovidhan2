import os
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).parent
SKIP_DIRS = ['word', 'images', 'mock-tests_backup']

def should_skip(filepath):
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return True
    return False

def main():
    thin = []
    for filepath in ROOT.rglob('*.html'):
        if should_skip(filepath):
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            soup = BeautifulSoup(content, 'html.parser')
            text = soup.get_text(separator=' ', strip=True)
            word_count = len(text.split())
            if word_count < 300:
                thin.append((filepath, word_count))
        except:
            continue

    thin.sort(key=lambda x: x[1])
    print(f"📊 Found {len(thin)} thin-content pages (<300 words).\n")
    for filepath, count in thin[:20]:
        print(f"  {filepath.relative_to(ROOT)} – {count} words")
    if len(thin) > 20:
        print(f"  ... and {len(thin)-20} more")

    with open('thin_content_report.txt', 'w', encoding='utf-8') as f:
        f.write("THIN CONTENT REPORT\n")
        f.write("="*60 + "\n\n")
        for filepath, count in thin:
            f.write(f"{filepath.relative_to(ROOT)} – {count} words\n")

if __name__ == "__main__":
    main()