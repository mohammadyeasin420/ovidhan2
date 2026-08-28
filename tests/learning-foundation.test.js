'use strict';

const assert = require('node:assert/strict');
const {
    createLearningFoundation,
    createMemoryStorage,
    retentionBucket,
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
    assert.equal(state.version, 8);
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
    assert.equal(foundation.getState().version, 8);
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
    assert.equal(state.version, 8);
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

test('new learner activates only after a genuine learning action', () => {
    const { foundation } = createHarness();
    assert.equal(foundation.getRetention().journeyStage, 'DISCOVERED');
    foundation.recordLearningAction('first', 'quiz', 'correct');
    const retention = foundation.getRetention();
    assert.equal(retention.journeyStage, 'ACTIVATED');
    assert.equal(retention.sessionCount, 1);
    assert.equal(retention.meaningfulActionCount, 1);
    assert.equal(retention.learningDays.length, 1);
});

test('refresh in the same session is not a learner return', () => {
    const first = createHarness();
    first.foundation.recordLearningAction('first', 'quiz', 'correct');
    const second = createHarness({ localStorage: first.localStorage, sessionStorage: first.sessionStorage, time: first.time });
    second.foundation.recordLearningAction('second', 'quiz', 'correct');
    assert.equal(second.foundation.getRetention().learningDays.length, 1);
    assert.equal(second.foundation.getRetention().returningLearnerActionCount, 0);
    assert.equal(second.transported.some(item => item.event === 'learner_return'), false);
});

test('same-day new session is not a meaningful return', () => {
    const first = createHarness();
    first.foundation.recordLearningAction('first', 'quiz', 'correct');
    first.time.advance(constants.SESSION_TIMEOUT_MS + 1000);
    const second = createHarness({ localStorage: first.localStorage, sessionStorage: first.sessionStorage, time: first.time });
    second.foundation.recordLearningAction('second', 'quiz', 'correct');
    assert.equal(second.foundation.getRetention().sessionCount, 2);
    assert.equal(second.foundation.getRetention().returningLearnerActionCount, 0);
    assert.equal(second.transported.some(item => item.event === 'learner_return'), false);
});

test('next-day learning action creates one meaningful return', () => {
    const first = createHarness();
    first.foundation.recordLearningAction('first', 'quiz', 'incorrect');
    first.time.advance(86400000 + constants.SESSION_TIMEOUT_MS);
    const second = createHarness({ localStorage: first.localStorage, sessionStorage: first.sessionStorage, time: first.time });
    second.foundation.recordLearningAction('second', 'quiz', 'correct');
    const retention = second.foundation.getRetention();
    assert.equal(retention.lastReturnBucket, 'D1');
    assert.equal(retention.returningLearnerActionCount, 1);
    assert.equal(retention.journeyStage, 'RETURNING');
    assert.deepEqual(second.transported.filter(item => item.event === 'learner_return').map(item => item.properties.return_bucket), ['D1']);
});

test('D1 D7 and D30 return buckets are deterministic', () => {
    assert.equal(retentionBucket(0), null);
    assert.equal(retentionBucket(1), 'D1');
    assert.equal(retentionBucket(2), 'D7');
    assert.equal(retentionBucket(7), 'D7');
    assert.equal(retentionBucket(8), 'D30');
    assert.equal(retentionBucket(30), 'D30');
    assert.equal(retentionBucket(31), 'LATER');
});

test('retention state is bounded during normalization', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY, JSON.stringify({
        version: 4,
        retention: {
            sessionCount: 999999,
            meaningfulActionCount: 999999,
            returningLearnerActionCount: 999999,
            firstSessionLearningActions: 999999,
            learningDays: Array.from({ length: 120 }, (_, index) => '2026-' + String(Math.floor(index / 28) + 1).padStart(2, '0') + '-' + String(index % 28 + 1).padStart(2, '0'))
        }
    }));
    const { foundation } = createHarness({ localStorage });
    const retention = foundation.getRetention();
    assert.equal(retention.sessionCount, constants.MAX_RETENTION_COUNT);
    assert.equal(retention.meaningfulActionCount, constants.MAX_RETENTION_COUNT);
    assert.equal(retention.firstSessionLearningActions, 99);
    assert.equal(retention.learningDays.length, constants.MAX_LEARNING_DAYS);
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
    assert.equal(state.version, 8);
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

test('BCS analytics strips candidate identifiers', () => {
    const { foundation, transported } = createHarness();
    assert.equal(foundation.track('bcs_stage_selected', {
        stage_id: 'PRELIMINARY_PREPARATION', surface: 'stage-selector', roll_number: '123456', name: 'Private'
    }), true);
    assert.equal(transported[0].properties.stage_id, 'PRELIMINARY_PREPARATION');
    assert.equal(transported[0].properties.roll_number, undefined);
    assert.equal(transported[0].properties.name, undefined);
    assert.equal(foundation.track('bcs_official_source_open', {
        source_type: 'OFFICIAL_BPSC', surface: 'official-information', registration_number: 'secret'
    }), true);
    assert.equal(transported[1].properties.source_type, 'OFFICIAL_BPSC');
    assert.equal(transported[1].properties.registration_number, undefined);
});

test('learner goals use stable IDs while legacy values route safely', () => {
    const { foundation } = createHarness();
    assert.equal(foundation.getRoutingGoal(), 'GENERAL_ENGLISH');
    assert.equal(foundation.setGoal('BCS'), 'BCS');
    assert.equal(foundation.getRoutingGoal(), 'BCS');
    assert.equal(foundation.setGoal('free form legacy goal'), 'BCS');
    assert.equal(foundation.getState().goal, 'BCS');
    foundation.setGoal(null);
    assert.equal(foundation.getRoutingGoal(), 'GENERAL_ENGLISH');
});

test('unknown persisted legacy goal is preserved but receives safe routing fallback', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY, JSON.stringify({version:4,anonymousLearnerId:'11111111-1111-4111-8111-111111111111',goal:'legacy-custom-goal'}));
    const foundation = createLearningFoundation({localStorage});
    assert.equal(foundation.getState().goal, 'legacy-custom-goal');
    assert.equal(foundation.getRoutingGoal(), 'GENERAL_ENGLISH');
});

