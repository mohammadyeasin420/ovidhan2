'use strict';

const assert = require('node:assert/strict');
const {
    createLearningFoundation,
    createMemoryStorage,
    constants
} = require('../learning-foundation.js');

function fixedCrypto() {
    let counter = 0;
    return {
        randomUUID() {
            counter += 1;
            return '00000000-0000-4000-8000-' + String(counter).padStart(12, '0');
        }
    };
}

function clock(start) {
    let value = new Date(start);
    return {
        now: () => new Date(value),
        advance(ms) {
            value = new Date(value.getTime() + ms);
        }
    };
}

function createHarness(overrides) {
    const time = overrides && overrides.time ? overrides.time : clock('2026-08-16T12:00:00.000Z');
    const localStorage = overrides && overrides.localStorage ? overrides.localStorage : createMemoryStorage();
    const sessionStorage = overrides && overrides.sessionStorage ? overrides.sessionStorage : createMemoryStorage();
    const transported = [];
    const foundation = createLearningFoundation({
        localStorage,
        sessionStorage,
        crypto: fixedCrypto(),
        now: time.now,
        location: { hostname: 'localhost', pathname: '/test', search: '' },
        transport: (event, properties) => transported.push({ event, properties }),
        debug: true
    });
    return { foundation, localStorage, sessionStorage, transported, time };
}

function test(name, callback) {
    try {
        callback();
        console.log('PASS', name);
    } catch (error) {
        console.error('FAIL', name);
        throw error;
    }
}

test('new anonymous learner receives versioned state and random first-party ID', () => {
    const { foundation } = createHarness();
    const state = foundation.getState();
    assert.equal(state.version, 3);
    assert.match(state.anonymousLearnerId, /^[0-9a-f-]{36}$/);
    assert.equal(state.progress.learningActions, 0);
});

test('returning learner keeps anonymous ID and saved identifiers', () => {
    const first = createHarness();
    first.foundation.saveWord('Beautiful');
    const firstId = first.foundation.getState().anonymousLearnerId;
    const second = createHarness({
        localStorage: first.localStorage,
        sessionStorage: first.sessionStorage
    });
    assert.equal(second.foundation.getState().anonymousLearnerId, firstId);
    assert.deepEqual(second.foundation.getState().savedWords, ['beautiful']);
});

test('corrupted state recovers without breaking initialization', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY, '{not-json');
    const { foundation } = createHarness({ localStorage });
    assert.equal(foundation.getState().version, 3);
    assert.equal(foundation.getState().progress.learningActions, 0);
});

test('old foundation schema is normalized without losing identifiers', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY, JSON.stringify({
        version: 0,
        anonymousLearnerId: '11111111-1111-4111-8111-111111111111',
        savedWords: ['Language'],
        progress: { learningActions: 2 }
    }));
    const { foundation } = createHarness({ localStorage });
    const state = foundation.getState();
    assert.equal(state.version, 3);
    assert.equal(state.anonymousLearnerId, '11111111-1111-4111-8111-111111111111');
    assert.deepEqual(state.savedWords, ['language']);
    assert.equal(state.progress.learningActions, 2);
});

test('storage unavailable falls back to in-memory state', () => {
    const blocked = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
        removeItem() { throw new Error('blocked'); }
    };
    const { foundation } = createHarness({ localStorage: blocked, sessionStorage: blocked });
    assert.equal(foundation.storagePersistent, false);
    assert.equal(foundation.sessionPersistent, false);
    assert.equal(foundation.recordLearningAction('action-1', 'quiz', 'correct'), true);
    assert.equal(foundation.getState().progress.learningActions, 1);
});

