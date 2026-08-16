'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const profile = require('../mistake-profile.js');
const { items } = require('../mistake-mirror.js');
const root = path.resolve(__dirname, '..');
let passed = 0;
function scenario(name, callback) { callback(); passed += 1; console.log('PASS', name); }
function s(values) { return Object.assign({initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0}, values); }

scenario('new learner does not show mastery', () => {
    const result=profile.aggregate(items,{mistakeSignals:{}});
    assert.equal(result.observedItemCount,0);
    assert.ok(result.families.every(family=>family.status==='NEW'&&family.confidence==='LOW'));
});
scenario('repeated article failures become needs practice', () => {
    const state={mistakeSignals:{'mm-article-apple':Object.assign(s({initialIncorrect:2,repairIncorrect:1,retestIncorrect:2}),{retestResult:'incorrect'})}};
    const family=profile.aggregate(items,state).families.find(item=>item.id==='articles');
    assert.equal(family.status,'NEEDS_PRACTICE');
});
scenario('failure followed by successful repair and retest becomes improving', () => {
    const state={mistakeSignals:{'mm-article-apple':Object.assign(s({initialIncorrect:1,repairCorrect:1,retestCorrect:1}),{retestResult:'correct'})}};
    const family=profile.aggregate(items,state).families.find(item=>item.id==='articles');
    assert.equal(family.status,'IMPROVING');
});
scenario('repeated success across distinct items can become strong', () => {
    const signals={}; ['mm-good-at','mm-senior-to','mm-depend-on'].forEach(id=>{signals[id]=Object.assign(s({initialCorrect:1,retestCorrect:1}),{initialResult:'correct',retestResult:'correct'});});
    const family=profile.aggregate(items,{mistakeSignals:signals}).families.find(item=>item.id==='fixed-preposition');
    assert.equal(family.status,'STRONG'); assert.equal(family.confidence,'MEDIUM');
});
scenario('mixed evidence prioritizes unresolved weakness', () => {
    const state={mistakeSignals:{'mm-listen-to':Object.assign(s({retestIncorrect:1}),{retestResult:'incorrect'}),'mm-good-at':Object.assign(s({initialCorrect:2,retestCorrect:2}),{retestResult:'correct'})},recentActions:[]};
    const next=profile.recommendNext(items,state,null,Date.now());
    assert.equal(next.item.id,'mm-listen-to'); assert.equal(next.reason_code,'FAILED_RETEST');
});
scenario('SEO/static surface and 30-item content remain intact', () => {
    const html=fs.readFileSync(path.join(root,'common-mistakes-bangladeshi-learners.html'),'utf8');
    assert.equal(items.length,30); assert.match(html,/<title>Common English Mistakes Bangladeshi Learners Make \| Ovidhan<\/title>/);
    assert.match(html,/<h1>Common English Mistakes Bangladeshi Learners Make<\/h1>/); assert.match(html,/rel="canonical"/);
    assert.doesNotMatch(html,/<meta[^>]+noindex/i); assert.match(html,/application\/ld\+json/);
});
console.log(`PASS ${passed} Phase 3F release scenarios`);
