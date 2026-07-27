// Make functions globally accessible so inline onclick works
window.playSection = function(index) {
    const text = document.getElementById(`audio-text-${index}`).innerText;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
    // Visual feedback
    const audioTextEl = document.getElementById(`audio-text-${index}`);
    audioTextEl.style.background = 'var(--gold-dim)';
    utterance.onend = () => {
        audioTextEl.style.background = 'transparent';
    };
};

window.toggleTranslation = function(index) {
    const trans = document.getElementById(`translation-${index}`);
    const btn = document.querySelector(`#sec-${index} .btn-translate`);
    if (trans.style.display === 'block') {
        trans.style.display = 'none';
        btn.textContent = '🌐 Show Bangla';
    } else {
        trans.style.display = 'block';
        btn.textContent = '🌐 Hide Bangla';
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.section-box');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const progressFill = document.getElementById('progress-fill');
    const feedback = document.getElementById('exam-feedback');
    let currentSection = 0;

    function showSection(index) {
        sections.forEach((el, i) => {
            el.classList.toggle('hidden', i !== index);
        });
        prevBtn.disabled = index === 0;
        nextBtn.textContent = index === sections.length - 1 ? '✅ Submit Exam' : 'Next Section ➡';
        progressFill.style.width = ((index + 1) / sections.length) * 100 + '%';
        document.querySelector('main').scrollIntoView({ behavior: 'smooth' });
    }

    function validateSection(index) {
        const mcqs = document.querySelectorAll(`#sec-${index} .mcq-question`);
        let allAnswered = true;
        mcqs.forEach((q, i) => {
            const selected = document.querySelector(`input[name="sec-${index}-q${i}"]:checked`);
            if (!selected) allAnswered = false;
        });
        return allAnswered;
    }

    nextBtn.addEventListener('click', function() {
        if (currentSection < sections.length - 1) {
            if (!validateSection(currentSection)) {
                feedback.textContent = "⚠️ Please answer all questions in this section before proceeding.";
                return;
            }
            feedback.textContent = "";
            currentSection++;
            showSection(currentSection);
        } else {
            if (!validateSection(currentSection)) {
                feedback.textContent = "⚠️ Please answer all questions in the final section before submitting.";
                return;
            }
            feedback.textContent = "";
            // Submit logic (XP, etc.)
            feedback.innerHTML = "🎉 Exam Submitted! XP granted.";
            nextBtn.disabled = true;
            prevBtn.disabled = true;
            if (typeof window.ovidhan !== 'undefined' && window.ovidhan.trackDailyChallenge) {
                window.ovidhan.trackDailyChallenge();
            }
        }
    });

    prevBtn.addEventListener('click', function() {
        if (currentSection > 0) {
            currentSection--;
            showSection(currentSection);
        }
    });

    // Show first section
    showSection(0);
});