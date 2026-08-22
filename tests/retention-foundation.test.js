'use strict';

const assert = require('node:assert/strict');
const { createLearningFoundation, createMemoryStorage, constants } = require('../learning-foundation.js');
const profile = require('../mistake-profile.js');
const graph = require('../skill-mistake-graph.json');
const { items } = require('../mistake-mirror.js');

function clock(start) {
    let value = new Date(start);
    return { now: () => new Date(value), advance: ms => { value = new Date(value.getTime() + ms); } };
}

function crypto() {
    let n = 0;
    return { randomUUID: () => '30000000-0000-4000-8000-' + String(++n).padStart(12, '0') };
}

function create(options) {
    options = options || {};
    return createLearningFoundation({
        localStorage: options.localStorage || createMemoryStorage(),
        sessionStorage: options.sessionStorage || createMemoryStorage(),
        now: options.time ? options.time.now : clock('2026-08-16T12:00:00Z').now,
        crypto: crypto(),
        location: { hostname: 'localhost', pathname: '/common-mistakes-bangladeshi-learners.html', search: '' },
        transport: options.transport,
        debug: true
    });
}

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

scenario('new learner remains discovered until learning', () => {
    assert.equal(create({}).getRetention().journeyStage, 'DISCOVERED');
});

scenario('same-day session does not become a meaningful return', () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const time = clock('2026-08-16T08:00:00Z');
    create({ localStorage, sessionStorage, time }).recordLearningAction('one', 'quiz', 'correct');
    time.advance(constants.SESSION_TIMEOUT_MS + 1);
    const later = create({ localStorage, sessionStorage, time });
    later.recordLearningAction('two', 'quiz', 'correct');
    assert.equal(later.getRetention().lastReturnBucket, null);
});

scenario('next-day action is a D1 meaningful return', () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const time = clock('2026-08-16T08:00:00Z');
    create({ localStorage, sessionStorage, time }).recordLearningAction('one', 'quiz', 'incorrect');
    time.advance(86400000 + constants.SESSION_TIMEOUT_MS);
    const later = create({ localStorage, sessionStorage, time });
    later.recordLearningAction('two', 'quiz', 'correct');
    assert.equal(later.getRetention().lastReturnBucket, 'D1');
    assert.equal(later.getRetention().journeyStage, 'RETURNING');
});

scenario('return with unresolved mistake keeps failed retest first', () => {
    const state = { mistakeSignals: {
        'mm-listen-to': { attempts:3,initialCorrect:0,initialIncorrect:1,repairCorrect:0,repairIncorrect:1,retestCorrect:0,retestIncorrect:1,retestResult:'incorrect' }
    }, recentActions: [] };
    const next = profile.recommendNext(items, state, null, Date.parse('2026-08-17T12:00:00Z'), graph);
    assert.equal(next.item.id, 'mm-listen-to');
    assert.equal(next.reason_code, 'FAILED_RETEST');
});

scenario('return after improvement remains deterministic', () => {
    const state = { mistakeSignals: {
        'mm-good-at': { attempts:3,initialCorrect:0,initialIncorrect:1,repairCorrect:1,repairIncorrect:0,retestCorrect:1,retestIncorrect:0,initialResult:'incorrect',repairResult:'correct',retestResult:'correct' }
    }, recentActions: [{ id:'mistake-mirror:mm-good-at' }] };
    const first = profile.recommendNext(items, state, 'mm-good-at', Date.parse('2026-08-17T12:00:00Z'), graph);
    const second = profile.recommendNext(items, state, 'mm-good-at', Date.parse('2026-08-17T12:00:00Z'), graph);
    assert.equal(first.item.id, second.item.id);
    assert.notEqual(first.item.id, 'mm-good-at');
});

scenario('corrupt storage recovers to bounded current-version retention', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY, '{broken');
    const learner = create({ localStorage });
    assert.equal(learner.getState().version, 5);
    assert.equal(learner.getRetention().meaningfulActionCount, 0);
});

scenario('analytics unavailable never blocks learning', () => {
    const learner = create({ transport: undefined });
    assert.doesNotThrow(() => learner.recordLearningAction('safe', 'quiz', 'correct'));
    assert.equal(learner.getRetention().meaningfulActionCount, 1);
});

console.log('PASS 7 Phase 3H retention scenarios');
