#!/usr/bin/env python3
"""
Canonical sitemap generator for ovidhan.net (GitHub Pages static site).

Rules:
- One filesystem discovery pass (no overlapping include-dir scans)
- Deduplicate by normalized relative path
- Include a URL only when the HTML file exists on disk
- Never emit more than 50,000 URLs in a single urlset; split + sitemap index if needed
"""

from __future__ import annotations

import datetime
import os
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
BASE_URL = "https://ovidhan.net"
MAX_URLS_PER_SITEMAP = 50000

# Directories never scanned for public HTML pages
EXCLUDE_DIRS = {
    ".git",
    "question-bank-src",
    "scripts",
    "assets",
    "backups",
    "seo_suite",
    "node_modules",
    "__pycache__",
    "word_old_backup",
    "mock-tests_backup",
    "data",
}

# Partial/template HTML that should not be indexed as standalone pages
EXCLUDE_FILES = {
    "header.html",
    "footer.html",
    "word-template.html",
}


def normalize_rel_path(rel_path: str) -> str:
    path = rel_path.replace("\\", "/").lstrip("./")
    while "//" in path:
        path = path.replace("//", "/")
    return path


def path_to_url_path(rel_path: str) -> str:
    rel_path = normalize_rel_path(rel_path)
    if rel_path == "index.html":
        return "/"
    return "/" + rel_path


def should_skip_dir(dirname: str) -> bool:
    return dirname in EXCLUDE_DIRS or dirname.startswith(".")


def discover_html_pages() -> list[dict]:
    """Single walk; return unique existing HTML pages with metadata."""
    seen: set[str] = set()
    pages: list[dict] = []

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if not should_skip_dir(d))

        # Skip excluded path segments that may appear mid-path
        rel_dir = normalize_rel_path(str(Path(dirpath).relative_to(ROOT)))
        if any(part in EXCLUDE_DIRS for part in rel_dir.split("/") if part):
            dirnames[:] = []
            continue

        for filename in sorted(filenames):
            if not filename.endswith(".html"):
                continue
            if filename in EXCLUDE_FILES:
                continue

            full_path = Path(dirpath) / filename
            if not full_path.is_file():
                continue

            rel_path = normalize_rel_path(str(full_path.relative_to(ROOT)))
            if rel_path in seen:
                continue
            seen.add(rel_path)

            # Defense-in-depth: reserved/device names that cannot ship on some hosts
            # are only included when the file truly exists (checked above).
            mtime = full_path.stat().st_mtime
            lastmod = datetime.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
            url_path = path_to_url_path(rel_path)

            priority = "0.5"
            changefreq = "monthly"
            if url_path == "/":
                priority = "1.0"
                changefreq = "daily"
            elif url_path in ("/assessment.html", "/journey.html"):
                priority = "0.9"
                changefreq = "weekly"
            elif url_path.startswith("/mock-tests/"):
                priority = "0.7"
                changefreq = "weekly"
            elif url_path.startswith("/word/"):
                priority = "0.6"
                changefreq = "monthly"
            elif url_path.startswith(("/grammar/", "/tools/")):
                priority = "0.8"
                changefreq = "monthly"

            pages.append(
                {
                    "rel_path": rel_path,
                    "url_path": url_path,
                    "loc": f"{BASE_URL}{url_path}" if url_path != "/" else f"{BASE_URL}/",
                    "lastmod": lastmod,
                    "changefreq": changefreq,
                    "priority": priority,
                }
            )

    pages.sort(key=lambda item: item["url_path"])
    return pages


