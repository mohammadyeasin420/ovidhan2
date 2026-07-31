// vocabulary-analyzer.js – CEFR-based vocabulary level checker

// --- CEFR word mapping (sample – you can expand this) ---
// For a production version, we'd use a comprehensive list from your dictionary.
// I've included a small subset for demonstration.
const cefrMap = {
    // A1
    "the": "A1", "be": "A1", "to": "A1", "of": "A1", "and": "A1", "a": "A1", "in": "A1", "that": "A1", "have": "A1", "i": "A1",
    "it": "A1", "for": "A1", "not": "A1", "on": "A1", "with": "A1", "he": "A1", "as": "A1", "you": "A1", "do": "A1", "at": "A1",
    "this": "A1", "but": "A1", "his": "A1", "by": "A1", "from": "A1", "they": "A1", "we": "A1", "say": "A1", "her": "A1", "she": "A1",
    "or": "A1", "an": "A1", "will": "A1", "my": "A1", "one": "A1", "all": "A1", "would": "A1", "there": "A1", "their": "A1", "what": "A1",
    "so": "A1", "up": "A1", "out": "A1", "if": "A1", "about": "A1", "who": "A1", "get": "A1", "which": "A1", "go": "A1", "me": "A1",
    // A2
    "also": "A2", "because": "A2", "between": "A2", "both": "A2", "can": "A2", "come": "A2", "could": "A2", "day": "A2", "down": "A2",
    "even": "A2", "every": "A2", "first": "A2", "good": "A2", "great": "A2", "how": "A2", "just": "A2", "know": "A2", "like": "A2",
    "make": "A2", "more": "A2", "most": "A2", "much": "A2", "new": "A2", "now": "A2", "only": "A2", "other": "A2", "over": "A2",
    "people": "A2", "really": "A2", "see": "A2", "should": "A2", "such": "A2", "than": "A2", "then": "A2", "think": "A2",
    "time": "A2", "two": "A2", "very": "A2", "way": "A2", "well": "A2", "when": "A2", "where": "A2", "why": "A2", "work": "A2",
    "world": "A2", "year": "A2", "your": "A2",
    // B1 (sample)
    "actually": "B1", "although": "B1", "amount": "B1", "become": "B1", "business": "B1", "change": "B1", "consider": "B1",
    "continue": "B1", "develop": "B1", "different": "B1", "enough": "B1", "experience": "B1", "feel": "B1", "follow": "B1",
    "however": "B1", "important": "B1", "include": "B1", "instead": "B1", "issue": "B1", "likely": "B1", "main": "B1",
    "might": "B1", "necessary": "B1", "offer": "B1", "possible": "B1", "problem": "B1", "process": "B1", "provide": "B1",
    "reason": "B1", "result": "B1", "seem": "B1", "serious": "B1", "situation": "B1", "social": "B1", "system": "B1",
    "therefore": "B1", "value": "B1", "various": "B1", "whether": "B1", "within": "B1", "without": "B1",
    // B2 (sample)
    "acknowledge": "B2", "acquire": "B2", "adequate": "B2", "adjust": "B2", "affect": "B2", "appropriate": "B2", "assess": "B2",
    "capacity": "B2", "challenge": "B2", "concept": "B2", "conclusion": "B2", "consist": "B2", "contribute": "B2", "convey": "B2",
    "demonstrate": "B2", "despite": "B2", "distinguish": "B2", "emphasis": "B2", "environment": "B2", "evaluate": "B2",
    "feature": "B2", "flexible": "B2", "former": "B2", "generate": "B2", "highlight": "B2", "impact": "B2", "imply": "B2",
    "involve": "B2", "justify": "B2", "maintain": "B2", "modify": "B2", "obtain": "B2", "overcome": "B2", "perceive": "B2",
    "promote": "B2", "pursue": "B2", "recognize": "B2", "reflect": "B2", "relevant": "B2", "significant": "B2", "sustain": "B2",
    "tend": "B2", "transfer": "B2", "undertake": "B2", "widespread": "B2",
    // C1 (sample)
    "academic": "C1", "accommodate": "C1", "accompany": "C1", "accumulate": "C1", "adapt": "C1", "advocate": "C1",
    "alternative": "C1", "ambitious": "C1", "anticipate": "C1", "assumption": "C1", "budget": "C1", "collaborate": "C1",
    "compensate": "C1", "complement": "C1", "comprise": "C1", "conceive": "C1", "consensus": "C1", "controversy": "C1",
    "demonstrate": "C1", "dominant": "C1", "eliminate": "C1", "emerge": "C1", "enable": "C1", "enormous": "C1",
    "establish": "C1", "exceed": "C1", "exclude": "C1", "exhibit": "C1", "foster": "C1", "implement": "C1", "impose": "C1",
    "initiate": "C1", "integrate": "C1", "intervene": "C1", "investigate": "C1", "negotiate": "C1", "occupy": "C1",
    "overlook": "C1", "perspective": "C1", "prior": "C1", "profound": "C1", "regulate": "C1", "reinforce": "C1",
    "restore": "C1", "revolution": "C1", "scheme": "C1", "simulate": "C1", "strategy": "C1", "substitute": "C1",
    "transform": "C1", "underlie": "C1", "validate": "C1", "violate": "C1"
};

// Load stats
function loadStats() {
    const stats = JSON.parse(localStorage.getItem('ovidhan_vocab_stats') || '{"analyses":0, "xp":0}');
    document.getElementById('analysisCount').textContent = stats.analyses;
    document.getElementById('xpEarned').textContent = stats.xp;
}

