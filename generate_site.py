import json
import os
import markdown
from pathlib import Path
from datetime import datetime

CONTENT_DIR = Path("content")
OUTPUT_DIR = Path("")  # Output directly to root

def generate_site():
    for root, dirs, files in os.walk(CONTENT_DIR):
        if "page.json" in files and "lesson.md" in files:
            folder_path = Path(root)
            page_json_path = folder_path / "page.json"
            lesson_md_path = folder_path / "lesson.md"

            with open(page_json_path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)

            if data.get("status") != "published":
                continue

            with open(lesson_md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()

            body_html = markdown.markdown(md_content, extensions=['extra', 'codehilite'])
            
            slug = data.get("slug") or folder_path.name + "-tense-bangla"
            subject = data.get("subject", "grammar")
            url = f"/{subject}/{slug}.html"
            data['canonical'] = data.get("canonical") or url

            # --- RENDER COMPARISON TABLE ---
            comp_html = ""
            if "comparison" in data:
                comp_html = "<table style='width:100%; border-collapse: collapse;'><thead><tr><th>Tense</th><th>Usage</th><th>Example</th></tr></thead><tbody>"
                for c in data["comparison"]:
                    comp_html += f"<tr><td><strong>{c['tense']}</strong></td><td>{c['usage']}</td><td>{c['example']}</td></tr>"
                comp_html += "</tbody></table>"

            # --- RENDER SIGNAL WORDS ---
            signals_html = ""
            if "signal_words" in data:
                signals_html = "<ul>" + "".join([f"<li>{w}</li>" for w in data["signal_words"]]) + "</ul>"

            # --- RENDER SPEAKING PRACTICE ---
            speaking_html = ""
            if "speaking_practice" in data:
                speaking_html = "<ol>" + "".join([f"<li>{s}</li>" for s in data["speaking_practice"]]) + "</ol>"

            # --- RENDER AUDIO EXAMPLES (TTS) ---
            audio_html = ""
            if "audio_examples" in data:
                audio_html = "<ul>"
                for a in data["audio_examples"]:
                    audio_html += f'<li>{a} <button onclick="speakText(\'{a}\')" style="background:transparent; border:none; cursor:pointer; color:var(--teal);">🔊</button></li>'
                audio_html += "</ul>"

            # --- RENDER MULTI-TYPE QUIZ ---
            quiz_html = ""
            if "quiz" in data:
                for idx, q in enumerate(data["quiz"]):
                    q_type = q.get("type", "mcq")
                    if q_type == "mcq":
                        quiz_html += f"<p><strong>{idx+1}. {q['question']}</strong></p>"
                        for opt in q['options']:
                            quiz_html += f'<label><input type="radio" name="q{idx}" value="{opt}"> {opt}</label><br>'
                    elif q_type == "fill":
                        quiz_html += f"<p><strong>{idx+1}. {q['question']}</strong></p>"
                        quiz_html += f'<input type="text" id="q{idx}" placeholder="Type your answer..."><br>'
                    elif q_type in ["correction", "translation"]:
                        quiz_html += f"<p><strong>{idx+1}. {q['question']}</strong></p>"
                        quiz_html += f'<textarea id="q{idx}" rows="2" style="width:100%; padding:0.5rem;"></textarea>'

            # --- RENDER FAQ ---
            faq_html = ""
            if "faq" in data:
                for f in data["faq"]:
                    faq_html += f"""
                    <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
                        <h4 style="color: var(--teal); margin-bottom: 0.25rem;">{f['q']}</h4>
                        <p style="color: var(--text-mid);">{f['a']}</p>
                    </div>
                    """

            # --- RENDER RELATED LINKS ---
            related_html = ""
            if "related_links" in data:
                related_html = "<ul>" + "".join([f'<li><a href="{l["url"]}">{l["title"]}</a></li>' for l in data["related_links"]]) + "</ul>"

            # --- GENERATE JSON-LD ---
            jsonld = {
                "@context": "https://schema.org",
                "@type": "LearningResource",
                "name": data['title'],
                "description": data['primary_keyword'],
                "educationalLevel": data['cefr'],
                "author": { "@type": "Person", "name": data.get('author', 'Ovidhan Team') },
                "dateModified": datetime.now().strftime("%Y-%m-%d"),
                "about": { "@type": "Thing", "name": data['subject'] }
            }
            if "faq" in data:
                jsonld["mainEntity"] = [{"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in data["faq"]]
            jsonld_html = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>'

            # --- MAIN HTML TEMPLATE (ESCAPED CURLY BRACES) ---
            template_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} | Ovidhan</title>
    <meta name="description" content="{primary_keyword}">
    <link rel="canonical" href="https://ovidhan.net{canonical}">
    <link rel="stylesheet" href="../styles.css">
    {json_ld_html}
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

        <!-- Comparison Table -->
        <div style="margin-top: 2rem; background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">🔍 Comparison Table</h3>
            {comparison_html}
        </div>

        <!-- Signal Words -->
        <div style="margin-top: 2rem; background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">📌 Signal Words</h3>
            {signals_html}
        </div>

        <!-- Audio Examples -->
        <div style="margin-top: 2rem; background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">🔊 Listen to Examples</h3>
            {audio_html}
        </div>

        <!-- Speaking Practice -->
        <div style="margin-top: 2rem; background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">🗣️ Speaking Practice</h3>
            <p>Say these sentences aloud:</p>
            {speaking_html}
        </div>

        <!-- Quiz -->
        <div style="margin-top: 2rem; background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">🧪 Quiz</h3>
            {quiz_html}
            <button onclick="alert('Check your answers manually!')" class="btn-secondary" style="margin-top: 1rem;">Check Answers</button>
        </div>

        <!-- FAQ -->
        <div style="margin-top: 2rem;">
            <h3 style="color: var(--gold);">❓ Frequently Asked Questions</h3>
            {faq_html}
        </div>

        <!-- Related Links -->
        <div style="margin-top: 2rem; background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3 style="color: var(--gold);">🔗 Related Lessons</h3>
            {related_html}
        </div>

        <div style="margin-top: 3rem; text-align: center;">
            <a href="/learn.html" class="btn-secondary">📚 Back to Learning Hub</a>
        </div>
    </main>
    <script>
        function speakText(text) {{
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }}
    </script>
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
                comparison_html=comp_html,
                signals_html=signals_html,
                audio_html=audio_html,
                speaking_html=speaking_html,
                quiz_html=quiz_html,
                faq_html=faq_html,
                related_html=related_html,
                json_ld_html=jsonld_html
            )

            output_path = OUTPUT_DIR / subject / f"{slug}.html"
            os.makedirs(output_path.parent, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_html)
            
            print(f"✅ Generated: {output_path}")

if __name__ == "__main__":
    generate_site()