import json
import os
import shutil
from pathlib import Path

CONTENT_DIR = Path("content")
TEMPLATE_PATH = Path("grammar-template.html") # We will create this simple template

# Simple HTML template (You can expand this later)
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{seo_title}</title>
    <meta name="description" content="{seo_description}">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <!-- Header injected later -->
    <main style="max-width: 820px; margin: 120px auto; padding: 2rem;">
        <h1 class="gold-text">{hero_headline}</h1>
        <p style="font-size: 1.2rem; color: var(--text-mid);">{hero_subtitle}</p>
        <hr style="border-color: var(--border); margin: 2rem 0;">
        
        <div id="lesson-content">
            <!-- Markdown content will be inserted here by parsing the MD file -->
            {markdown_html}
        </div>
    </main>
    <script src="../global.js"></script>
</body>
</html>"""

def markdown_to_html(md_text):
    # Basic Markdown converter for the pilot
    lines = md_text.split('\n')
    html_lines = []
    in_list = False
    for line in lines:
        line = line.strip()
        if line.startswith('# '):
            html_lines.append(f'<h1>{line[2:]}</h1>')
        elif line.startswith('## '):
            html_lines.append(f'<h2>{line[3:]}</h2>')
        elif line.startswith('- '):
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            html_lines.append(f'<li>{line[2:]}</li>')
        elif line.startswith('> '):
            html_lines.append(f'<blockquote>{line[2:]}</blockquote>')
        else:
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if line:
                html_lines.append(f'<p>{line}</p>')
    if in_list:
        html_lines.append('</ul>')
    return '\n'.join(html_lines)

def generate_pages():
    for root, dirs, files in os.walk(CONTENT_DIR):
        if "lesson.json" in files and "lesson.md" in files:
            # 1. Load Data
            json_path = Path(root) / "lesson.json"
            md_path = Path(root) / "lesson.md"
            
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if data.get("status") != "published":
                print(f"Skipping draft: {data.get('title')}")
                continue

            with open(md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 2. Convert Markdown to HTML
            body_html = markdown_to_html(md_content)

            # 3. Fill the Template
            final_html = HTML_TEMPLATE.format(
                seo_title=data['seo']['title'],
                seo_description=data['seo']['description'],
                hero_headline=data['hero']['headline'],
                hero_subtitle=data['hero']['subtitle'],
                markdown_html=body_html
            )

            # 4. Write output to the URL path (e.g., /grammar/past-simple-tense-bangla.html)
            output_path = Path(data['url'].lstrip('/'))
            os.makedirs(output_path.parent, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"✅ Generated: {output_path}")

if __name__ == "__main__":
    generate_pages()