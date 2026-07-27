import json
import os
import re

with open('listening-exercises.json', 'r', encoding='utf-8') as f:
    exercises = json.load(f)

category_map = {
    "bangladesh": "bangladesh",
    "daily": "daily",
    "travel": "travel",
    "office": "office",
    "student": "student",
    "confidence": "confidence"
}

template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Ovidhan Listening Practice</title>
    <meta name="description" content="{meta_desc}">
    <meta name="keywords" content="{keywords}, listening practice, English listening, Bangladesh English">
    <link rel="stylesheet" href="../../styles.css">
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": "{title}",
        "description": "{meta_desc}",
        "educationalLevel": "{level}",
        "provider": {{
            "@type": "Organization",
            "name": "Ovidhan"
        }},
        "duration": "PT{duration}M",
        "inLanguage": "en"
    }}
    </script>
</head>
<body>
    <main style="max-width: 820px; margin: 120px auto; padding: 2rem;">
        <h1 class="gold-text">{title}</h1>
        <p style="font-size: 1.1rem; color: var(--text-mid);">{context_bn}</p>
        <p><strong>Level:</strong> {level} &nbsp;|&nbsp; <strong>Duration:</strong> {duration} minutes &nbsp;|&nbsp; <strong>XP:</strong> {xp}</p>

        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); margin: 1.5rem 0;">
            <h3>🎧 Listen</h3>
            <button id="btn-listen" class="btn-primary">🔊 Play Audio</button>
            <div id="audio-feedback" style="margin-top: 0.5rem; color: var(--text-mid);"></div>
        </div>

        <div style="background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); margin: 1.5rem 0;">
            <h3>📝 Transcript</h3>
            <p id="transcript-en" style="font-size: 1.2rem;">{audio_text}</p>
            <p id="transcript-bn" style="color: var(--text-mid);">{bangla_translation}</p>
        </div>

        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); margin: 1.5rem 0;">
            <h3>✍️ Dictation (Fill in the blanks)</h3>
            {dictation_html}
            <button id="btn-check-dictation" class="btn-secondary">Check Answers</button>
            <div id="dictation-feedback" style="margin-top: 0.5rem;"></div>
            <script id="dictation-answers" type="application/json">{dictation_answers_json}</script>
        </div>

        <div style="background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); margin: 1.5rem 0;">
            <h3>🧪 Comprehension Quiz</h3>
            {quiz_html}
            <button id="btn-check-quiz" class="btn-secondary">Submit Quiz</button>
            <div id="quiz-feedback" style="margin-top: 0.5rem;"></div>
            <script id="quiz-data" type="application/json">{quiz_data_json}</script>
        </div>

        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); margin: 1.5rem 0;">
            <h3>📖 Vocabulary</h3>
            <ul>{vocab_html}</ul>
        </div>

        <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); margin: 1.5rem 0;">
            <h3>🔗 Related Lessons</h3>
            <ul>{related_html}</ul>
        </div>

        <div style="margin-top: 2rem; text-align: center;">
            <a href="/learn.html" class="btn-primary">📚 Back to Learning Hub</a>
        </div>
    </main>
    <script src="../../listening-engine.js"></script>
</body>
</html>"""

def slugify(title):
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    return slug

for exercise in exercises:
    category = exercise.get('category', 'daily')
    folder = category_map.get(category, 'daily')
    os.makedirs(f'listening/{folder}', exist_ok=True)

    slug = slugify(exercise['title'])
    filepath = f'listening/{folder}/{slug}.html'

    # Dictation HTML
    dictation_html = ''
    for i, blank in enumerate(exercise['dictation_blanks']):
        dictation_html += f'<p style="font-size: 1.1rem;">{blank}</p>'
        dictation_html += f'<input type="text" id="dictation-{i}" placeholder="Type your answer..." style="width: 80%; padding: 0.5rem; margin-bottom: 0.5rem;">'

    # Quiz HTML
    quiz_html = ''
    for i, q in enumerate(exercise['comprehension_quiz']):
        quiz_html += f'<p><strong>{i+1}. {q["question"]}</strong></p>'
        for idx, opt in enumerate(q['options']):
            quiz_html += f'<label><input type="radio" name="q{i}" value="{idx}"> {opt}</label><br>'

    # Vocabulary & Related
    vocab_html = ''.join(f'<li><strong>{v["word"]}</strong> – {v["meaning"]}</li>' for v in exercise.get('vocab', []))
    related_html = ''.join(f'<li><a href="{l["url"]}">{l["title"]}</a></li>' for l in exercise.get('related_lessons', []))

    # Hidden data
    dictation_answers_json = json.dumps(exercise['dictation_answers'])
    quiz_data_json = json.dumps([{'correct': q['correct']} for q in exercise['comprehension_quiz']])

    meta_desc = exercise['audio_text'][:160] + "... (Bangla translation available)"

    html = template.format(
        title=exercise['title'],
        meta_desc=meta_desc,
        keywords=exercise.get('keywords', 'English listening practice'),
        level=exercise['level'],
        duration=exercise['duration_minutes'],
        context_bn=exercise['context_bn'],
        audio_text=exercise['audio_text'],
        bangla_translation=exercise['bangla_translation'],
        dictation_html=dictation_html,
        quiz_html=quiz_html,
        vocab_html=vocab_html,
        related_html=related_html,
        xp=exercise['xp'],
        dictation_answers_json=dictation_answers_json,
        quiz_data_json=quiz_data_json
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Generated: {filepath}")