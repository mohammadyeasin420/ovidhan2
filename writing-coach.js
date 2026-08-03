// ============================================================
//  Writing Coach – Full Logic (Standalone JS)
// ============================================================

let currentOriginal = "";
let currentRewrites = {};

// --- 1. Load Stats from localStorage ---
function loadStats() {
    try {
        const stats = JSON.parse(localStorage.getItem('ovidhan_writing_stats') || '{"checks":0, "xp":0}');
        const checkCountEl = document.getElementById('checkCount');
        const xpEarnedEl = document.getElementById('xpEarned');
        if (checkCountEl) checkCountEl.textContent = stats.checks;
        if (xpEarnedEl) xpEarnedEl.textContent = stats.xp;
    } catch (e) {
        console.warn("Could not load stats:", e);
    }
}
document.addEventListener('DOMContentLoaded', loadStats);

// --- 2. Core Rewriting Engine ---
function rewriteText(text, style) {
    let result = text;

    // Informal → Formal rules (applied to all styles)
    const rules = {
        "wanna": "want to", "gonna": "going to", "kinda": "kind of", "sorta": "sort of",
        "gotta": "have to", "u": "you", "ur": "your", "plz": "please",
        "thx": "thanks", "n": "and", "cuz": "because", "I'm": "I am",
        "I'll": "I will", "don't": "do not", "can't": "cannot",
        "won't": "will not", "shouldn't": "should not", "wouldn't": "would not",
        "couldn't": "could not", "didn't": "did not", "hasn't": "has not",
        "haven't": "have not", "isn't": "is not", "aren't": "are not",
        "wasn't": "was not", "weren't": "were not", "ain't": "is not"
    };
    for (const [key, val] of Object.entries(rules)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, val);
    }

    // Style‑specific enhancements
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
        result = result.replace(/\b(work)\b/gi, 'endeavour');
    }

    return result;
}

function generateExplanation(original, rewritten, style) {
    const origWords = original.split(' ');
    const newWords = rewritten.split(' ');
    let changes = [];
    for (let i = 0; i < Math.min(origWords.length, newWords.length); i++) {
        if (origWords[i].toLowerCase() !== newWords[i].toLowerCase()) {
            changes.push(`Changed "<strong>${origWords[i]}</strong>" to "<strong>${newWords[i]}</strong>"`);
        }
    }
    if (changes.length === 0) return "No major changes needed.";
    return `<strong>💡 Changes made for ${style} style:</strong><br>` + changes.slice(0, 5).join('<br>');
}

// --- 3. Main Analysis Function ---
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

    styles.forEach(style => {
        const rewritten = rewriteText(input, style);
        currentRewrites[style] = rewritten;
        
        // Update the DOM
        const textEl = document.getElementById(`${style}Text`);
        const expEl = document.getElementById(`${style}Exp`);
        if (textEl) textEl.innerHTML = rewritten;
        if (expEl) expEl.innerHTML = generateExplanation(input, rewritten, style);
    });

    // Show and activate the first tab
    if (resultSection) resultSection.style.display = 'block';
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const firstTab = document.getElementById('tabFormal');
    const firstBtn = document.querySelector('[data-tab="formal"]');
    if (firstTab) firstTab.classList.add('active');
    if (firstBtn) firstBtn.classList.add('active');

    // Update stats
    try {
        let stats = JSON.parse(localStorage.getItem('ovidhan_writing_stats') || '{"checks":0, "xp":0}');
        stats.checks++;
        stats.xp += 10;
        localStorage.setItem('ovidhan_writing_stats', JSON.stringify(stats));
        
        document.getElementById('checkCount').textContent = stats.checks;
        document.getElementById('xpEarned').textContent = stats.xp;

        // Try to add XP via global system
        if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addXP) {
            window.ovidhan.addXP(10);
        }
    } catch (e) {
        console.warn("Could not update stats:", e);
    }
}

// --- 4. Tab Switching ---
document.addEventListener('DOMContentLoaded', function() {
    const tabContainer = document.getElementById('tabContainer');
    if (tabContainer) {
        tabContainer.addEventListener('click', function(e) {
            if (e.target.classList.contains('tab-btn')) {
                const tab = e.target.dataset.tab;
                
                // Update buttons
                document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update content
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                const targetContent = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
                if (targetContent) targetContent.classList.add('active');
            }
        });
    }
});

// --- 5. Save to SRS (with Fallback) ---
function saveToSRS() {
    const activeTab = document.querySelector('.tab-btn.active');
    const style = activeTab ? activeTab.dataset.tab : 'formal';
    const rewrittenText = currentRewrites[style] || '';
    
    const feedbackEl = document.getElementById('srsFeedback');
    if (!rewrittenText) {
        if (feedbackEl) feedbackEl.textContent = '⚠️ No text to save.';
        return;
    }

    const sentences = rewrittenText.match(/[^.!?]+[.!?]+/g) || [rewrittenText];
    const firstSentence = sentences[0].trim();

    // Try global SRS, fallback to localStorage
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addToSRS) {
        window.ovidhan.addToSRS(firstSentence);
        if (feedbackEl) feedbackEl.textContent = `✅ Saved to SRS!`;
    } else {
        try {
            let myWords = JSON.parse(localStorage.getItem('ovidhan_my_saved_sentences') || '[]');
            myWords.push(firstSentence);
            localStorage.setItem('ovidhan_my_saved_sentences', JSON.stringify(myWords));
            if (feedbackEl) feedbackEl.textContent = `✅ Saved locally! (SRS not loaded)`;
        } catch (e) {
            console.warn("Could not save locally:", e);
            if (feedbackEl) feedbackEl.textContent = `❌ Failed to save.`;
        }
    }
}

// --- 6. Keyboard Shortcut (Ctrl+Enter) ---
document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                analyzeWriting();
            }
        });
    }
});