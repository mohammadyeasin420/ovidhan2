#!/usr/bin/env python3
"""
Add a single new page to the sitemap safely.

Prefer regenerating with the canonical generator when many pages change:
    python generate_sitemap.py

This helper only appends one URL when:
- the HTML file exists on disk
- the URL is not already present
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
SITEMAP_FILE = ROOT / "sitemap.xml"
NEW_PAGE = "/learning-path-elementary.html"  # Change this to your new page
BASE = "https://ovidhan.net"
MAX_URLS = 50000


def update_sitemap() -> None:
    rel = NEW_PAGE.lstrip("/")
    if not (ROOT / rel).is_file():
        raise SystemExit(
            f"❌ Refusing to add {NEW_PAGE}: file does not exist ({rel}). "
            "Fix the path or create the page first."
        )

    full = BASE + NEW_PAGE
    if not SITEMAP_FILE.exists():
        raise SystemExit("❌ sitemap.xml missing. Run: python generate_sitemap.py")

    text = SITEMAP_FILE.read_text(encoding="utf-8")
    if "<sitemapindex" in text:
        raise SystemExit(
            "❌ sitemap.xml is currently a sitemap index. "
            "Use generate_sitemap.py instead of this helper."
        )

    locs = re.findall(r"<loc>(.*?)</loc>", text)
    if full in locs:
        print(f"✅ {NEW_PAGE} already in sitemap.")
        return

    if len(locs) + 1 >= MAX_URLS:
        raise SystemExit(
            f"❌ Adding this URL would reach/exceed {MAX_URLS} entries. "
            "Run generate_sitemap.py (split/index mode)."
        )

    entry = (
        "  <url>\n"
        f"    <loc>{full}</loc>\n"
        f"    <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>0.8</priority>\n"
        "  </url>\n"
    )
    if "</urlset>" not in text:
        raise SystemExit("❌ sitemap.xml missing </urlset>. Regenerate with generate_sitemap.py")

    SITEMAP_FILE.write_text(text.replace("</urlset>", entry + "</urlset>"), encoding="utf-8")
    print(f"✅ Added {NEW_PAGE} to sitemap.xml")


if __name__ == "__main__":
    update_sitemap()
