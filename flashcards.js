// ── Flashcard SRS Engine (Spaced Repetition) ──
const FLASHCARD_KEY = 'ovidhan_flashcards';

// Default word list (100 essential English words with Bangla meanings)
// These will be used as a fallback if the dictionary JSON fails to load.
const DEFAULT_WORDS = [
    { word: "apple", meaning: "আপেল", example: "I eat an apple every day." },
    { word: "book", meaning: "বই", example: "This book is very interesting." },
    { word: "cat", meaning: "বিড়াল", example: "The cat is sleeping." },
    { word: "dog", meaning: "কুকুর", example: "My dog is very friendly." },
    { word: "elephant", meaning: "হাতি", example: "The elephant is huge." },
    { word: "flower", meaning: "ফুল", example: "She loves this flower." },
    { word: "garden", meaning: "বাগান", example: "We play in the garden." },
    { word: "house", meaning: "ঘর", example: "This is my house." },
    { word: "ice", meaning: "বরফ", example: "I like ice in my drink." },
    { word: "jacket", meaning: "জ্যাকেট", example: "Wear your jacket today." },
    { word: "king", meaning: "রাজা", example: "The king ruled the country." },
    { word: "lion", meaning: "সিংহ", example: "The lion is the king of the jungle." },
    { word: "moon", meaning: "চাঁদ", example: "The moon is full tonight." },
    { word: "night", meaning: "রাত", example: "I sleep at night." },
    { word: "ocean", meaning: "সমুদ্র", example: "The ocean is vast." },
    { word: "pencil", meaning: "পেন্সিল", example: "I write with a pencil." },
    { word: "queen", meaning: "রানি", example: "The queen is kind." },
    { word: "river", meaning: "নদী", example: "We swim in the river." },
    { word: "star", meaning: "তারা", example: "The stars are shining." },
    { word: "tree", meaning: "গাছ", example: "The tree is tall." },
    { word: "umbrella", meaning: "ছাতা", example: "Take an umbrella today." },
    { word: "village", meaning: "গ্রাম", example: "I live in a village." },
    { word: "water", meaning: "পানি", example: "Please drink some water." },
    { word: "yellow", meaning: "হলুদ", example: "The sun is yellow." },
    { word: "zebra", meaning: "জেব্রা", example: "The zebra has stripes." },
    { word: "ball", meaning: "বল", example: "Throw the ball to me." },
    { word: "child", meaning: "শিশু", example: "The child is playing." },
    { word: "door", meaning: "দরজা", example: "Please close the door." },
    { word: "eye", meaning: "চোখ", example: "My eye is red." },
    { word: "fish", meaning: "মাছ", example: "I like to eat fish." },
    { word: "girl", meaning: "মেয়ে", example: "The girl is singing." },
    { word: "hand", meaning: "হাত", example: "Raise your hand." },
    { word: "island", meaning: "দ্বীপ", example: "We visited the island." },
    { word: "jump", meaning: "লাফানো", example: "Don't jump here." },
    { word: "kite", meaning: "ঘুড়ি", example: "I fly a kite." },
    { word: "leg", meaning: "পা", example: "My leg hurts." },
    { word: "milk", meaning: "দুধ", example: "Drink your milk." },
    { word: "nest", meaning: "বাসা", example: "The bird built a nest." },
    { word: "orange", meaning: "কমলা", example: "The orange is sweet." },
    { word: "paper", meaning: "কাগজ", example: "I need some paper." },
    { word: "rest", meaning: "বিশ্রাম", example: "Let's take a rest." },
    { word: "school", meaning: "বিদ্যালয়", example: "I go to school." },
    { word: "table", meaning: "টেবিল", example: "The book is on the table." },
    { word: "uncle", meaning: "চাচা", example: "My uncle is here." },
    { word: "voice", meaning: "কণ্ঠ", example: "Her voice is beautiful." },
    { word: "walk", meaning: "হাঁটা", example: "I walk to the park." },
    { word: "year", meaning: "বছর", example: "A year has 365 days." },
    { word: "zero", meaning: "শূন্য", example: "The number is zero." },
    { word: "beautiful", meaning: "সুন্দর", example: "The flower is beautiful." },
    { word: "danger", meaning: "বিপদ", example: "Stay away from danger." },
    { word: "excellent", meaning: "চমৎকার", example: "You did an excellent job." }
];

function getDefaultFlashcardState() {
    return {
        cards: [],
        dueCount: 0,
        totalCards: 0,
        lastSessionDate: null
    };
}

