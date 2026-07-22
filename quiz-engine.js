// ── Unified Quiz Engine ──
const QUESTION_BANKS = {
    grammar: {
        name: 'Grammar',
        icon: '📝',
        description: 'Test your English grammar knowledge.',
        questions: [
            {
                id: 'g1',
                question: 'Which sentence is correct?',
                options: ['I am agree with you.', 'I agree with you.', 'I am agreeing with you.', 'I agreed with you.'],
                correct: 1,
                explanation: 'In English, "agree" is a verb. We don\'t use "am" with it. The correct form is "I agree with you."'
            },
            {
                id: 'g2',
                question: 'Choose the correct passive voice: "The boy is reading a book."',
                options: ['A book is read by the boy.', 'A book is being read by the boy.', 'A book was read by the boy.', 'A book has been read by the boy.'],
                correct: 1,
                explanation: 'The sentence is in present continuous tense. The passive form is "is being" + past participle (read).'
            },
            {
                id: 'g3',
                question: 'Which of the following is a countable noun?',
                options: ['Water', 'Rice', 'Furniture', 'Book'],
                correct: 3,
                explanation: '"Book" is countable (one book, two books). Water, rice, and furniture are uncountable nouns.'
            },
            {
                id: 'g4',
                question: 'What is the past tense of "swim"?',
                options: ['Swimmed', 'Swam', 'Swum', 'Swiming'],
                correct: 1,
                explanation: '"Swim" is irregular: swim → swam → swum. The past tense is "swam".'
            },
            {
                id: 'g5',
                question: 'Choose the correct article: "She is ______ honest person."',
                options: ['a', 'an', 'the', 'no article'],
                correct: 1,
                explanation: 'We use "an" before a vowel sound. "Honest" starts with a silent "h", so it has a vowel sound (on-est).'
            },
            {
                id: 'g6',
                question: 'Identify the conjunction: "He is poor, but he is honest."',
                options: ['poor', 'but', 'honest', 'he'],
                correct: 1,
                explanation: '"But" is a conjunction that connects two contrasting ideas.'
            },
            {
                id: 'g7',
                question: 'Which sentence uses the correct subject-verb agreement?',
                options: ['The team are playing well.', 'The team is playing well.', 'The team were playing well.', 'The team am playing well.'],
                correct: 1,
                explanation: 'Collective nouns like "team" take a singular verb in British English (and often in American). "The team is playing well."'
            },
            {
                id: 'g8',
                question: 'What is the superlative form of "beautiful"?',
                options: ['Beautifuler', 'Most beautiful', 'More beautiful', 'Beautifulest'],
                correct: 1,
                explanation: 'For words with 3+ syllables, we use "most" + adjective. "Most beautiful" is correct.'
            }
        ]
    },
    vocabulary: {
        name: 'Vocabulary',
        icon: '📚',
        description: 'Test your English vocabulary range.',
        questions: [
            {
                id: 'v1',
                question: 'What does "benevolent" mean?',
                options: ['Cruel', 'Kind and generous', 'Angry', 'Sad'],
                correct: 1,
                explanation: '"Benevolent" means well-meaning and kindly. The opposite is "malevolent" (wishing evil).'
            },
            {
                id: 'v2',
                question: 'What is a synonym for "abundant"?',
                options: ['Scarce', 'Plentiful', 'Rare', 'Empty'],
                correct: 1,
                explanation: '"Abundant" means existing in large quantities. "Plentiful" has the same meaning.'
            },
            {
                id: 'v3',
                question: 'What does the idiom "break the ice" mean?',
                options: ['To break something frozen', 'To start a conversation', 'To end a relationship', 'To make a mistake'],
                correct: 1,
                explanation: '"Break the ice" means to make people feel more comfortable and start a conversation.'
            },
            {
                id: 'v4',
                question: 'Which word means "to make something less severe"?',
                options: ['Intensify', 'Exacerbate', 'Alleviate', 'Aggravate'],
                correct: 2,
                explanation: '"Alleviate" means to make something (like pain or suffering) less severe. The opposite is "aggravate".'
            },
            {
                id: 'v5',
                question: 'What is the meaning of "ambiguous"?',
                options: ['Clear', 'Difficult', 'Unclear or confusing', 'Happy'],
                correct: 2,
                explanation: '"Ambiguous" means open to more than one interpretation; unclear or confusing.'
            },
            {
                id: 'v6',
                question: 'Choose the correct antonym for "generous".',
                options: ['Kind', 'Stingy', 'Helpful', 'Giving'],
                correct: 1,
                explanation: 'The opposite of generous (giving freely) is "stingy" (not giving freely).'
            },
            {
                id: 'v7',
                question: 'What does the phrasal verb "give up" mean?',
                options: ['To present', 'To surrender or stop', 'To distribute', 'To return'],
                correct: 1,
                explanation: '"Give up" means to surrender, stop trying, or quit doing something.'
            }
        ]
    },
    tenses: {
        name: 'Tenses',
        icon: '⏳',
        description: 'Master English tenses.',
        questions: [
            {
                id: 't1',
                question: 'Choose the correct present perfect sentence.',
                options: ['I have seen that movie yesterday.', 'I saw that movie yesterday.', 'I have seen that movie.', 'I am seeing that movie.'],
                correct: 2,
                explanation: 'Present perfect (have/has + past participle) is used for past actions without a specific time. "Yesterday" would require past simple.'
            },
            {
                id: 't2',
                question: 'What tense is "She will have finished by then"?',
                options: ['Future simple', 'Future continuous', 'Future perfect', 'Present perfect'],
                correct: 2,
                explanation: 'Future perfect (will have + past participle) describes an action that will be completed before a certain time in the future.'
            },
            {
                id: 't3',
                question: 'Fill the blank: "I _____ when you called."',
                options: ['sleep', 'am sleeping', 'was sleeping', 'have slept'],
                correct: 2,
                explanation: 'Past continuous (was/were + -ing) is used for an action in progress that was interrupted by another past action.'
            },
            {
                id: 't4',
                question: 'Which sentence is in the present continuous tense?',
                options: ['I eat breakfast at 8am.', 'I am eating breakfast now.', 'I have eaten breakfast.', 'I ate breakfast.'],
                correct: 1,
                explanation: 'Present continuous is formed with am/is/are + present participle (-ing). It describes actions happening right now.'
            },
            {
                id: 't5',
                question: 'What is the past participle of "write"?',
                options: ['Wrote', 'Written', 'Writing', 'Writes'],
                correct: 1,
                explanation: 'The past participle of "write" is "written" (used in perfect tenses and passive voice).'
            }
        ]
    },
    bcs: {
        name: 'BCS English',
        icon: '🎓',
        description: 'Practice for BCS Preliminary and Written exams.',
        questions: [
            {
                id: 'b1',
                question: 'Choose the correct translation: "বৃষ্টি পড়ছে।"',
                options: ['Rain is falling.', 'It is raining.', 'The rain falls.', 'It rains.'],
                correct: 1,
                explanation: 'The most natural English equivalent for "বৃষ্টি পড়ছে" is "It is raining."'
            },
            {
                id: 'b2',
                question: 'Which of the following is an example of a compound sentence?',
                options: ['I went home.', 'I went home and I slept.', 'I went home because I was tired.', 'Going home, I slept.'],
                correct: 1,
                explanation: 'A compound sentence has two independent clauses joined by a conjunction (and, but, or). "I went home and I slept."'
            },
            {
                id: 'b3',
                question: 'Fill the blank with the correct preposition: "He is good ______ mathematics."',
                options: ['in', 'at', 'for', 'about'],
                correct: 1,
                explanation: 'We use "good at" to describe a skill or ability. "Good at mathematics."'
            },
            {
                id: 'b4',
                question: 'Choose the correct word: "The news ______ not good today."',
                options: ['are', 'is', 'were', 'have'],
                correct: 1,
                explanation: '"News" is an uncountable noun that takes a singular verb. "The news is not good."'
            },
            {
                id: 'b5',
                question: 'Identify the antonym of "Bold".',
                options: ['Brave', 'Courageous', 'Timid', 'Strong'],
                correct: 2,
                explanation: '"Timid" (showing fear or lack of courage) is the opposite of "bold" (showing courage).'
            }
        ]
    },
    ielts: {
        name: 'IELTS',
        icon: '🌍',
        description: 'Prepare for IELTS Reading, Writing, and Speaking tasks.',
        questions: [
            {
                id: 'i1',
                question: 'Which of the following is a synonym for "however" used to contrast ideas?',
                options: ['Additionally', 'Nevertheless', 'Therefore', 'Moreover'],
                correct: 1,
                explanation: '"Nevertheless" is a formal synonym for "however" used to introduce a contrasting point. Perfect for IELTS Writing Task 2.'
            },
            {
                id: 'i2',
                question: 'Fill the blank: "The graph shows a significant ______ in sales over the last quarter."',
                options: ['decline', 'declining', 'declined', 'declines'],
                correct: 0,
                explanation: 'We need a noun here: "a significant decline". This is common in IELTS Task 1 descriptions.'
            },
            {
                id: 'i3',
                question: 'What is the IELTS band descriptor for someone who can "understand complex arguments"?',
                options: ['Band 5', 'Band 6', 'Band 7', 'Band 8'],
                correct: 2,
                explanation: 'Band 7 often describes someone who can "understand complex arguments" and "handle detailed reasoning."'
            },
            {
                id: 'i4',
                question: 'In IELTS Writing Task 2, what is the recommended paragraph structure?',
                options: ['Introduction, 1 body, Conclusion', 'Introduction, 2-3 body, Conclusion', 'Only body paragraphs', 'Introduction, 5-6 body, Conclusion'],
                correct: 1,
                explanation: 'A standard Task 2 essay has Introduction, 2-3 body paragraphs (each with one main idea), and a Conclusion.'
            },
            {
                id: 'i5',
                question: 'Which connector best shows cause and effect?',
                options: ['Whereas', 'In addition', 'Consequently', 'Similarly'],
                correct: 2,
                explanation: '"Consequently" shows a result or effect. Use it to connect a cause and its effect in IELTS Writing.'
            }
        ]
    }
};

