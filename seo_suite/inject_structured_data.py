#!/usr/bin/env python3
"""
Structured Data Injector for Ovidhan
- Scans all HTML files (core pages, word pages, blog posts)
- Injects relevant JSON-LD schema (Definition, FAQ, Breadcrumb, etc.)
- Skips pages that already have schema of the same type
"""

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_DIR = Path(__file__).parent.parent
SITE_URL = "https://ovidhan.net"

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------
def read_soup(filepath):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        return BeautifulSoup(f, "html.parser")

def write_soup(filepath, soup):
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(str(soup))

def has_schema_type(soup, schema_type):
    """Check if a JSON-LD script with a given @type already exists."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") == schema_type:
                        return True
            elif isinstance(data, dict):
                if data.get("@type") == schema_type:
                    return True
        except Exception:
            pass
    return False

def inject_json_ld(soup, data):
    """Append a JSON-LD script to <head>."""
    script = soup.new_tag("script", type="application/ld+json")
    script.string = json.dumps(data, ensure_ascii=False, indent=2)
    head = soup.find("head")
    if head:
        head.append(script)
    else:
        # Fallback: append to body
        body = soup.find("body")
        if body:
            body.insert(0, script)

# ---------------------------------------------------------------------------
# Schema builders
# ---------------------------------------------------------------------------
def breadcrumb_schema(page_url, page_title):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": SITE_URL
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": page_title,
                "item": page_url
            }
        ]
    }

def defined_term_schema(word, meaning, bangla, pos, pronunciation, example):
    """Build a DefinedTerm schema for dictionary word pages."""
    schema = {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "name": word,
        "description": meaning,
        "inLanguage": ["en", "bn"],
        "termCode": word
    }
    if pronunciation:
        schema["phoneticText"] = pronunciation
    if pos:
        schema["additionalProperty"] = {
            "@type": "PropertyValue",
            "name": "Part of Speech",
            "value": pos
        }
    if bangla:
        schema["alternateName"] = bangla
    return schema

def faq_schema(questions):
    """Create FAQPage schema from a list of {question, answer} dicts."""
    main_entities = []
    for qa in questions:
        main_entities.append({
            "@type": "Question",
            "name": qa["question"],
            "acceptedAnswer": {
                "@type": "Answer",
                "text": qa["answer"]
            }
        })
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": main_entities
    }

def website_schema():
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Ovidhan",
        "url": SITE_URL,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": f"{SITE_URL}/search?q={{search_term_string}}"
            },
            "query-input": "required name=search_term_string"
        }
    }

# ---------------------------------------------------------------------------
# Page type detectors & processing
# ---------------------------------------------------------------------------
def process_word_page(filepath, page_url):
    soup = read_soup(filepath)
    if has_schema_type(soup, "DefinedTerm"):
        return  # already has definition schema

    # Try to extract word and meaning from the page (heuristic)
    # Look for common elements in your word page template
    word = filepath.stem
    title_tag = soup.find("title")
    page_title = title_tag.string.strip() if title_tag and title_tag.string else word

    # Extract meaning, bangla, pronunciation, pos from the page (if present)
    meaning_elem = soup.find(class_="meaning") or soup.find(id="meaning")
    meaning = meaning_elem.get_text(strip=True) if meaning_elem else ""

    bangla_elem = soup.find(class_="bangla") or soup.find(id="bangla")
    bangla = bangla_elem.get_text(strip=True) if bangla_elem else ""

    pron_elem = soup.find(class_="pronunciation")
    pronunciation = pron_elem.get_text(strip=True).strip("/ ") if pron_elem else ""

    pos_elem = soup.find(class_="part-of-speech")
    pos = pos_elem.get_text(strip=True) if pos_elem else ""

    example_elem = soup.find(class_="example")
    example = example_elem.get_text(strip=True) if example_elem else ""

    # Inject Breadcrumb
    inject_json_ld(soup, breadcrumb_schema(page_url, page_title))

    # Inject DefinedTerm
    inject_json_ld(soup, defined_term_schema(word, meaning, bangla, pos, pronunciation, example))

    write_soup(filepath, soup)
    print(f"  ✅ Injected schema into {filepath.name}")

def process_core_page(filepath, page_url, page_title):
    soup = read_soup(filepath)
    # Always add breadcrumb if missing
    if not has_schema_type(soup, "BreadcrumbList"):
        inject_json_ld(soup, breadcrumb_schema(page_url, page_title))

    # Check for FAQ-like sections (look for elements with class 'faq' or id 'faq')
    faq_section = soup.find(class_="faq") or soup.find(id="faq")
    if faq_section and not has_schema_type(soup, "FAQPage"):
        questions = []
        # Extract Q&A pairs from <dt>/<dd> or from headings and following paragraphs
        qas = faq_section.find_all(["dt", "h2", "h3", "h4"])
        for q in qas:
            answer_tag = q.find_next_sibling(["dd", "p", "div"])
            if answer_tag:
                questions.append({
                    "question": q.get_text(strip=True),
                    "answer": answer_tag.get_text(strip=True)
                })
        if questions:
            inject_json_ld(soup, faq_schema(questions))
            print(f"  📝 Added FAQ schema to {filepath.name}")

    write_soup(filepath, soup)

def process_blog_post(filepath, page_url, page_title, author="Mohammad Yeasin"):
    soup = read_soup(filepath)
    if has_schema_type(soup, "BlogPosting"):
        return
    # Extract first paragraph as description, and a date if present
    date_meta = soup.find("meta", attrs={"property": "article:published_time"})
    date_pub = date_meta["content"] if date_meta else ""
    if not date_pub:
        # Try to extract from filename (e.g., 2026-07-01.html)
        match = re.match(r"(\d{4}-\d{2}-\d{2})", filepath.name)
        if match:
            date_pub = match.group(1)

    first_p = soup.find("p")
    description = first_p.get_text(strip=True) if first_p else page_title

    blog_schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": page_title,
        "author": {
            "@type": "Person",
            "name": author
        },
        "datePublished": date_pub,
        "description": description,
        "url": page_url
    }
    inject_json_ld(soup, blog_schema)
    inject_json_ld(soup, breadcrumb_schema(page_url, page_title))
    write_soup(filepath, soup)
    print(f"  ✅ Injected blog schema into {filepath.name}")

def process_homepage(filepath):
    soup = read_soup(filepath)
    if not has_schema_type(soup, "WebSite"):
        inject_json_ld(soup, website_schema())
    if not has_schema_type(soup, "BreadcrumbList"):
        inject_json_ld(soup, breadcrumb_schema(SITE_URL + "/", "Ovidhan Home"))
    write_soup(filepath, soup)
    print("  ✅ Injected homepage schema")

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main():
    print("🔧 Structured Data Injector for Ovidhan")
    total = 0

    # Word pages
    word_dir = BASE_DIR / "word"
    if word_dir.is_dir():
        word_files = list(word_dir.glob("*.html"))
        total += len(word_files)
        print(f"Processing {len(word_files)} word pages...")
        for fp in word_files:
            page_url = f"{SITE_URL}/word/{fp.name}"
            try:
                process_word_page(fp, page_url)
            except Exception as e:
                print(f"  ❌ Error on {fp.name}: {e}")

    # Core pages (root HTML except word/, tools/, blog posts)
    root_files = [f for f in BASE_DIR.glob("*.html") if not re.match(r"\d{4}-\d{2}-\d{2}", f.name)
                  and f.name not in ("header.html", "footer.html")]
    total += len(root_files)
    print(f"\nProcessing {len(root_files)} core pages...")
    for fp in root_files:
        page_url = f"{SITE_URL}/{fp.name}" if fp.name != "index.html" else SITE_URL + "/"
        page_title = fp.stem.replace("-", " ").title()
        try:
            if fp.name == "index.html":
                process_homepage(fp)
            else:
                process_core_page(fp, page_url, page_title)
        except Exception as e:
            print(f"  ❌ Error on {fp.name}: {e}")

    # Blog posts
    blog_files = list(BASE_DIR.glob("2026-*.html"))
    total += len(blog_files)
    print(f"\nProcessing {len(blog_files)} blog posts...")
    for fp in blog_files:
        page_url = f"{SITE_URL}/{fp.name}"
        # Try to get title from <title>
        soup = read_soup(fp)
        title_tag = soup.find("title")
        page_title = title_tag.string.strip() if title_tag and title_tag.string else fp.stem
        try:
            process_blog_post(fp, page_url, page_title)
        except Exception as e:
            print(f"  ❌ Error on {fp.name}: {e}")

    print(f"\n✅ Done. Injected structured data into {total} pages.")

if __name__ == "__main__":
    main()