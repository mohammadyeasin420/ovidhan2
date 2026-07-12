import json
import os
import re
from pathlib import Path

# --- Configuration ---
JSON_PATH = 'enriched-dictionary.json'
OUTPUT_DIR = 'word'

# --- Curated Lists for SEO Tags & Internal Links ---
BCS_WORDS = {'beautiful', 'education', 'environment', 'significant', 'economy', 'government', 'responsible', 'opportunity', 'achievement', 'knowledge', 'development', 'university', 'research', 'technology', 'innovation', 'sustainable', 'global', 'cultural', 'democracy', 'constitution', 'independence', 'sovereignty', 'integrity', 'solidarity', 'prosperity', 'heritage', 'diversity', 'equality', 'justice', 'liberty', 'freedom', 'rights', 'duties', 'citizenship'}
IELTS_WORDS = {'analyze', 'assess', 'consequence', 'consistent', 'contribute', 'demonstrate', 'establish', 'evaluate', 'identify', 'interpret', 'maintain', 'perceive', 'principle', 'significant', 'strategy', 'subsequent', 'sufficient', 'theoretical', 'variable', 'whereas', 'furthermore', 'nevertheless', 'conversely', 'accordingly', 'contemporary', 'inevitable', 'predominant'}

# --- Load Dictionary ---
print("📖 Loading dictionary...")
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    words_data = json.load(f)

Path(OUTPUT_DIR).mkdir(exist_ok=True)

# --- Internal Link Helpers ---
def get_grammar_link(pos):
    """Return a link to the relevant grammar article based on Part of Speech."""
    links = {
        'noun': ('📚 Grammar: Noun Rules', '/grammar/noun-rules-bangla.html'),
        'verb': ('📚 Grammar: Verb Rules', '/grammar/verb-rules-bangla.html'),
        'adjective': ('📚 Grammar: Adjective Rules', '/grammar/adjective-rules-bangla.html'),
        'adverb': ('📚 Grammar: Adverb Rules', '/grammar/adverb-rules-bangla.html'),
        'pronoun': ('📚 Grammar: Pronoun Rules', '/grammar/pronoun-rules-bangla.html'),
        'preposition': ('📚 Grammar: Preposition Rules', '/grammar/preposition-rules-bangla.html'),
        'conjunction': ('📚 Grammar: Conjunction Rules', '/grammar/conjunction-rules-bangla.html'),
        'interjection': ('📚 Grammar: Interjection Rules', '/grammar/interjection-rules-bangla.html')
    }
    return links.get(pos.lower(), None)

def get_badge(word):
    """Return BCS/IELTS badges as HTML spans."""
    badges = []
    if word.lower() in BCS_WORDS:
        badges.append('<span style="background: #1A3530; color: var(--gold); padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.7rem; border: 1px solid var(--gold);">🎯 BCS</span>')
    if word.lower() in IELTS_WORDS:
        badges.append('<span style="background: #1A3530; color: var(--teal); padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.7rem; border: 1px solid var(--teal);">🌍 IELTS</span>')
    return ' '.join(badges)