// ── Quiz State ──
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let selectedCategory = null;
let isAnswered = false;

// ── DOM refs (will be set after DOM load) ──
let quizContainer, progressBar, categorySelect, questionCounter, questionText, optionsContainer;
let nextBtn, resultContainer, finalScore, finalPercent, xpEarned, resultDetails, retryBtn, backBtn;

function initDomRefs() {
    quizContainer = document.getElementById('quizContainer');
    progressBar = document.getElementById('quizProgress');
    categorySelect = document.getElementById('categorySelect');
    questionCounter = document.getElementById('questionCounter');
    questionText = document.getElementById('questionText');
    optionsContainer = document.getElementById('optionsContainer');
    nextBtn = document.getElementById('nextBtn');
    resultContainer = document.getElementById('resultContainer');
    finalScore = document.getElementById('finalScore');
    finalPercent = document.getElementById('finalPercent');
    xpEarned = document.getElementById('xpEarned');
    resultDetails = document.getElementById('resultDetails');
    retryBtn = document.getElementById('retryBtn');
    backBtn = document.getElementById('backBtn');
}

function loadCategory(categoryKey) {
    selectedCategory = categoryKey;
    const bank = QUESTION_BANKS[categoryKey];
    if (!bank) return;

    // Shuffle questions and pick 10 (or all if less than 10)
    const shuffled = [...bank.questions].sort(() => Math.random() - 0.5);
    currentQuestions = shuffled.slice(0, Math.min(10, shuffled.length));
    currentIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    isAnswered = false;

    // Update UI
    document.querySelector('.quiz-header .category-badge').textContent = `${bank.icon} ${bank.name}`;
    document.getElementById('categoryDescription').textContent = bank.description;

    // Show quiz, hide result
    quizContainer.style.display = 'block';
    resultContainer.style.display = 'none';
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = true;

    renderQuestion();
}

