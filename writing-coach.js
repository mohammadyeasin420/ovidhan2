// writing-coach.js – Rewriting Engine

let currentOriginal = "";
let currentRewrites = {};

// Stats
function loadStats() {
    const stats = JSON.parse(localStorage.getItem('ovidhan_writing_stats') || '{"checks":0, "xp":0}');
    document.getElementById('checkCount').textContent = stats.checks;
    document.getElementById('xpEarned').textContent = stats.xp;
}
document.addEventListener('DOMContentLoaded', loadStats);

// Core rewriting engine
function rewriteText(text, style) {
    let result = text;

    // Dictionary of informal -> formal replacements
    const rules = {
        "wanna": "want to",
        "gonna": "going to",
        "kinda": "kind of",
        "sorta": "sort of",
        "gotta": "have to",
        "u": "you",
        "ur": "your",
        "plz": "please",
        "thx": "thanks",
        "n": "and",
        "cuz": "because",
        "I'm": "I am",
        "I'll": "I will",
        "don't": "do not",
        "can't": "cannot",
        "won't": "will not",
        "shouldn't": "should not",
        "wouldn't": "would not",
        "couldn't": "could not",
        "didn't": "did not",
        "hasn't": "has not",
        "haven't": "have not",
        "isn't": "is not",
        "aren't": "are not",
        "wasn't": "was not",
        "weren't": "were not",
        "ain't": "is not"
    };

    // Apply base rules (Formal)
    for (const [key, val] of Object.entries(rules)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, val);
    }

    // Style-specific tweaks
    if (style === 'business') {
        result = result.replace(/\b(help)\b/gi, 'assist');
        result = result.replace(/\b(need)\b/gi, 'require');
        result = result.replace(/\b(get)\b/gi, 'obtain');
        result = result.replace(/\b(use)\b/gi, 'utilize');
        result = result.replace(/\b(send)\b/gi, 'transmit');
    } else if (style === 'ielts') {
        result = result.replace(/\b(show)\b/gi, 'demonstrate');
        result = result.replace(/\b(good)\b/gi, 'beneficial');
        result = result.replace(/\b(bad)\b/gi, 'detrimental');
        result = result.replace(/\b(important)\b/gi, 'crucial');
        result = result.replace(/\b(think)\b/gi, 'believe');
    } else if (style === 'bcs') {
        result = result.replace(/\b(think)\b/gi, 'opine');
        result = result.replace(/\b(show)\b/gi, 'illustrate');
        result = result.replace(/\b(important)\b/gi, 'significant');
        result = result.replace(/\b(use)\b/gi, 'employ');
        result = result.replace(/\b(get)\b/gi, 'procure');
    }

    return result;
}

function generateExplanation(original, rewritten, style) {
    // Simple diff to highlight changes
    const origWords = original.split(' ');
    const newWords = rewritten.split(' ');
    let changes = [];

    for (let i = 0; i < Math.min(origWords.length, newWords.length); i++) {
        if (origWords[i].toLowerCase() !== newWords[i].toLowerCase()) {
            changes.push(`Changed "<span class="highlight">${origWords[i]}</span>" to "<span class="highlight">${newWords[i]}</span>"`);
        }
    }

    if (changes.length === 0) {
        return "No major changes needed. The text was already appropriate for this style.";
    }

    return `<strong>💡 Changes made for ${style} style:</strong><br>` + changes.slice(0, 5).join('<br>');
}

function analyzeWriting() {
    const input = document.getElementById('textInput').value.trim();
    const resultSection = document.getElementById('resultSection');
    if (!input) {
        alert('Please paste some text first.');
        return;
    }

    currentOriginal = input;
    const styles = ['formal', 'business', 'ielts', 'bcs'];
    currentRewrites = {};

    // Generate rewrites
    styles.forEach(style => {
        const rewritten = rewriteText(input, style);
        currentRewrites[style] = rewritten;
        
        // Render text
        document.getElementById(`${style}Text`).innerHTML = rewritten;
        document.getElementById(`${style}Exp`).innerHTML = generateExplanation(input, rewritten, style);
    });

    resultSection.style.display = 'block';
    // Activate first tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tabFormal').classList.add('active');
    document.querySelector('[data-tab="formal"]').classList.add('active');

    // Update stats
    let stats = JSON.parse(localStorage.getItem('ovidhan_writing_stats') || '{"checks":0, "xp":0}');
    stats.checks++;
    stats.xp += 10;
    localStorage.setItem('ovidhan_writing_stats', JSON.stringify(stats));
    document.getElementById('checkCount').textContent = stats.checks;
    document.getElementById('xpEarned').textContent = stats.xp;

    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addXP) {
        window.ovidhan.addXP(10);
    }
}

// Tab switching logic
document.getElementById('tabContainer').addEventListener('click', function(e) {
    if (e.target.classList.contains('tab-btn')) {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    }
});

// Save to SRS
function saveToSRS() {
    const activeTab = document.querySelector('.tab-btn.active');
    const style = activeTab ? activeTab.dataset.tab : 'formal';
    const rewrittenText = currentRewrites[style] || '';

    if (!rewrittenText) {
        document.getElementById('srsFeedback').textContent = '⚠️ No text to save.';
        return;
    }

    // Split into key phrases (take first 3 sentences for the SRS)
    const sentences = rewrittenText.match(/[^.!?]+[.!?]+/g) || [rewrittenText];
    const firstSentence = sentences[0].trim();

    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addToSRS) {
        window.ovidhan.addToSRS(firstSentence);
        document.getElementById('srsFeedback').textContent = `✅ Saved "${firstSentence.substring(0,30)}..." to SRS!`;
        document.getElementById('srsFeedback').style.color = 'var(--green)';
    } else {
        // Fallback
        let flashcards = JSON.parse(localStorage.getItem('ovidhan_flashcards') || '[]');
        flashcards.push(firstSentence);
        localStorage.setItem('ovidhan_flashcards', JSON.stringify(flashcards));
        document.getElementById('srsFeedback').textContent = `✅ Saved to local flashcards!`;
        document.getElementById('srsFeedback').style.color = 'var(--green)';
    }
}

// Allow Ctrl+Enter to trigger analysis
document.getElementById('textInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        analyzeWriting();
    }
});