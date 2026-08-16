/* Ovidhan Learning Foundation v1 — anonymous state and privacy-safe events. */
(function (root, factory) {
    const exported = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    }

    if (root && root.document) {
        const instance = exported.createLearningFoundation({ window: root });
        root.OvidhanLearning = instance;
        instance.initPilotInstrumentation();
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const STATE_KEY = 'ovidhan_learning_v1';
    const SESSION_KEY = 'ovidhan_learning_session_v1';
    const STATE_VERSION = 3;
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const MAX_IDENTIFIER_ITEMS = 250;
    const MAX_RECENT_ACTIONS = 50;
    const MAX_DEBUG_EVENTS = 100;

    const EVENT_PROPERTIES = Object.freeze({
        seo_landing: ['source_category'],
        answer_viewed: ['answer_type'],
        learning_action_started: ['action_id', 'action_type'],
        quiz_started: ['activity_id', 'topic'],
        quiz_answered: ['activity_id', 'result', 'attempt_number', 'option_id'],
        quiz_correct: ['activity_id', 'attempt_number'],
        quiz_incorrect: ['activity_id', 'attempt_number'],
        hear_word: ['content_id'],
        save_word: ['word_id'],
        mistake_saved: ['mistake_id'],
        next_learning_item: ['action_id', 'destination_id', 'reason_code'],
        learning_session_3_actions: ['action_count'],
        learning_session_5_actions: ['action_count'],
        app_cta_view: ['cta_id', 'cta_context', 'install_status'],
        app_cta_click: ['cta_id', 'cta_context', 'install_status']
        ,mistake_mirror_start: ['mistake_id', 'mistake_family']
        ,mistake_answer: ['mistake_id', 'mistake_family', 'result', 'option_id', 'attempt_number']
        ,mistake_repair_start: ['mistake_id', 'mistake_family']
        ,mistake_repair_result: ['mistake_id', 'mistake_family', 'result', 'option_id', 'attempt_number']
        ,mistake_retest_result: ['mistake_id', 'mistake_family', 'result', 'option_id', 'attempt_number']
        ,mistake_session_complete: ['mistake_id', 'mistake_family', 'result', 'mastery_status']
        ,mistake_next_action: ['mistake_id', 'destination_id', 'reason_code', 'score_band']
        ,dakho_cta_view: ['cta_id', 'cta_context', 'trigger', 'install_status']
        ,dakho_cta_click: ['cta_id', 'cta_context', 'trigger', 'install_status']
        ,mistake_profile_view: ['profile_state', 'evidence_band']
        ,next_action_selected: ['destination_id', 'skill_id', 'family_id', 'reason_code', 'priority_band']
        ,next_action_started: ['destination_id', 'skill_id', 'family_id', 'reason_code', 'priority_band']
    });

    const COMMON_PROPERTIES = Object.freeze([
        'page_id',
        'content_type',
        'intent',
        'goal'
    ]);

    function createMemoryStorage() {
        const values = Object.create(null);
        return {
            getItem(key) {
                return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
            },
            setItem(key, value) {
                values[key] = String(value);
            },
            removeItem(key) {
                delete values[key];
            }
        };
    }

    function safeStorage(candidate) {
        const fallback = createMemoryStorage();
        if (!candidate) return { storage: fallback, persistent: false };

        try {
            const probe = '__ovidhan_learning_probe__';
            candidate.setItem(probe, '1');
            candidate.removeItem(probe);
            return { storage: candidate, persistent: true };
        } catch (error) {
            return { storage: fallback, persistent: false };
        }
    }

    function readStorageCandidate(explicitStorage, windowObject, property) {
        if (explicitStorage) return explicitStorage;
        try {
            return windowObject ? windowObject[property] : null;
        } catch (error) {
            return null;
        }
    }

    function randomId(cryptoObject) {
        if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
            return cryptoObject.randomUUID();
        }

        if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            cryptoObject.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
        }

        return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
    }

    function uniqueIdentifiers(values) {
        const result = [];
        const seen = new Set();
        (Array.isArray(values) ? values : []).forEach(value => {
            const identifier = typeof value === 'string'
                ? value.trim().toLowerCase()
                : value && typeof value.word === 'string'
                    ? value.word.trim().toLowerCase()
                    : '';
            if (!identifier || identifier.length > 100 || seen.has(identifier)) return;
            seen.add(identifier);
            result.push(identifier);
        });
        return result.slice(-MAX_IDENTIFIER_ITEMS);
    }

    function parseObject(storage, key) {
        try {
            const raw = storage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function defaultState(id, nowIso) {
        return {
            version: STATE_VERSION,
            anonymousLearnerId: id,
            createdAt: nowIso,
            updatedAt: nowIso,
            goal: null,
            level: null,
            knownWords: [],
            weakWords: [],
            savedWords: [],
            mistakes: [],
            mistakeSignals: {},
            recentActions: [],
            progress: {
                learningActions: 0,
                correctActions: 0,
                incorrectActions: 0,
                lastActionAt: null
            },
            migrations: []
        };
    }

    function boundedCount(value, legacyMatch) {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric >= 0) return Math.min(99, Math.floor(numeric));
        return legacyMatch ? 1 : 0;
    }

    function normalizeState(candidate, id, nowIso) {
        const source = candidate && typeof candidate === 'object' ? candidate : {};
        const state = defaultState(
            typeof source.anonymousLearnerId === 'string' && source.anonymousLearnerId
                ? source.anonymousLearnerId
                : id,
            typeof source.createdAt === 'string' ? source.createdAt : nowIso
        );

        state.updatedAt = nowIso;
        state.goal = typeof source.goal === 'string' && source.goal.length <= 50 ? source.goal : null;
        state.level = typeof source.level === 'string' && source.level.length <= 20 ? source.level : null;
        state.knownWords = uniqueIdentifiers(source.knownWords);
        state.weakWords = uniqueIdentifiers(source.weakWords);
        state.savedWords = uniqueIdentifiers(source.savedWords);
        state.mistakes = uniqueIdentifiers(source.mistakes);
        if (source.mistakeSignals && typeof source.mistakeSignals === 'object' && !Array.isArray(source.mistakeSignals)) {
            Object.keys(source.mistakeSignals).slice(-MAX_IDENTIFIER_ITEMS).forEach(identifier => {
                if (!/^[a-z0-9-]{1,100}$/.test(identifier)) return;
                const signal = source.mistakeSignals[identifier] || {};
                state.mistakeSignals[identifier] = {
                    attempts: Math.max(0, Math.min(99, Math.floor(Number(signal.attempts) || 0))),
                    initialResult: signal.initialResult === 'correct' ? 'correct' : signal.initialResult === 'incorrect' ? 'incorrect' : null,
                    repairResult: signal.repairResult === 'correct' ? 'correct' : signal.repairResult === 'incorrect' ? 'incorrect' : null,
                    retestResult: signal.retestResult === 'correct' ? 'correct' : signal.retestResult === 'incorrect' ? 'incorrect' : null,
                    masteryStatus: ['needs-repair', 'improving', 'secure'].includes(signal.masteryStatus) ? signal.masteryStatus : 'needs-repair',
                    lastSeenAt: typeof signal.lastSeenAt === 'string' ? signal.lastSeenAt : nowIso,
                    initialCorrect: boundedCount(signal.initialCorrect, signal.initialResult === 'correct'),
                    initialIncorrect: boundedCount(signal.initialIncorrect, signal.initialResult === 'incorrect'),
                    repairCorrect: boundedCount(signal.repairCorrect, signal.repairResult === 'correct'),
                    repairIncorrect: boundedCount(signal.repairIncorrect, signal.repairResult === 'incorrect'),
                    retestCorrect: boundedCount(signal.retestCorrect, signal.retestResult === 'correct'),
                    retestIncorrect: boundedCount(signal.retestIncorrect, signal.retestResult === 'incorrect')
                };
            });
        }
        state.recentActions = Array.isArray(source.recentActions)
            ? source.recentActions.filter(item => item && typeof item.id === 'string').slice(-MAX_RECENT_ACTIONS).map(item => ({
                id: item.id.slice(0, 100),
                type: typeof item.type === 'string' ? item.type.slice(0, 40) : 'unknown',
                result: item.result === 'correct' || item.result === 'incorrect' ? item.result : null,
                at: typeof item.at === 'string' ? item.at : nowIso
            }))
            : [];

        if (source.progress && typeof source.progress === 'object') {
            ['learningActions', 'correctActions', 'incorrectActions'].forEach(key => {
                const value = Number(source.progress[key]);
                state.progress[key] = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
            });
            state.progress.lastActionAt = typeof source.progress.lastActionAt === 'string'
                ? source.progress.lastActionAt
                : null;
        }

        state.migrations = Array.isArray(source.migrations)
            ? source.migrations.filter(item => typeof item === 'string').slice(-20)
            : [];
        return state;
    }

    function migrateLegacyState(state, storage) {
        if (state.migrations.includes('legacy-identifiers-v1')) return state;

        const learnedWords = parseObject(storage, 'ovidhan_learned_words');
        const savedWords = parseObject(storage, 'ovidhan_saved_words');
        const flashcards = parseObject(storage, 'ovidhan_flashcards');
        const profile = parseObject(storage, 'ovidhan_user_profile');
        const srs = parseObject(storage, 'ovidhan_srs');

        const flashcardValues = Array.isArray(flashcards)
            ? flashcards
            : flashcards && Array.isArray(flashcards.cards)
                ? flashcards.cards
                : [];

        state.knownWords = uniqueIdentifiers([].concat(state.knownWords, Array.isArray(learnedWords) ? learnedWords : []));
        state.savedWords = uniqueIdentifiers([].concat(
            state.savedWords,
            Array.isArray(savedWords) ? savedWords : [],
            flashcardValues,
            profile && Array.isArray(profile.savedWords) ? profile.savedWords : []
        ));
        state.mistakes = uniqueIdentifiers([].concat(
            state.mistakes,
            Array.isArray(srs) ? srs : []
        ));
        state.migrations.push('legacy-identifiers-v1');
        return state;
    }

    function sanitizeValue(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') return value.slice(0, 100);
        return undefined;
    }

    function sourceCategory(documentObject, locationObject) {
        try {
            if (!documentObject || !documentObject.referrer) return 'direct_or_unknown';
            const referrer = new URL(documentObject.referrer, locationObject && locationObject.href);
            const host = referrer.hostname.toLowerCase();
            if (/google|bing|yahoo|duckduckgo/.test(host)) return 'search';
            if (/facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok/.test(host)) return 'social';
            if (locationObject && host === locationObject.hostname) return 'internal';
            return 'external';
        } catch (error) {
            return 'direct_or_unknown';
        }
    }

    function createLearningFoundation(options) {
        options = options || {};
        const windowObject = options.window || {};
        const documentObject = options.document || windowObject.document || null;
        const locationObject = options.location || windowObject.location || { hostname: '', search: '', pathname: '' };
        const cryptoObject = options.crypto || windowObject.crypto || null;
        const now = typeof options.now === 'function' ? options.now : () => new Date();
        const local = safeStorage(readStorageCandidate(options.localStorage, windowObject, 'localStorage'));
        const session = safeStorage(readStorageCandidate(options.sessionStorage, windowObject, 'sessionStorage'));
        const debugEvents = [];
        const emittedDedupeKeys = new Set();
        const debugEnabled = Boolean(options.debug) || /^(localhost|127\.0\.0\.1)$/.test(locationObject.hostname || '') || /(?:^|[?&])ovidhanDebug=1(?:&|$)/.test(locationObject.search || '');

        function saveState(state) {
            state.updatedAt = now().toISOString();
            try {
                local.storage.setItem(STATE_KEY, JSON.stringify(state));
            } catch (error) {
                // The memory-backed adapter or current in-memory value remains usable.
            }
            return state;
        }

        function loadState() {
            const nowIso = now().toISOString();
            let parsed = parseObject(local.storage, STATE_KEY);
            const learnerId = parsed && typeof parsed.anonymousLearnerId === 'string'
                ? parsed.anonymousLearnerId
                : randomId(cryptoObject);
            let state = normalizeState(parsed, learnerId, nowIso);
            state = migrateLegacyState(state, local.storage);
            return saveState(state);
        }

        let learnerState = loadState();

        function loadSession() {
            const currentTime = now().getTime();
            const parsed = parseObject(session.storage, SESSION_KEY);
            const expired = !parsed || !Number.isFinite(parsed.lastActivityMs) || currentTime - parsed.lastActivityMs > SESSION_TIMEOUT_MS;
            const current = expired ? {
                id: randomId(cryptoObject),
                startedAt: now().toISOString(),
                lastActivityMs: currentTime,
                actionCount: 0,
                actionIds: [],
                milestones: [],
                eventDedupeKeys: []
            } : parsed;

            current.lastActivityMs = currentTime;
            current.actionIds = Array.isArray(current.actionIds) ? current.actionIds.slice(-100) : [];
            current.milestones = Array.isArray(current.milestones) ? current.milestones : [];
            current.eventDedupeKeys = Array.isArray(current.eventDedupeKeys) ? current.eventDedupeKeys.slice(-200) : [];
            try {
                session.storage.setItem(SESSION_KEY, JSON.stringify(current));
            } catch (error) {
                // Session remains available in memory.
            }
            return current;
        }

        let learningSession = loadSession();

        function saveSession() {
            learningSession.lastActivityMs = now().getTime();
            try {
                session.storage.setItem(SESSION_KEY, JSON.stringify(learningSession));
            } catch (error) {
                // No product behavior depends on persistence.
            }
        }

        function pageContext() {
            const body = documentObject && documentObject.body;
            return {
                page_id: body && body.dataset.learningSurface ? body.dataset.learningSurface : (locationObject.pathname || 'unknown').slice(0, 100),
                content_type: body && body.dataset.learningContentType ? body.dataset.learningContentType : 'unknown',
                intent: body && body.dataset.learningIntent ? body.dataset.learningIntent : 'unknown',
                goal: learnerState.goal || 'unknown'
            };
        }

        function sanitizedProperties(eventName, properties) {
            const allowed = new Set(COMMON_PROPERTIES.concat(EVENT_PROPERTIES[eventName] || []));
            const source = Object.assign({}, pageContext(), properties || {});
            const clean = {};
            Object.keys(source).forEach(key => {
                if (!allowed.has(key)) return;
                const value = sanitizeValue(source[key]);
                if (value !== undefined) clean[key] = value;
            });
            return clean;
        }

        function sendToExistingAnalytics(eventName, properties) {
            try {
                if (typeof options.transport === 'function') {
                    options.transport(eventName, properties);
                    return;
                }
                if (typeof windowObject.gtag === 'function') {
                    windowObject.gtag('event', eventName, properties);
                }
            } catch (error) {
                // Analytics transport must never break the page.
            }
        }

        function track(eventName, properties, settings) {
            if (!Object.prototype.hasOwnProperty.call(EVENT_PROPERTIES, eventName)) return false;
            settings = settings || {};
            const dedupeKey = settings.dedupeKey ? eventName + ':' + settings.dedupeKey : null;
            if (dedupeKey && (emittedDedupeKeys.has(dedupeKey) || learningSession.eventDedupeKeys.includes(dedupeKey))) return false;
            if (dedupeKey) {
                emittedDedupeKeys.add(dedupeKey);
                learningSession.eventDedupeKeys.push(dedupeKey);
                learningSession.eventDedupeKeys = learningSession.eventDedupeKeys.slice(-200);
                saveSession();
            }

            const event = {
                event: eventName,
                timestamp: now().toISOString(),
                eventVersion: 1,
                anonymousLearnerId: learnerState.anonymousLearnerId,
                sessionId: learningSession.id,
                properties: sanitizedProperties(eventName, properties)
            };
            debugEvents.push(event);
            if (debugEvents.length > MAX_DEBUG_EVENTS) debugEvents.shift();
            if (debugEnabled && windowObject.console && typeof windowObject.console.debug === 'function') {
                windowObject.console.debug('[OvidhanLearning]', eventName, event.properties);
            }
            sendToExistingAnalytics(eventName, event.properties);
            return true;
        }

        function recordLearningAction(actionId, actionType, result) {
            if (typeof actionId !== 'string' || !actionId || learningSession.actionIds.includes(actionId)) return false;
            learningSession.actionIds.push(actionId.slice(0, 100));
            learningSession.actionCount += 1;
            saveSession();

            learnerState.progress.learningActions += 1;
            if (result === 'correct') learnerState.progress.correctActions += 1;
            if (result === 'incorrect') learnerState.progress.incorrectActions += 1;
            learnerState.progress.lastActionAt = now().toISOString();
            learnerState.recentActions.push({
                id: actionId.slice(0, 100),
                type: typeof actionType === 'string' ? actionType.slice(0, 40) : 'unknown',
                result: result === 'correct' || result === 'incorrect' ? result : null,
                at: now().toISOString()
            });
            learnerState.recentActions = learnerState.recentActions.slice(-MAX_RECENT_ACTIONS);
            saveState(learnerState);
            if (debugEnabled && documentObject && documentObject.documentElement) {
                documentObject.documentElement.dataset.learningSessionActions = String(learningSession.actionCount);
            }

            [3, 5].forEach(milestone => {
                if (learningSession.actionCount === milestone && !learningSession.milestones.includes(milestone)) {
                    learningSession.milestones.push(milestone);
                    saveSession();
                    track('learning_session_' + milestone + '_actions', { action_count: milestone }, { dedupeKey: String(milestone) });
                }
            });
            return true;
        }

        function saveWord(wordId) {
            const next = uniqueIdentifiers(learnerState.savedWords.concat([wordId]));
            if (next.length === learnerState.savedWords.length) return false;
            learnerState.savedWords = next;
            saveState(learnerState);
            track('save_word', { word_id: wordId }, { dedupeKey: wordId });
            return true;
        }

        function saveMistake(mistakeId) {
            const next = uniqueIdentifiers(learnerState.mistakes.concat([mistakeId]));
            if (next.length === learnerState.mistakes.length) return false;
            learnerState.mistakes = next;
            saveState(learnerState);
            track('mistake_saved', { mistake_id: mistakeId }, { dedupeKey: mistakeId });
            return true;
        }

        function recordMistakeSignal(mistakeId, stage, result) {
            if (!/^[a-z0-9-]{1,100}$/.test(mistakeId) || !['initial', 'repair', 'retest'].includes(stage)) return false;
            if (result !== 'correct' && result !== 'incorrect') return false;
            const previous = learnerState.mistakeSignals[mistakeId] || {
                attempts: 0, initialResult: null, repairResult: null, retestResult: null,
                masteryStatus: 'needs-repair', lastSeenAt: now().toISOString(),
                initialCorrect: 0, initialIncorrect: 0, repairCorrect: 0,
                repairIncorrect: 0, retestCorrect: 0, retestIncorrect: 0
            };
            previous.attempts = Math.min(99, previous.attempts + 1);
            previous[stage + 'Result'] = result;
            const countKey = stage + (result === 'correct' ? 'Correct' : 'Incorrect');
            previous[countKey] = Math.min(99, (Number(previous[countKey]) || 0) + 1);
            previous.lastSeenAt = now().toISOString();
            previous.masteryStatus = previous.retestResult === 'correct'
                ? 'secure'
                : previous.repairResult === 'correct' ? 'improving' : 'needs-repair';
            learnerState.mistakeSignals[mistakeId] = previous;
            saveState(learnerState);
            return true;
        }

        function setGoal(goal) {
            learnerState.goal = typeof goal === 'string' && goal.length <= 50 ? goal : null;
            saveState(learnerState);
            return learnerState.goal;
        }

        function reset() {
            try {
                local.storage.removeItem(STATE_KEY);
                session.storage.removeItem(SESSION_KEY);
            } catch (error) {
                // A fresh in-memory state is still created.
            }
            learnerState = normalizeState(null, randomId(cryptoObject), now().toISOString());
            learnerState.migrations.push('legacy-identifiers-v1');
            learningSession = {
                id: randomId(cryptoObject),
                startedAt: now().toISOString(),
                lastActivityMs: now().getTime(),
                actionCount: 0,
                actionIds: [],
                milestones: [],
                eventDedupeKeys: []
            };
            saveState(learnerState);
            saveSession();
            emittedDedupeKeys.clear();
            debugEvents.length = 0;
        }

        function ctaId(anchor) {
            return anchor && anchor.dataset && anchor.dataset.learningCta
                ? anchor.dataset.learningCta
                : 'app-link';
        }

        function initPilotInstrumentation() {
            if (!documentObject) return;
            const start = () => {
                const body = documentObject.body;
                if (!body || body.dataset.learningInstrumentation !== 'common-mistakes-3b') return;
                if (documentObject.documentElement) {
                    documentObject.documentElement.dataset.learningFoundation = 'ready';
                    if (debugEnabled) {
                        documentObject.documentElement.dataset.learningSessionActions = String(learningSession.actionCount);
                    }
                }

                const source = sourceCategory(documentObject, locationObject);
                if (source === 'search' || source === 'social') {
                    track('seo_landing', { source_category: source }, { dedupeKey: 'landing' });
                }

                const hero = documentObject.querySelector('.hero');
                if (hero && typeof windowObject.IntersectionObserver === 'function') {
                    const answerObserver = new windowObject.IntersectionObserver(entries => {
                        if (!entries.some(entry => entry.isIntersecting)) return;
                        track('answer_viewed', { answer_type: 'common-mistakes-guide' }, { dedupeKey: 'primary-answer' });
                        answerObserver.disconnect();
                    }, { threshold: 0.25 });
                    answerObserver.observe(hero);
                }

                const diagnostic = documentObject.getElementById('diagnosticBox');
                if (diagnostic) {
                    diagnostic.addEventListener('click', event => {
                        const button = event.target.closest && event.target.closest('.btn-option');
                        if (!button || !diagnostic.contains(button)) return;
                        const activityId = 'common-mistakes-diagnostic-' + button.dataset.index;
                        track('quiz_started', { activity_id: 'common-mistakes-diagnostic', topic: 'grammar-mistakes' }, { dedupeKey: 'common-mistakes-diagnostic' });
                        const inspectResult = () => {
                            const result = button.classList.contains('selected-correct') ? 'correct' : 'incorrect';
                            const attemptNumber = 1;
                            const isNew = track('quiz_answered', {
                                activity_id: activityId,
                                result,
                                attempt_number: attemptNumber,
                                option_id: button.dataset.value || 'unknown'
                            }, { dedupeKey: activityId });
                            if (!isNew) return;
                            track(result === 'correct' ? 'quiz_correct' : 'quiz_incorrect', {
                                activity_id: activityId,
                                attempt_number: attemptNumber
                            }, { dedupeKey: activityId });
                            recordLearningAction(activityId, 'diagnostic-question', result);
                        };
                        if (typeof windowObject.requestAnimationFrame === 'function') {
                            windowObject.requestAnimationFrame(inspectResult);
                        } else {
                            inspectResult();
                        }
                    });
                }

                const appLinks = Array.from(documentObject.querySelectorAll('a[data-learning-cta]'));
                if (typeof windowObject.IntersectionObserver === 'function') {
                    const ctaObserver = new windowObject.IntersectionObserver(entries => {
                        entries.forEach(entry => {
                            if (!entry.isIntersecting) return;
                            const id = ctaId(entry.target);
                            track('app_cta_view', {
                                cta_id: id,
                                cta_context: id,
                                install_status: 'unknown'
                            }, { dedupeKey: id });
                            track('dakho_cta_view', {
                                cta_id: id,
                                cta_context: id,
                                trigger: 'common-mistakes-guide',
                                install_status: 'unknown'
                            }, { dedupeKey: id });
                            ctaObserver.unobserve(entry.target);
                        });
                    }, { threshold: 0.5 });
                    appLinks.forEach(link => ctaObserver.observe(link));
                }

                documentObject.addEventListener('click', event => {
                    const anchor = event.target.closest && event.target.closest('a[data-learning-cta]');
                    if (!anchor) return;
                    const id = ctaId(anchor);
                    track('app_cta_click', {
                        cta_id: id,
                        cta_context: id,
                        install_status: 'unknown'
                    }, { dedupeKey: id });
                    track('dakho_cta_click', {
                        cta_id: id,
                        cta_context: id,
                        trigger: 'common-mistakes-guide',
                        install_status: 'unknown'
                    }, { dedupeKey: id });
                });
            };

            if (documentObject.readyState === 'loading') {
                documentObject.addEventListener('DOMContentLoaded', start, { once: true });
            } else {
                start();
            }
        }

        return Object.freeze({
            version: STATE_VERSION,
            track,
            recordLearningAction,
            saveWord,
            saveMistake,
            recordMistakeSignal,
            setGoal,
            reset,
            getState: () => JSON.parse(JSON.stringify(learnerState)),
            getSession: () => JSON.parse(JSON.stringify(learningSession)),
            storagePersistent: local.persistent,
            sessionPersistent: session.persistent,
            initPilotInstrumentation,
            debug: () => debugEnabled ? {
                enabled: true,
                state: JSON.parse(JSON.stringify(learnerState)),
                session: JSON.parse(JSON.stringify(learningSession)),
                events: JSON.parse(JSON.stringify(debugEvents))
            } : { enabled: false }
        });
    }

    return {
        createLearningFoundation,
        createMemoryStorage,
        constants: Object.freeze({
            STATE_KEY,
            SESSION_KEY,
            STATE_VERSION,
            SESSION_TIMEOUT_MS
        })
    };
});
