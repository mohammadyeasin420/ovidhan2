'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pack = require('../data/bcs-smartpath-practice-v1.json');
const literaturePack = require('../data/bcs-literature-smartpath-v1.json');
const writtenPack = require('../data/bcs-written-smartpath-v1.json');
const graph = require('../skill-mistake-graph.json');
const goals = require('../goal-skill-requirements.json');
const destinations = require('../smartpath-destinations.json');
const transferGraph = require('../bangla-english-transfer-graph.json');
const mirror = require('../mistake-mirror.js');
const profileApi = require('../mistake-profile.js');
const router = require('../smartpath-router.js');

assert.equal(pack.length, 70);
assert.equal(new Set(pack.map(item => item.id)).size, 70);
assert.ok(pack.every(item => item.id.startsWith('bcs-smartpath-')));
assert.equal(new Set(pack.map(item => item.question)).size, 70);
assert.ok(pack.every(item => item.options.length === 4 && new Set(item.options.map(option => option.id)).size === 4));
assert.ok(pack.every(item => item.options.filter(option => option.id === item.correct_option).length === 1));
assert.ok(pack.every(item => ['BEGINNER','INTERMEDIATE','ADVANCED'].includes(item.difficulty)));
assert.ok(pack.every(item => item.practice_type === 'OVIDHAN_CREATED_BCS_STYLE' && item.official_question === false));
assert.ok(pack.every(item => typeof item.explanation_bn === 'string' && item.explanation_bn.length > 0 && !item.explanation_bn.includes('\uFFFD')));

const skills = new Map(graph.skills.map(skill => [skill.id, skill]));
assert.ok(pack.every(item => skills.has(item.micro_skill)));
assert.equal(graph.item_mappings.length, 240);
assert.equal(graph.item_mappings.filter(mapping => mapping.item_id.startsWith('mm-')).length, 30);
assert.equal(graph.item_mappings.filter(mapping => mapping.item_id.startsWith('bcs-smartpath-')).length, 70);
assert.equal(new Set(graph.item_mappings.map(mapping => mapping.item_id)).size, 240);
graph.item_mappings.forEach(mapping => {
    assert.ok(skills.has(mapping.primary_skill_id));
    assert.equal(skills.get(mapping.primary_skill_id).family_id, mapping.primary_family_id);
});

mirror.addReviewedPack(pack);
mirror.addLiteraturePack(literaturePack);
mirror.addWrittenPack(writtenPack);
assert.equal(mirror.items.length, 240);
assert.equal(new Set(mirror.items.map(item => item.id)).size, 240);
const allDestinations = router.mistakeDestinations(mirror.items, graph).concat(destinations.destinations);
assert.equal(allDestinations.filter(destination => destination.item_id).length, 240);
const NOW = Date.parse('2026-08-22T12:00:00.000Z');
const signal = overrides => Object.assign({attempts:1,initialResult:null,repairResult:null,retestResult:null,masteryStatus:'needs-repair',lastSeenAt:'2026-08-22T10:00:00.000Z',initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0}, overrides);
function run(state) {
    state = Object.assign({goal:'GENERAL_ENGLISH',level:null,mistakeSignals:{},recentActions:[]}, state);
    return router.recommend({state,profile:profileApi.aggregate(mirror.items,state,graph),graph,transferGraph,goalGraph:goals,destinations:allDestinations,nowMs:NOW});
}
assert.match(run({goal:'BCS'}).item_id, /^bcs-smartpath-/);
const observed = {'bcs-smartpath-001':signal({initialResult:'incorrect',initialIncorrect:1})};
const profile = profileApi.aggregate(mirror.items,{mistakeSignals:observed},graph);
assert.equal(profile.observedItemCount, 1);
assert.notEqual(profile.microSkills.find(skill => skill.id === 'indefinite_article_a_an').status, 'NEW');
assert.equal(run({mistakeSignals:{'bcs-smartpath-070':signal({retestResult:'incorrect',retestIncorrect:1})}}).primary_reason, 'FAILED_RETEST');
assert.equal(run({mistakeSignals:{'bcs-smartpath-069':signal({initialResult:'incorrect',initialIncorrect:1})}}).primary_reason, 'UNRESOLVED_MISTAKE');
const unseen = run({goal:'GENERAL_ENGLISH'});
const suppressed = run({goal:'GENERAL_ENGLISH',recentActions:[{id:'mistake-mirror:'+unseen.item_id,type:'mistake-mirror',result:'correct',at:'2026-08-22T11:00:00.000Z'}]});
assert.notEqual(suppressed.item_id, unseen.item_id);
goals.goal_ids.forEach(goal => assert.equal(run({goal}).goal_id, goal));
assert.equal(destinations.destinations.find(item => item.skill_id === 'writing_precis').url, '/precis-summary-writing-bangla.html');
assert.equal(destinations.destinations.find(item => item.skill_id === 'formal_letter_writing').url, '/formal-letter-writing-bangla.html');

const runtime = [read('mistake-mirror.js'),read('mistake-profile.js'),read('smartpath-router.js'),read('learning-foundation.js')].join('\n');
assert.doesNotMatch(read('smartpath-router.js'), /Math\.random|fetch\(['"]https?:|XMLHttpRequest|api\.openai|openai\.com/i);
assert.doesNotMatch([read('mistake-mirror.js'), JSON.stringify(pack)].join('\n'), /learner_text|raw_writing|audio_transcript|phone|email/i);
assert.equal((runtime.match(/ovidhan_learning_v1/g) || []).length > 0, true);
assert.doesNotMatch(read('mistake-mirror.js'), /localStorage|sessionStorage/);

console.log(JSON.stringify({status:'PASS',newReviewedItems:70,existingItems:30,preservedPhase5B1Items:100,currentTotalMappedItems:240,canonicalSkillsCovered:new Set(pack.map(item => item.micro_skill)).size,goals:goals.goal_ids.length}, null, 2));