test('canonical skill evidence is bounded, validated, and deduplicated by evidence ID', () => {
    const { foundation } = createHarness();
    assert.equal(foundation.recordSkillEvidence('ielts-diagnostic-v1:q01','essay_thesis_focus','DIAGNOSTIC_OBJECTIVE','incorrect','ielts-diagnostic-v1'),true);
    assert.equal(foundation.recordSkillEvidence('ielts-diagnostic-v1:q01','essay_thesis_focus','DIAGNOSTIC_OBJECTIVE','correct','ielts-diagnostic-v1'),true);
    const state=foundation.getState();
    assert.equal(Object.keys(state.skillEvidence).length,1);
    assert.equal(state.skillEvidence['ielts-diagnostic-v1:q01'].attempts,2);
    assert.equal(state.skillEvidence['ielts-diagnostic-v1:q01'].result,'correct');
    assert.equal(state.skillEvidence['ielts-diagnostic-v1:q01'].repairResult,undefined);
    assert.equal(state.skillEvidence['ielts-diagnostic-v1:q01'].retestResult,undefined);
    assert.equal(state.skillEvidence['ielts-diagnostic-v1:q01'].masteryStatus,undefined);
    assert.equal(foundation.recordSkillEvidence('bad text','skill','DIAGNOSTIC_OBJECTIVE','incorrect','source'),false);
});

test('objective audio comprehension persists as canonical skill evidence', () => {
    const { foundation, localStorage } = createHarness();
    const evidenceId='ielts-listening-v1:ielts-listening-001';
    assert.equal(foundation.recordSkillEvidence(evidenceId,'listening_main_point','OBJECTIVE_AUDIO_COMPREHENSION','correct','ielts-listening-001'),true);
    const evidence=foundation.getState().skillEvidence[evidenceId];
    assert.deepEqual({evidence_id:evidence.evidence_id,skill_id:evidence.skill_id,evidence_type:evidence.evidence_type,result:evidence.result,source_id:evidence.source_id},{evidence_id:evidenceId,skill_id:'listening_main_point',evidence_type:'OBJECTIVE_AUDIO_COMPREHENSION',result:'correct',source_id:'ielts-listening-001'});
    const reloaded=createLearningFoundation({localStorage});
    assert.equal(reloaded.getState().skillEvidence[evidenceId].evidence_type,'OBJECTIVE_AUDIO_COMPREHENSION');
});

