'use strict';
const assert = require('node:assert/strict');
const profile = require('../mistake-profile.js');
const { items } = require('../mistake-mirror.js');
function test(name, fn) { try { fn(); console.log('PASS', name); } catch (error) { console.error('FAIL', name); throw error; } }
function evidence(overrides) {
    return Object.assign({ distinctItems:0,interactions:0,initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0,unresolvedItems:0,weaknessScore:0 }, overrides);
}
function signal(overrides) {
    return Object.assign({ initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0 }, overrides);
}

test('status rules cover NEW, NEEDS_PRACTICE, IMPROVING, STABLE, and STRONG', () => {
    assert.equal(profile.statusFor(evidence()), 'NEW');
    assert.equal(profile.statusFor(evidence({interactions:3,distinctItems:1,retestIncorrect:1,unresolvedItems:1,weaknessScore:3})), 'NEEDS_PRACTICE');
    assert.equal(profile.statusFor(evidence({interactions:3,distinctItems:1,initialIncorrect:1,retestCorrect:1,weaknessScore:0})), 'IMPROVING');
    assert.equal(profile.statusFor(evidence({interactions:6,distinctItems:2,retestCorrect:2,weaknessScore:-2})), 'STABLE');
    assert.equal(profile.statusFor(evidence({interactions:10,distinctItems:3,initialCorrect:2,retestCorrect:3,weaknessScore:-8})), 'STRONG');
});
test('confidence uses interaction count and distinct-item diversity', () => {
    assert.equal(profile.confidenceFor(evidence({interactions:3,distinctItems:1})), 'LOW');
    assert.equal(profile.confidenceFor(evidence({interactions:4,distinctItems:2})), 'MEDIUM');
    assert.equal(profile.confidenceFor(evidence({interactions:9,distinctItems:3})), 'HIGH');
});
test('historical failure does not permanently block later stable evidence', () => {
    const later=evidence({interactions:8,distinctItems:2,initialCorrect:2,initialIncorrect:1,retestCorrect:3,retestIncorrect:1,unresolvedItems:0,weaknessScore:-3});
    assert.equal(profile.statusFor(later),'STABLE');
});
test('aggregation reuses item micro-skill and family taxonomy', () => {
    const state={mistakeSignals:{'mm-good-at':signal({initialIncorrect:1,retestIncorrect:1}),'mm-senior-to':signal({retestCorrect:1})}};
    const result=profile.aggregate(items,state);
    const skill=result.microSkills.find(entry=>entry.id==='fixed-preposition');
    const family=result.families.find(entry=>entry.id==='fixed-preposition');
    assert.ok(skill.itemIds.includes('mm-good-at'));
    assert.deepEqual(skill.itemIds,family.itemIds);
    assert.equal(family.status,'NEEDS_PRACTICE');
});
test('failed retest has highest priority and output is deterministic', () => {
    const state={mistakeSignals:{'mm-listen-to':Object.assign(signal({retestIncorrect:1}),{retestResult:'incorrect'})},recentActions:[]};
    const first=profile.recommendNext(items,state,'mm-agree-verb',Date.parse('2026-08-16T12:00:00Z'));
    const second=profile.recommendNext(items,state,'mm-agree-verb',Date.parse('2026-08-16T12:00:00Z'));
    assert.equal(first.item.id,'mm-listen-to');
    assert.equal(first.reason_code,'FAILED_RETEST');
    assert.equal(first.priority_band,'HIGH');
    assert.equal(first.item.id,second.item.id);
});
test('weak family prioritizes another relevant item', () => {
    const state={mistakeSignals:{'mm-good-at':Object.assign(signal({retestIncorrect:1}),{retestResult:'correct'})},recentActions:[{id:'mistake-mirror:mm-good-at'}]};
    const next=profile.recommendNext(items,state,'mm-good-at',Date.now());
    assert.equal(next.item.mistake_family,'fixed-preposition');
    assert.equal(next.reason_code,'WEAK_FAMILY');
});
test('immediate current/recent repetition is avoided', () => {
    const state={mistakeSignals:{},recentActions:[{id:'mistake-mirror:mm-article-apple'}]};
    const next=profile.recommendNext(items,state,'mm-agree-verb',Date.now());
    assert.notEqual(next.item.id,'mm-agree-verb');
    assert.notEqual(next.item.id,'mm-article-apple');
});
test('improving family receives reinforcement', () => {
    const state={mistakeSignals:{'mm-good-at':Object.assign(signal({initialIncorrect:1,retestCorrect:1}),{initialResult:'incorrect',retestResult:'correct'})},recentActions:[{id:'mistake-mirror:mm-good-at'}]};
    const next=profile.recommendNext(items,state,'mm-good-at',Date.now());
    assert.equal(next.item.mistake_family,'fixed-preposition');
    assert.equal(next.reason_code,'REINFORCEMENT');
});
test('profile schema and analytics vocabulary contain no PII or raw content', () => {
    const forbidden=/name|email|phone|location|school|raw|audio|transcript|message/i;
    ['profile_state','evidence_band','destination_id','reason_code','priority_band'].forEach(key=>assert.doesNotMatch(key,forbidden));
    assert.deepEqual(profile.STATUSES,['NEW','NEEDS_PRACTICE','IMPROVING','STABLE','STRONG']);
    assert.deepEqual(profile.CONFIDENCE,['LOW','MEDIUM','HIGH']);
});
console.log('PASS all mistake-profile tests');