function renderQuestion() {
    if (currentIndex >= currentQuestions.length) {
        showResults();
        return;
    }

    const q = currentQuestions[currentIndex];
    questionCounter.textContent = `Question ${currentIndex + 1} of ${currentQuestions.length}`;
    questionText.textContent = q.question;

    // Update progress bar
    const progress = ((currentIndex) / currentQuestions.length) * 100;
    progressBar.style.width = progress + '%';

    // Render options
    optionsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = opt;
        div.dataset.index = idx;
        div.addEventListener('click', () => selectOption(idx));
        optionsContainer.appendChild(div);
    });

    // Reset state
    isAnswered = false;
    nextBtn.disabled = true;
    nextBtn.textContent = 'Next →';

    // Remove any existing feedback
    document.querySelectorAll('.option.correct, .option.incorrect').forEach(el => {
        el.classList.remove('correct', 'incorrect', 'show-explanation');
    });
    const oldExplanations = document.querySelectorAll('.explanation-text');
    oldExplanations.forEach(el => el.remove());
}

function selectOption(selectedIdx) {
    if (isAnswered) return;
    const q = currentQuestions[currentIndex];
    const options = optionsContainer.querySelectorAll('.option');

    isAnswered = true;
    nextBtn.disabled = false;

    // Highlight correct and wrong
    options.forEach((opt, idx) => {
        if (idx === q.correct) opt.classList.add('correct');
        if (idx === selectedIdx && idx !== q.correct) opt.classList.add('incorrect');
        opt.style.cursor = 'default';
        opt.removeEventListener('click', selectOption);
    });

    // Update score
    if (selectedIdx === q.correct) {
        correctCount++;
    } else {
        incorrectCount++;
    }

    // Show explanation
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation-text';
    explanationDiv.innerHTML = `<strong>💡 Explanation:</strong> ${q.explanation}`;
    optionsContainer.appendChild(explanationDiv);

    // Change next button text if last question
    if (currentIndex === currentQuestions.length - 1) {
        nextBtn.textContent = '📊 See Results';
    }
}

