import json

# ─── CURATED REAL VERBS ────────────────────────────────────────

VERBS = [
    "accept", "achieve", "admire", "adopt", "advance", "advise", "afford", "agree", "allow", "apply",
    "appreciate", "approve", "arrange", "arrive", "assist", "assume", "attempt", "attend", "avoid",
    "base", "believe", "belong", "benefit", "borrow", "bother", "breathe", "bring", "build", "burn",
    "buy", "calculate", "call", "cancel", "capture", "carry", "catch", "cause", "challenge", "change",
    "charge", "cheat", "check", "choose", "claim", "clean", "clear", "climb", "close", "collect",
    "combine", "command", "comment", "commit", "communicate", "compare", "compete", "complain", "complete", "concentrate",
    "confirm", "confuse", "connect", "consider", "consist", "contact", "contain", "continue", "contribute", "control",
    "convince", "count", "cover", "create", "cross", "cry", "cut", "damage", "dance", "deal",
    "decide", "declare", "decline", "decrease", "defend", "define", "deliver", "demand", "deny",
    "depend", "derive", "describe", "deserve", "destroy", "determine", "develop", "devote", "direct", "discuss",
    "distinguish", "distribute", "divide", "doubt", "draft", "drag", "draw", "dream", "dress", "drink",
    "drive", "drop", "eat", "eliminate", "emerge", "emphasize", "employ", "enable", "encounter", "encourage",
    "engage", "establish", "estimate", "evaluate", "examine", "exceed", "exchange", "exclude", "execute", "exist",
    "expand", "experience", "explain", "explore", "express", "extend", "extract", "face", "facilitate", "fail",
    "fill", "finance", "find", "finish", "fix", "flow", "focus", "follow", "force",
    "form", "frame", "free", "fulfil", "function", "gain", "gather", "generate", "grant",
    "grasp", "grow", "handle", "hang", "happen", "harm", "help", "hire", "hold", "house",
    "identify", "ignore", "imagine", "implement", "implicate", "impose", "improve", "include", "increase", "indicate",
    "influence", "inform", "initiate", "inspect", "install", "instruct", "integrate", "intend", "interest", "interview",
    "introduce", "invest", "investigate", "involve", "isolate", "join", "judge", "justify", "keep", "kick",
    "kill", "knock", "label", "lack", "laugh", "launch", "lay", "lead", "lean", "leap",
    "learn", "leave", "lend", "let", "level", "license", "lift", "light", "limit", "list",
    "listen", "live", "locate", "lock", "look", "lose", "love", "manage", "mark", "match",
    "mean", "measure", "meet", "mention", "mind", "miss", "mix", "move", "multiply", "name",
    "negotiate", "notice", "number", "observe", "obtain", "occupy", "offer", "open", "operate", "oppose",
    "order", "organize", "overcome", "paint", "participate", "pass", "pause", "perform", "persist", "persuade",
    "place", "plan", "play", "point", "pose", "position", "possess", "postpone", "practise", "preserve",
    "press", "prevent", "prioritize", "process", "produce", "program", "progress", "prohibit", "promise", "promote",
    "propose", "protect", "prove", "provide", "publish", "purchase", "pursue", "qualify", "question", "quit",
    "range", "rank", "rate", "reach", "realize", "receive", "recognize", "recommend", "record", "reduce",
    "refer", "reflect", "refuse", "regulate", "reinforce", "reject", "release", "rely", "remain", "remember",
    "remind", "remove", "render", "replace", "report", "represent", "reproduce", "request", "require", "resolve",
    "respect", "respond", "restore", "restrict", "retain", "reveal", "reverse", "review", "revise", "revolt",
    "risk", "role", "save", "schedule", "secure", "select", "sell", "send", "separate", "share",
    "shift", "shoot", "show", "shut", "signal", "simplify", "skip", "solve", "sort", "sound",
    "specify", "spend", "spread", "stand", "start", "state", "stay", "stimulate", "stop", "store",
    "stress", "stretch", "structure", "study", "submit", "succeed", "suggest", "summarize", "supply", "support",
    "suppose", "survive", "suspend", "switch", "target", "taste", "terminate", "test", "tie", "tolerate",
    "transfer", "transform", "treat", "undertake", "unify", "unite", "update", "urge", "use", "utilize",
    "validate", "vary", "verify", "view", "violate", "visit", "visualize", "vote", "wait", "walk",
    "waste", "watch", "weigh", "widen", "win", "wind", "wish", "wonder", "worry", "write"
]

