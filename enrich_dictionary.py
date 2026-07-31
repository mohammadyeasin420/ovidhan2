import json
from pathlib import Path

# Load the dictionary and verb forms
with open('enriched-dictionary.json', 'r', encoding='utf-8') as f:
    dictionary = json.load(f)

with open('verb-forms.json', 'r', encoding='utf-8') as f:
    verb_forms_lookup = json.load(f)

# Load common mistakes from grammar rules (you can expand this)
common_mistakes_db = {
    "go": [{"wrong": "He go to school.", "right": "He goes to school.", "explanation_bn": "For He/She/It, add 's'."}],
    "run": [{"wrong": "He run fast.", "right": "He runs fast.", "explanation_bn": "Add 's' for third person singular."}],
    # ... add more as needed
}

collocations_db = {
    "global": ["global warming", "global economy", "global perspective"],
    "make": ["make a decision", "make a mistake", "make progress"],
    # ... extend from your existing collocation files or manually
}

# Enrich each entry
for entry in dictionary:
    word = entry.get('english') or entry.get('word')
    if not word:
        continue
    word_lower = word.lower()

    # Verb forms
    if word_lower in verb_forms_lookup:
        entry['verb_forms'] = verb_forms_lookup[word_lower]
    else:
        entry['verb_forms'] = {}

    # Collocations
    if word_lower in collocations_db:
        entry['collocations'] = collocations_db[word_lower]
    else:
        entry['collocations'] = []

    # Common mistakes
    if word_lower in common_mistakes_db:
        entry['common_mistakes'] = common_mistakes_db[word_lower]
    else:
        entry['common_mistakes'] = []

# Save the enriched dictionary
with open('enriched-dictionary.json', 'w', encoding='utf-8') as f:
    json.dump(dictionary, f, ensure_ascii=False, indent=2)

print("✅ Enriched dictionary with verb forms, collocations, and common mistakes.")