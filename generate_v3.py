import json
import os
import re
from pathlib import Path
from string import Template

JSON_PATH = 'enriched-dictionary.json'
OUTPUT_DIR = 'word'
TEMPLATE_PATH = 'word-template.html'

BCS_WORDS = {'beautiful', 'education', 'environment', 'significant', 'economy', 'government', 'responsible', 'opportunity', 'achievement', 'knowledge', 'development', 'university', 'research', 'technology', 'innovation', 'sustainable', 'global', 'cultural', 'democracy', 'constitution', 'independence', 'sovereignty', 'integrity', 'solidarity', 'prosperity', 'heritage', 'diversity', 'equality', 'justice', 'liberty', 'freedom', 'rights', 'duties', 'citizenship'}
IELTS_WORDS = {'analyze', 'assess', 'consequence', 'consistent', 'contribute', 'demonstrate', 'establish', 'evaluate', 'identify', 'interpret', 'maintain', 'perceive', 'principle', 'significant', 'strategy', 'subsequent', 'sufficient', 'theoretical', 'variable', 'whereas', 'furthermore', 'nevertheless', 'conversely', 'accordingly', 'contemporary', 'inevitable', 'predominant'}

COMMON_MISTAKES = {
    'beautiful': '❌ beautifull ❌ beautyful ✅ beautiful',
    'education': '❌ educaton ❌ eduation ✅ education',
    'environment': '❌ enviroment ❌ enviornment ✅ environment',
    'government': '❌ goverment ❌ govenment ✅ government',
    'opportunity': '❌ oppurtunity ❌ oportunity ✅ opportunity',
}

print("📖 Loading dictionary...")
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    words_data = json.load(f)
Path(OUTPUT_DIR).mkdir(exist_ok=True)

print("📄 Loading template...")
with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
    html_template = Template(f.read())

def get_badge(word):
    badges = []
    if word.lower() in BCS_WORDS:
        badges.append('<span style="background: #1A3530; color: var(--gold); padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.7rem; border: 1px solid var(--gold);">🎯 BCS</span>')
    if word.lower() in IELTS_WORDS:
        badges.append('<span style="background: #1A3530; color: var(--teal); padding: 0.15rem 0.6rem; border-radius: 12px; font-size: 0.7rem; border: 1px solid var(--teal);">🌍 IELTS</span>')
    return ' '.join(badges)

def get_bangladeshi_usage(word):
    if word.lower() in BCS_WORDS:
        return '📘 Frequently appears in BCS, Bank Jobs, and University admission tests.'
    elif word.lower() in IELTS_WORDS:
        return '🌏 Commonly used in IELTS Writing and Speaking tasks.'
    else:
        return '📖 Essential for daily conversation and building a strong vocabulary.'

def get_comparatives(pos, word):
    if pos.lower() != 'adjective':
        return '', ''
    if len(word) <= 5 and not word.endswith('y'):
        return f'{word}er', f'{word}est'
    elif word.endswith('y'):
        base = word[:-1]
        return f'{base}ier', f'{base}iest'
    else:
        return f'more {word}', f'most {word}'

def get_grammar_link(pos):
    links = {
        'noun': ('📚 Grammar: Noun Rules', '/noun-rules-bangla.html'),
        'verb': ('📚 Grammar: Verb Rules', '/verb-rules-bangla.html'),
        'adjective': ('📚 Grammar: Adjective Rules', '/adjective-rules-bangla.html'),
        'adverb': ('📚 Grammar: Adverb Rules', '/adverb-rules-bangla.html'),
        'pronoun': ('📚 Grammar: Pronoun Rules', '/pronoun-rules-bangla.html'),
        'preposition': ('📚 Grammar: Preposition Rules', '/preposition-rules-bangla.html'),
        'conjunction': ('📚 Grammar: Conjunction Rules', '/conjunction-rules-bangla.html'),
        'interjection': ('📚 Grammar: Interjection Rules', '/interjection-rules-bangla.html')
    }
    return links.get(pos.lower(), None)

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
    base = {
        'make': ['make a decision', 'make a mistake', 'make a difference'],
        'do': ['do your best', 'do a favor', 'do business'],
        'take': ['take a break', 'take care', 'take responsibility'],
        'get': ['get started', 'get ready', 'get a job'],
        'have': ['have a good time', 'have a chance', 'have fun'],
        'break': ['break the ice', 'break a record', 'break a habit'],
        'run': ['run a business', 'run an errand', 'run out of time']
    }
    for key, colls in base.items():
        if word.startswith(key):
            return colls[:3]
    return ['daily use phrase', 'common expression', 'popular collocation']

