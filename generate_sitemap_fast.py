import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent
SITEMAP_FILE = ROOT_DIR / "sitemap.xml"

# Folders to skip (fast mode - keeps performance high)
EXCLUDE_DIRS = {"word", "tools", "blog", "images", "mock-tests_backup", "data"}
# Files to skip
EXCLUDE_FILES = {"header.html", "footer.html", "sitemap.xml", "robots.txt"}

def get_all_html_pages():
    """Walk all directories (except excluded) and return relative paths."""
    pages = []
    for root, dirs, files in os.walk(ROOT_DIR):
        # Modify dirs in-place to skip excluded folders
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file.endswith(".html") and file not in EXCLUDE_FILES:
                full_path = Path(root) / file
                # Get path relative to root, convert backslashes to forward slashes
                rel_path = str(full_path.relative_to(ROOT_DIR)).replace("\\", "/")
                pages.append(rel_path)
    return pages

def generate_fast_sitemap():
    print("🔍 Scanning for HTML files (fast mode - skipping /word/)...")
    pages = get_all_html_pages()
    print(f"📊 Found {len(pages)} pages to include in sitemap.")

    if not pages:
        print("❌ No pages found to include.")
        return

    base_url = "https://ovidhan.net"
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for page in pages:
        sitemap += f'''  <url>
    <loc>{base_url}/{page}</loc>
    <lastmod>2026-07-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
'''
    sitemap += "</urlset>"

    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write(sitemap)

    print(f"✅ Sitemap generated: {SITEMAP_FILE} ({len(pages)} URLs)")
    print(f"📁 File size: {SITEMAP_FILE.stat().st_size} bytes")

if __name__ == "__main__":
    generate_fast_sitemap()