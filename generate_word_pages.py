import json
import os

# Load the dictionary (which is a list of word entries)
with open('enriched-dictionary.json', 'r', encoding='utf-8') as f:
    dictionary_data = json.load(f)

# Template for each word page
template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{word} – Ovidhan Learning Explorer</title>
    <meta name="description" content="Learn the meaning of '{word}' in Bangla, with pronunciation, examples, and related words.">
    <link rel="stylesheet" href="../styles.css">
    <link rel="canonical" href="https://ovidhan.net/word/{word}.html">
</head>
<body>
    <!-- Header will be injected later -->
    <div class="explorer-container" style="padding:2rem;">
        <h1>🔍 Learning Explorer</h1>
        <div class="search-box">
            <input type="text" id="wordInput" placeholder="Type a word..." value="{word}">
            <button onclick="searchWord()" class="btn-primary">Search</button>
        </div>
        <div id="resultArea"></div>
    </div>
    <!-- Footer will be injected later -->
    <script src="../learning-explorer.js"></script>
</body>
</html>"""

os.makedirs('word', exist_ok=True)

# Iterate over each word entry
for entry in dictionary_data:
    # Try to find the word field (common keys: 'english', 'word', 'en')
    word = entry.get('english') or entry.get('word') or entry.get('en')
    if not word:
        continue  # skip entries without a word
    # Ensure the word is a simple string (no spaces or punctuation)
    word_clean = word.strip().lower().replace(' ', '-')
    if not word_clean.isalnum() and '-' not in word_clean:
        # If it contains special characters, skip
        continue
    filepath = os.path.join('word', f'{word_clean}.html')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(template.format(word=word_clean))
    print(f"✅ Generated: {filepath}")