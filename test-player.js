(function() {
    const container = document.getElementById('test-container');
    if (!container) return;

    // Get questions from the page (embedded by generate_tests.py)
    let questions = window.TEST_QUESTIONS || [];
    let currentIndex = 0;
    let score = 0;
    let answers = [];

    function renderQuestion(index) {
        if (index >= questions.length) {
            showResults();
            return;
        }
        const q = questions[index];
        let html = `
            <div class="question-card">
                <div class="progress">Question ${index + 1} of ${questions.length}</div>
                <h3>${q.question_text}</h3>
                <p><small>Topic: ${q.topic} | Difficulty: ${'⭐'.repeat(q.difficulty)}</small></p>
                <div class="options">
        `;
        q.options.forEach((opt, i) => {
            html += `
                <button class="option-btn" data-index="${i}" onclick="window.handleAnswer(${i})">
                    ${String.fromCharCode(65 + i)}. ${opt}
                </button>
            `;
        });
        html += `</div><div id="feedback-${index}" class="feedback"></div></div>`;
        container.innerHTML = html;
        
        // Store current question globally for the onclick handler
        window.__currentQuestionIndex = index;
    }

    window.handleAnswer = function(selectedIndex) {
        const q = questions[window.__currentQuestionIndex];
        const feedbackDiv = document.getElementById(`feedback-${window.__currentQuestionIndex}`);
        const isCorrect = (selectedIndex === q.correct_index);
        
        if (isCorrect) score++;
        answers.push({ question_id: q.id, selected: selectedIndex, correct: isCorrect });

        let distractorText = q.distractor_explanations[selectedIndex] || '';
        let feedbackHtml = `
            <div class="result-feedback ${isCorrect ? 'correct' : 'wrong'}">
                <h4>${isCorrect ? '✅ Correct!' : '❌ Wrong!'}</h4>
                <p><strong>Explanation:</strong> ${q.explanation}</p>
                <p><strong>বাংলা ব্যাখ্যা:</strong> ${q.bangla_explanation}</p>
                <p><strong>Why not the others?</strong> ${distractorText}</p>
                <div class="learning-links">
                    <strong>Learn More:</strong>
                    ${q.learning_links.map(link => `<a href="${link}">📖 Study</a>`).join(' ')}
                </div>
                <button onclick="window.nextQuestion()" class="next-btn">Next Question →</button>
            </div>
        `;
        feedbackDiv.innerHTML = feedbackHtml;
        
        // Disable buttons
        document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    };

    window.nextQuestion = function() {
        window.__currentQuestionIndex++;
        if (window.__currentQuestionIndex < questions.length) {
            renderQuestion(window.__currentQuestionIndex);
        } else {
            showResults();
        }
    };

    function showResults() {
        const total = questions.length;
        const percentage = Math.round((score / total) * 100);
        let grade = percentage >= 80 ? '🌟 Excellent' : (percentage >= 60 ? '📈 Good' : '📚 Keep Practicing');
        
        container.innerHTML = `
            <div class="result-box">
                <h2>🎯 Test Complete!</h2>
                <div class="score-display">${score} / ${total} (${percentage}%)</div>
                <div class="grade">${grade}</div>
                <div class="skill-breakdown">
                    <h4>Quick Analysis</h4>
                    <p>Wrong answers? Click below to review.</p>
                </div>
                <button onclick="window.location.reload()" class="retry-btn">🔄 Retry Test</button>
                <a href="/mock-tests/index.html" class="back-btn">📂 All Tests</a>
            </div>
        `;
        // Save to localStorage for future "Learning Journey" tracking
        const history = JSON.parse(localStorage.getItem('ovidhan_test_history') || '[]');
        history.push({ date: new Date(), tag: window.TEST_TAG, score, total });
        localStorage.setItem('ovidhan_test_history', JSON.stringify(history));
    }

    // Add CSS dynamically
const style = document.createElement('style');
style.textContent = `
    .option-btn { display: block; width: 100%; padding: 12px; margin: 8px 0; background: #1e1e2e; color: #fff; border: 1px solid #444; border-radius: 8px; cursor: pointer; text-align: left; font-size: 1rem; }
    .option-btn:hover:not(:disabled) { background: #2a2a3e; border-color: #E6B84A; }
    .option-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .feedback { margin-top: 20px; padding: 18px; border-radius: 8px; }
    
    /* ✅ FIXED: Light backgrounds with readable text */
    .correct { 
        background: rgba(74, 222, 128, 0.12); 
        border-left: 4px solid #4ade80; 
        color: #D8EDEB;
    }
    .wrong { 
        background: rgba(248, 113, 113, 0.12); 
        border-left: 4px solid #f87171; 
        color: #D8EDEB;
    }
    .correct h4, .wrong h4 { color: #fff; margin-bottom: 8px; }
    .correct strong, .wrong strong { color: #fff; }
    .correct p, .wrong p { color: #D8EDEB; }
    
    .next-btn, .retry-btn, .back-btn { 
        background: #E6B84A; 
        color: #0B1F1A; 
        padding: 10px 24px; 
        border: none; 
        border-radius: 8px; 
        cursor: pointer; 
        margin: 5px; 
        font-weight: 700;
        font-size: 1rem;
        transition: 0.2s;
    }
    .next-btn:hover, .retry-btn:hover, .back-btn:hover { 
        opacity: 0.85; 
        transform: scale(1.02);
    }
    .score-display { 
        font-size: 3em; 
        font-weight: bold; 
        margin: 20px 0; 
        color: #E6B84A;
    }
    .learning-links a { 
        color: #4ECDC4; 
        margin-right: 12px; 
        text-decoration: none;
        font-weight: 500;
    }
    .learning-links a:hover { 
        color: #E6B84A; 
        text-decoration: underline;
    }
    .grade { 
        font-size: 1.5em; 
        margin: 10px 0;
        color: #D8EDEB;
    }
    .result-box { 
        text-align: center; 
        padding: 30px 20px; 
        background: #122820; 
        border-radius: 12px; 
        border: 1px solid #1E3D38;
    }
    .progress {
        color: #8AADA9;
        font-size: 0.9rem;
        margin-bottom: 12px;
    }
    .question-card h3 {
        color: #D8EDEB;
        font-size: 1.2rem;
        margin-bottom: 8px;
    }
`;
document.head.appendChild(style);

    // Start the test
    if (questions.length > 0) {
        renderQuestion(0);
    } else {
        container.innerHTML = '<p>No questions found for this test.</p>';
    }
})();