# ─── IRREGULAR VERBS ─────────────────────────────────────────

IRREGULAR = {
    "arise": ["arose", "arisen"], "awake": ["awoke", "awoken"], "be": ["was/were", "been"],
    "bear": ["bore", "borne"], "beat": ["beat", "beaten"], "become": ["became", "become"],
    "begin": ["began", "begun"], "bend": ["bent", "bent"], "bet": ["bet", "bet"],
    "bind": ["bound", "bound"], "bite": ["bit", "bitten"], "bleed": ["bled", "bled"],
    "blow": ["blew", "blown"], "break": ["broke", "broken"], "bring": ["brought", "brought"],
    "build": ["built", "built"], "burn": ["burnt/burned", "burnt/burned"], "burst": ["burst", "burst"],
    "buy": ["bought", "bought"], "cast": ["cast", "cast"], "catch": ["caught", "caught"],
    "choose": ["chose", "chosen"], "cling": ["clung", "clung"], "come": ["came", "come"],
    "cost": ["cost", "cost"], "creep": ["crept", "crept"], "cut": ["cut", "cut"],
    "deal": ["dealt", "dealt"], "dig": ["dug", "dug"], "do": ["did", "done"],
    "draw": ["drew", "drawn"], "dream": ["dreamt/dreamed", "dreamt/dreamed"],
    "drink": ["drank", "drunk"], "drive": ["drove", "driven"], "eat": ["ate", "eaten"],
    "fall": ["fell", "fallen"], "feed": ["fed", "fed"], "feel": ["felt", "felt"],
    "fight": ["fought", "fought"], "find": ["found", "found"], "flee": ["fled", "fled"],
    "fling": ["flung", "flung"], "fly": ["flew", "flown"], "forbid": ["forbade", "forbidden"],
    "forget": ["forgot", "forgotten"], "forgive": ["forgave", "forgiven"], "freeze": ["froze", "frozen"],
    "get": ["got", "got/gotten"], "give": ["gave", "given"], "go": ["went", "gone"],
    "grow": ["grew", "grown"], "hang": ["hung", "hung"], "have": ["had", "had"],
    "hear": ["heard", "heard"], "hide": ["hid", "hidden"], "hit": ["hit", "hit"],
    "hold": ["held", "held"], "hurt": ["hurt", "hurt"], "keep": ["kept", "kept"],
    "know": ["knew", "known"], "lay": ["laid", "laid"], "lead": ["led", "led"],
    "leave": ["left", "left"], "lend": ["lent", "lent"], "let": ["let", "let"],
    "lie": ["lay", "lain"], "lose": ["lost", "lost"], "make": ["made", "made"],
    "mean": ["meant", "meant"], "meet": ["met", "met"], "pay": ["paid", "paid"],
    "put": ["put", "put"], "read": ["read", "read"], "ride": ["rode", "ridden"],
    "ring": ["rang", "rung"], "rise": ["rose", "risen"], "run": ["ran", "run"],
    "say": ["said", "said"], "see": ["saw", "seen"], "seek": ["sought", "sought"],
    "sell": ["sold", "sold"], "send": ["sent", "sent"], "set": ["set", "set"],
    "shake": ["shook", "shaken"], "shine": ["shone", "shone"], "shoot": ["shot", "shot"],
    "show": ["showed", "shown/showed"], "shut": ["shut", "shut"], "sing": ["sang", "sung"],
    "sink": ["sank", "sunk"], "sit": ["sat", "sat"], "sleep": ["slept", "slept"],
    "slide": ["slid", "slid"], "speak": ["spoke", "spoken"], "spend": ["spent", "spent"],
    "spread": ["spread", "spread"], "spring": ["sprang", "sprung"], "stand": ["stood", "stood"],
    "steal": ["stole", "stolen"], "stick": ["stuck", "stuck"], "sting": ["stung", "stung"],
    "strike": ["struck", "struck/stricken"], "swear": ["swore", "sworn"], "sweep": ["swept", "swept"],
    "swim": ["swam", "swum"], "take": ["took", "taken"], "teach": ["taught", "taught"],
    "tear": ["tore", "torn"], "tell": ["told", "told"], "think": ["thought", "thought"],
    "throw": ["threw", "thrown"], "understand": ["understood", "understood"],
    "wake": ["woke", "woken"], "wear": ["wore", "worn"], "weave": ["wove", "woven"],
    "win": ["won", "won"], "write": ["wrote", "written"]
}