def render_urlset(pages: list[dict]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for page in pages:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{escape(page['loc'])}</loc>",
                f"    <lastmod>{page['lastmod']}</lastmod>",
                f"    <changefreq>{page['changefreq']}</changefreq>",
                f"    <priority>{page['priority']}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def render_sitemap_index(part_files: list[str], lastmod: str) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for name in part_files:
        lines.extend(
            [
                "  <sitemap>",
                f"    <loc>{escape(f'{BASE_URL}/{name}')}</loc>",
                f"    <lastmod>{lastmod}</lastmod>",
                "  </sitemap>",
            ]
        )
    lines.append("</sitemapindex>")
    lines.append("")
    return "\n".join(lines)


def validate_pages(pages: list[dict]) -> tuple[int, int, list[str]]:
    """Return (duplicate_count, missing_count, missing_locs)."""
    locs = [p["loc"] for p in pages]
    duplicate_count = len(locs) - len(set(locs))
    missing = []
    for page in pages:
        if page["url_path"] == "/":
            rel = "index.html"
        else:
            rel = page["url_path"].lstrip("/")
        if not (ROOT / rel).is_file():
            missing.append(page["loc"])
    return duplicate_count, len(missing), missing


def generate_sitemap() -> None:
    print("Canonical sitemap generator: scanning once for existing HTML files...")
    pages = discover_html_pages()
    duplicate_count, missing_count, missing_locs = validate_pages(pages)

    print(f"Discovered unique existing pages: {len(pages)}")
    print(f"Duplicate count (pre-write): {duplicate_count}")
    print(f"Missing-file count (pre-write): {missing_count}")
    if missing_locs:
        for loc in missing_locs[:20]:
            print(f"  missing: {loc}")
        raise SystemExit("Refusing to write sitemap with missing files.")

    today = datetime.datetime.now().strftime("%Y-%m-%d")

    if len(pages) <= MAX_URLS_PER_SITEMAP:
        (ROOT / "sitemap.xml").write_text(render_urlset(pages), encoding="utf-8")
        print(f"Wrote sitemap.xml with {len(pages)} URLs (< {MAX_URLS_PER_SITEMAP}).")
    else:
        # Split rather than silently dropping legitimate URLs
        part_names = []
        for index in range(0, len(pages), MAX_URLS_PER_SITEMAP):
            chunk = pages[index : index + MAX_URLS_PER_SITEMAP]
            part_no = (index // MAX_URLS_PER_SITEMAP) + 1
            part_name = f"sitemap-part-{part_no}.xml"
            (ROOT / part_name).write_text(render_urlset(chunk), encoding="utf-8")
            part_names.append(part_name)
            print(f"Wrote {part_name} with {len(chunk)} URLs.")

        index_xml = render_sitemap_index(part_names, today)
        (ROOT / "sitemap-index.xml").write_text(index_xml, encoding="utf-8")
        # Keep sitemap.xml as an index pointer for robots.txt compatibility
        (ROOT / "sitemap.xml").write_text(index_xml, encoding="utf-8")
        print(
            f"URL count {len(pages)} exceeded {MAX_URLS_PER_SITEMAP}; "
            "wrote sitemap index + split parts."
        )

    # Final on-disk validation of the primary sitemap.xml when it is a urlset
    content = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    if "<urlset" in content:
        import re

        locs = re.findall(r"<loc>(.*?)</loc>", content)
        uniq = set(locs)
        missing_final = []
        for loc in uniq:
            path = loc.replace(BASE_URL, "")
            rel = "index.html" if path in ("", "/") else path.lstrip("/")
            if not (ROOT / rel).is_file():
                missing_final.append(loc)
        print("--- post-write validation ---")
        print(f"total <loc> count: {len(locs)}")
        print(f"unique URL count: {len(uniq)}")
        print(f"duplicate count: {len(locs) - len(uniq)}")
        print(f"missing-file count: {len(missing_final)}")
        if "word/con.html" in content or "word/aux.html" in content:
            raise SystemExit("Reserved orphan word URLs unexpectedly present.")
        if len(locs) - len(uniq) != 0 or missing_final or len(locs) >= MAX_URLS_PER_SITEMAP:
            raise SystemExit("Sitemap validation failed.")
        print("Sitemap validation passed.")


if __name__ == "__main__":
    generate_sitemap()