// Load stats on page load
document.addEventListener('DOMContentLoaded', loadStats);

function analyzeText() {
    const text = document.getElementById('textInput').value.trim();
    const resultArea = document.getElementById('resultArea');
    if (!text) {
        alert('Please paste or type some English text.');
        return;
    }

    // Split into words (lowercase, remove punctuation)
    const words = text.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/).filter(w => w.length > 1);
    if (words.length < 5) {
        alert('Please enter at least 5 words for a meaningful analysis.');
        return;
    }

    // Count words per CEFR level
    const counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, unknown: 0 };
    const unknownWords = [];
    const seenWords = new Set();

    words.forEach(word => {
        if (seenWords.has(word)) return;
        seenWords.add(word);

        const level = cefrMap[word] || null;
        if (level) {
            counts[level] = (counts[level] || 0) + 1;
        } else {
            counts.unknown = (counts.unknown || 0) + 1;
            unknownWords.push(word);
        }
    });

    // Calculate percentages
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const percentages = {};
    levels.forEach(l => {
        percentages[l] = Math.round((counts[l] / total) * 100);
    });
    const unknownPercent = Math.round((counts.unknown / total) * 100);

    // Estimate IELTS band (rough heuristic)
    const ieltsScore = Math.min(9, Math.max(3, 3 + (percentages.B1 * 0.02) + (percentages.B2 * 0.04) + (percentages.C1 * 0.06)));
    const ieltsBand = ieltsScore.toFixed(1);

    // Build result HTML
    let html = `
        <h2 style="color: var(--gold);">📈 Your Vocabulary Profile</h2>
        <p><strong>Total unique words analyzed:</strong> ${Object.keys(seenWords).length}</p>
        <p><strong>Estimated IELTS Band:</strong> <span style="font-size: 1.8rem; color: var(--gold);">${ieltsBand}</span> / 9.0</p>

        <div class="level-breakdown">
            ${levels.map(l => `
                <div class="level-box">
                    <div class="level">${l}</div>
                    <div class="percentage">${percentages[l]}%</div>
                </div>
            `).join('')}
            <div class="level-box" style="background: var(--red-dim);">
                <div class="level" style="color: var(--red);">Unknown</div>
                <div class="percentage">${unknownPercent}%</div>
            </div>
        </div>
    `;

    // Show unknown words with option to save to flashcards
    if (unknownWords.length > 0) {
        html += `<div class="unknown-words"><strong>🔍 Words to learn:</strong><br>`;
        unknownWords.slice(0, 20).forEach(word => {
            html += `<span onclick="saveWordToFlashcard('${word}')" style="cursor:pointer; background:var(--surface2); padding:0.2rem 0.8rem; border-radius:12px; margin:0.2rem; display:inline-block;">${word} 🃏</span>`;
        });
        if (unknownWords.length > 20) {
            html += `<span style="color:var(--text-mid);">... and ${unknownWords.length - 20} more</span>`;
        }
        html += `</div>`;
    }

    // Share buttons
    const shareText = `My vocabulary level: IELTS ${ieltsBand} 🎯\nCEFR: A1:${percentages.A1}% A2:${percentages.A2}% B1:${percentages.B1}% B2:${percentages.B2}% C1:${percentages.C1}%\nAnalyzed with Ovidhan's Vocabulary Analyzer!`;
    html += `
        <div class="share-buttons">
            <button onclick="shareResult('facebook', '${encodeURIComponent(shareText)}')" class="btn-secondary">📘 Share on Facebook</button>
            <button onclick="shareResult('whatsapp', '${encodeURIComponent(shareText)}')" class="btn-secondary">💬 Share on WhatsApp</button>
            <button onclick="navigator.clipboard.writeText('${shareText}')" class="btn-secondary">📋 Copy to Clipboard</button>
        </div>
    `;

    resultArea.innerHTML = html;
    resultArea.style.display = 'block';

    // Update stats
    let stats = JSON.parse(localStorage.getItem('ovidhan_vocab_stats') || '{"analyses":0, "xp":0}');
    stats.analyses++;
    stats.xp += 10;
    localStorage.setItem('ovidhan_vocab_stats', JSON.stringify(stats));
    document.getElementById('analysisCount').textContent = stats.analyses;
    document.getElementById('xpEarned').textContent = stats.xp;

    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addXP) {
        window.ovidhan.addXP(10);
    }
}

function saveWordToFlashcard(word) {
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addFlashcard) {
        window.ovidhan.addFlashcard(word);
        alert(`✅ "${word}" added to flashcards!`);
    } else {
        let flashcards = JSON.parse(localStorage.getItem('ovidhan_flashcards') || '[]');
        if (!flashcards.includes(word)) {
            flashcards.push(word);
            localStorage.setItem('ovidhan_flashcards', JSON.stringify(flashcards));
            alert(`✅ "${word}" added to flashcards!`);
        } else {
            alert(`⚠️ "${word}" already in flashcards.`);
        }
    }
}

function shareResult(platform, text) {
    const url = 'https://ovidhan.net/vocabulary-analyzer.html';
    const fullText = text + ' Check yours: ' + url;
    if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?quote=${fullText}&u=${url}`);
    } else if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${fullText}`);
    }
}

// Allow Ctrl+Enter to trigger analysis
document.getElementById('textInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        analyzeText();
    }
});