test('legacy identifiers migrate non-destructively and old keys remain', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem('ovidhan_learned_words', JSON.stringify(['Apple']));
    localStorage.setItem('ovidhan_flashcards', JSON.stringify({ cards: [{ word: 'Water' }] }));
    localStorage.setItem('ovidhan_srs', JSON.stringify([{ word: 'Grammar' }]));
    const { foundation } = createHarness({ localStorage });
    const state = foundation.getState();
    assert.deepEqual(state.knownWords, ['apple']);
    assert.deepEqual(state.savedWords, ['water']);
    assert.deepEqual(state.mistakes, ['grammar']);
    assert.ok(localStorage.getItem('ovidhan_flashcards'));
    assert.ok(localStorage.getItem('ovidhan_srs'));
});

test('meaningful session actions increment once and emit 3/5 milestones', () => {
    const { foundation } = createHarness();
    assert.equal(foundation.recordLearningAction('a1', 'quiz', 'correct'), true);
    assert.equal(foundation.recordLearningAction('a1', 'quiz', 'correct'), false);
    ['a2', 'a3', 'a4', 'a5'].forEach(id => foundation.recordLearningAction(id, 'quiz', 'incorrect'));
    assert.equal(foundation.getSession().actionCount, 5);
    const events = foundation.debug().events.map(event => event.event);
    assert.equal(events.filter(event => event === 'learning_session_3_actions').length, 1);
    assert.equal(events.filter(event => event === 'learning_session_5_actions').length, 1);
});

test('event dedupe and property allowlist prevent arbitrary text collection', () => {
    const { foundation, transported } = createHarness();
    assert.equal(foundation.track('quiz_answered', {
        activity_id: 'q1',
        result: 'correct',
        option_id: 'a',
        arbitrary_typed_text: 'private sentence'
    }, { dedupeKey: 'q1' }), true);
    assert.equal(foundation.track('quiz_answered', { activity_id: 'q1' }, { dedupeKey: 'q1' }), false);
    assert.equal(transported.length, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(transported[0].properties, 'arbitrary_typed_text'), false);
});

test('event dedupe survives a page reload in the same session', () => {
    const first = createHarness();
    assert.equal(first.foundation.track('quiz_started', {
        activity_id: 'diagnostic',
        topic: 'grammar'
    }, { dedupeKey: 'diagnostic' }), true);
    const second = createHarness({
        localStorage: first.localStorage,
        sessionStorage: first.sessionStorage
    });
    assert.equal(second.foundation.track('quiz_started', {
        activity_id: 'diagnostic',
        topic: 'grammar'
    }, { dedupeKey: 'diagnostic' }), false);
});

test('unsupported future event is not emitted', () => {
    const { foundation, transported } = createHarness();
    assert.equal(foundation.track('mistake_mirror_generated', { text: 'no' }), false);
    assert.equal(transported.length, 0);
});

test('mistake signals migrate safely and record only bounded outcome metadata', () => {
    const { foundation } = createHarness();
    assert.equal(foundation.recordMistakeSignal('mm-agree-verb', 'initial', 'incorrect'), true);
    assert.equal(foundation.recordMistakeSignal('mm-agree-verb', 'repair', 'correct'), true);
    assert.equal(foundation.recordMistakeSignal('mm-agree-verb', 'retest', 'correct'), true);
    const signal = foundation.getState().mistakeSignals['mm-agree-verb'];
    assert.equal(signal.attempts, 3);
    assert.equal(signal.masteryStatus, 'secure');
    assert.equal(signal.initialIncorrect, 1);
    assert.equal(signal.repairCorrect, 1);
    assert.equal(signal.retestCorrect, 1);
    assert.equal(foundation.recordMistakeSignal('raw learner sentence', 'initial', 'correct'), false);
});

test('version-2 mistake signals migrate to bounded evidence counters', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY, JSON.stringify({
        version: 2,
        anonymousLearnerId: '22222222-2222-4222-8222-222222222222',
        mistakeSignals: {
            'mm-agree-verb': { attempts: 3, initialResult: 'incorrect', repairResult: 'correct', retestResult: 'correct' }
        }
    }));
    const { foundation } = createHarness({ localStorage });
    const state = foundation.getState();
    assert.equal(state.version, 3);
    assert.equal(state.mistakeSignals['mm-agree-verb'].initialIncorrect, 1);
    assert.equal(state.mistakeSignals['mm-agree-verb'].repairCorrect, 1);
    assert.equal(state.mistakeSignals['mm-agree-verb'].retestCorrect, 1);
});

