document.addEventListener('DOMContentLoaded', function() {
    // --- Elements ---
    const audioText = document.getElementById('transcript-en').innerText;
    const audioBtn = document.getElementById('btn-listen');
    const repeatBtn = document.getElementById('btn-repeat');
    const speedToggle = document.getElementById('btn-speed');
    const audioFeedback = document.getElementById('audio-feedback');

    let isSlow = false; // default normal speed

    // --- Play Audio Function ---
    function playAudio() {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(audioText);
        utterance.lang = 'en-US';
        utterance.rate = isSlow ? 0.7 : 0.9; // 0.7 slow, 0.9 normal
        window.speechSynthesis.speak(utterance);
        audioFeedback.textContent = isSlow ? "🔊 Playing (Slow)..." : "🔊 Playing...";
        utterance.onend = () => { audioFeedback.textContent = "✅ Done."; };
    }

    // --- Play Button ---
    if (audioBtn) {
        audioBtn.addEventListener('click', playAudio);
    }

    // --- Repeat Button ---
    if (repeatBtn) {
        repeatBtn.addEventListener('click', playAudio);
    }

    // --- Speed Toggle Button ---
    if (speedToggle) {
        speedToggle.addEventListener('click', function() {
            isSlow = !isSlow;
            this.textContent = isSlow ? "🐢 Slow" : "🐇 Normal";
            audioFeedback.textContent = isSlow ? "Slow mode activated." : "Normal mode activated.";
            // Optionally stop current audio (if playing)
            window.speechSynthesis.cancel();
        });
    }

    // --- Dictation Check --- (unchanged)
    const dictationBtn = document.getElementById('btn-check-dictation');
    const dictationFeedback = document.getElementById('dictation-feedback');
    const dictationAnswersElem = document.getElementById('dictation-answers');
    if (dictationAnswersElem) {
        const answers = JSON.parse(dictationAnswersElem.textContent);
        dictationBtn.addEventListener('click', function() {
            let correct = 0;
            for (let i = 0; i < answers.length; i++) {
                const input = document.getElementById(`dictation-${i}`);
                if (!input) continue;
                const userAnswer = input.value.trim().toLowerCase();
                const correctAnswer = answers[i].toLowerCase();
                if (userAnswer === correctAnswer) {
                    correct++;
                    input.style.border = "2px solid var(--green)";
                } else {
                    input.style.border = "2px solid var(--red)";
                }
            }
            dictationFeedback.innerHTML = `You got ${correct} out of ${answers.length} correct.`;
            if (correct === answers.length) {
                dictationFeedback.innerHTML += " 🎉 Perfect!";
                if (typeof window.ovidhan !== 'undefined' && window.ovidhan.trackDailyChallenge) {
                    window.ovidhan.trackDailyChallenge();
                }
            }
        });
    }

    // --- Quiz Check --- (unchanged)
    const quizBtn = document.getElementById('btn-check-quiz');
    const quizFeedback = document.getElementById('quiz-feedback');
    const quizDataElem = document.getElementById('quiz-data');
    if (quizDataElem) {
        const quizData = JSON.parse(quizDataElem.textContent);
        quizBtn.addEventListener('click', function() {
            let correct = 0;
            for (let i = 0; i < quizData.length; i++) {
                const radios = document.getElementsByName(`q${i}`);
                let selected = null;
                for (const radio of radios) {
                    if (radio.checked) {
                        selected = parseInt(radio.value);
                        break;
                    }
                }
                if (selected === quizData[i].correct) {
                    correct++;
                }
            }
            quizFeedback.innerHTML = `You got ${correct} out of ${quizData.length} correct.`;
            if (correct === quizData.length) {
                quizFeedback.innerHTML += " 🎉 Perfect!";
                if (typeof window.ovidhan !== 'undefined' && window.ovidhan.trackDailyChallenge) {
                    window.ovidhan.trackDailyChallenge();
                }
            }
        });
    }
});