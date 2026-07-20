import json
from datetime import datetime

JSON_PATH = 'enriched-dictionary.json'
BACKUP_PATH = f'enriched-dictionary-backup-{datetime.now().strftime("%Y%m%d-%H%M%S")}.json'

# --- Teaching Notes Database ---
TEACHING_NOTES = {
    "affect": "প্রভাব ফেলা। মনে রাখবেন, 'affect' সাধারণত ক্রিয়া (verb) হিসেবে ব্যবহৃত হয় (যেমন: 'The rain affected the match'), আর 'effect' বিশেষ্য (noun) (যেমন: 'The rain had a bad effect')।",
    "effect": "প্রভাব বা ফলাফল। এটি সাধারণত বিশেষ্য (noun) হিসেবে ব্যবহৃত হয়। মনে রাখবেন: 'Affect' হলো কাজ, 'Effect' হলো সেই কাজের ফল।",
    "beautiful": "সুন্দর। এটি একটি Adjective (বিশেষণ)। এটি সাধারণত কোনো ব্যক্তি, স্থান, বা বস্তুর প্রশংসা করতে ব্যবহৃত হয়। যেমন: 'She has a beautiful smile' (তার একটি সুন্দর হাসি আছে)।",
    "education": "শিক্ষা। এটি একটি Noun (বিশেষ্য)। 'Education' শুধু স্কুল-কলেজে পড়া নয়, এটি জীবন জুড়ে শেখার প্রক্রিয়া। BCS এবং IELTS-এর জন্য অত্যন্ত গুরুত্বপূর্ণ একটি শব্দ।",
    "environment": "পরিবেশ। এটি একটি Noun (বিশেষ্য)। 'Environment' বলতে আমাদের চারপাশের প্রকৃতি, বাতাস, পানি, ও জীবজন্তু সবকিছুকে বোঝায়।",
    "government": "সরকার। এটি একটি Noun (বিশেষ্য)। 'Government' বলতে একটি দেশের শাসনকারী দল বা সংস্থাকে বোঝায়। BCS পরীক্ষায় এই শব্দটি প্রায়শই আসে।",
    "opportunity": "সুযোগ। এটি একটি Noun (বিশেষ্য)। মনে রাখবেন, আমরা সাধারণত বলি 'an opportunity' (একটি সুযোগ) বা 'opportunities' (একাধিক সুযোগ)।",
    "knowledge": "জ্ঞান। এটি একটি Noun (বিশেষ্য)। 'Knowledge' হলো কোনো বিষয়ে বোঝাপড়া বা অভিজ্ঞতা। এটি একটি uncountable noun।",
    "development": "উন্নয়ন। এটি একটি Noun (বিশেষ্য)। 'Develop' হলো ক্রিয়া (verb) রূপ। বাংলাদেশের প্রেক্ষাপটে 'Development' একটি অত্যন্ত গুরুত্বপূর্ণ শব্দ।",
    "university": "বিশ্ববিদ্যালয়। এটি একটি Noun (বিশেষ্য)। মনে রাখবেন: 'a university' (an নয়) কারণ এর উচ্চারণ 'ইউ' দিয়ে শুরু হয়।",
    "technology": "প্রযুক্তি। এটি একটি Noun (বিশেষ্য)। 'Technological' হলো এর Adjective রূপ।",
    "sustainable": "টেকসই। এটি একটি Adjective (বিশেষণ)। 'Sustainable development' একটি গুরুত্বপূর্ণ ধারণা।",
    "significant": "উল্লেখযোগ্য বা গুরুত্বপূর্ণ। এটি একটি Adjective (বিশেষণ)। IELTS-এ এই শব্দটি খুব ঘন ঘন ব্যবহৃত হয়।",
    "economy": "অর্থনীতি। এটি একটি Noun (বিশেষ্য)। একটি দেশের 'Economy' মানে তার উৎপাদন, বাণিজ্য ও অর্থের সামগ্রিক অবস্থা।",
    "responsible": "দায়িত্বশীল। এটি একটি Adjective (বিশেষণ)। BCS ও Bank Job পরীক্ষায় এটি অত্যন্ত গুরুত্বপূর্ণ।",
    "achievement": "অর্জন। এটি একটি Noun (বিশেষ্য)। 'Achieve' হলো এর ক্রিয়া (verb) রূপ।",
    "research": "গবেষণা। এটি একটি Noun (বিশেষ্য) অথবা Verb (ক্রিয়া) হতে পারে।",
    "innovation": "উদ্ভাবন বা নতুনত্ব। এটি একটি Noun (বিশেষ্য)। IELTS লেখায় এই শব্দটি খুবই কার্যকরী।",
    "cultural": "সাংস্কৃতিক। এটি একটি Adjective (বিশেষণ)। 'Culture' হলো এর Noun রূপ।",
    "democracy": "গণতন্ত্র। এটি একটি Noun (বিশেষ্য)। যে শাসনব্যবস্থায় জনগণ তাদের প্রতিনিধি নির্বাচন করে।",
    "independence": "স্বাধীনতা। এটি একটি Noun (বিশেষ্য)। 'Independent' হলো এর Adjective রূপ।",
    "justice": "ন্যায়বিচার। এটি একটি Noun (বিশেষ্য)।",
    "community": "সম্প্রদায় বা সমাজ। এটি একটি Noun (বিশেষ্য)।",
    "make": "বানানো বা তৈরি করা। মনে রাখবেন, আমরা বলি 'make a decision' (সিদ্ধান্ত নেওয়া), 'make a mistake' (ভুল করা), কিন্তু 'do homework' (হোমওয়ার্ক করা)।",
    "do": "করা। 'Make' এবং 'Do' এর পার্থক্য: 'Make' সাধারণত তৈরি করার জন্য, 'Do' সাধারণত কাজ বা অ্যাকশনের জন্য।",
    "take": "নেওয়া। যেমন: 'Take a break' (বিরতি নেওয়া), 'Take care' (যত্ন নেওয়া)।",
    "get": "পাওয়া বা অর্জন করা। যেমন: 'Get a job' (চাকরি পাওয়া), 'Get ready' (প্রস্তুত হওয়া)।",
    "have": "থাকা বা পাওয়া। যেমন: 'Have breakfast' (সকালের নাস্তা করা), 'Have a good time' (ভালো সময় কাটানো)।",
    "say": "বলা (কথা বলা)। যেমন: 'He said hello' (সে হ্যালো বলল)।",
    "tell": "বলা বা জানানো। যেমন: 'Tell me the truth' (আমাকে সত্যি বলো)।",
    "think": "মনে করা বা চিন্তা করা। যেমন: 'I think you are right' (আমি মনে করি আপনি ঠিক)।",
    "know": "জানা। যেমন: 'I know the answer' (আমি উত্তর জানি)।",
    "good": "ভালো। 'Good' মানে সন্তোষজনক বা মানসম্মত। মনে রাখবেন, 'Well' সাধারণত Adverb, কিন্তু অসুস্থতার প্রসঙ্গে 'Well' মানে 'সুস্থ' হতে পারে।",
    "happy": "খুশি। 'Happy' মানে আনন্দিত। 'Happiness' হলো এর Noun রূপ।",
    "big": "বড়। আকার, পরিমাণ বা গুরুত্ব বোঝাতে 'Big' ব্যবহার করা হয়।",
    "small": "ছোট। 'Big' এর বিপরীত।",
    "important": "গুরুত্বপূর্ণ। 'Importance' হলো এর Noun রূপ।"
}

print("📖 Loading enriched-dictionary.json...")
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"✅ Loaded {len(data)} entries.")
print(f"📦 Creating backup: {BACKUP_PATH}")
with open(BACKUP_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✍️ Adding bn_teaching_note field...")
updated_count = 0
for entry in data:
    word = entry.get('english', '').lower()
    default_note = "📘 এই শব্দটির ব্যবহার ও অর্থ সম্পর্কে বিস্তারিত শিখতে আমাদের সাথে থাকুন। আমরা শীঘ্রই এই শব্দটির জন্য একটি সহজ ও কার্যকরী শিক্ষা নোট যোগ করবো।"
    
    if 'bn_teaching_note' not in entry:
        entry['bn_teaching_note'] = TEACHING_NOTES.get(word, default_note)
        updated_count += 1

print(f"✅ Added teaching notes to {updated_count} entries.")

print("💾 Saving enriched-dictionary.json...")
with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("=" * 60)
print("🎉 SUCCESS!")
print(f"   ✅ Updated {updated_count} words.")
print("   📁 saved to enriched-dictionary.json")
print("=" * 60)
print("🚀 NEXT STEP: Run 'python generate_v3.py' to rebuild your website pages.")