test('Mistake Mirror events accept approved IDs and reject learner text', () => {
    const { foundation, transported } = createHarness();
    assert.equal(foundation.track('mistake_answer', {
        mistake_id: 'mm-agree-verb', mistake_family: 'agree-verb', result: 'incorrect',
        option_id: 'incorrect', attempt_number: 1, learner_text: 'private text'
    }), true);
    assert.equal(Object.hasOwn(transported[0].properties, 'learner_text'), false);
});

test('app CTA distinguishes view/click while install remains unknown', () => {
    const { foundation } = createHarness();
    foundation.track('app_cta_view', {
        cta_id: 'footer',
        cta_context: 'footer',
        install_status: 'unknown'
    }, { dedupeKey: 'footer' });
    foundation.track('app_cta_click', {
        cta_id: 'footer',
        cta_context: 'footer',
        install_status: 'unknown'
    }, { dedupeKey: 'footer' });
    const events = foundation.debug().events;
    assert.equal(events.length, 2);
    assert.ok(events.every(event => event.properties.install_status === 'unknown'));
});

test('Dakho CTA funnel remains allowlisted and never infers installation', () => {
    const { foundation, transported } = createHarness();
    foundation.track('dakho_cta_view', {
        cta_id: 'mistakes-section', cta_context: 'mistakes-section',
        trigger: 'common-mistakes-guide', install_status: 'unknown', raw_text: 'private'
    });
    foundation.track('dakho_cta_click', {
        cta_id: 'mistakes-section', cta_context: 'mistakes-section',
        trigger: 'common-mistakes-guide', install_status: 'unknown'
    });
    assert.deepEqual(transported.map(item => item.event), ['dakho_cta_view', 'dakho_cta_click']);
    assert.ok(transported.every(item => item.properties.install_status === 'unknown'));
    assert.ok(transported.every(item => !Object.hasOwn(item.properties, 'raw_text')));
});

test('profile analytics accepts only coarse allowlisted properties', () => {
    const { foundation, transported } = createHarness();
    foundation.track('mistake_profile_view', {
        profile_state: 'EVIDENCE', evidence_band: 'LOW', full_profile: 'private'
    });
    foundation.track('next_action_selected', {
        destination_id: 'mm-article-apple', skill_id: 'indefinite_article_a_an', family_id: 'ARTICLES', reason_code: 'WEAK_FAMILY',
        priority_band: 'MEDIUM', learner_text: 'private'
    });
    foundation.track('next_action_started', {
        destination_id: 'mm-article-apple', skill_id: 'indefinite_article_a_an', family_id: 'ARTICLES', reason_code: 'WEAK_FAMILY', priority_band: 'MEDIUM'
    });
    assert.deepEqual(transported.map(item => item.event), ['mistake_profile_view', 'next_action_selected', 'next_action_started']);
    assert.ok(transported.every(item => !Object.hasOwn(item.properties, 'full_profile')));
    assert.ok(transported.every(item => !Object.hasOwn(item.properties, 'learner_text')));
    assert.equal(transported[1].properties.skill_id, 'indefinite_article_a_an');
    assert.equal(transported[1].properties.family_id, 'ARTICLES');
});

test('reset creates a new learner without deleting legacy keys', () => {
    const { foundation, localStorage } = createHarness();
    localStorage.setItem('ovidhan_dashboard_data', JSON.stringify({ xp: 100 }));
    const before = foundation.getState().anonymousLearnerId;
    foundation.reset();
    assert.notEqual(foundation.getState().anonymousLearnerId, before);
    assert.ok(localStorage.getItem('ovidhan_dashboard_data'));
});

console.log('PASS all learning-foundation tests');
