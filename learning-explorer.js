// learning-explorer.js – Phase 4 (Mini Story, Daily Challenge, Mistake Notebook, SRS)

let dictionary = null;
let currentWord = null;

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

    currentWord = word;

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

    // --- Build main result ---
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

    // --- PHASE 4: Mini Story, Daily Challenge, Mistake Notebook ---
    html += `<div class="phase4" style="margin-top:1.5rem; border-top:1px solid var(--border); padding-top:1rem;">`;

    // Mini Story
    const story = entry.story || `${word} is a common word in English. It is used every day. Try to use it in your own sentences.`;
    html += `<div class="mini-story"><strong>📖 Mini Story</strong><p style="color:var(--text-mid); font-style:italic;">${story}</p></div>`;

    // Daily Challenge
    html += `<div class="daily-challenge" style="margin-top:1rem;">`;
    html += `<strong>⭐ Daily Challenge</strong>`;
    html += `<p>Today's challenge: Use the word <strong>"${word}"</strong> in a sentence.</p>`;
    html += `<input type="text" id="challengeSentence" placeholder="Type your sentence here..." style="width:100%; padding:0.5rem; margin:0.5rem 0; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--text);">`;
    html += `<button onclick="submitChallenge('${word}')" class="btn-secondary">Submit Challenge</button>`;
    html += `<div id="challengeFeedback" style="margin-top:0.5rem; color:var(--text-mid);"></div>`;
    html += `</div>`;

    // Mistake Notebook link
    html += `<div class="mistake-notebook" style="margin-top:1rem;">`;
    html += `<strong>📓 Mistake Notebook</strong>`;
    html += `<p>Words you've saved appear in your <a href="/mistake-notebook.html" style="color:var(--gold);">Mistake Notebook</a> for daily revision.</p>`;
    html += `</div>`;

    html += `</div>`;

    // --- Phase 3 features (Quiz, Flashcard, Save Word) ---
    html += `<div class="phase3" style="margin-top:1.5rem; border-top:1px solid var(--border); padding-top:1rem;">`;

    // Quiz
    const quizQuestion = `What is the meaning of "${word}"?`;
    const options = [
        entry.bangla || entry.meaning || 'Unknown',
        'Not sure',
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

    // Save Word (Mistake Notebook / SRS)
    html += `<div class="save-word" style="margin-top:1rem;">`;
    html += `<button onclick="saveWord('${word}')" class="btn-secondary">✅ Mark as Learned</button>`;
    html += `<span id="saveFeedback" style="margin-left:0.5rem; color:var(--text-mid);"></span>`;
    html += `</div>`;

    html += `</div>`;

    // --- Learn More (future) ---
    html += `<button class="learn-more-btn" onclick="toggleExtra()">▼ Learn More</button>`;
    html += `<div class="extra-sections" id="extraSections">`;
    html += `<p style="color:var(--text-mid);">Next: Full sentences and conversation practice.</p>`;
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

// --- Quiz ---
function checkQuiz(word) {
    const selected = document.querySelector('input[name="quiz"]:checked');
    const feedback = document.getElementById('quizFeedback');
    if (!selected) {
        feedback.innerHTML = 'Please select an answer.';
        return;
    }
    const isCorrect = parseInt(selected.value) === 0;
    feedback.innerHTML = isCorrect
        ? '✅ Correct! +5 XP'
        : '❌ Not quite. The correct answer is the first option.';
    if (isCorrect && typeof window.ovidhan !== 'undefined' && window.ovidhan.addXP) {
        window.ovidhan.addXP(5);
    }
}

// --- Flashcard ---
function saveFlashcard(word) {
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addFlashcard) {
        window.ovidhan.addFlashcard(word);
        document.getElementById('flashcardFeedback').textContent = '✅ Added to flashcards!';
    } else {
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

// --- Save Word (SRS Mistake Notebook Integration) ---
function saveWord(word) {
    // Direct SRS integration (Mistake Notebook)
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addToSRS) {
        window.ovidhan.addToSRS(word);
        document.getElementById('saveFeedback').textContent = '✅ Added to SRS Mistake Notebook!';
    } else {
        // Fallback to simple list
        let learned = JSON.parse(localStorage.getItem('ovidhan_learned_words') || '[]');
        if (!learned.includes(word)) {
            learned.push(word);
            localStorage.setItem('ovidhan_learned_words', JSON.stringify(learned));
            document.getElementById('saveFeedback').textContent = '✅ Saved to list!';
        } else {
            document.getElementById('saveFeedback').textContent = '⚠️ Already saved.';
        }
    }
    // Dispatch event so the notebook can update if open
    window.dispatchEvent(new CustomEvent('wordSaved', { detail: { word } }));
}

// --- Daily Challenge ---
function submitChallenge(word) {
    const sentence = document.getElementById('challengeSentence').value.trim();
    const feedback = document.getElementById('challengeFeedback');
    if (!sentence) {
        feedback.innerHTML = 'Please write a sentence using the word.';
        return;
    }
    if (!sentence.toLowerCase().includes(word)) {
        feedback.innerHTML = `⚠️ Your sentence should contain the word "${word}".`;
        return;
    }
    let submissions = JSON.parse(localStorage.getItem('ovidhan_daily_challenges') || '[]');
    submissions.push({ word, sentence, date: new Date().toISOString() });
    localStorage.setItem('ovidhan_daily_challenges', JSON.stringify(submissions));
    feedback.innerHTML = '✅ Challenge submitted! +10 XP';
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addXP) {
        window.ovidhan.addXP(10);
    }
}

document.getElementById('wordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchWord();
});