test('version-4 state migrates without manufacturing diagnostic evidence', () => {
    const localStorage=createMemoryStorage();
    localStorage.setItem(constants.STATE_KEY,JSON.stringify({version:4,anonymousLearnerId:'11111111-1111-4111-8111-111111111111',mistakeSignals:{}}));
    const { foundation }=createHarness({localStorage});
    assert.equal(foundation.getState().version,8);
    assert.deepEqual(foundation.getState().skillEvidence,{});
});

test('speaking performance evidence persists coarse metadata only', () => {
    const { foundation, localStorage }=createHarness();
    const id='ielts-speaking-v1:ielts-speaking-part2-001';
    assert.equal(foundation.recordPerformanceEvidence(id,'speaking_extended_turn','SPEAKING_PERFORMANCE_ATTEMPT','PART_2_EXTENDED_TURN','ielts-speaking-part2-001','60_TO_119_SECONDS'),true);
    assert.equal(foundation.recordPerformanceEvidence(id,'speaking_extended_turn','SPEAKING_PERFORMANCE_ATTEMPT','PART_2_EXTENDED_TURN','ielts-speaking-part2-001','120_SECONDS_OR_MORE'),true);
    const entry=foundation.getState().performanceEvidence[id];
    assert.equal(entry.attempt_count,2);assert.equal(entry.duration_bucket,'120_SECONDS_OR_MORE');
    ['audio','blob','transcript','content','score','correctness','result'].forEach(field=>assert.equal(entry[field],undefined));
    assert.equal(createLearningFoundation({localStorage}).getState().performanceEvidence[id].attempt_count,2);
});

test('performance evidence normalization rejects raw speech and arbitrary fields', () => {
    const localStorage=createMemoryStorage(),id='ielts-speaking-v1:ielts-speaking-part3-001';
    localStorage.setItem(constants.STATE_KEY,JSON.stringify({version:6,anonymousLearnerId:'11111111-1111-4111-8111-111111111111',performanceEvidence:{[id]:{evidence_id:id,skill_id:'speaking_discussion_response',evidence_type:'SPEAKING_PERFORMANCE_ATTEMPT',task_type:'PART_3_DISCUSSION_RESPONSE',source_id:'ielts-speaking-part3-001',duration_bucket:'30_TO_59_SECONDS',attempt_count:1,audio:'raw voice',transcript:'secret',score:9,arbitrary:'no'}}}));
    const entry=createLearningFoundation({localStorage}).getState().performanceEvidence[id];
    assert.ok(entry);assert.deepEqual(Object.keys(entry).sort(),['attempt_count','duration_bucket','evidence_id','evidence_type','first_seen_at','last_seen_at','skill_id','source_id','task_type'].sort());
    assert.equal(createLearningFoundation({localStorage}).recordPerformanceEvidence(id,'speaking_discussion_response','SPEAKING_PERFORMANCE_ATTEMPT','BAD_TASK','ielts-speaking-part3-001','30_TO_59_SECONDS'),false);
});

test('writing performance evidence persists coarse metadata and rejects raw writing fields', () => {
    const { foundation, localStorage }=createHarness(),id='ielts-gt-writing-v1:gt-task1-letter-001';
    assert.equal(foundation.recordPerformanceEvidence(id,'writing_letter_task_response','WRITING_PERFORMANCE_ATTEMPT','GT_TASK_1_LETTER','gt-task1-letter-001','60_TO_119_SECONDS'),true);
    const entry=foundation.getState().performanceEvidence[id];
    assert.equal(entry.attempt_count,1);assert.equal(entry.task_type,'GT_TASK_1_LETTER');
    ['raw_text','text','response','exact_word_count','word_count','score','band','quality','correctness'].forEach(field=>assert.equal(entry[field],undefined));
    assert.equal(createLearningFoundation({localStorage}).getState().performanceEvidence[id].skill_id,'writing_letter_task_response');
    assert.equal(foundation.recordPerformanceEvidence(id,'writing_letter_task_response','WRITING_PERFORMANCE_ATTEMPT','ACADEMIC_TASK_1','gt-task1-letter-001','60_TO_119_SECONDS'),false);
});

console.log('PASS all learning-foundation tests');
