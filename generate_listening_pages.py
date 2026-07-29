import json
import os
import markdown
from pathlib import Path

LISTENING_JSON = Path("listening-exercises.json")
OUTPUT_DIR = Path("listening")

# Template for each lesson page
LESSON_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Ovidhan Listening Practice</title>
    <meta name="description" content="{description}">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <main style="max-width: 820px; margin: 120px auto; padding: 2rem;">
        <!-- HERO -->
        <h1 class="gold-text">{title}</h1>
        <p style="font-size: 1.2rem; color: var(--text-mid);">{level} · {duration} min · ⭐ {xp} XP</p>
        <hr style="border-color: var(--border); margin: 2rem 0;">

        <!-- AUDIO PLAYER -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>🎧 Audio Player</h3>
            <button onclick="playAudio()" class="btn-primary">▶ Play</button>
            <button onclick="pauseAudio()" class="btn-secondary">⏸ Pause</button>
            <button onclick="resumeAudio()" class="btn-secondary">▶ Resume</button>
            <span id="audio-status" style="color: var(--text-mid); margin-left: 1rem;"></span>
        </div>

        <!-- TRANSCRIPT & BANGLA TRANSLATION -->
        <div style="background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>📝 Transcript</h3>
            <button onclick="toggleTranslation()" class="btn-secondary" style="margin-bottom: 1rem;">🌐 Toggle Bangla</button>
            <p id="transcript-en" style="font-size: 1.1rem;">{audio_text}</p>
            <p id="translation-bn" style="display: none; color: var(--text-mid); font-family: var(--font-bn);">{bangla_translation}</p>
        </div>

        <!-- VOCABULARY -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>📖 Vocabulary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr><th style="text-align: left; border-bottom: 1px solid var(--border);">Word</th><th style="text-align: left; border-bottom: 1px solid var(--border);">Bangla</th></tr></thead>
                <tbody>{vocab_rows}</tbody>
            </table>
        </div>

        <!-- GRAMMAR NOTE -->
        <div style="background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>📝 Grammar Note</h3>
            <p style="color: var(--text-mid);">{grammar_note}</p>
        </div>

        <!-- QUIZ -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>🧪 Quiz</h3>
            {quiz_html}
            <button onclick="checkQuiz()" class="btn-primary" style="margin-top: 1rem;">Check Answers</button>
            <div id="quiz-result" style="margin-top: 1rem; color: var(--text-mid);"></div>
        </div>

        <!-- SHADOWING -->
        <div style="background: var(--surface2); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>🎤 Shadowing Practice</h3>
            <p style="color: var(--text-mid);">Listen and repeat after the speaker:</p>
            <ul style="line-height: 2;">{shadowing_html}</ul>
        </div>

        <!-- COMMON MISTAKES -->
        <div style="background: var(--surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>⚠️ Common Mistakes</h3>
            {mistakes_html}
        </div>

        <!-- RELATED LESSONS -->
        <div style="background: var(--surface2); padding: 1rem; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 2rem;">
            <h3>🔗 Related Lessons</h3>
            <ul>{related_html}</ul>
        </div>

        <!-- NEXT LESSON -->
        <div style="background: var(--surface); padding: 1rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <h3>➡ Next Lesson</h3>
            {next_lesson_html}
        </div>

        <div style="margin-top: 2rem; text-align: center;">
            <a href="/listening.html" class="btn-secondary">📚 Back to Listening Hub</a>
        </div>
    </main>

    <script>
        const audioText = `{audio_text}`;
        let utterance = null;

        function playAudio() {{
            window.speechSynthesis.cancel();
            utterance = new SpeechSynthesisUtterance(audioText);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
            document.getElementById('audio-status').textContent = '🔊 Playing...';
            utterance.onend = () => document.getElementById('audio-status').textContent = '✅ Done.';
        }}
        function pauseAudio() {{
            if (window.speechSynthesis.speaking) {{
                window.speechSynthesis.pause();
                document.getElementById('audio-status').textContent = '⏸ Paused.';
            }}
        }}
        function resumeAudio() {{
            if (window.speechSynthesis.paused) {{
                window.speechSynthesis.resume();
                document.getElementById('audio-status').textContent = '🔊 Resumed...';
            }}
        }}
        function toggleTranslation() {{
            const el = document.getElementById('translation-bn');
            const btn = document.querySelector('.btn-translate');
            if (el.style.display === 'none') {{
                el.style.display = 'block';
                btn.textContent = '🌐 Hide Bangla';
            }} else {{
                el.style.display = 'none';
                btn.textContent = '🌐 Toggle Bangla';
            }}
        }}
        function checkQuiz() {{
            // Simple JavaScript grading – can be extended
            alert('✅ Quiz completed! Check your answers manually.');
        }}
    </script>
