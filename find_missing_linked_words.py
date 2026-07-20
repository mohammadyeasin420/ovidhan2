import json
from collections import defaultdict

# Load your dictionary
print("📖 Loading enriched-dictionary.json...")
with open('enriched-dictionary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Create a set of all words in your dictionary (lowercase for matching)
existing_words = {entry['english'].lower() for entry in data}
print(f"✅ Loaded {len(existing_words)} existing words.")

# Scan for missing linked words
missing_words = defaultdict(list)  # word -> list of places it appears

for entry in data:
    word = entry['english'].lower()
    
    # Check synonyms
    for syn in entry.get('synonyms', []):
        if syn.lower() not in existing_words:
            missing_words[syn.lower()].append(f"synonym of '{word}'")
    
    # Check antonyms
    for ant in entry.get('antonyms', []):
        if ant.lower() not in existing_words:
            missing_words[ant.lower()].append(f"antonym of '{word}'")
    
    # Check word family
    for fam in entry.get('word_family', []):
        if fam.lower() not in existing_words:
            missing_words[fam.lower()].append(f"word family of '{word}'")
    
    # Check collocations (these are phrases, not single words)
    for coll in entry.get('collocations', []):
        # Split collocation into individual words and check each
        for part in coll.split():
            # Skip common stopwords that don't need their own pages
            if part.lower() in ['a', 'an', 'the', 'of', 'for', 'to', 'with', 'on', 'at', 'from', 'by', 'in', 'without']:
                continue
            if part.lower() not in existing_words:
                missing_words[part.lower()].append(f"collocation '{coll}'")

# Separate real words from collocation phrases
real_missing = {}
collocation_phrases = []

for word, sources in missing_words.items():
    # If it appears as a collocation part AND as a synonym/antonym/family, it's a real missing word
    is_collocation_only = all('collocation' in s for s in sources)
    if is_collocation_only:
        collocation_phrases.append(word)
    else:
        real_missing[word] = sources

print(f"\n🔍 Found {len(missing_words)} total missing linked items.")
print(f"   - {len(real_missing)} are REAL words (synonyms, antonyms, word family)")
print(f"   - {len(collocation_phrases)} are collocation parts (should NOT be linked)")

# Save real missing words report
with open('real-missing-words.txt', 'w', encoding='utf-8') as f:
    f.write("=" * 60 + "\n")
    f.write("OVIDHAN - REAL MISSING WORDS (Add these to your dictionary)\n")
    f.write("=" * 60 + "\n\n")
    f.write(f"Total real missing words: {len(real_missing)}\n\n")
    
    for i, (word, sources) in enumerate(sorted(real_missing.items()), 1):
        f.write(f"{i}. {word}\n")
        f.write(f"   Appears as: {', '.join(sources)}\n\n")

# Save collocation phrases report
with open('collocation-phrases.txt', 'w', encoding='utf-8') as f:
    f.write("=" * 60 + "\n")
    f.write("OVIDHAN - COLLOCATION PHRASES (DO NOT link these as words)\n")
    f.write("=" * 60 + "\n\n")
    f.write(f"Total collocation parts: {len(collocation_phrases)}\n\n")
    
    for i, word in enumerate(sorted(collocation_phrases), 1):
        f.write(f"{i}. {word}\n")

print(f"\n📁 Reports saved:")
print(f"   - 'real-missing-words.txt' ({len(real_missing)} words to add)")
print(f"   - 'collocation-phrases.txt' ({len(collocation_phrases)} phrases to NOT link)")

# Show first 20 missing real words
print("\n🔍 First 20 REAL missing words:")
for word in list(sorted(real_missing.keys()))[:20]:
    print(f"  - {word}")