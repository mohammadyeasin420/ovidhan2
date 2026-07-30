import json
import os
import markdown
from pathlib import Path
from datetime import datetime

CONTENT_DIR = Path("content")
OUTPUT_DIR = Path("")  # Output directly to root

def generate_site():
    for root, dirs, files in os.walk(CONTENT_DIR):
        if "page.json" in files:
            folder_path = Path(root)
            page_json_path = folder_path / "page.json"
            # Also check for reading.md or lesson.md
            md_path = folder_path / "reading.md"
            if not md_path.exists():
                md_path = folder_path / "lesson.md"
            if not md_path.exists():
                continue  # skip if no markdown file

            with open(page_json_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)

            if data.get("status") != "published":
                continue

            with open(md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()

            body_html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])
            
            slug = data.get("slug")
            if not slug:
                # Generate slug from folder name
                slug = folder_path.name
                if data.get("subject") == "grammar":
                    slug += "-tense-bangla"
            
            subject = data.get("subject", "grammar")
            url = f"/{subject}/{slug}.html"
            data['canonical'] = data.get("canonical") or url

            # Choose template based on subject
            template_name = data.get("template")
            if not template_name:
                if subject == "grammar":
                    template_name = "lesson"
                elif subject == "reading":
                    template_name = "reading"
                else:
                    template_name = "lesson"
            
            template_path = Path("templates") / f"{template_name}.html"
            if not template_path.exists():
                print(f"⚠️ Template missing: {template_path}")
                continue

            with open(template_path, 'r', encoding='utf-8') as f:
                template_html = f.read()

            # Prepare common fields
            cefr = data.get("cefr", "A1")
            reading_time = data.get("reading_time", 5)
            word_count = data.get("word_count", 100)
            xp = data.get("xp", 20)

            # Render vocabulary table
            vocab_rows = ""
            for v in data.get("vocabulary", []):
                if isinstance(v, dict):
                    vocab_rows += f"<tr><td>{v['word']}</td><td>{v['bangla']}</td></tr>"
                else:
                    vocab_rows += f"<tr><td>{v}</td><td></td></tr>"

            # Render quiz – safely handle missing keys
            quiz_html = ""
            for i, q in enumerate(data.get("quiz", [])):
                if not q.get("options"):
                    print(f"⚠️ Skipping quiz entry {i+1} in {page_json_path} (missing 'options')")
                    continue
                quiz_html += f'<p><strong>{i+1}. {q["question"]}</strong></p>'
                for j, opt in enumerate(q["options"]):
                    quiz_html += f'<label><input type="radio" name="q{i}" value="{j}"> {opt}</label><br>'
                quiz_html += '<br>'

            # Render FAQ
            faq_html = ""
            for f in data.get("faq", []):
                faq_html += f"""
                <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
                    <h4 style="color: var(--teal); margin-bottom: 0.25rem;">{f['q']}</h4>
                    <p style="color: var(--text-mid);">{f['a']}</p>
                </div>
                """

            # Minimal JSON-LD
            jsonld = {
                "@context": "https://schema.org",
                "@type": "LearningResource",
                "name": data['title'],
                "description": data.get('primary_keyword', ''),
                "educationalLevel": cefr,
                "author": { "@type": "Person", "name": data.get('author', 'Ovidhan Team') },
                "dateModified": datetime.now().strftime("%Y-%m-%d"),
                "about": { "@type": "Thing", "name": subject }
            }
            jsonld_html = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>'

            # Fill template
            final_html = template_html.format(
                title=data['title'],
                primary_keyword=data.get('primary_keyword', ''),
                canonical=data['canonical'],
                cefr=cefr,
                reading_time=reading_time,
                word_count=word_count,
                xp=xp,
                subject=subject,
                body_html=body_html,
                vocab_rows=vocab_rows,
                quiz_html=quiz_html,
                faq_html=faq_html,
                json_ld_html=jsonld_html
            )

            output_path = OUTPUT_DIR / subject / f"{slug}.html"
            os.makedirs(output_path.parent, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"✅ Generated: {output_path}")

if __name__ == "__main__":
    generate_site()