def main():
    print(f"🚀 Generating V3 Learning Pages for {len(words_data)} words...")
    for idx, entry in enumerate(words_data):
        word = entry['english'].strip()
        filename = clean_word(word)
        pos = entry.get('part_of_speech', 'unknown').capitalize()
        definition = entry.get('definition', 'Meaning not available.')
        
        prev_word = words_data[idx - 1]['english'] if idx > 0 else words_data[-1]['english']
        next_word = words_data[idx + 1]['english'] if idx + 1 < len(words_data) else words_data[0]['english']
        prev_file = clean_word(prev_word)
        next_file = clean_word(next_word)
        prev_next_tags = f'<link rel="prev" href="https://ovidhan.net/word/{prev_file}.html" /><link rel="next" href="https://ovidhan.net/word/{next_file}.html" />'
        
        comp, sup = get_comparatives(pos, word)
        comparatives_html = ''
        if comp and sup:
            comparatives_html = f'''
            <div class="section">
                <h3>Comparative & Superlative</h3>
                <div class="section-content">
                    <span style="background: var(--surface2); padding: 0.2rem 1rem; border-radius: 12px; margin-right: 0.5rem;"><strong>Comparative:</strong> {comp}</span>
                    <span style="background: var(--surface2); padding: 0.2rem 1rem; border-radius: 12px;"><strong>Superlative:</strong> {sup}</span>
                </div>
            </div>
            '''
        
        badges = get_badge(word)
        bangladeshi_usage = get_bangladeshi_usage(word)
        bcs_stars = '★★★★★' if word.lower() in BCS_WORDS else '☆☆☆☆☆'
        ielts_stars = '★★★★★' if word.lower() in IELTS_WORDS else '☆☆☆☆☆'
        
        if len(word) < 5:
            cefr = 'A2 (Elementary)'
        elif len(word) < 8:
            cefr = 'B1 (Intermediate)'
        else:
            cefr = 'B2 (Upper-Intermediate)'
        
        common_mistake = COMMON_MISTAKES.get(word.lower(), 'No common mistakes reported yet. Stay tuned!')
        
        synonyms = entry.get('synonyms', [])
        antonyms = entry.get('antonyms', [])
        family = entry.get('word_family', [])
        collocations = generate_collocations(word.lower())
        
        synonyms_html = generate_tags(synonyms, 'Synonym')
        antonyms_html = generate_tags(antonyms, 'Antonym')
        family_html = generate_tags(family, 'Family')
        collocations_html = generate_tags(collocations, 'Collocation')
        
        grammar_link_result = get_grammar_link(pos)
        grammar_link = f'<a href="{grammar_link_result[1]}" class="internal-link">{grammar_link_result[0]}</a>' if grammar_link_result else ''
        
        html_content = html_template.substitute(
            word=word, filename=filename, bangla=entry.get('bangla', ''),
            example=entry.get('example', 'No example available.'),
            pronunciation=entry.get('pronunciation', 'Pronunciation coming soon'),
            pos=pos, definition=definition,
            synonyms_html=synonyms_html, antonyms_html=antonyms_html,
            family_html=family_html, collocations_html=collocations_html,
            badges=badges, grammar_link=grammar_link,
            prev_file=prev_file, prev_word=prev_word,
            next_file=next_file, next_word=next_word,
            prev_next=prev_next_tags,
            bangladeshi_usage=bangladeshi_usage,
            bcs_stars=bcs_stars, ielts_stars=ielts_stars,
            cefr=cefr, common_mistake=common_mistake,
            comparatives_section=comparatives_html
        )
        
        output_path = os.path.join(OUTPUT_DIR, f"{filename}.html")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        if (idx + 1) % 500 == 0:
            print(f"  ✅ Generated {idx + 1} pages...")
    
    print(f"🎉 Successfully generated {len(words_data)} V3 Learning Pages in '/{OUTPUT_DIR}/'")

if __name__ == '__main__':
    main()