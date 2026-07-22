// ── Gamification Engine ──
const GAMIFICATION_KEY = 'ovidhan_gamification';

function getDefaultStats() {
    return {
        xp: 0,
        level: 1,
        streak: 0,
        lastActiveDate: null,
        achievements: [],
        totalQuizzesTaken: 0,
        totalWordsLearned: 0,
        dailyChallengeCompleted: false,
        lastChallengeDate: null
    };
}

function loadStats() {
    try {
        const data = localStorage.getItem(GAMIFICATION_KEY);
        if (!data) return getDefaultStats();
        const parsed = JSON.parse(data);
        const defaults = getDefaultStats();
        for (let key in defaults) {
            if (!(key in parsed)) parsed[key] = defaults[key];
        }
        return parsed;
    } catch (e) {
        return getDefaultStats();
    }
}

function saveStats(stats) {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(stats));
}

function updateStreak() {
    const stats = loadStats();
    const today = new Date().toDateString();
    if (stats.lastActiveDate === today) return stats;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastActiveDate === yesterday.toDateString()) {
        stats.streak += 1;
    } else if (stats.lastActiveDate !== today) {
        stats.streak = 1;
    }
    stats.lastActiveDate = today;
    saveStats(stats);
    return stats;
}

function addXP(amount) {
    const stats = loadStats();
    stats.xp += amount;
    const newLevel = Math.floor(stats.xp / 100) + 1;
    if (newLevel > stats.level) {
        stats.level = newLevel;
        unlockAchievement('level_' + newLevel);
    }
    saveStats(stats);
    return stats;
}

function unlockAchievement(id) {
    const stats = loadStats();
    if (!stats.achievements.includes(id)) {
        stats.achievements.push(id);
        saveStats(stats);
        return true;
    }
    return false;
}

function completeDailyChallenge() {
    const stats = loadStats();
    const today = new Date().toDateString();
    if (stats.lastChallengeDate === today) return false;
    stats.lastChallengeDate = today;
    stats.dailyChallengeCompleted = true;
    addXP(20);
    updateStreak();
    saveStats(stats);
    return true;
}

function getXPProgress(stats) {
    const currentLevelXP = (stats.level - 1) * 100;
    const xpInLevel = stats.xp - currentLevelXP;
    return { current: xpInLevel, needed: 100, percent: Math.min((xpInLevel / 100) * 100, 100) };
}

window.OvidhanGamification = {
    loadStats,
    saveStats,
    updateStreak,
    addXP,
    unlockAchievement,
    completeDailyChallenge,
    getXPProgress
};