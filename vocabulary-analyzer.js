// Replace the existing saveWordToFlashcard function with this:
function saveWordToFlashcard(word) {
    // Add to SRS (Mistake Notebook) - NEW
    if (typeof window.ovidhan !== 'undefined' && window.ovidhan.addToSRS) {
        window.ovidhan.addToSRS(word);
        alert(`✅ "${word}" added to your SRS Mistake Notebook!`);
    } else {
        // Fallback to simple localStorage if SRS isn't loaded
        let flashcards = JSON.parse(localStorage.getItem('ovidhan_flashcards') || '[]');
        if (!flashcards.includes(word)) {
            flashcards.push(word);
            localStorage.setItem('ovidhan_flashcards', JSON.stringify(flashcards));
            alert(`✅ "${word}" added to flashcards!`);
        } else {
            alert(`⚠️ "${word}" already saved.`);
        }
    }
}