</body>
</html>
"""

def slugify(title):
    return title.lower().replace(' ', '-').replace(',', '').replace('(', '').replace(')', '')

def build_lesson(exercise):
    # Vocabulary
    vocab_rows = "".join([f'<tr><td>{v["word"]}</td><td>{v["bangla"]}</td></tr>' for v in exercise.get('vocab', [])])

    # Quiz
    quiz_html = ""
    for i, q in enumerate(exercise.get('quiz', [])):
        quiz_html += f'<p><strong>{i+1}. {q["question"]}</strong></p>'
        for j, opt in enumerate(q['options']):
            quiz_html += f'<label><input type="radio" name="q{i}" value="{j}"> {opt}</label><br>'
        quiz_html += '<br>'

    # Shadowing
    shadowing_html = "".join([f'<li><button onclick="speakText(\'{s}\')" class="btn-secondary" style="font-size:0.8rem;padding:2px 10px;">🔊</button> {s}</li>' for s in exercise.get('shadowing_sentences', [])])

    # Common mistakes
    mistakes_html = ""
    for m in exercise.get('common_mistakes', []):
        mistakes_html += f'<p>❌ {m["wrong"]}<br>✅ {m["right"]}<br><span style="color: var(--text-soft); font-size: 0.9rem;">{m["explanation"]}</span></p>'

    # Related lessons
    related_html = "".join([f'<li><a href="{l["url"]}">{l["title"]}</a></li>' for l in exercise.get('related_lessons', [])])

    # Next lesson
    next_id = exercise.get('next_lesson_id')
    next_html = ""
    if next_id:
        # Find the next lesson in the JSON
        with open(LISTENING_JSON, 'r', encoding='utf-8') as f:
            all_ex = json.load(f)
        for ex in all_ex:
            if ex['id'] == next_id:
                next_html = f'<p><a href="/listening/{slugify(ex["title"])}.html">{ex["title"]}</a> →</p>'
                break
        else:
            next_html = '<p>No next lesson.</p>'
    else:
        next_html = '<p>You’ve completed all lessons in this series!</p>'

    return LESSON_TEMPLATE.format(
        title=exercise['title'],
        description=f"Improve your English listening with a {exercise['level']} exercise on {exercise['title']}.",
        level=exercise['level'],
        duration=exercise['duration'],
        xp=exercise['xp'],
        audio_text=exercise['audio_text'],
        bangla_translation=exercise['bangla_translation'],
        vocab_rows=vocab_rows,
        grammar_note=exercise['grammar_note'],
        quiz_html=quiz_html,
        shadowing_html=shadowing_html,
        mistakes_html=mistakes_html,
        related_html=related_html,
        next_lesson_html=next_html
    )

def main():
    with open(LISTENING_JSON, 'r', encoding='utf-8') as f:
        exercises = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for ex in exercises:
        slug = slugify(ex['title'])
        filepath = OUTPUT_DIR / f"{slug}.html"
        html = build_lesson(ex)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"✅ Generated: {filepath}")

if __name__ == "__main__":
    main()