import json
import os
import markdown
from pathlib import Path

CONTENT_DIR = Path("content")

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{seo_title}</title>
    <meta name="description" content="{seo_description}">
    <meta name="keywords" content="{seo_keywords}">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <main style="max-width: 860px; margin: 120px auto; padding: 2rem;">
        <h1 class="gold-text">{hero_headline}</h1>
        <p style="font-size: 1.2rem; color: var(--text-mid);">{hero_subtitle}</p>
        <hr style="border-color: var(--border); margin: 2rem 0;">
        
        <div id="lesson-content">
            {markdown_html}
        </div>

        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">📖 Vocabulary List</h3>
            <ul style="display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem;">
                {vocabulary_html}
            </ul>
        </div>

        <div style="margin-top: 2rem;">
            <h3 style="color: var(--gold);">❓ Frequently Asked Questions</h3>
            {faq_html}
        </div>

        <div style="margin-top: 3rem; text-align: center;">
            <a href="/learn.html" class="btn-primary">📚 Back to Learning Hub</a>
        </div>
    </main>
    <script src="../global.js"></script>
</body>
</html>"""

def generate_pages():
    for root, dirs, files in os.walk(CONTENT_DIR):
        if "lesson.json" in files and "lesson.md" in files:
            json_path = Path(root) / "lesson.json"
            md_path = Path(root) / "lesson.md"
            
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if data.get("status") != "published":
                print(f"Skipping draft: {data.get('title')}")
                continue

            with open(md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 1. Convert Markdown to HTML
            body_html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])

            # 2. Generate Vocabulary List from JSON
            vocab_items = data.get("vocabulary", [])
            vocab_html = "".join([f"<li style='font-family: var(--font-en);'><strong>{v}</strong></li>" for v in vocab_items])

            # 3. Generate FAQ from JSON
            faq_data = data.get("faq", [])
            faq_html = ""
            for item in faq_data:
                faq_html += f"""
                <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem; border: 1px solid var(--border);">
                    <h4 style="color: var(--teal); margin-bottom: 0.25rem;">{item['q']}</h4>
                    <p style="color: var(--text-mid);">{item['a']}</p>
                </div>
                """

            # 4. Fill the Template
            final_html = HTML_TEMPLATE.format(
                seo_title=data['seo']['title'],
                seo_description=data['seo']['description'],
                seo_keywords=", ".join(data['seo'].get('keywords', [])),
                hero_headline=data['hero']['headline'],
                hero_subtitle=data['hero']['subtitle'],
                markdown_html=body_html,
                vocabulary_html=vocab_html,
                faq_html=faq_html
            )

            output_path = Path(data['url'].lstrip('/'))
            os.makedirs(output_path.parent, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"✅ Generated: {output_path}")

if __name__ == "__main__":
    generate_pages()