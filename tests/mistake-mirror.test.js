'use strict';
const assert = require('node:assert/strict');
const { items, optionsFor, chooseNext, addReviewedPack } = require('../mistake-mirror.js');
const reviewedPack = require('../data/bcs-smartpath-practice-v1.json');
function test(name, fn) { try { fn(); console.log('PASS', name); } catch (error) { console.error('FAIL', name); throw error; } }

test('dataset contains exactly 30 unique manually reviewed items', () => {
    assert.equal(items.length, 30);
    assert.equal(new Set(items.map(item => item.id)).size, 30);
    assert.ok(items.every(item => item.source_status === 'manually-reviewed'));
});
test('reviewed BCS-style pack extends the same engine to 100 items', () => {
    addReviewedPack(reviewedPack);
    assert.equal(items.length, 100);
    assert.equal(new Set(items.map(item => item.id)).size, 100);
    assert.equal(items.filter(item => item.practice_type === 'OVIDHAN_CREATED_BCS_STYLE').length, 70);
});
test('every item has the required editorial schema and safe stable IDs', () => {
    const fields = ['id','correct','category','micro_skill','mistake_family','explanation_bn','explanation_en','difficulty','source_status'];
    items.forEach(item => {
        fields.forEach(field => assert.ok(item[field], `${item.id} missing ${field}`));
        assert.match(item.id, /^(mm-|bcs-smartpath-)[a-z0-9-]+$/);
        if (item.type === 'multiple-choice') assert.ok(item.question); else assert.notEqual(item.incorrect, item.correct);
        assert.doesNotMatch(item.explanation_bn, /\uFFFD/);
        assert.ok(['grammar','usage'].includes(item.category));
        assert.ok(['beginner','intermediate','advanced'].includes(item.difficulty));
    });
});
test('diagnose, repair, and retest choices have one deterministic correct route', () => {
    items.forEach(item => {
        ['repair','retest'].forEach(stage => {
            const options = optionsFor(item, stage);
            if (item.type === 'multiple-choice') {
                assert.equal(options.length, 4);
                assert.equal(options.filter(option => option.id === item.correct_option).length, 1);
            } else {
                assert.equal(options.length, 2);
                assert.equal(options.filter(option => option.id === 'correct').length, 1);
                assert.equal(options.find(option => option.id === 'correct').text, item.correct);
            }
        });
    });
});
test('recommendation is stable, excludes current item, and explains its choice', () => {
    items.forEach(item => {
        const first = chooseNext(item, { mistakeSignals: {} });
        const second = chooseNext(item, { mistakeSignals: {} });
        assert.equal(first.item.id, second.item.id);
        assert.notEqual(first.item.id, item.id);
        assert.ok(['same-family-repair','next-reviewed-item'].includes(first.reason_code));
        assert.ok(['high','medium'].includes(first.score_band));
    });
});
test('dataset has no raw learner-input or PII fields', () => {
    const forbidden = /text_input|learner_text|email|name|phone|audio|transcript|query/i;
    items.forEach(item => Object.keys(item).forEach(key => assert.doesNotMatch(key, forbidden)));
});
test('fewer/less item states the formal-versus-informal register distinction', () => {
    const item = items.find(candidate => candidate.id === 'mm-fewer-less');
    assert.match(item.explanation_en, /formal or edited English/i);
    assert.match(item.explanation_en, /informally/i);
    assert.match(item.explanation_bn, /Formal বা edited English/);
    assert.match(item.explanation_bn, /informal English/);
});
test('new multiple-choice items retain four accessible answer choices', () => {
    items.filter(item => item.type === 'multiple-choice').forEach(item => {
        assert.equal(optionsFor(item, 'initial').length, 4);
        assert.equal(optionsFor(item, 'repair').filter(option => option.id === item.correct_option).length, 1);
    });
});
console.log('PASS all mistake-mirror tests');