function getCardDefaults(wordObj) {
    return {
        word: wordObj.word,
        meaning: wordObj.meaning || wordObj.bangla || wordObj.definition || '',
        example: wordObj.example || wordObj.sentence || '',
        interval: 1,
        nextReviewDate: new Date().toISOString().split('T')[0],
        ease: 2.5,
        stage: 0,
        correctCount: 0,
        incorrectCount: 0
    };
}

function loadFlashcards() {
    try {
        const data = localStorage.getItem(FLASHCARD_KEY);
        if (!data) return null;
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function saveFlashcards(state) {
    localStorage.setItem(FLASHCARD_KEY, JSON.stringify(state));
}

function initializeDeck(words) {
    const existing = loadFlashcards();
    if (existing && existing.cards && existing.cards.length > 0) {
        const existingWords = new Set(existing.cards.map(c => c.word.toLowerCase()));
        const newWords = words.filter(w => !existingWords.has(w.word.toLowerCase()));
        if (newWords.length === 0) return existing;
        const newCards = newWords.map(w => getCardDefaults(w));
        existing.cards = existing.cards.concat(newCards);
        existing.totalCards = existing.cards.length;
        saveFlashcards(existing);
        return existing;
    } else {
        const cards = words.map(w => getCardDefaults(w));
        const state = {
            cards: cards,
            totalCards: cards.length,
            dueCount: 0,
            lastSessionDate: null
        };
        saveFlashcards(state);
        return state;
    }
}

function getDueCards(state) {
    const today = new Date().toISOString().split('T')[0];
    const due = state.cards.filter(c => c.nextReviewDate <= today);
    state.dueCount = due.length;
    saveFlashcards(state);
    return due;
}

function scheduleCard(card, quality) {
    const today = new Date();
    let interval = card.interval || 1;
    let ease = card.ease || 2.5;

    if (quality === 0) {
        interval = 1;
        ease = Math.max(1.3, ease - 0.2);
        card.stage = Math.max(0, card.stage - 1);
        card.incorrectCount += 1;
    } else if (quality === 1) {
        interval = Math.max(1, interval * 1.2);
        ease = Math.max(1.3, ease - 0.15);
        card.stage = Math.min(4, card.stage + 0.5);
        card.correctCount += 1;
    } else if (quality === 2) {
        interval = Math.max(1, interval * 2.5);
        ease = Math.min(4.0, ease + 0.1);
        card.stage = Math.min(4, card.stage + 1);
        card.correctCount += 1;
    } else if (quality === 3) {
        interval = Math.max(1, interval * 3.5);
        ease = Math.min(4.0, ease + 0.15);
        card.stage = Math.min(4, card.stage + 2);
        card.correctCount += 1;
    }

    interval = Math.min(365, interval);
    card.interval = Math.round(interval);
    card.ease = Math.round(ease * 10) / 10;

    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + card.interval);
    card.nextReviewDate = nextDate.toISOString().split('T')[0];

    // ─── ✅ DASHBOARD INTEGRATION ───
    // If the card has just reached stage 4 (mastered), inform the dashboard
    if (card.stage >= 4 && typeof window.ovidhan !== 'undefined' && window.ovidhan.trackFlashcardMastered) {
        window.ovidhan.trackFlashcardMastered();
    }

    return card;
}

function getCardStats(state) {
    const total = state.cards.length;
    const today = new Date().toISOString().split('T')[0];
    const due = state.cards.filter(c => c.nextReviewDate <= today).length;
    const mastered = state.cards.filter(c => c.stage >= 4).length;
    return { total, due, mastered, percentMastered: Math.round((mastered / total) * 100) || 0 };
}

async function loadDictionaryWords() {
    try {
        let response = await fetch('/enriched-dictionary.json');
        if (!response.ok) {
            response = await fetch('/dictionary.json');
        }
        if (!response.ok) {
            throw new Error('Dictionary not found');
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            return data.map(item => ({
                word: item.word || item.english || item.term || '',
                meaning: item.meaning || item.bangla || item.definition || '',
                example: item.example || item.sentence || ''
            })).filter(w => w.word && w.meaning);
        } else if (data.words && Array.isArray(data.words)) {
            return data.words.map(item => ({
                word: item.word || item.english || '',
                meaning: item.meaning || item.bangla || '',
                example: item.example || ''
            })).filter(w => w.word && w.meaning);
        }
        return [];
    } catch (e) {
        console.warn('Could not load dictionary, using fallback words.');
        return DEFAULT_WORDS;
    }
}

// ── Expose for use in flashcards.html ──
window.FlashcardEngine = {
    loadFlashcards,
    saveFlashcards,
    initializeDeck,
    getDueCards,
    scheduleCard,
    getCardStats,
    loadDictionaryWords,
    DEFAULT_WORDS
};