# ─── BANGLA MEANINGS ─────────────────────────────────────────

BANGLA_MEANINGS = {
    "accept": "গ্রহণ করা", "achieve": "অর্জন করা", "admire": "প্রশংসা করা", "adopt": "গ্রহণ করা",
    "advance": "অগ্রসর হওয়া", "advise": "উপদেশ দেওয়া", "afford": "সামর্থ্য থাকা", "agree": "সম্মত হওয়া",
    "allow": "অনুমতি দেওয়া", "apply": "প্রয়োগ করা", "appreciate": "মূল্যায়ন করা", "approve": "অনুমোদন করা",
    "arrange": "সাজানো", "arrive": "পৌঁছানো", "assist": "সাহায্য করা", "assume": "ধরে নেওয়া",
    "attempt": "চেষ্টা করা", "attend": "উপস্থিত থাকা", "avoid": "এড়িয়ে যাওয়া", "base": "ভিত্তি করা",
    "believe": "বিশ্বাস করা", "belong": "অন্তর্ভুক্ত হওয়া", "benefit": "উপকার হওয়া", "borrow": "ধার করা",
    "bother": "বিরক্ত করা", "breathe": "শ্বাস নেওয়া", "bring": "আনা", "build": "নির্মাণ করা",
    "burn": "পোড়ানো", "buy": "কেনা", "calculate": "গণনা করা", "call": "ডাকা",
    "cancel": "বাতিল করা", "capture": "বন্দী করা", "carry": "বহন করা", "catch": "ধরা",
    "cause": "কারণ হওয়া", "challenge": "চ্যালেঞ্জ করা", "change": "পরিবর্তন করা", "charge": "চার্জ করা",
    "cheat": "প্রতারণা করা", "check": "পরীক্ষা করা", "choose": "বেছে নেওয়া", "claim": "দাবি করা",
    "clean": "পরিষ্কার করা", "clear": "পরিষ্কার হওয়া", "climb": "আরোহণ করা", "close": "বন্ধ করা",
    "collect": "সংগ্রহ করা", "combine": "একত্রিত করা", "command": "আদেশ দেওয়া", "comment": "মন্তব্য করা",
    "commit": "প্রতিশ্রুতিবদ্ধ হওয়া", "communicate": "যোগাযোগ করা", "compare": "তুলনা করা",
    "compete": "প্রতিযোগিতা করা", "complain": "অভিযোগ করা", "complete": "সম্পূর্ণ করা",
    "concentrate": "মনোযোগ দেওয়া", "confirm": "নিশ্চিত করা", "confuse": "বিভ্রান্ত করা",
    "connect": "সংযোগ করা", "consider": "বিবেচনা করা", "consist": "গঠিত হওয়া", "contact": "যোগাযোগ করা",
    "contain": "ধারণ করা", "continue": "চালিয়ে যাওয়া", "contribute": "অবদান রাখা",
    "control": "নিয়ন্ত্রণ করা", "convince": "বিশ্বাস করানো", "count": "গণনা করা",
    "cover": "ঢেকে দেওয়া", "create": "সৃষ্টি করা", "cross": "অতিক্রম করা", "cry": "কান্না করা",
    "cut": "কাটা", "damage": "ক্ষতি করা", "dance": "নাচা", "deal": "মোকাবেলা করা",
    "decide": "সিদ্ধান্ত নেওয়া", "declare": "ঘোষণা করা", "decline": "প্রত্যাখ্যান করা",
    "decrease": "কমানো", "defend": "রক্ষা করা", "define": "সংজ্ঞায়িত করা",
    "deliver": "বিতরণ করা", "demand": "দাবি করা", "deny": "অস্বীকার করা",
    "depend": "নির্ভর করা", "derive": "উদ্ভূত হওয়া", "describe": "বর্ণনা করা",
    "deserve": "প্রাপ্য হওয়া", "destroy": "ধ্বংস করা", "determine": "নির্ধারণ করা",
    "develop": "উন্নয়ন করা", "devote": "উৎসর্গ করা", "direct": "নির্দেশ দেওয়া",
    "discuss": "আলোচনা করা", "distinguish": "পার্থক্য করা", "distribute": "বিতরণ করা",
    "divide": "বিভক্ত করা", "doubt": "সন্দেহ করা", "draft": "খসড়া করা",
    "drag": "টেনে আনা", "draw": "আঁকা", "dream": "স্বপ্ন দেখা", "dress": "পোশাক পরা",
    "drink": "পান করা", "drive": "চালানো", "drop": "ফেলা", "eat": "খাওয়া",
    "eliminate": "দূর করা", "emerge": "উদিত হওয়া", "emphasize": "জোর দেওয়া",
    "employ": "নিয়োগ করা", "enable": "সক্ষম করা", "encounter": "সম্মুখীন হওয়া",
    "encourage": "উৎসাহিত করা", "engage": "নিযুক্ত হওয়া", "establish": "প্রতিষ্ঠা করা",
    "estimate": "আনুমানিক করা", "evaluate": "মূল্যায়ন করা", "examine": "পরীক্ষা করা",
    "exceed": "অতিক্রম করা", "exchange": "বিনিময় করা", "exclude": "বাদ দেওয়া",
    "execute": "সম্পাদন করা", "exist": "অস্তিত্ব থাকা", "expand": "প্রসারিত করা",
    "experience": "অভিজ্ঞতা", "explain": "ব্যাখ্যা করা", "explore": "অন্বেষণ করা",
    "express": "প্রকাশ করা", "extend": "প্রসারিত করা", "extract": "উদ্ধার করা",
    "face": "মোকাবেলা করা", "facilitate": "সহজ করা", "fail": "ব্যর্থ হওয়া",
    "fill": "পূরণ করা", "finance": "অর্থায়ন করা", "finish": "শেষ করা",
    "fix": "মেরামত করা", "flow": "প্রবাহিত হওয়া", "focus": "কেন্দ্রীভূত করা",
    "follow": "অনুসরণ করা", "force": "বাধ্য করা", "form": "গঠন করা",
    "frame": "কাঠামো তৈরি করা", "free": "মুক্ত করা", "fulfil": "পূর্ণ করা",
    "function": "কাজ করা", "gain": "অর্জন করা", "gather": "জড়ো করা",
    "generate": "উৎপন্ন করা", "grant": "অনুদান দেওয়া", "grasp": "আঁকড়ে ধরা",
    "grow": "বাড়তে থাকা", "handle": "পরিচালনা করা", "hang": "ঝোলানো",
    "happen": "ঘটা", "harm": "ক্ষতি করা", "help": "সাহায্য করা",
    "hire": "নিয়োগ করা", "hold": "ধরা", "house": "আশ্রয় দেওয়া",
    "identify": "শনাক্ত করা", "ignore": "উপেক্ষা করা", "imagine": "কল্পনা করা",
    "implement": "বাস্তবায়ন করা", "implicate": "জড়িত করা", "impose": "আরোপ করা",
    "improve": "উন্নতি করা", "include": "অন্তর্ভুক্ত করা", "increase": "বৃদ্ধি করা",
    "indicate": "নির্দেশ করা", "influence": "প্রভাবিত করা", "inform": "জানানো",
    "initiate": "শুরু করা", "inspect": "পরিদর্শন করা", "install": "ইনস্টল করা",
    "instruct": "নির্দেশ দেওয়া", "integrate": "একীভূত করা", "intend": "উদ্দেশ্য থাকা",
    "interest": "আগ্রহী হওয়া", "interview": "সাক্ষাৎকার নেওয়া", "introduce": "পরিচয় করানো",
    "invest": "বিনিয়োগ করা", "investigate": "তদন্ত করা", "involve": "জড়িত করা",
    "isolate": "বিচ্ছিন্ন করা", "join": "যোগ দেওয়া", "judge": "বিচার করা",
    "justify": "ন্যায্যতা প্রমাণ করা", "keep": "রাখা", "kick": "লাথি মারা",
    "kill": "মারা", "knock": "আঘাত করা", "label": "লেবেল দেওয়া",
    "lack": "অভাব থাকা", "laugh": "হাসা", "launch": "উদ্বোধন করা",
    "lay": "শোওয়া", "lead": "নেতৃত্ব দেওয়া", "lean": "হেলে পড়া",
    "leap": "লাফ দেওয়া", "learn": "শেখা", "leave": "ছেড়ে যাওয়া",
    "lend": "ধার দেওয়া", "let": "অনুমতি দেওয়া", "level": "সমতল করা",
    "license": "লাইসেন্স দেওয়া", "lift": "উত্তোলন করা", "light": "আলো দেওয়া",
    "limit": "সীমাবদ্ধ করা", "list": "তালিকা তৈরি করা", "listen": "শোনা",
    "live": "বাস করা", "locate": "অবস্থান করা", "lock": "তালা দেওয়া",
    "look": "দেখা", "lose": "হারানো", "love": "ভালোবাসা",
    "manage": "পরিচালনা করা", "mark": "চিহ্নিত করা", "match": "মেলানো",
    "mean": "অর্থ বোঝানো", "measure": "মাপা", "meet": "দেখা করা",
    "mention": "উল্লেখ করা", "mind": "মনে রাখা", "miss": "মিস করা",
    "mix": "মেশানো", "move": "সরানো", "multiply": "গুণ করা",
    "name": "নাম দেওয়া", "negotiate": "আলোচনা করা", "notice": "লক্ষ্য করা",
    "number": "সংখ্যা নির্ধারণ করা", "observe": "পর্যবেক্ষণ করা", "obtain": "প্রাপ্ত করা",
    "occupy": "অধিকার করা", "offer": "অফার করা", "open": "খোলা",
    "operate": "পরিচালনা করা", "oppose": "বিরোধিতা করা", "order": "আদেশ দেওয়া",
    "organize": "সংগঠিত করা", "overcome": "অতিক্রম করা", "paint": "আঁকা",
    "participate": "অংশগ্রহণ করা", "pass": "পাশ করা", "pause": "বিরতি দেওয়া",
    "perform": "সম্পাদন করা", "persist": "অটল থাকা", "persuade": "বোঝানো",
    "place": "স্থান দেওয়া", "plan": "পরিকল্পনা করা", "play": "খেলা",
    "point": "নির্দেশ করা", "pose": "অবস্থান দেওয়া", "position": "অবস্থান করা",
    "possess": "অধিকার করা", "postpone": "স্থগিত করা", "practise": "অভ্যাস করা",
    "preserve": "সংরক্ষণ করা", "press": "চাপ দেওয়া", "prevent": "প্রতিরোধ করা",
    "prioritize": "অগ্রাধিকার দেওয়া", "process": "প্রক্রিয়াকরণ করা", "produce": "উৎপাদন করা",
    "program": "প্রোগ্রাম করা", "progress": "অগ্রগতি হওয়া", "prohibit": "নিষিদ্ধ করা",
    "promise": "প্রতিশ্রুতি দেওয়া", "promote": "উন্নত করা", "propose": "প্রস্তাব করা",
    "protect": "রক্ষা করা", "prove": "প্রমাণ করা", "provide": "প্রদান করা",
    "publish": "প্রকাশ করা", "purchase": "ক্রয় করা", "pursue": "অনুসরণ করা",
    "qualify": "যোগ্য হওয়া", "question": "প্রশ্ন করা", "quit": "ছেড়ে দেওয়া",
    "range": "পরিসীমা নির্ধারণ করা", "rank": "শ্রেণীবদ্ধ করা", "rate": "মূল্যায়ন করা",
    "reach": "পৌঁছানো", "realize": "উপলব্ধি করা", "receive": "গ্রহণ করা",
    "recognize": "চিনতে পারা", "recommend": "সুপারিশ করা", "record": "রেকর্ড করা",
    "reduce": "কমানো", "refer": "উল্লেখ করা", "reflect": "প্রতিফলিত করা",
    "refuse": "অস্বীকার করা", "regulate": "নিয়ন্ত্রণ করা", "reinforce": "শক্তিশালী করা",
    "reject": "প্রত্যাখ্যান করা", "release": "মুক্ত করা", "rely": "নির্ভর করা",
    "remain": "থাকা", "remember": "মনে রাখা", "remind": "স্মরণ করানো",
    "remove": "সরানো", "render": "উপস্থাপন করা", "replace": "প্রতিস্থাপন করা",
    "report": "রিপোর্ট করা", "represent": "প্রতিনিধিত্ব করা", "reproduce": "প্রজনন করা",
    "request": "অনুরোধ করা", "require": "প্রয়োজন হওয়া", "resolve": "সমাধান করা",
    "respect": "সম্মান করা", "respond": "সাড়া দেওয়া", "restore": "পুনরুদ্ধার করা",
    "restrict": "সীমাবদ্ধ করা", "retain": "ধরে রাখা", "reveal": "প্রকাশ করা",
    "reverse": "উল্টানো", "review": "পর্যালোচনা করা", "revise": "সংশোধন করা",
    "revolt": "বিদ্রোহ করা", "risk": "ঝুঁকি নেওয়া", "save": "সংরক্ষণ করা",
    "schedule": "শিডিউল করা", "secure": "নিরাপদ করা", "select": "নির্বাচন করা",
    "sell": "বিক্রি করা", "send": "পাঠানো", "separate": "পৃথক করা",
    "share": "ভাগ করা", "shift": "স্থানান্তর করা", "shoot": "শুট করা",
    "show": "দেখানো", "shut": "বন্ধ করা", "signal": "সংকেত দেওয়া",
    "simplify": "সরল করা", "skip": "এড়িয়ে যাওয়া", "solve": "সমাধান করা",
    "sort": "সাজানো", "sound": "শব্দ করা", "specify": "নির্দিষ্ট করা",
    "spend": "খরচ করা", "spread": "ছড়িয়ে দেওয়া", "stand": "দাঁড়ানো",
    "start": "শুরু করা", "state": "বিবৃত করা", "stay": "থাকা",
    "stimulate": "উদ্দীপিত করা", "stop": "থামা", "store": "সংরক্ষণ করা",
    "stress": "চাপ দেওয়া", "stretch": "প্রসারিত করা", "structure": "গঠন করা",
    "study": "পড়া", "submit": "জমা দেওয়া", "succeed": "সফল হওয়া",
    "suggest": "পরামর্শ দেওয়া", "summarize": "সংক্ষিপ্ত করা", "supply": "সরবরাহ করা",
    "support": "সমর্থন করা", "suppose": "ধরে নেওয়া", "survive": "বেঁচে থাকা",
    "suspend": "স্থগিত করা", "switch": "বদলানো", "target": "লক্ষ্য করা",
    "taste": "স্বাদ নেওয়া", "terminate": "শেষ করা", "test": "পরীক্ষা করা",
    "tie": "বাঁধা", "tolerate": "সহ্য করা", "transfer": "স্থানান্তর করা",
    "transform": "রূপান্তর করা", "treat": "চিকিৎসা করা", "undertake": "হাতে নেওয়া",
    "unify": "একীভূত করা", "unite": "ঐক্যবদ্ধ করা", "update": "আপডেট করা",
    "urge": "উৎসাহিত করা", "use": "ব্যবহার করা", "utilize": "প্রয়োগ করা",
    "validate": "বৈধতা প্রমাণ করা", "vary": "পরিবর্তিত হওয়া", "verify": "যাচাই করা",
    "view": "দেখা", "violate": "লঙ্ঘন করা", "visit": "দেখা করা",
    "visualize": "কল্পনা করা", "vote": "ভোট দেওয়া", "wait": "অপেক্ষা করা",
    "walk": "হাঁটা", "waste": "নষ্ট করা", "watch": "দেখা",
    "weigh": "ওজন করা", "widen": "প্রশস্ত করা", "win": "জেতা",
    "wind": "ঘুরানো", "wish": "ইচ্ছা করা", "wonder": "আশ্চর্য হওয়া",
    "worry": "চিন্তা করা", "write": "লেখা"
}

