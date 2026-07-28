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
        <!-- Hero -->
        <h1 class="gold-text">{hero_headline}</h1>
        <p style="font-size: 1.2rem; color: var(--text-mid);">{hero_subtitle}</p>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 0.5rem 0 1.5rem;">
            <span style="background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">CEFR: {cefr}</span>
            <span style="background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">⏱ {reading_time} min</span>
            <span style="background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 12px; font-size: 0.8rem;">{lesson_type}</span>
        </div>
        <hr style="border-color: var(--border); margin: 2rem 0;">

        <!-- Markdown Content -->
        <div id="lesson-content">
            {markdown_html}
        </div>

        <!-- Vocabulary Table (from JSON) -->
        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">📖 Vocabulary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr><th style="text-align: left; border-bottom: 1px solid var(--border);">Word</th><th style="text-align: left; border-bottom: 1px solid var(--border);">Bangla</th></tr></thead>
                <tbody>
                    {vocabulary_rows}
                </tbody>
            </table>
        </div>

        <!-- Conversation (from JSON) -->
        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface2); border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">💬 Real-Life Conversation</h3>
            {conversation_html}
        </div>

        <!-- FAQ (from JSON) -->
        <div style="margin-top: 2rem;">
            <h3 style="color: var(--gold);">❓ Frequently Asked Questions</h3>
            {faq_html}
        </div>

        <!-- Previous/Next Navigation -->
        <div style="display: flex; justify-content: space-between; margin-top: 3rem;">
            {prev_lesson_html}
            {next_lesson_html}
        </div>

        <!-- Download CTA -->
        <div style="margin-top: 3rem; text-align: center;">
            <a href="https://play.google.com/store/apps/details?id=com.ovidhan.dictionary" class="btn-primary" target="_blank" rel="noopener">📱 Practice Offline – Download App</a>
        </div>
        <div style="margin-top: 2rem; text-align: center;">
            <a href="/learn.html" class="btn-secondary">📚 Back to Learning Hub</a>
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
            
            # Convert Markdown
            body_html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])

            # Vocabulary Table
            vocab_rows = ""
            for v in data.get("vocabulary", []):
                if isinstance(v, dict):
                    vocab_rows += f"<tr><td>{v['word']}</td><td>{v['bangla']}</td></tr>"
                else:
                    # fallback if old format
                    vocab_rows += f"<tr><td>{v}</td><td></td></tr>"

            # Conversation
            conv_html = ""
            for line in data.get("conversation", []):
                conv_html += f"<p><strong>{line['speaker']}:</strong> {line['text']}</p>"

            # FAQ
            faq_html = ""
            for item in data.get("faq", []):
                faq_html += f"""
                <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem; border: 1px solid var(--border);">
                    <h4 style="color: var(--teal); margin-bottom: 0.25rem;">{item['q']}</h4>
                    <p style="color: var(--text-mid);">{item['a']}</p>
                </div>
                """

            # Previous / Next
            prev_html = ""
            if data.get("previous_lesson"):
                prev_html = f'<a href="{data["previous_lesson"]["url"]}" class="btn-secondary">← {data["previous_lesson"]["title"]}</a>'
            else:
                prev_html = '<span></span>'
            next_html = ""
            if data.get("next_lesson"):
                next_html = f'<a href="{data["next_lesson"]["url"]}" class="btn-primary">{data["next_lesson"]["title"]} →</a>'
            else:
                next_html = '<span></span>'

            # Fill template
            final_html = HTML_TEMPLATE.format(
                seo_title=data['seo']['title'],
                seo_description=data['seo']['description'],
                seo_keywords=", ".join(data['seo'].get('keywords', [])),
                hero_headline=data['hero']['headline'],
                hero_subtitle=data['hero']['subtitle'],
                cefr=data['cefr'],
                reading_time=data.get('reading_time', 10),
                lesson_type=data.get('lesson_type', 'Lesson'),
                markdown_html=body_html,
                vocabulary_rows=vocab_rows,
                conversation_html=conv_html,
                faq_html=faq_html,
                prev_lesson_html=prev_html,
                next_lesson_html=next_html
            )

            output_path = Path(data['url'].lstrip('/'))
            os.makedirs(output_path.parent, exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"✅ Generated: {output_path}")

if __name__ == "__main__":
    generate_pages()