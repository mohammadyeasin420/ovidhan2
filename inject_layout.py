import re
from pathlib import Path

ROOT_DIR = Path(__file__).parent
HEADER_FILE = ROOT_DIR / "header.html"
FOOTER_FILE = ROOT_DIR / "footer.html"

# Files to skip (by name)
EXCLUDE_FILES = ["header.html", "footer.html", "inject_layout.py", "styles.css"]

# Directories to skip entirely (recursive)
EXCLUDE_DIRS = ["word", "tools", "blog", "images", "mock-tests_backup"]

def should_skip_file(file_path):
    """Return True if the file should be skipped."""
    if file_path.name in EXCLUDE_FILES:
        return True
    for parent in file_path.parents:
        if parent.name in EXCLUDE_DIRS:
            return True
    return False

def remove_all_headers(content):
    # Remove existing nav/header elements with common classes
    patterns = [
        r'<nav[^>]*class="[^"]*site-nav[^"]*"[^>]*>.*?</nav>',
        r'<header[^>]*class="[^"]*site-header[^"]*"[^>]*>.*?</header>',
        r'<nav[^>]*>.*?(?:mega-menu|Home.*Learn.*Dictionary).*?</nav>'
    ]
    for pat in patterns:
        content = re.sub(pat, '', content, flags=re.DOTALL | re.IGNORECASE)
    return content

def remove_all_footers(content):
    patterns = [
        r'<footer[^>]*class="[^"]*site-footer[^"]*"[^>]*>.*?</footer>',
        r'<div[^>]*class="[^"]*site-footer[^"]*"[^>]*>.*?</div>',
        r'<footer[^>]*>.*?(?:©|Copyright|Made with).*?</footer>'
    ]
    for pat in patterns:
        content = re.sub(pat, '', content, flags=re.DOTALL | re.IGNORECASE)
    return content

def get_relative_css_path(file_path):
    """Calculate the relative path from file to root for styles.css."""
    depth = len(file_path.relative_to(ROOT_DIR).parents)
    if depth == 0:
        return "styles.css"
    else:
        return "../" * depth + "styles.css"

def inject_layout(html_path):
    # Read the HTML content
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Load header/footer
    with open(HEADER_FILE, 'r', encoding='utf-8') as f:
        header = f.read()
    with open(FOOTER_FILE, 'r', encoding='utf-8') as f:
        footer = f.read()

    # Remove any existing headers/footers
    content = remove_all_headers(content)
    content = remove_all_footers(content)

    # Inject header after <body>
    content = re.sub(r'(<body[^>]*>)', r'\1\n' + header, content, flags=re.IGNORECASE)

    # Inject footer before </body>
    content = re.sub(r'(</body>)', footer + '\n' + r'\1', content, flags=re.IGNORECASE)

    # Fix the CSS link: update or add the correct relative path
    css_path = get_relative_css_path(html_path)
    css_link = f'<link rel="stylesheet" href="{css_path}" />'
    
    # If there's already a styles.css link, replace it; otherwise add it in <head>
    if '<link rel="stylesheet" href="styles.css"' in content:
        # Replace any existing styles.css link with the correct relative one
        content = re.sub(r'<link rel="stylesheet" href="[^"]*styles\.css"[^>]*>', css_link, content, flags=re.IGNORECASE)
    else:
        # Insert into <head> if not present
        content = re.sub(r'(<head[^>]*>)', r'\1\n    ' + css_link, content, flags=re.IGNORECASE)

    # Write back the file
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Injected: {html_path.relative_to(ROOT_DIR)}")

def main():
    if not HEADER_FILE.exists() or not FOOTER_FILE.exists():
        print("❌ header.html or footer.html missing.")
        return

    # Recursively find all HTML files, skip excluded ones
    all_files = list(ROOT_DIR.rglob("*.html"))
    files_to_process = [f for f in all_files if not should_skip_file(f)]

    print(f"Found {len(all_files)} HTML files total. Processing {len(files_to_process)} (skipping others).")
    count = 0
    for file in files_to_process:
        inject_layout(file)
        count += 1

    print(f"\n🎉 Done! Processed {count} files.")

if __name__ == "__main__":
    main()