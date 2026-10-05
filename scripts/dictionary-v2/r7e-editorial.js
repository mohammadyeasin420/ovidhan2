'use strict';
// Bangla and examples for the remaining 45 words of the frozen R7E pilot.
// English definitions and synset ids come from the selection file, not from this module.

const EDITORIAL = {
    pious: {
        display: 'ধর্মভক্ত',
        explanation: 'নামাজ বা পূজায়, এবং রোজকার কথায়, ঈশ্বরের প্রতি শ্রদ্ধা স্পষ্ট থাকলে মানুষ ধর্মভক্ত।',
        en: 'My grandmother begins each morning with a pious prayer before sunrise.',
        bn: 'আমার দাদি প্রতিদিন সূর্য ওঠার আগে ভক্তিভরে নামাজ পড়ে দিন শুরু করেন।',
        confidence: 'high'
    },
    credentials: {
        display: 'প্রমাণপত্র',
        explanation: 'বর্ণিত তথ্য যে সত্য, তা লিখে দেয় এমন দাপ্তরিক কাগজই এই অর্থে প্রমাণপত্র।',
        en: 'On Monday the envoy presented his credentials, a signed letter confirming the facts of his appointment.',
        bn: 'সোমবার দূত একটি সই করা চিঠি প্রমাণপত্র হিসেবে পেশ করলেন, যেখানে তাঁর নিয়োগের তথ্য সত্য বলে লেখা আছে।',
        confidence: 'high'
    },
    messy: {
        display: 'এলোমেলো ও নোংরা',
        explanation: 'কাপড়, থালা আর ধুলো জায়গা না মেনে পড়ে থাকলে ঘর এলোমেলো ও নোংরা হয়ে যায়।',
        en: 'Wrapping paper and dirty plates left the living room messy after the birthday party.',
        bn: 'জন্মদিনের পর মোড়কের কাগজ আর নোংরা থালায় বসার ঘর এলোমেলো হয়ে গেল।',
        confidence: 'high'
    },
    sustainable: {
        display: 'চালিয়ে যাওয়া যায় এমন',
        explanation: 'কোনো কাজ, চলন বা ব্যবস্থা পরেও আগের মতো চালিয়ে নেওয়া গেলে, সেটি এই অর্থে বজায় থাকে।',
        en: 'They chose a slower pace that was sustainable for the whole riverside walk.',
        bn: 'নদীর ধারের পুরো পথ হাঁটতে পারে, এমন একটু ধীর গতি তারা রাখল।',
        confidence: 'high'
    },
    eagerly: {
        display: 'আগ্রহভরে',
        explanation: 'আর অপেক্ষা করা যায় না, তাই সুযোগ আসতেই মানুষ আগ্রহভরে এগিয়ে আসে।',
        en: 'The students eagerly refreshed the result page the moment the bell rang.',
        bn: 'ঘণ্টা বাজার সঙ্গে সঙ্গে শিক্ষার্থীরা আগ্রহভরে ফলাফলের পাতা আবার খুলল।',
        confidence: 'high'
    },
    width: {
        display: 'প্রস্থ',
        explanation: 'কোনো বস্তু এক পাশ থেকে উল্টো পাশ পর্যন্ত যতটা জায়গা নেয়, সেই মাপই প্রস্থ।',
        en: 'The tailor checked the width of the blue cloth before cutting the school uniform.',
        bn: 'স্কুলের উর্দি কাটার আগে দর্জি নীল কাপড়ের প্রস্থ দেখে নিলেন।',
        confidence: 'high'
    },
    controversy: {
        display: 'বিতর্ক',
        explanation: 'একই সিদ্ধান্ত নিয়ে দুই পক্ষ জোরের সঙ্গে আলাদা কথা বলে, এবং কেউ সহজে সরে আসে না।',
        en: 'The sudden rise in bus fare caused a controversy among commuters at the terminal.',
        bn: 'হঠাৎ বাসভাড়া বাড়ায় টার্মিনালের যাত্রীদের মধ্যে বিতর্ক শুরু হলো।',
        confidence: 'high'
    },
    employee: {
        display: 'কর্মচারী',
        explanation: 'নির্দিষ্ট বেতনে কোনো প্রতিষ্ঠানের কাজ করতে যোগ দেন, তিনি কর্মচারী।',
        en: 'Each new employee collected an identity card from the office desk on Monday.',
        bn: 'সোমবার প্রত্যেক নতুন কর্মচারী অফিসের ডেস্ক থেকে একটি পরিচয়পত্র নিলেন।',
        confidence: 'high'
    },
    scared: {
        display: 'ভীত',
        explanation: 'হঠাৎ বিপদ বা গভীর অন্ধকারে ভয় শরীরে চেপে বসলে মানুষ ভীত হয়ে পড়ে।',
        en: 'The little boy was scared when thunder shook the tin roof at midnight.',
        bn: 'মাঝরাতে বজ্রপাতে টিনের চাল কেঁপে উঠলে ছোট ছেলেটি ভয় পেয়ে গেল।',
        confidence: 'high'
    },
    sassy: {
        display: 'উদ্ধত',
        explanation: 'বড়দের উদ্দেশে কথায় সম্মানের সুর থাকে না, থাকে শুধু বাড়াবাড়ি সাহস। এই অর্থে মানুষ উদ্ধত।',
        en: 'Asked about the missing homework, the student gave a sassy reply and turned away.',
        bn: 'হোমওয়ার্ক কোথায়, এই প্রশ্নে শিক্ষার্থী উদ্ধত জবাব দিয়ে মুখ ঘুরিয়ে নিল।',
        confidence: 'high'
    },
    renowned: {
        display: 'খ্যাতনামা',
        explanation: 'কাজের গুণে নাম দূরের জেলা পর্যন্ত শ্রদ্ধার সঙ্গে পৌঁছলে মানুষ খ্যাতনামা।',
        en: 'A renowned eye specialist visited the district hospital on Sunday.',
        bn: 'রোববার এক খ্যাতনামা চক্ষু বিশেষজ্ঞ জেলা হাসপাতালে গেলেন।',
        confidence: 'high'
    },
    funeral: {
        display: 'অন্ত্যেষ্টিক্রিয়া',
        explanation: 'মৃত্যুর পর দাফন বা সৎকারকে ঘিরে আত্মীয় ও প্রতিবেশীরা যে অনুষ্ঠানে আসেন, সেটি অন্ত্যেষ্টিক্রিয়া।',
        en: 'Cousins from Sylhet travelled overnight for their uncle\'s funeral in the village.',
        bn: 'গ্রামে মামার অন্ত্যেষ্টিক্রিয়ায় সিলেট থেকে ভাইবোনেরা রাতভর পথ পাড়ি দিলেন।',
        confidence: 'high'
    },
    immense: {
        display: 'বিশাল',
        explanation: 'সংখ্যা, আয়তন বা মাত্রা চেনা সীমা ছাড়িয়ে গেলে তা বিশাল হয়ে ওঠে।',
        en: 'An immense crowd stood along the river before the first boat left the ghat.',
        bn: 'প্রথম নৌকা ঘাট ছাড়ার আগে নদীর ধারে বিশাল ভিড় দাঁড়িয়েছিল।',
        confidence: 'high'
    },
    premises: {
        display: 'প্রাঙ্গণ',
        explanation: 'একটি প্রতিষ্ঠানের জমি এবং সেই জমিতে দাঁড়ানো ভবন মিলিয়ে প্রাঙ্গণ।',
        en: 'Delivery vans may enter the school premises only through the north gate.',
        bn: 'সরবরাহের ভ্যান স্কুল প্রাঙ্গণে ঢুকতে পারে শুধু উত্তর গেট দিয়ে।',
        confidence: 'high'
    },
    seldom: {
        display: 'কদাচিৎ',
        explanation: 'বছরের প্রায় সব দিন যা দেখা যায় না, তা কদাচিৎ ঘটে।',
        en: 'He seldom takes the later train, because the dawn coach reaches the mill on time.',
        bn: 'ভোরের গাড়ি সময়ে কলে পৌঁছায় বলে পরের ট্রেন তিনি কদাচিৎ ধরেন।',
        confidence: 'high'
    },
    accountability: {
        display: 'জবাবদিহি',
        explanation: 'খরচ বা সিদ্ধান্তের ব্যাখ্যা নির্দিষ্ট কারো কাছে জমা দিতে হলে সেখানে জবাবদিহি থাকে।',
        en: 'The class captain accepted accountability for the money collected for the picnic.',
        bn: 'পিকনিকের জমানো টাকার জবাবদিহি শ্রেণির দলনেতা নিলেন।',
        confidence: 'high'
    },
    employer: {
        display: 'নিয়োগকর্তা',
        explanation: 'যিনি বা যে প্রতিষ্ঠান কাউকে বেতন দিয়ে কাজ করান, তিনি নিয়োগকর্তা।',
        en: 'Her employer signed the leave form so she could attend her sister\'s wedding.',
        bn: 'বোনের বিয়েতে যেতে পারার জন্য ছুটির ফর্মে তার নিয়োগকর্তা সই করলেন।',
        confidence: 'high'
    },
    merchant: {
        display: 'খুচরা ব্যবসায়ী',
        explanation: 'পণ্য কিনে নিজের দোকান থেকে সরাসরি ক্রেতার কাছে বিক্রি করেন, এমন মানুষ খুচরা ব্যবসায়ী।',
        en: 'The rice merchant weighed the last sack before the evening call to prayer.',
        bn: 'সন্ধ্যার আজানের আগে চালের ব্যবসায়ী শেষ বস্তাটি মাপলেন।',
        confidence: 'high'
    },
    hastily: {
        display: 'তাড়াহুড়ো করে',
        explanation: 'দেখে নেওয়ার সময় না রেখেই কোনো কাজ তাড়াহুড়ো করে শেষ করা হয়।',
        en: 'She hastily tied her shoelaces and ran when she heard the ferry whistle.',
        bn: 'ফেরির সিটি শুনে সে তাড়াহুড়ো করে জুতার ফিতে বেঁধে দৌড়াল।',
        confidence: 'high'
    },
    rural: {
        display: 'গ্রামীণ',
        explanation: 'শহরের ভিড় নয়, মাঠ ও গ্রামের বসতি এই জীবনের কেন্দ্র। এমন এলাকা গ্রামীণ।',
        en: 'A rural post office serves five villages from a single small room.',
        bn: 'একটি ছোট ঘর থেকে গ্রামীণ ডাকঘর পাঁচটি গ্রামের চিঠি সামলায়।',
        confidence: 'high'
    },
    vigilant: {
        display: 'সতর্ক',
        explanation: 'বিপদ আসতে পারে ভেবে চোখ ও কান খোলা রাখলে মানুষ সতর্ক থাকে।',
        en: 'The night guard stayed vigilant while the warehouse keys were still out.',
        bn: 'গুদামের চাবি বাইরে থাকা পর্যন্ত রাতের প্রহরী সতর্ক ছিলেন।',
        confidence: 'high'
    },
    wrist: {
        display: 'কব্জি',
        explanation: 'হাতের তালু আর বাহু যে সন্ধিতে নড়ে, সেই জায়গাই কব্জি।',
        en: 'She rubbed her wrist after carrying the water pot up the pond steps.',
        bn: 'পুকুরের সিঁড়ি দিয়ে পানির কলসি তুলে আনার পর সে কব্জি ঘষল।',
        confidence: 'high'
    },
    blissful: {
        display: 'পরম সুখী',
        explanation: 'দুশ্চিন্তা সরে গিয়ে শুধু গভীর তৃপ্তি থাকলে মুহূর্তটি পরম সুখী।',
        en: 'The baby looked blissful, asleep against his mother\'s shoulder on the launch.',
        bn: 'লঞ্চে মায়ের কাঁধে ঘুমোনো শিশুটিকে পরম সুখী দেখাচ্ছিল।',
        confidence: 'high'
    },
    deprived: {
        display: 'বঞ্চিত',
        explanation: 'খাওয়া, পড়া বা নিরাপদ আশ্রয়ের মতো দরকারি জিনিস নাগালে না এলে মানুষ বঞ্চিত থাকে।',
        en: 'After the flood, the char families were deprived of a dry place to cook.',
        bn: 'বন্যার পর চরের পরিবারগুলো রান্না করার শুকনো জায়গা থেকে বঞ্চিত ছিল।',
        confidence: 'high'
    },
    humidity: {
        display: 'আর্দ্রতা',
        explanation: 'বাতাসে জলীয় ভাপ বাড়লে গরম আরও আঠালো লাগে। এই ভেজা ভাবের নাম আর্দ্রতা।',
        en: 'The humidity in Barishal made the cotton shirt cling by midafternoon.',
        bn: 'বরিশালের আর্দ্রতায় দুপুর গড়াতেই সুতির জামা গায়ে সেঁটে যাচ্ছিল।',
        confidence: 'high'
    },
    ubiquitous: {
        display: 'সর্বত্র দেখা যায় এমন',
        explanation: 'একই জিনিস রাস্তায়, বাড়িতে ও বাজারে একসঙ্গে চোখে পড়লে মনে হয় সেটি সর্বত্র আছে।',
        en: 'Small tea stalls are ubiquitous on the road from Cumilla to Feni.',
        bn: 'কুমিল্লা থেকে ফেনির রাস্তায় ছোট চায়ের দোকান সর্বত্র চোখে পড়ে।',
        confidence: 'high'
    },
    excellent: {
        display: 'উৎকৃষ্ট',
        explanation: 'মান এত উঁচু যে সেটিকে সাধারণ ভালো কাজের সঙ্গে গুলিয়ে ফেলা যায় না।',
        en: 'His excellent diagram made the water cycle easy for the whole class.',
        bn: 'তার উৎকৃষ্ট চিত্রে পুরো শ্রেণির কাছে পানির চক্র সহজ হয়ে গেল।',
        confidence: 'high'
    },
    daughter: {
        display: 'কন্যা',
        explanation: 'মা ও বাবার যে সন্তান মেয়ে, তিনি তাঁদের কন্যা।',
        en: 'Their daughter won the spelling prize at the upazila school fair.',
        bn: 'উপজেলা স্কুল মেলার বানান প্রতিযোগিতায় তাঁদের কন্যা পুরস্কার পেলেন।',
        confidence: 'high'
    },
    amicable: {
        display: 'সদ্ভাবপূর্ণ',
        explanation: 'বিরোধ মিটলেও দুই পক্ষ বন্ধুর মতো কথা বলে। এমন মীমাংসা সদ্ভাবপূর্ণ।',
        en: 'The landlord and the tenant settled the repair costs on amicable terms.',
        bn: 'মেরামতের খরচ বাড়িওয়ালা ও ভাড়াটিয়া সদ্ভাবে মিটিয়ে নিলেন।',
        confidence: 'high'
    },
    goofy: {
        display: 'হাস্যকর',
        explanation: 'এত বোকাটে ও অদ্ভুত যে রাগ আসে না, হাসি আসে।',
        en: 'He balanced a goofy paper moustache on his nose to cheer up his nephew.',
        bn: 'ভাগ্নেকে হাসাতে সে নাকে একটা হাস্যকর কাগজের গোঁফ আটকাল।',
        confidence: 'high'
    },
    concise: {
        display: 'সংক্ষিপ্ত',
        explanation: 'বাড়তি বাক্য বাদ দিয়ে মূল তথ্য কম কথায় শেষ হলে লেখা সংক্ষিপ্ত হয়।',
        en: 'The concise timetable listed only the room, the subject, and the start time.',
        bn: 'সংক্ষিপ্ত সময়সূচিতে ছিল শুধু কক্ষ, বিষয় ও শুরুর সময়।',
        confidence: 'high'
    },
    culinary: {
        display: 'রন্ধনবিষয়ক',
        explanation: 'রান্না, রেসিপি ও রান্নাঘরের সরঞ্জাম এই বৃত্তের ভেতরে পড়ে।',
        en: 'In the culinary workshop, the trainees learned to temper spices for a lentil soup.',
        bn: 'রন্ধন কর্মশালায় প্রশিক্ষণার্থীরা ডালের ঝোলে মশলা ফোড়ন দিতে শিখল।',
        confidence: 'high'
    },
    dowry: {
        display: 'যৌতুক',
        explanation: 'বিয়ের সময় কনের পরিবার থেকে বরের পক্ষে যে টাকা বা সম্পদ যায়, তার নাম যৌতুক।',
        en: 'The museum label described a dowry of brass pots listed in a nineteenth-century marriage deed.',
        bn: 'জাদুঘরের ফলকে উনিশ শতকের একটি বিয়ের দলিলে পিতলের হাঁড়ির যৌতুকের কথা লেখা ছিল।',
        confidence: 'high'
    },
    entrepreneur: {
        display: 'উদ্যোক্তা',
        explanation: 'নিজের অর্থ ও লোকসানের ঝুঁকি নিয়ে নতুন ব্যবসা দাঁড় করান, এমন মানুষ উদ্যোক্তা।',
        en: 'The entrepreneur hired two neighbours and started a bicycle-repair shed by the ferry.',
        bn: 'উদ্যোক্তা দুই প্রতিবেশীকে নিয়ে ফেরিঘাটের পাশে সাইকেল মেরামতের ঘর খুললেন।',
        confidence: 'high'
    },
    deadline: {
        display: 'শেষ সময়সীমা',
        explanation: 'এই সময় পেরোলে কাজ আর গ্রহণ করা হয় না। সেই ঘড়িই শেষ সময়সীমা।',
        en: 'Friday at noon is the deadline for handing in the science project.',
        bn: 'বিজ্ঞান প্রকল্প জমা দেওয়ার শেষ সময়সীমা শুক্রবার দুপুর।',
        confidence: 'high'
    },
    relevant: {
        display: 'প্রাসঙ্গিক',
        explanation: 'যে তথ্য আলোচ্য প্রশ্নের সঙ্গে সরাসরি যুক্ত, তা প্রাসঙ্গিক।',
        en: 'An old flood map was relevant to the question about the broken embankment.',
        bn: 'ভাঙা বাঁধ নিয়ে প্রশ্নের সঙ্গে পুরোনো বন্যার মানচিত্র প্রাসঙ্গিক ছিল।',
        confidence: 'high'
    },
    frankly: {
        display: 'অকপটে বলতে গেলে',
        explanation: 'বক্তা বাক্যের শুরুতেই নিজের সত্য মত সরাসরি রেখে দেন।',
        en: 'Frankly, the draft needs one more day before I can send it.',
        bn: 'অকপটে বলতে গেলে, খসড়াটি পাঠানোর আগে আমার আরও একদিন দরকার।',
        confidence: 'high'
    },
    obviously: {
        display: 'স্পষ্টতই',
        explanation: 'সামনের প্রমাণ এত পরিষ্কার যে ভুল বোঝার সুযোগ থাকে না।',
        en: 'The empty ink bottle was obviously why the printer stopped midway.',
        bn: 'কালি ফুরিয়ে যাওয়ায় মাঝপথে ছাপা বন্ধ হয়েছিল, সেটা স্পষ্টতই বোঝা গেল।',
        confidence: 'high'
    },
    gradually: {
        display: 'ধীরে ধীরে',
        explanation: 'বদল এক লাফে আসে না। অল্প অল্প করে সামনে বাড়ে, অর্থাৎ ধীরে ধীরে।',
        en: 'Muddy water gradually covered the lower steps as the tide came in.',
        bn: 'জোয়ার আসতে আসতে ঘোলা জল ধীরে ধীরে নিচের সিঁড়ি ডুবিয়ে দিল।',
        confidence: 'high'
    },
    solely: {
        display: 'শুধুমাত্র',
        explanation: 'অন্য লোক বা অন্য কারণ বাদ দিয়ে কেবল একটি বিষয় কাজ করে।',
        en: 'She sat the extra class solely to practise the listening section.',
        bn: 'শোনার অংশ অনুশীলনের জন্যই তিনি শুধুমাত্র বাড়তি ক্লাসে বসলেন।',
        confidence: 'high'
    },
    cherish: {
        display: 'আগলে রাখা',
        explanation: 'হারিয়ে যেতে দিতে চান না, তাই কোনো স্মৃতি বা মানুষকে যত্নে ধরে রাখেন।',
        en: 'He cherishes the small radio his grandfather repaired for him.',
        bn: 'দাদু যে ছোট রেডিওটি সারিয়ে দিয়েছিলেন, সেটি তিনি আগলে রাখেন।',
        confidence: 'high'
    },
    perish: {
        display: 'প্রাণ হারানো',
        explanation: 'শরীর আর তার দরকারি কাজ চালাতে পারে না, তাই প্রাণ চলে যায়।',
        en: 'The young mango saplings perished when the pond dried for six weeks.',
        bn: 'টানা ছয় সপ্তাহ পুকুর শুকিয়ে থাকায় আমের চারাগুলো প্রাণ হারাল।',
        confidence: 'high'
    },
    weep: {
        display: 'চোখের জল ফেলা',
        explanation: 'দুঃখ, রাগ বা ব্যথায় চোখ বেয়ে জল নামে।',
        en: 'She began to weep when the torn admit card fell out of her bag.',
        bn: 'ব্যাগ থেকে ছিঁড়ে যাওয়া প্রবেশপত্র বেরিয়ে পড়লে তার চোখের জল নেমে এল।',
        confidence: 'high'
    },
    sue: {
        display: 'মামলা করা',
        explanation: 'ক্ষতির বিচার চাইতে আদালতে নালিশ জমা দেওয়া হয়।',
        en: 'The grocer will sue the supplier who kept the payment and sent no lentils.',
        bn: 'টাকা রেখেও ডাল না পাঠানো সরবরাহকারীর বিরুদ্ধে মুদি মামলা করবেন।',
        confidence: 'high'
    },
    cooperate: {
        display: 'একযোগে কাজ করা',
        explanation: 'একই প্রকল্পের অংশ ভাগ করে দুই দল সেই কাজ শেষের দিকে এগিয়ে নেয়।',
        en: 'The two unions cooperated to repair the shared tube well before summer.',
        bn: 'গ্রীষ্মের আগে ভাগাভাগি নলকূপ সারাতে দুই সমিতি একযোগে কাজ করল।',
        confidence: 'high'
    }
};

module.exports = { EDITORIAL };
