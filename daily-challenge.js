// ── Daily Challenge Engine ──
const DAILY_CHALLENGES = [
    { id: 'write_sentence', icon: '✍️', title: 'Write a Sentence', description: 'Write 3 sentences using the word of the day.', duration: '5 min', type: 'writing' },
    { id: 'speak_aloud', icon: '🎤', title: 'Speak Aloud', description: 'Read a paragraph aloud. Record yourself.', duration: '5 min', type: 'speaking' },
    { id: 'read_passage', icon: '📖', title: 'Read a Passage', description: 'Read a short passage and answer 3 questions.', duration: '7 min', type: 'reading' },
    { id: 'listen_repeat', icon: '🎧', title: 'Listen & Repeat', description: 'Listen to a recording and repeat it back.', duration: '5 min', type: 'listening' },
    { id: 'vocab_quiz', icon: '📚', title: 'Vocabulary Quiz', description: 'Take a 5-question vocabulary quiz.', duration: '3 min', type: 'quiz' },
    { id: 'grammar_fix', icon: '✅', title: 'Fix the Grammar', description: 'Find and correct 3 grammar mistakes.', duration: '4 min', type: 'writing' },
    { id: 'daily_dialogue', icon: '💬', title: 'Daily Dialogue', description: 'Read and practice a short dialogue.', duration: '6 min', type: 'speaking' },
];

function getDailyChallenge() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const index = dayOfYear % DAILY_CHALLENGES.length;
    return DAILY_CHALLENGES[index];
}

function isChallengeCompleted() {
    const stats = window.OvidhanGamification.loadStats();
    const today = new Date().toDateString();
    return stats.lastChallengeDate === today && stats.dailyChallengeCompleted;
}

function completeChallenge() {
    return window.OvidhanGamification.completeDailyChallenge();
}

window.DailyChallenge = {
    getDailyChallenge,
    isChallengeCompleted,
    completeChallenge
};