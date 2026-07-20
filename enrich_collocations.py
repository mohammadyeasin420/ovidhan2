import json
import nltk
from nltk.collocations import BigramCollocationFinder
from nltk.metrics import BigramAssocMeasures
from collections import defaultdict
import time

print("=" * 60)
print("📚 OVIDHAN – REAL COLLOCATION ENRICHMENT")
print("=" * 60)

# --- Step 1: Ensure NLTK Data is Available ---
print("📦 Checking NLTK data...")
try:
    nltk.data.find('corpora/brown')
    print("✅ Brown Corpus already downloaded.")
except LookupError:
    print("📥 Downloading Brown Corpus (this may take a minute)...")
    nltk.download('brown')
    nltk.download('punkt')

from nltk.corpus import brown

# --- Step 2: Load Your Dictionary ---
print("📖 Loading enriched-dictionary.json...")
with open('enriched-dictionary.json', 'r', encoding='utf-8') as f:
    dict_data = json.load(f)

word_set = {entry['english'].lower() for entry in dict_data}
print(f"✅ Loaded {len(word_set)} unique dictionary words.")

# --- Step 3: Process the Brown Corpus (only keep words from your dictionary) ---
print("📚 Scanning Brown Corpus for real collocations...")
all_words = []
total_sentences = len(brown.sents())
for i, sentence in enumerate(brown.sents()):
    # Progress indicator every 10,000 sentences
    if i % 10000 == 0:
        print(f"  Processing sentence {i}/{total_sentences}...")
    for word in sentence:
        lower_word = word.lower()
        if lower_word in word_set:
            all_words.append(lower_word)

print(f"✅ Collected {len(all_words)} relevant word tokens.")

# --- Step 4: Find Collocations (Statistically Significant Word Pairs) ---
print("🔍 Calculating collocations using Likelihood Ratio...")
finder = BigramCollocationFinder.from_words(all_words)
finder.apply_freq_filter(3)  # Only pairs appearing at least 3 times

bigram_measures = BigramAssocMeasures()
colloc_dict = defaultdict(list)

# Get the top scoring bigrams (limit to 10,000 to keep memory low)
scored = finder.score_ngrams(bigram_measures.likelihood_ratio)
print(f"   Found {len(scored)} candidate bigrams. Selecting top ones...")

for bigram, score in scored[:10000]:  # Limit to top 10,000 pairs
    w1, w2 = bigram
    if w1 in word_set and w2 in word_set:
        phrase = f"{w1} {w2}"
        # Assign to first word (max 5)
        if len(colloc_dict[w1]) < 5:
            colloc_dict[w1].append(phrase)
        # Assign to second word (max 5)
        if len(colloc_dict[w2]) < 5:
            colloc_dict[w2].append(phrase)

print(f"✅ Found real collocations for {len(colloc_dict)} unique words.")

# --- Step 5: Enrich Your Dictionary ---
print("✍️ Updating enriched-dictionary.json...")
updated_count = 0
for entry in dict_data:
    word = entry['english'].lower()
    if word in colloc_dict:
        entry['collocations'] = colloc_dict[word]
        updated_count += 1
    else:
        # If no real collocation found, keep a generic placeholder
        if 'collocations' not in entry or not entry['collocations']:
            entry['collocations'] = ["common phrase", "daily usage"]

print(f"✅ Enriched {updated_count} words with real collocations.")

# --- Step 6: Save the Updated Dictionary ---
with open('enriched-dictionary.json', 'w', encoding='utf-8') as f:
    json.dump(dict_data, f, ensure_ascii=False, indent=2)

print("=" * 60)
print("🎉 SUCCESS!")
print(f"   ✅ Updated {updated_count} words.")
print("   📁 saved to enriched-dictionary.json")
print("=" * 60)
print("🚀 NEXT STEP: Run 'python generate_v3.py' to rebuild your website pages.")