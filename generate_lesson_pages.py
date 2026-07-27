import json
import os

# Load the enhanced JSON
with open('speaking-lessons.json', 'r', encoding='utf-8') as f:
    lessons = json.load(f)

# Map categories to folder names
category_map = {
    "daily": "daily",
    "travel": "travel",
    "office": "office",
    "student": "student",
    "bangladesh": "bangladesh",
    "confidence": "confidence"
}

# The full HTML template (unchanged)
template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Ovidhan Speaking Course</title>
    <meta name="description" content="Learn {title} in English with Bangla explanations. {level} level speaking practice for Bangladeshi learners.">
    <link rel="stylesheet" href="../../styles.css">
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "Course",
        "name": "{title}",
        "description": "Interactive {level} speaking lesson with Bangla support.",
        "provider": {{
            "@type": "Organization",
            "name": "Ovidhan"
        }}
    }}
    </script>
</head>
<body>
    <!-- Header will be injected later -->
    <main style="max-width: 820px; margin: 120px auto; padding: 2rem;">
        <h1 class="gold-text">{title}</h1>
        <p style="font-size: 1.2rem; color: var(--text-mid); margin-bottom: 2rem;">{context_bn}</p>
        
        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>🎯 Learning Objectives</h3>
            <ul>
                {objectives_html}
            </ul>
        </div>

        <h3>🗣️ Full Dialogue</h3>
        <div id="dialogue-area" style="background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 2rem;">
            {dialogues_html}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
            <div style="background: var(--surface); padding: 1rem; border-radius: var(--radius);">
                <h4>📖 Key Vocabulary</h4>
                <ul>{vocab_html}</ul>
            </div>
            <div style="background: var(--surface); padding: 1rem; border-radius: var(--radius);">
                <h4>💡 Grammar Tip</h4>
                <p>{grammar_tip}</p>
            </div>
        </div>

        <div style="background: var(--surface); padding: 1rem; border-radius: var(--radius); margin-bottom: 2rem;">
            <h4>🔊 Pronunciation Tip</h4>
            <p>{pronunciation_tip}</p>
        </div>

        <div style="background: var(--surface); padding: 1rem; border-radius: var(--radius); margin-bottom: 2rem;">
            <h4>🔑 Key Phrases</h4>
            <ul>{key_phrases_html}</ul>
        </div>

        <div style="background: var(--surface); padding: 1rem; border-radius: var(--radius); margin-bottom: 2rem;">
            <h4>🧪 Quiz</h4>
            <div id="quiz-area">{quiz_html}</div>
        </div>

        <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); margin-top: 2rem;">
            <h4>🎤 Speaking Practice</h4>
            <div id="speaking-controls" style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button id="btn-listen" class="btn-primary">🎧 Listen</button>
                <button id="btn-speak" class="btn-secondary">🎤 Speak & Check</button>
            </div>
            <div id="transcript-feedback" style="margin-top: 1rem; padding: 1rem; background: var(--surface); border-radius: var(--radius); min-height: 50px;"></div>
        </div>
    </main>
    <!-- Footer will be injected later -->
    <script src="../../lesson-engine.js"></script>
</body>
</html>"""

for lesson in lessons:
    # Determine category folder
    category = lesson.get('category', 'daily')
    folder = category_map.get(category, 'daily')
    
    # Create the specific category folder
    os.makedirs(f'speaking/{folder}', exist_ok=True)
    
    # Generate slug – replace problematic characters
    slug = lesson['title'].lower()
    slug = slug.replace(' ', '-')
    slug = slug.replace(',', '')
    slug = slug.replace('&', 'and')
    slug = slug.replace('/', '-')          # <-- Fix for slashes
    slug = slug.replace('?', '')
    slug = slug.replace('!', '')
    slug = slug.replace("'", '')
    slug = slug.replace('"', '')
    
    filepath = os.path.join('speaking', folder, f'{slug}.html')
    
    # Build HTML components (same as before)
    objectives_html = ''.join(f'<li>{obj}</li>' for obj in lesson.get('objectives', []))
    dialogues_html = ''.join(
        f'<p><strong>{d["speaker"]}:</strong> {d["en"]}<br><span style="color: var(--text-mid);">({d["bn"]})</span></p>'
        for d in lesson['dialogues']
    )
    vocab_html = ''.join(f'<li><strong>{v["word"]}</strong> – {v["meaning"]}</li>' for v in lesson.get('vocab', []))
    grammar_tip = lesson.get('grammar_tip', 'No grammar tip yet.')
    pronunciation_tip = lesson.get('pronunciation_tip', 'No pronunciation tip yet.')
    key_phrases_html = ''.join(f'<li>{phrase}</li>' for phrase in lesson.get('key_phrases', []))
    
    quiz_html = ''
    for i, q in enumerate(lesson.get('quiz', [])):
        quiz_html += f'<p><strong>{i+1}. {q["question"]}</strong></p><ul>'
        for idx, opt in enumerate(q['options']):
            quiz_html += f'<li><label><input type="radio" name="q{i}" value="{idx}"> {opt}</label></li>'
        quiz_html += '</ul>'
    
    # Fill the template
    html = template.format(
        title=lesson['title'],
        level=lesson['level'],
        context_bn=lesson['context_bn'],
        objectives_html=objectives_html,
        dialogues_html=dialogues_html,
        vocab_html=vocab_html,
        grammar_tip=grammar_tip,
        pronunciation_tip=pronunciation_tip,
        key_phrases_html=key_phrases_html,
        quiz_html=quiz_html
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Generated: {filepath}")