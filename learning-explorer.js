// learning-explorer.js – Phase 3 (Quiz, Flashcards, Save Word)

let dictionary = null;
let currentWord = null;  // store the current word for quiz/flashcard

fetch('/enriched-dictionary.json')
    .then(res => res.json())
    .then(data => {
        dictionary = {};
        data.forEach(entry => {
            const word = entry.english || entry.word || entry.en;
            if (word) dictionary[word.toLowerCase()] = entry;
        });
        const params = new URLSearchParams(window.location.search);
        const wordParam = params.get('word');
        if (wordParam) {
            document.getElementById('wordInput').value = wordParam;
            searchWord();
        }
    })
    .catch(err => {
        console.error('Dictionary load error:', err);
        document.getElementById('resultArea').innerHTML = '<p style="color: var(--red);">❌ Failed to load dictionary.</p>';
    });

function searchWord() {
    const word = document.getElementById('wordInput').value.trim().toLowerCase();
    const resultArea = document.getElementById('resultArea');
    if (!word) {
        resultArea.innerHTML = '<p style="color: var(--text-soft);">Please enter a word.</p>';
        return;
    }
    if (!dictionary) {
        resultArea.innerHTML = '<p>Loading dictionary...</p>';
        return;
    }

    const entry = dictionary[word];
    if (!entry) {
        resultArea.innerHTML = `<p style="color: var(--text-soft);">❌ Word not found. Try another word.</p>`;
        return;
    }

    currentWord = word;  // store for quiz/flashcard

    // --- Update URL & canonical ---
    const url = new URL(window.location);
    url.searchParams.set('word', word);
    window.history.pushState({}, '', url);
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `https://ovidhan.net/word/${word}.html`);

    // --- Build HTML ---
    let html = `<div class="result-card">`;
    html += `<div class="word">${word}</div>`;
    html += `<div class="pronunciation">/ ${entry.pronunciation || '...'} / <button onclick="speak('${word}')" style="background:none; border:none; color:var(--teal); cursor:pointer;">🔊</button></div>`;
    html += `<div class="meaning"><strong>Meaning:</strong> ${entry.meaning || 'Not available'}</div>`;
    html += `<div class="bangla"><strong>বাংলা:</strong> ${entry.bangla || 'Not available'}</div>`;
    html += `<div><strong>Word type:</strong> ${entry.part_of_speech || 'N/A'}</div>`;

    // --- Verb Forms ---
    if (entry.verb_forms && Object.keys(entry.verb_forms).length > 0) {
        html += `<div class="verb-forms"><strong>🔄 Verb Forms</strong><ul>`;
        for (const [tense, form] of Object.entries(entry.verb_forms)) {
            html += `<li><strong>${tense}:</strong> ${form}</li>`;
        }
        html += `</ul></div>`;
    }

    // --- Collocations ---
    if (entry.collocations && entry.collocations.length > 0) {
        html += `<div class="collocations"><strong>🔗 Collocations</strong><ul>`;
        entry.collocations.forEach(col => html += `<li>${col}</li>`);
        html += `</ul></div>`;
    }

    // --- Common Mistakes ---
    if (entry.common_mistakes && entry.common_mistakes.length > 0) {
        html += `<div class="common-mistakes"><strong>⚠️ Common Mistakes</strong><ul>`;
        entry.common_mistakes.forEach(m => {
            html += `<li>❌ ${m.wrong} → ✅ ${m.right} <span style="color:var(--text-mid); font-size:0.9rem;">(${m.explanation_bn})</span></li>`;
        });
        html += `</ul></div>`;
    }

    // --- Examples ---
    if (entry.examples && entry.examples.length) {
        html += `<div class="examples"><strong>Examples:</strong><ul>`;
        entry.examples.forEach(ex => html += `<li>${ex}</li>`);
        html += `</ul></div>`;
    }

    // --- Related words ---
    if (entry.synonyms || entry.antonyms) {
        html += `<div class="related-words"><strong>Related:</strong> `;
        if (entry.synonyms) {
            entry.synonyms.forEach(syn => html += `<a href="/word/${syn}.html">${syn}</a> `);
        }
        if (entry.antonyms) {
            entry.antonyms.forEach(ant => html += `<a href="/word/${ant}.html">${ant}</a> `);
        }
        html += `</div>`;
    }

    // --- PHASE 3: Quiz, Flashcard, Save Word ---
    html += `<div class="phase3" style="margin-top:1.5rem; border-top:1px solid var(--border); padding-top:1rem;">`;

    // Quiz (one MCQ)
    const quizQuestion = `What is the meaning of "${word}"?`;
    const options = [
        entry.bangla || entry.meaning || 'Unknown',
        'Not sure (skip)',
        'I don\'t know'
    ];
    html += `<div class="quiz-block"><strong>🧪 Quick Quiz</strong>`;
    html += `<p>${quizQuestion}</p>`;
    html += `<div id="quizOptions">`;
    options.forEach((opt, i) => {
        html += `<label><input type="radio" name="quiz" value="${i}"> ${opt}</label><br>`;
    });
    html += `</div>`;
    html += `<button onclick="checkQuiz('${word}')" class="btn-secondary" style="margin-top:0.5rem;">Check Answer</button>`;
    html += `<div id="quizFeedback" style="margin-top:0.5rem; color:var(--text-mid);"></div></div>`;

    // Flashcard
    html += `<div class="flashcard-block" style="margin-top:1rem;">`;
    html += `<button onclick="saveFlashcard('${word}')" class="btn-secondary">🃏 Save as Flashcard</button>`;
    html += `<span id="flashcardFeedback" style="margin-left:0.5rem; color:var(--text-mid);"></span>`;
    html += `</div>`;

    // Save Word (Mistake Notebook)
    html += `<div class="save-word" style="margin-top:1rem;">`;
    html += `<button onclick="saveWord('${word}')" class="btn-secondary">✅ Mark as Learned</button>`;
    html += `<span id="saveFeedback" style="margin-left:0.5rem; color:var(--text-mid);"></span>`;
    html += `</div>`;

    html += `</div>`;

    // --- Learn More (future phases) ---
    html += `<button class="learn-more-btn" onclick="toggleExtra()">▼ Learn More</button>`;
    html += `<div class="extra-sections" id="extraSections">`;
    html += `<p style="color:var(--text-mid);">Story, Daily Challenge, and Mistake Notebook coming soon.</p>`;
    html += `</div>`;
    html += `</div>`;

    resultArea.innerHTML = html;
}