def main():
    print("📝 Generating 10,000 Verb Forms with Bangla Meanings")
    print("====================================================")
    
    all_verbs = set(VERBS + list(IRREGULAR.keys()))
    verb_list = sorted(all_verbs)
    print(f"✅ Found {len(verb_list)} unique verbs.")
    
    results = []
    for i, w in enumerate(verb_list):
        word_lower = w.lower()
        if word_lower in IRREGULAR:
            past, pp = IRREGULAR[word_lower]
        else:
            if word_lower.endswith('e'):
                past = word_lower + 'd'
                pp = word_lower + 'd'
            elif word_lower.endswith('y') and len(word_lower) > 1 and word_lower[-2] not in 'aeiou':
                past = word_lower[:-1] + 'ied'
                pp = word_lower[:-1] + 'ied'
            else:
                past = word_lower + 'ed'
                pp = word_lower + 'ed'
        bangla = BANGLA_MEANINGS.get(word_lower, "")
        results.append({"base": word_lower, "past": past, "pp": pp, "bangla": bangla})
        if (i + 1) % 500 == 0:
            print(f"   ✅ Processed {i+1}/{len(verb_list)} verbs...")
    
    with open('verb-forms.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ SUCCESS! Saved {len(results)} verb forms to verb-forms.json")
    print(f"📂 File location: verb-forms.json")

if __name__ == "__main__":
    main()