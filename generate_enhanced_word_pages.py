import json
import re
from pathlib import Path
from string import Template

ROOT = Path(__file__).parent
OUTPUT_DIR = ROOT / "word"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── 1. LOAD DICTIONARY WITH UTF-8 ──
def load_dictionary():
    enriched_path = ROOT / "enriched-dictionary.json"
    dict_path = ROOT / "dictionary.json"
    raw_data = []

    try:
        if enriched_path.exists():
            with open(enriched_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
        elif dict_path.exists():
            with open(dict_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
        else:
            print("❌ No dictionary.json or enriched-dictionary.json found.")
            return []
    except UnicodeDecodeError:
        try:
            with open(enriched_path, 'r', encoding='utf-8-sig') as f:
                raw_data = json.load(f)
        except:
            with open(dict_path, 'r', encoding='utf-8-sig') as f:
                raw_data = json.load(f)
    except Exception as e:
        print(f"❌ Error loading JSON: {e}")
        return []

    # Auto-detect format
    if isinstance(raw_data, list):
        if raw_data and isinstance(raw_data[0], list):
            return [{"word": item[0], "meaning": item[1] if len(item) > 1 else ""} for item in raw_data if item]
        elif raw_data and isinstance(raw_data[0], dict):
            if 'word' in raw_data[0]:
                return raw_data
            else:
                for item in raw_data:
                    for key in ['english', 'term', 'name', 'title']:
                        if key in item:
                            item['word'] = item[key]
                            break
                return raw_data
        else:
            return raw_data
    elif isinstance(raw_data, dict):
        if 'words' in raw_data and isinstance(raw_data['words'], list):
            return raw_data['words']
        else:
            converted = []
            for key, value in raw_data.items():
                if isinstance(value, dict):
                    value['word'] = key
                    converted.append(value)
                elif isinstance(value, str):
                    converted.append({"word": key, "meaning": value})
            return converted
    return []

def safe_filename(word):
    safe = re.sub(r'[^a-zA-Z0-9-]', '', word).lower()
    if not safe:
        safe = f"word_{hash(word)}"
    return safe

# ── HTML TEMPLATE USING $ PLACEHOLDERS ──
HTML_TEMPLATE = Template('''<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$word meaning in Bangla – Ovidhan Dictionary</title>
    <meta name="description" content="Learn the meaning of "$word" in Bangla ($bangla). Example sentence, pronunciation, synonyms, antonyms, and more." />
    <link rel="canonical" href="https://ovidhan.net/word/$safe.html" />
    <link rel="stylesheet" href="/styles.css" />
    <meta property="og:title" content="$word meaning in Bangla – Ovidhan" />
    <meta property="og:description" content="Learn the meaning of "$word" in Bangla ($bangla). Example, pronunciation, synonyms, antonyms, and more." />
    <meta property="og:url" content="https://ovidhan.net/word/$safe.html" />
    <meta name="robots" content="index, follow" />
    <style>
        body { background: #0B1F1A; color: #D8EDEB; font-family: 'Hind Siliguri', sans-serif; line-height: 1.8; }
        .word-container { max-width: 780px; margin: 0 auto; padding: 30px 20px 60px; }
        .breadcrumb { font-family: 'Inter', sans-serif; font-size: 13px; color: #5A7D79; margin-bottom: 24px; }
        .breadcrumb a { color: #4ECDC4; text-decoration: none; }
        .breadcrumb a:hover { color: #E6B84A; }
        .word-header { border-bottom: 1px solid #1E3D38; padding-bottom: 16px; margin-bottom: 24px; }
        .word-header .word { font-size: 2.8rem; font-weight: 800; color: #fff; font-family: 'Inter', sans-serif; }
        .word-header .pronunciation { font-size: 1.2rem; color: #E6B84A; font-family: 'Inter', sans-serif; margin-top: 4px; }
        .word-header .bangla { font-size: 1.8rem; color: #8AADA9; margin-top: 4px; }
        .word-header .cefr { display: inline-block; background: #1A3530; border: 1px solid #4ECDC4; color: #4ECDC4; padding: 2px 12px; border-radius: 12px; font-size: 0.75rem; font-family: 'Inter', sans-serif; margin-top: 8px; }
        .exam-tag { display: inline-block; background: rgba(230,184,74,0.12); color: #E6B84A; font-size: 0.7rem; padding: 2px 12px; border-radius: 12px; font-family: 'Inter', sans-serif; font-weight: 600; margin-right: 4px; }
        .word-section { background: #122820; border: 1px solid #1E3D38; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; }
        .word-section h3 { color: #E6B84A; font-size: 1rem; margin-bottom: 10px; font-family: 'Inter', sans-serif; letter-spacing: 0.5px; }
        .word-section p, .word-section li { color: #8AADA9; line-height: 1.8; }
        .word-section .example-box { background: #0B1F1A; border-left: 4px solid #E6B84A; padding: 12px 16px; border-radius: 4px; color: #D8EDEB; font-style: italic; }
        .word-section .tag-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .word-section .tag-group span { background: #1A3530; border: 1px solid #1E3D38; border-radius: 20px; padding: 4px 14px; font-size: 0.9rem; color: #D8EDEB; }
        .word-section .tag-group span.synonym { border-color: #4ECDC4; color: #4ECDC4; }
        .word-section .tag-group span.antonym { border-color: #f87171; color: #f87171; }
        .word-section .tag-group span.colloc { border-color: #E6B84A; color: #E6B84A; }
        .word-section .mistake-box { background: rgba(248,113,113,0.08); border-left: 4px solid #f87171; padding: 12px 16px; border-radius: 4px; color: #fca5a5; }
        .word-section .grammar-box { background: rgba(78,205,196,0.08); border-left: 4px solid #4ECDC4; padding: 12px 16px; border-radius: 4px; color: #8AADA9; }
        .word-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
        .word-actions .btn { background: #E6B84A; color: #0B1F1A; padding: 10px 24px; border: none; border-radius: 40px; font-weight: 700; font-family: 'Inter', sans-serif; cursor: pointer; text-decoration: none; transition: 0.2s; display: inline-flex; align-items: center; gap: 6px; }
        .word-actions .btn:hover { background: #f0c85a; transform: scale(1.02); }
        .word-actions .btn-secondary { background: #1A3530; color: #D8EDEB; border: 1px solid #1E3D38; }
        .word-actions .btn-secondary:hover { border-color: #E6B84A; color: #E6B84A; }
        .back-link { margin-top: 24px; display: block; color: #4ECDC4; text-decoration: none; font-family: 'Inter', sans-serif; font-size: 14px; }
        .back-link:hover { color: #E6B84A; }
        .site-footer { background: #060F0D; border-top: 1px solid #1E3D38; text-align: center; padding: 30px 24px; color: #5A7D79; font-size: 13px; margin-top: 40px; }
        .site-footer a { color: #4ECDC4; text-decoration: none; }
        .site-footer a:hover { color: #E6B84A; }
        .no-data { color: #5A7D79; font-style: italic; }
        @media (max-width: 600px) {
            .word-header .word { font-size: 2rem; }
            .word-header .bangla { font-size: 1.4rem; }
            .word-section { padding: 16px; }
        }
    </style>
</head>
<body>

<header style="background:#0B1F1A;border-bottom:1px solid #1E3D38;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
    <a href="/" style="font-size:22px;font-weight:700;color:#E6B84A;text-decoration:none;">অভিধান <span style="color:#D8EDEB;">| Ovidhan</span></a>
    <nav style="display:flex;gap:16px;flex-wrap:wrap;">
        <a href="/" style="color:#8AADA9;text-decoration:none;font-size:14px;font-family:'Inter',sans-serif;">Home</a>
        <a href="/dictionary.html" style="color:#8AADA9;text-decoration:none;font-size:14px;font-family:'Inter',sans-serif;">Dictionary</a>
        <a href="/explorer.html" style="color:#8AADA9;text-decoration:none;font-size:14px;font-family:'Inter',sans-serif;">🔍 Explorer</a>
        <a href="/grammar.html" style="color:#8AADA9;text-decoration:none;font-size:14px;font-family:'Inter',sans-serif;">Grammar</a>
        <a href="/practice.html" style="color:#8AADA9;text-decoration:none;font-size:14px;font-family:'Inter',sans-serif;">Practice</a>
        <a href="https://play.google.com/store/apps/details?id=com.ovidhan.dictionary" style="background:#E6B84A;color:#0B1F1A;font-weight:700;padding:5px 14px;border-radius:8px;text-decoration:none;font-size:14px;font-family:'Inter',sans-serif;" target="_blank">📱 Download</a>
    </nav>
</header>

<main class="word-container">
    <nav class="breadcrumb">
        <a href="https://ovidhan.net">Home</a> ›
        <a href="/dictionary.html">Dictionary</a> ›
        <a href="/word/$first_letter.html">$first_letter_upper</a> ›
        $word
    </nav>

    <div class="word-header">
        <div class="word">$word</div>
        <div class="pronunciation">$pronunciation 
            <button onclick="speakWord('$word')" style="background:transparent;border:none;color:#E6B84A;font-size:1.2rem;cursor:pointer;margin-left:8px;">🔊</button>
        </div>
        <div class="bangla">$bangla</div>
        <div style="margin-top:8px;">
            <span class="cefr">📊 $cefr</span>
            $exam_tags
        </div>
    </div>

    <div class="word-section">
        <h3>📖 Definition</h3>
        <p>$definition</p>
    </div>

    <div class="word-section">
        <h3>💬 Example Sentence</h3>
        <div class="example-box">"$example"</div>
    </div>

    <div class="word-section">
        <h3>🔗 Collocations</h3>
        <div class="tag-group">$colloc_html</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="word-section">
            <h3>✅ Synonyms</h3>
            <div class="tag-group">$syn_html</div>
        </div>
        <div class="word-section">
            <h3>❌ Antonyms</h3>
            <div class="tag-group">$ant_html</div>
        </div>
    </div>

    <div class="word-section">
        <h3>📘 Grammar Note</h3>
        <div class="grammar-box">$grammar</div>
    </div>

    $mistake_html

    <div class="word-actions">
        <a href="/flashcards.html?word=$word" class="btn">📇 Add to Flashcards</a>
        <a href="/quiz.html" class="btn btn-secondary">🧠 Quiz Me</a>
        <a href="/practice.html" class="btn btn-secondary">🎯 Daily Practice</a>
        <a href="/explorer.html" class="btn btn-secondary">🔍 Explorer</a>
    </div>

    <a href="/dictionary.html" class="back-link">← Back to Dictionary</a>
</main>

<footer class="site-footer">
    <p><strong style="color:#E6B84A;">অভিধান | Ovidhan</strong> — English Learning Ecosystem for Bangladesh</p>
    <p>
        <a href="/">Home</a> &nbsp;•&nbsp;
        <a href="/dictionary.html">Dictionary</a> &nbsp;•&nbsp;
        <a href="/explorer.html">Explorer</a> &nbsp;•&nbsp;
        <a href="/grammar.html">Grammar</a> &nbsp;•&nbsp;
        <a href="/practice.html">Practice</a> &nbsp;•&nbsp;
        <a href="/tools.html">Tools</a> &nbsp;•&nbsp;
        <a href="https://play.google.com/store/apps/details?id=com.ovidhan.dictionary" target="_blank">📱 Download App</a>
    </p>
    <p style="margin-top: 12px;">© 2026 Ovidhan • Made with ❤️ for Bangladesh 🇧🇩</p>
</footer>

<script>
    function speakWord(word) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    }
</script>

</body>
</html>''')

def generate_word_html(word_data):
    word = word_data.get('word', '')
    if not word:
        return None

    bangla = word_data.get('bangla', word_data.get('meaning', word_data.get('definition', '—')))
    definition = word_data.get('definition', word_data.get('meaning', bangla))
    pronunciation = word_data.get('pronunciation', '—')
    example = word_data.get('example', word_data.get('sentence', 'No example available.'))
    collocations = word_data.get('collocations', [])
    synonyms = word_data.get('synonyms', [])
    antonyms = word_data.get('antonyms', [])
    grammar = word_data.get('grammar_note', '—')
    common_mistakes = word_data.get('common_mistakes', word_data.get('common_mistake', ''))
    exam_category = word_data.get('exam_category', [])
    cefr = word_data.get('cefr_level', word_data.get('level', 'A1-C2'))

    if not synonyms:
        synonyms = ['Try our Smart Word Explorer for more synonyms!']
    if not antonyms:
        antonyms = ['Try our Smart Word Explorer for more antonyms!']

    exam_tags = ''.join(f'<span class="exam-tag">🎓 {cat}</span>' for cat in exam_category)
    colloc_html = ''.join(f'<span class="colloc">{c}</span>' for c in collocations) if collocations else '<span class="no-data">No collocations available.</span>'
    syn_html = ''.join(f'<span class="synonym">{s}</span>' for s in synonyms if s)
    ant_html = ''.join(f'<span class="antonym">{a}</span>' for a in antonyms if a)

    mistake_html = ''
    if common_mistakes and len(str(common_mistakes)) > 5:
        mistake_html = f'''
        <div class="word-section">
            <h3>⚠️ Common Mistakes</h3>
            <div class="mistake-box">{common_mistakes}</div>
        </div>
        '''

    safe = safe_filename(word)
    first_letter = word[0].lower() if word else 'a'
    first_letter_upper = first_letter.upper()

    return HTML_TEMPLATE.substitute(
        word=word,
        safe=safe,
        bangla=bangla,
        definition=definition,
        pronunciation=pronunciation,
        example=example,
        colloc_html=colloc_html,
        syn_html=syn_html,
        ant_html=ant_html,
        grammar=grammar,
        mistake_html=mistake_html,
        exam_tags=exam_tags,
        cefr=cefr,
        first_letter=first_letter,
        first_letter_upper=first_letter_upper
    )

def main():
    print("📖 Loading dictionary with UTF-8...")
    dict_data = load_dictionary()
    if not dict_data:
        print("❌ No dictionary data found.")
        return

    print(f"✅ Loaded {len(dict_data)} entries.")

    if dict_data:
        sample = dict_data[0]
        print(f"📝 Sample entry: {sample}")

    print("📝 Generating enhanced pages...")
    generated = 0
    skipped = 0

    for idx, word_data in enumerate(dict_data, 1):
        word = word_data.get('word', '')
        if not word:
            skipped += 1
            continue
        safe = safe_filename(word)
        if len(safe) < 1:
            safe = f"word_{idx}"
        file_path = OUTPUT_DIR / f"{safe}.html"
        html_content = generate_word_html(word_data)
        if html_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            generated += 1
        else:
            skipped += 1
        if generated % 500 == 0:
            print(f"   Generated {generated} pages...")

    print(f"\n✅ Done! Generated {generated} pages in '/word/' folder.")
    if skipped > 0:
        print(f"⚠️ Skipped {skipped} entries (missing word field or invalid format).")

if __name__ == "__main__":
    main()