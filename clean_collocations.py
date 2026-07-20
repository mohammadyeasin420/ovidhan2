import json

print("📖 Loading enriched-dictionary.json...")
with open('enriched-dictionary.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("🧹 Cleaning dirty collocations...")
removed_count = 0
total_words = 0

for entry in data:
    collocs = entry.get('collocations', [])
    if not collocs:
        continue
    
    total_words += 1
    # Filter out bad collocations
    clean_collocs = []
    for c in collocs:
        words = c.split()
        # Remove if it's the same word repeated (e.g., "beautiful beautiful")
        if len(words) == 2 and words[0] == words[1]:
            removed_count += 1
            continue
        # Remove if it's just a single letter or a single word with no context
        if len(c) < 3:
            removed_count += 1
            continue
        clean_collocs.append(c)
    
    # If after cleaning we have nothing, use a default placeholder
    if clean_collocs:
        entry['collocations'] = clean_collocs
    else:
        # Keep at least one placeholder so it doesn't break the design
        entry['collocations'] = ["common usage"]

print(f"✅ Cleaned collocations for {total_words} words.")
print(f"🗑️ Removed {removed_count} garbage collocations.")

with open('enriched-dictionary.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("💾 Saved enriched-dictionary.json")
print("🚀 Next: Run 'python generate_v3.py' and deploy.")