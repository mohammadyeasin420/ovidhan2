document.addEventListener('DOMContentLoaded', function() {
    console.log("📘 Lesson engine loaded");

    // Get the dialogue container and all dialogue lines
    const dialogueArea = document.getElementById('dialogue-area');
    if (!dialogueArea) {
        console.warn("No dialogue-area found – not a speaking page.");
        return;
    }

    // Read XP reward from the data-xp attribute (default 15)
    const xpReward = parseInt(dialogueArea.dataset.xp) || 15;
    console.log(`🎯 XP for this lesson: ${xpReward}`);

    const dialogueParas = dialogueArea.querySelectorAll('p');
    let currentIndex = 0;

    // Helper: Extract just the English part from the static HTML
    function getCurrentEnglish() {
        const p = dialogueParas[currentIndex];
        if (!p) return "";
        const fullText = p.innerText;
        const lastParen = fullText.lastIndexOf('(');
        if (lastParen !== -1) {
            return fullText.substring(0, lastParen).trim();
        }
        return fullText.trim();
    }

    // Helper: Get the speaker name (optional, not used now)
    function getCurrentSpeaker() {
        const p = dialogueParas[currentIndex];
        if (!p) return "";
        const strong = p.querySelector('strong');
        return strong ? strong.innerText.replace(':', '') : "";
    }

    // --- LISTEN BUTTON LOGIC ---
    const btnListen = document.getElementById('btn-listen');
    if (btnListen) {
        btnListen.addEventListener('click', function() {
            const text = getCurrentEnglish();
            if (!text) {
                alert("No dialogue to read!");
                return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
            console.log("🔊 Speaking:", text);
        });
    }

    // --- SPEAK & CHECK BUTTON LOGIC ---
    const btnSpeak = document.getElementById('btn-speak');
    if (!btnSpeak) {
        console.warn("⚠️ Button #btn-speak not found.");
        return;
    }

    btnSpeak.addEventListener('click', function() {
        const targetText = getCurrentEnglish();
        if (!targetText) {
            console.warn("No current dialogue text.");
            return;
        }

        // Check if SpeechRecognition is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const feedback = document.getElementById('transcript-feedback');
            if (feedback) {
                feedback.innerHTML = "⚠️ Your browser does not support speech recognition. Please use Chrome or Edge.";
            }
            console.error("SpeechRecognition not supported.");
            return;
        }

        // Request microphone permission explicitly (only works on HTTPS/localhost)
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;

        recognition.onstart = function() {
            console.log("🎙️ Recognition started – speak now!");
        };

        recognition.onend = function() {
            console.log("🎙️ Recognition ended.");
        };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const feedback = document.getElementById('transcript-feedback');
            if (!feedback) return;

            console.log("🎤 Transcript:", transcript);

            // Calculate score (check if target words are present)
            const targetWords = targetText.toLowerCase().split(' ');
            const spokenWords = transcript.toLowerCase().split(' ');
            const matchCount = targetWords.filter(word => spokenWords.includes(word)).length;
            const score = (matchCount / targetWords.length) * 100;

            feedback.innerHTML = `<strong>You said:</strong> "${transcript}"<br>`;

            if (score > 70) {
                feedback.innerHTML += `<span style="color: var(--green);">✅ Great! (Accuracy: ${Math.round(score)}%)</span>`;
                // Move to next line automatically if there is one
                if (currentIndex < dialogueParas.length - 1) {
                    currentIndex++;
                    dialogueParas.forEach(p => p.style.background = 'transparent');
                    dialogueParas[currentIndex].style.background = 'var(--gold-dim)';
                    console.log(`➡️ Moving to line ${currentIndex + 1}`);
                } else {
                    // Lesson Complete!
                    feedback.innerHTML += `<br><span style="color: var(--gold);">🎉 Lesson Complete! +${xpReward} XP</span>`;
                    // Trigger dashboard update
                    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.trackDailyChallenge) {
                        window.ovidhan.trackDailyChallenge();
                        console.log("📊 Dashboard updated with +XP");
                    }
                }
            } else {
                feedback.innerHTML += `<span style="color: var(--orange);">🔁 Try again. Listen carefully and repeat. (Accuracy: ${Math.round(score)}%)</span>`;
            }
        };

        recognition.onerror = function(event) {
            const feedback = document.getElementById('transcript-feedback');
            if (!feedback) return;
            console.error("Speech recognition error:", event.error);
            if (event.error === 'not-allowed') {
                feedback.innerHTML = "⚠️ Microphone access denied. Please allow microphone in your browser settings (click the lock icon in the address bar).";
            } else if (event.error === 'no-speech') {
                feedback.innerHTML = "⚠️ No speech detected. Please speak clearly into the microphone.";
            } else if (event.error === 'audio-capture') {
                feedback.innerHTML = "⚠️ No microphone found. Please connect a microphone and try again.";
            } else {
                feedback.innerHTML = `⚠️ Error: ${event.error}. Reload the page and try again.`;
            }
        };

        // Start recognition
        console.log("Starting recognition...");
        recognition.start();
    });

    // Highlight the first line on load
    if (dialogueParas.length > 0) {
        dialogueParas[0].style.background = 'var(--gold-dim)';
        console.log("✅ First line highlighted");
    }
});