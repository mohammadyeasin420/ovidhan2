import json
import os
import markdown
from pathlib import Path
from datetime import datetime

CONTENT_DIR = Path("content")
OUTPUT_DIR = Path("")  # Output directly to root

def get_slug_from_path(path):
    # Fix: Take the folder name (e.g., "present-continuous") and add "-tense-bangla" to it
    return path.name + "-tense-bangla"

def generate_site():
    for root, dirs, files in os.walk(CONTENT_DIR):
        if "page.json" in files and "lesson.md" in files:
            folder_path = Path(root)
            page_json_path = folder_path / "page.json"
            lesson_md_path = folder_path / "lesson.md"

            # FIX: Use utf-8-sig to skip BOM
            with open(page_json_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)

            if data.get("status") != "published":
                print(f"Skipping draft: {data.get('title')}")
                continue

            with open(lesson_md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()

            body_html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])
            
            slug = data.get("slug") or get_slug_from_path(folder_path)
            subject = data.get("subject", "grammar")
            url = f"/{subject}/{slug}.html"
            data['canonical'] = data.get("canonical") or url

            # Minimal template for now (can be moved to templates/ folder later)
            template_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | Ovidhan</title>
    <meta name="description" content="{primary_keyword}">
    <link rel="canonical" href="https://ovidhan.net{canonical}">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <main style="max-width: 860px; margin: 120px auto; padding: 2rem;">
        <h1 class="gold-text">{title}</h1>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 0.5rem 0 1.5rem;">
            <span style="background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">CEFR: {cefr}</span>
            <span style="background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">⏱ {reading_time} min</span>
            <span style="background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">{subject}</span>
        </div>
        <hr style="border-color: var(--border); margin: 2rem 0;">
        <div id="lesson-content">
            {body_html}
        </div>
        <div style="margin-top: 3rem; text-align: center;">
            <a href="/learn.html" class="btn-secondary">📚 Back to Learning Hub</a>
        </div>
    </main>
</body>
</html>"""

            final_html = template_html.format(
                title=data['title'],
                primary_keyword=data['primary_keyword'],
                canonical=data['canonical'],
                cefr=data['cefr'],
                reading_time=data['reading_time'],
                subject=data['subject'],
                body_html=body_html,
            )

            output_path = OUTPUT_DIR / subject / f"{slug}.html"
            os.makedirs(output_path.parent, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"✅ Generated: {output_path}")

if __name__ == "__main__":
    generate_site()