function showResults() {
    quizContainer.style.display = 'none';
    resultContainer.style.display = 'block';

    const total = currentQuestions.length;
    const correct = correctCount;
    const percent = Math.round((correct / total) * 100);
    let earnedXP = 0;

    // Award XP for completing quiz
    if (correct > 0) {
        // 10 XP per correct answer, capped at 100
        earnedXP = Math.min(correct * 10, 100);
        if (typeof window.OvidhanGamification !== 'undefined') {
            window.OvidhanGamification.addXP(earnedXP);
            window.OvidhanGamification.updateStreak();
        }
    }

    // Show results
    finalScore.textContent = `${correct} / ${total}`;
    finalPercent.textContent = `${percent}%`;
    xpEarned.textContent = `+${earnedXP} XP earned!`;

    let message = '';
    if (percent >= 90) message = '🌟 Excellent! You are a language master!';
    else if (percent >= 70) message = '👍 Great job! Keep learning and you\'ll be fluent soon.';
    else if (percent >= 50) message = '📖 Good effort! Review the explanations and try again.';
    else message = '💪 Keep practicing! Every mistake is a learning opportunity.';
    resultDetails.textContent = message;

    // Update progress bar to full
    progressBar.style.width = '100%';
}

function restartQuiz() {
    if (selectedCategory) {
        loadCategory(selectedCategory);
    }
}

// ── Event Listeners ──
function initQuiz() {
    initDomRefs();

    // Populate category selector
    categorySelect.innerHTML = '<option value="">-- Select a Category --</option>';
    for (const [key, bank] of Object.entries(QUESTION_BANKS)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${bank.icon} ${bank.name}`;
        categorySelect.appendChild(opt);
    }

    categorySelect.addEventListener('change', function() {
        if (this.value) {
            loadCategory(this.value);
        } else {
            quizContainer.style.display = 'none';
            resultContainer.style.display = 'none';
        }
    });

    nextBtn.addEventListener('click', function() {
        if (this.disabled) return;
        currentIndex++;
        if (currentIndex >= currentQuestions.length) {
            showResults();
        } else {
            renderQuestion();
        }
    });

    retryBtn.addEventListener('click', restartQuiz);
    backBtn.addEventListener('click', function() {
        window.location.href = '/practice.html';
    });
}

// ── Initialize when DOM ready ──
document.addEventListener('DOMContentLoaded', initQuiz);