# --- HTML Template ---
HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{word} - Meaning in Bengali with Synonyms, Antonyms & Definition | Ovidhan</title>
    <meta name="description" content="{word} meaning in Bengali: {bangla}. Definition: {definition}. Synonyms, Antonyms, and usage examples to improve your vocabulary." />
    <link rel="canonical" href="https://ovidhan.net/word/{filename}.html" />

    <!-- Open Graph -->
    <meta property="og:title" content="{word} - English to Bangla Dictionary" />
    <meta property="og:description" content="{bangla} - {definition}" />
    <meta property="og:url" content="https://ovidhan.net/word/{filename}.html" />

    <!-- SCHEMA: BreadcrumbList -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://ovidhan.net/"}},
        {{"@type": "ListItem", "position": 2, "name": "Dictionary", "item": "https://ovidhan.net/dictionary.html"}},
        {{"@type": "ListItem", "position": 3, "name": "{word}", "item": "https://ovidhan.net/word/{filename}.html"}}
      ]
    }}
    </script>

    <!-- SCHEMA: DefinedTerm -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "name": "{word}",
      "description": "{definition}",
      "inDefinedTermSet": {{
        "@type": "DefinedTermSet",
        "name": "English to Bangla Dictionary",
        "url": "https://ovidhan.net/dictionary.html"
      }}
    }}
    </script>

    <!-- Fonts & Theme -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <style>
        /* --- Base Styles (Matches your theme) --- */
        .container {{ max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; }}
        .badge-group {{ margin: 0.5rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap; }}
        .word-header {{ display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.5rem; }}
        .word-title {{ font-size: 2.8rem; font-weight: 700; color: var(--text); margin-bottom: 0.25rem; }}
        .word-meta {{ display: flex; flex-wrap: wrap; gap: 0.75rem 1.5rem; color: var(--text-mid); font-size: 0.95rem; }}
        .word-meta span {{ background: var(--surface2); padding: 0.2rem 0.8rem; border-radius: 20px; border: 1px solid var(--border); }}
        .section {{ margin-top: 1.75rem; }}
        .section h3 {{ font-size: 1.1rem; font-weight: 600; color: var(--gold); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }}
        .section h3::before {{ content: "▸"; color: var(--teal); }}
        .section-content {{ color: var(--text-mid); line-height: 1.7; padding-left: 1.2rem; border-left: 2px solid var(--border); }}
        .tag-group {{ display: flex; flex-wrap: wrap; gap: 0.5rem; }}
        .tag {{ background: var(--gold-dim); color: var(--gold); padding: 0.2rem 0.8rem; border-radius: 16px; font-size: 0.85rem; border: 1px solid rgba(230,184,74,0.2); text-decoration: none; transition: 0.2s; }}
        .tag:hover {{ background: var(--gold); color: var(--bg); }}
        .internal-link {{ display: inline-block; background: var(--surface2); color: var(--teal); padding: 0.3rem 1rem; border-radius: 16px; font-size: 0.85rem; border: 1px solid var(--border); text-decoration: none; transition: 0.2s; }}
        .internal-link:hover {{ background: var(--teal); color: var(--bg); border-color: var(--teal); }}
        .save-btn {{ margin-top: 2rem; padding: 0.7rem 1.8rem; background: var(--teal); color: var(--bg); border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer; transition: 0.2s; }}
        .save-btn:hover {{ opacity: 0.8; transform: scale(0.98); }}
        .footer-links {{ margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 1.5rem; }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Navigation -->
        <nav style="margin-bottom: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="/" style="color: var(--gold); text-decoration: none; font-weight: 600;">🏠 Home</a>
            <a href="/dictionary.html" style="color: var(--text-mid); text-decoration: none;">📖 Dictionary</a>
            <a href="/explorer.html" style="color: var(--text-mid); text-decoration: none;">🔍 Smart Search</a>
        </nav>

        <!-- Word Content -->
        <article>
            <div class="badge-group">{badges}</div>
            <div class="word-header">
                <h1 class="word-title">{word}</h1>
                <div class="word-meta">
                    <span>🔊 {pronunciation}</span>
                    <span>📌 {pos}</span>
                    <span>📝 <span style="font-family: var(--font-bn);">{bangla}</span></span>
                </div>
            </div>

            <!-- Definition -->
            <div class="section">
                <h3>Definition</h3>
                <div class="section-content">{definition}</div>
            </div>

            <!-- Example -->
            <div class="section">
                <h3>Example</h3>
                <div class="section-content">"{example}"</div>
            </div>

            <!-- Collocations -->
            <div class="section">
                <h3>Collocations (Common Phrases)</h3>
                <div class="section-content">
                    <div class="tag-group">{collocations_html}</div>
                </div>
            </div>

            <!-- Synonyms -->
            <div class="section">
                <h3>Synonyms</h3>
                <div class="section-content">
                    <div class="tag-group">{synonyms_html}</div>
                </div>
            </div>

            <!-- Antonyms -->
            <div class="section">
                <h3>Antonyms</h3>
                <div class="section-content">
                    <div class="tag-group">{antonyms_html}</div>
                </div>
            </div>

            <!-- Word Family -->
            <div class="section">
                <h3>Word Family</h3>
                <div class="section-content">
                    <div class="tag-group">{family_html}</div>
                </div>
            </div>

            <!-- Internal Linking: Related Grammar -->
            <div class="section">
                <h3>📚 Learn More</h3>
                <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
                    {grammar_link}
                    <a href="/tools/plural-maker.html" class="internal-link">🛠️ Plural Maker</a>
                    <a href="/verb-forms.html" class="internal-link">📝 Verb Forms</a>
                    <a href="/sentence-analyzer.html" class="internal-link">🔍 Sentence Analyzer</a>
                </div>
            </div>

            <!-- Learning Path -->
            <div style="margin-top: 2rem; padding: 1.5rem; background: var(--surface2); border-radius: var(--radius); border-left: 4px solid var(--gold);">
                <strong>🚀 Want to master vocabulary?</strong>
                <p style="color: var(--text-mid); margin: 0.5rem 0;">Start your learning journey with our structured paths:</p>
                <a href="/learning-path-beginners.html" class="internal-link">Beginner Path</a>
                <a href="/learning-path-bcs.html" class="internal-link">BCS Path</a>
                <a href="/learning-path-ielts.html" class="internal-link">IELTS Path</a>
            </div>

            <!-- Save Button -->
            <button class="save-btn" onclick="saveWord('{word}')">💾 Save this word</button>
        </article>

        <footer class="footer-links">
            <span style="color: var(--text-soft);">Ovidhan - English to Bangla Dictionary</span>
            <a href="/" style="color: var(--text-soft); text-decoration: none;">Home</a>
            <a href="/dictionary.html" style="color: var(--text-soft); text-decoration: none;">Dictionary</a>
            <a href="/tools.html" style="color: var(--text-soft); text-decoration: none;">Tools</a>
        </footer>
    </div>

    <script>
        function saveWord(word) {{
            let saved = JSON.parse(localStorage.getItem('savedWords') || '[]');
            if (!saved.includes(word)) {{
                saved.push(word);
                localStorage.setItem('savedWords', JSON.stringify(saved));
                alert('✅ "' + word + '" saved to your vocabulary list!');
            }} else {{
                alert('⚠️ "' + word + '" is already saved.');
            }}
        }}
    </script>
    <script src="/global.js"></script>
    <script src="/recommendations.js"></script>
</body>
</html>'''

# --- Helper Functions ---
def clean_word(word):
    clean = re.sub(r'[^a-zA-Z0-9\s-]', '', word).strip().lower()
    return clean.replace(' ', '-')

def generate_tags(items, label):
    if not items:
        return '<span style="color: var(--text-soft);">None found</span>'
    html = ''
    for item in items[:15]:
        link = f'/word/{clean_word(item)}.html'
        html += f'<a href="{link}" class="tag">{item}</a>'
    return html

def generate_collocations(word):
    """Generate dummy collocations for demo. In production, load from a real file."""
    base = {
        'make': ['make a decision', 'make a mistake', 'make a difference', 'make an effort'],
        'do': ['do your best', 'do a favor', 'do the dishes', 'do business'],
        'take': ['take a break', 'take a look', 'take care', 'take responsibility'],
        'get': ['get started', 'get ready', 'get married', 'get a job'],
        'have': ['have a good time', 'have a problem', 'have a chance', 'have fun'],
        'break': ['break the ice', 'break a record', 'break the law', 'break a habit'],
        'run': ['run a business', 'run an errand', 'run out of time', 'run for office']
    }
    # Try to find a matching base word
    for key, colls in base.items():
        if word.startswith(key):
            return colls[:3]
    # Return default
    return ['daily use phrase', 'common expression', 'popular collocation']

# --- Main Generator ---
def main():
    print(f"🚀 Generating Knowledge Graph Word Pages for {len(words_data)} words...")
    
    for idx, entry in enumerate(words_data):
        word = entry['english'].strip()
        filename = clean_word(word)
        
        # Extract data
        bangla = entry.get('bangla', '')
        example = entry.get('example', 'No example available.')
        pronunciation = entry.get('pronunciation', 'Pronunciation coming soon')
        pos = entry.get('part_of_speech', 'unknown').capitalize()
        definition = entry.get('definition', 'Meaning not available.')
        synonyms = entry.get('synonyms', [])
        antonyms = entry.get('antonyms', [])
        family = entry.get('word_family', [])
        
        # Generate SEO Badges
        badges = get_badge(word)
        
        # Generate Collocations
        collocations = generate_collocations(word.lower())
        collocations_html = generate_tags(collocations, 'Collocation')
        
        # Generate HTML for lists
        synonyms_html = generate_tags(synonyms, 'Synonym')
        antonyms_html = generate_tags(antonyms, 'Antonym')
        family_html = generate_tags(family, 'Family')
        
        # Internal Grammar Link
        grammar_link_result = get_grammar_link(pos)
        if grammar_link_result:
            grammar_link = f'<a href="{grammar_link_result[1]}" class="internal-link">{grammar_link_result[0]}</a>'
        else:
            grammar_link = ''
        
        # Fill template
        html_content = HTML_TEMPLATE.format(
            word=word,
            filename=filename,
            bangla=bangla,
            example=example,
            pronunciation=pronunciation,
            pos=pos,
            definition=definition,
            synonyms_html=synonyms_html,
            antonyms_html=antonyms_html,
            family_html=family_html,
            collocations_html=collocations_html,
            badges=badges,
            grammar_link=grammar_link
        )
        
        # Write file
        output_path = os.path.join(OUTPUT_DIR, f"{filename}.html")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        if (idx + 1) % 500 == 0:
            print(f"  ✅ Generated {idx + 1} pages...")
    
    print(f"🎉 Successfully generated {len(words_data)} Knowledge Graph pages in '/{OUTPUT_DIR}/'")

if __name__ == '__main__':
    main()