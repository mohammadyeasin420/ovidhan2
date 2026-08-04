#!/usr/bin/env python3
"""
Hreflang Generator for Ovidhan
- Scans all HTML files
- Adds self-referencing hreflang="en", hreflang="bn", and hreflang="x-default" links
- Skips pages that already have hreflang tags
"""

from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_DIR = Path(__file__).parent.parent
SITE_URL = "https://ovidhan.net"

def has_hreflang(soup):
    """Check if any <link> with hreflang attribute already exists."""
    for link in soup.find_all("link", hreflang=True):
        return True
    return False

def canonical_url(soup, file_relative_path):
    """Get the canonical URL of the page, else build from file path."""
    # Check for canonical link
    canon = soup.find("link", rel="canonical")
    if canon and canon.get("href"):
        return canon["href"]

    # Build from file path
    path = str(file_relative_path).replace("\\", "/")
    if path == "index.html":
        return f"{SITE_URL}/"
    return f"{SITE_URL}/{path}"

def inject_hreflang(soup, url):
    """Add hreflang links to <head>."""
    head = soup.find("head")
    if not head:
        return False

    # Create three link elements
    en_link = soup.new_tag("link", rel="alternate", hreflang="en", href=url)
    bn_link = soup.new_tag("link", rel="alternate", hreflang="bn", href=url)
    x_default_link = soup.new_tag("link", rel="alternate", hreflang="x-default", href=url)

    head.append(en_link)
    head.append(bn_link)
    head.append(x_default_link)
    return True

def main():
    print("🌐 Hreflang Generator for Ovidhan")
    html_files = list(BASE_DIR.rglob("*.html"))
    # Exclude special files
    html_files = [f for f in html_files if f.name not in ("header.html", "footer.html")]
    total = 0

    for filepath in html_files:
        try:
            soup = BeautifulSoup(filepath.read_text(encoding="utf-8", errors="ignore"), "html.parser")
            if has_hreflang(soup):
                continue  # already done

            rel_path = filepath.relative_to(BASE_DIR)
            url = canonical_url(soup, rel_path)

            if inject_hreflang(soup, url):
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(str(soup))
                total += 1
                if total % 1000 == 0:
                    print(f"  Processed {total} files...")
        except Exception as e:
            print(f"  ❌ Error on {filepath.name}: {e}")

    print(f"✅ Injected hreflang tags into {total} pages.")

if __name__ == "__main__":
    main()