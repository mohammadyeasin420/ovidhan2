import json
import os
import re

with open('listening-exams.json', 'r', encoding='utf-8') as f:
    exams = json.load(f)

os.makedirs('listening-exams', exist_ok=True)

template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Ovidhan IELTS Practice</title>
    <meta name="description" content="{meta_desc}">
    <link rel="stylesheet" href="../styles.css">
    <style>
        .section-box {{ background: var(--surface); padding: 1.5rem; border-radius: var(--radius); margin: 1.5rem 0; border: 1px solid var(--border); }}
        .section-box.hidden {{ display: none; }}
        .mcq-question {{ margin: 1rem 0; }}
        .mcq-question label {{ display: block; margin: 0.3rem 0; cursor: pointer; }}
        .btn-translate {{ background: var(--teal-dim); color: var(--teal); border: 1px solid var(--teal); padding: 0.3rem 1rem; border-radius: 12px; cursor: pointer; font-size: 0.9rem; margin-left: 1rem; }}
        .btn-translate:hover {{ background: var(--teal); color: #000; }}
        .translation-text {{ display: none; margin-top: 0.5rem; color: var(--text-mid); font-style: italic; }}
        .progress-bar {{ background: var(--surface2); height: 8px; border-radius: 8px; margin: 1rem 0; overflow: hidden; }}
        .progress-fill {{ background: var(--gold); height: 100%; width: 0%; transition: width 0.3s; }}
    </style>
</head>
<body>
    <main style="max-width: 820px; margin: 120px auto; padding: 2rem;">
        <h1 class="gold-text">{title}</h1>
        <p style="font-size: 1.1rem; color: var(--text-mid);">{context_bn}</p>
        <p><strong>Level:</strong> {level} &nbsp;|&nbsp; <strong>Total Duration:</strong> {duration} minutes &nbsp;|&nbsp; <strong>XP:</strong> {xp}</p>
        <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>

        <div id="exam-container">
            {sections_html}
        </div>

        <div style="margin-top: 2rem; display: flex; justify-content: space-between;">
            <button id="btn-prev" class="btn-secondary" disabled>⬅ Previous</button>
            <button id="btn-next" class="btn-primary">Next Section ➡</button>
        </div>
        <div id="exam-feedback" style="margin-top: 1rem; text-align: center;"></div>

        <div style="margin-top: 3rem; text-align: center;">
            <a href="/learn.html" class="btn-primary">📚 Back to Learning Hub</a>
        </div>
    </main>
    <script src="../listening-exam-engine.js"></script>
</body>
</html>"""

def slugify(title):
    return re.sub(r'[^a-z0-9\s-]', '', title.lower()).replace(' ', '-')

for exam in exams:
    slug = slugify(exam['title'])
    filepath = f'listening-exams/{slug}.html'

    sections_html = ''
    for idx, sec in enumerate(exam['sections']):
        mcqs_html = ''
        for i, q in enumerate(sec['mcqs']):
            mcqs_html += f'<div class="mcq-question"><strong>{i+1}. {q["question"]}</strong>'
            for opt_idx, opt in enumerate(q['options']):
                mcqs_html += f'<label><input type="radio" name="sec-{idx}-q{i}" value="{opt_idx}"> {opt}</label>'
            mcqs_html += '</div>'

        sections_html += f"""
        <div class="section-box" id="sec-{idx}">
            <h3>{sec['title']}</h3>
            <button class="btn-primary" onclick="playSection({idx})">🎧 Play Audio</button>
            <button class="btn-translate" onclick="toggleTranslation({idx})">🌐 Show Bangla</button>
            <p id="audio-text-{idx}" style="font-size: 1.1rem; margin-top: 1rem;">{sec['audio_text']}</p>
            <div id="translation-{idx}" class="translation-text">{sec['bangla_translation']}</div>
            <div style="margin-top: 1rem;">{mcqs_html}</div>
        </div>
        """

    meta_desc = exam['sections'][0]['audio_text'][:160] + "... (Full IELTS Mock Test)"
    html = template.format(
        title=exam['title'],
        meta_desc=meta_desc,
        level=exam['level'],
        duration=exam['total_duration'],
        context_bn=exam['context_bn'],
        sections_html=sections_html,
        xp=exam['xp']
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Generated Exam: {filepath}")