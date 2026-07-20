import re
from pathlib import Path

ROOT_DIR = Path(__file__).parent
HEADER_FILE = ROOT_DIR / "header.html"
FOOTER_FILE = ROOT_DIR / "footer.html"
EXCLUDE_FILES = ["header.html", "footer.html", "inject_layout.py", "styles.css"]

def remove_all_headers(content):
    """Remove ALL possible header/nav blocks from the page."""
    # Remove <nav class="site-nav"> ... </nav>
    pattern1 = r'<nav[^>]*class="[^"]*site-nav[^"]*"[^>]*>.*?</nav>'
    content = re.sub(pattern1, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove <header class="site-header"> ... </header>
    pattern2 = r'<header[^>]*class="[^"]*site-header[^"]*"[^>]*>.*?</header>'
    content = re.sub(pattern2, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove any <nav> that contains "mega-menu" or navigation links
    pattern3 = r'<nav[^>]*>.*?(?:mega-menu|Home.*Learn.*Dictionary).*?</nav>'
    content = re.sub(pattern3, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    return content

def remove_all_footers(content):
    """Remove ALL possible footer blocks from the page."""
    # Remove <footer class="site-footer"> ... </footer>
    pattern1 = r'<footer[^>]*class="[^"]*site-footer[^"]*"[^>]*>.*?</footer>'
    content = re.sub(pattern1, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove <div class="site-footer"> ... </div>
    pattern2 = r'<div[^>]*class="[^"]*site-footer[^"]*"[^>]*>.*?</div>'
    content = re.sub(pattern2, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove any footer containing copyright text
    pattern3 = r'<footer[^>]*>.*?(?:©|Copyright|Made with).*?</footer>'
    content = re.sub(pattern3, '', content, flags=re.DOTALL | re.IGNORECASE)
    
    return content

def inject_layout(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip special files
    if html_path.name in EXCLUDE_FILES:
        return

    # Load new header & footer
    with open(HEADER_FILE, 'r', encoding='utf-8') as f:
        header = f.read()
    with open(FOOTER_FILE, 'r', encoding='utf-8') as f:
        footer = f.read()

    # STEP 1: Remove ALL old headers
    content = remove_all_headers(content)

    # STEP 2: Remove ALL old footers
    content = remove_all_footers(content)

    # STEP 3: Inject new header after <body>
    content = re.sub(r'(<body[^>]*>)', r'\1\n' + header, content, flags=re.IGNORECASE)

    # STEP 4: Inject new footer before </body>
    content = re.sub(r'(</body>)', footer + '\n' + r'\1', content, flags=re.IGNORECASE)

    # STEP 5: Ensure styles.css is linked
    if '<link rel="stylesheet" href="styles.css"' not in content:
        content = re.sub(r'(<head[^>]*>)', r'\1\n    <link rel="stylesheet" href="styles.css" />', content, flags=re.IGNORECASE)

    # Write back
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Cleaned & Injected: {html_path.name}")

def main():
    if not HEADER_FILE.exists() or not FOOTER_FILE.exists():
        print("❌ header.html or footer.html missing. Please create them first.")
        return
    
    files = list(ROOT_DIR.glob("*.html"))
    count = 0
    for file in files:
        if file.name not in EXCLUDE_FILES:
            inject_layout(file)
            count += 1
    
    print(f"\n🎉 Done! Processed {count} files. All old navs & footers removed; new ones injected.")

if __name__ == "__main__":
    main()