function toggleExtra() {
    const extra = document.getElementById('extraSections');
    const btn = document.querySelector('.learn-more-btn');
    extra.classList.toggle('open');
    btn.textContent = extra.classList.contains('open') ? '▲ Show Less' : '▼ Learn More';
}

function speak(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
}

// --- PHASE 3 Functions ---

function checkQuiz(word) {
    const selected = document.querySelector('input[name="quiz"]:checked');
    const feedback = document.getElementById('quizFeedback');
    if (!selected) {
        feedback.innerHTML = 'Please select an answer.';
        return;
    }
    // For now, we consider the first option (index 0) correct.
    // In the future you could store correct answers in the JSON.
    const isCorrect = parseInt(selected.value) === 0;
    feedback.innerHTML = isCorrect
        ? '✅ Correct! +5 XP'
        : '❌ Not quite. The correct answer is the first option.';
    if (isCorrect && typeof window.ovidhan !== 'undefined' && window.ovidhan.addXP) {
        window.ovidhan.addXP(5);
    }
}

function saveFlashcard(word) {
    // Use your existing flashcards.js – assuming it has an addFlashcard function
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addFlashcard) {
        window.ovidhan.addFlashcard(word);
        document.getElementById('flashcardFeedback').textContent = '✅ Added to flashcards!';
    } else {
        // Fallback: save to localStorage
        let flashcards = JSON.parse(localStorage.getItem('ovidhan_flashcards') || '[]');
        if (!flashcards.includes(word)) {
            flashcards.push(word);
            localStorage.setItem('ovidhan_flashcards', JSON.stringify(flashcards));
            document.getElementById('flashcardFeedback').textContent = '✅ Added to flashcards!';
        } else {
            document.getElementById('flashcardFeedback').textContent = '⚠️ Already in flashcards.';
        }
    }
}

function saveWord(word) {
    // Track learned words in localStorage – used for Mistake Notebook later
    let learned = JSON.parse(localStorage.getItem('ovidhan_learned_words') || '[]');
    if (!learned.includes(word)) {
        learned.push(word);
        localStorage.setItem('ovidhan_learned_words', JSON.stringify(learned));
        document.getElementById('saveFeedback').textContent = '✅ Saved to Mistake Notebook!';
    } else {
        document.getElementById('saveFeedback').textContent = '⚠️ Already saved.';
    }
}

document.getElementById('wordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchWord();
});