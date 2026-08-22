'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const literaturePack = require('../data/bcs-literature-smartpath-v1.json');
const grammarPack = require('../data/bcs-smartpath-practice-v1.json');
const graph = require('../skill-mistake-graph.json');
const goals = require('../goal-skill-requirements.json');
const transferGraph = require('../bangla-english-transfer-graph.json');
const destinationGraph = require('../smartpath-destinations.json');
const mirror = require('../mistake-mirror.js');
const profileApi = require('../mistake-profile.js');
const router = require('../smartpath-router.js');
const learningApi = require('../learning-foundation.js');

const expectedCounts = {literary_period_identification:15,author_work_attribution:35,quotation_attribution:20,genre_form_identification:10};
const literatureSkills = new Set(Object.keys(expectedCounts));
assert.equal(literaturePack.pack_id, 'bcs-literature-smartpath-v1');
assert.equal(literaturePack.version, 1);
assert.equal(literaturePack.review_status, 'REVIEWED');
assert.equal(literaturePack.items.length, 80);
const counts = {};
literaturePack.items.forEach(item => {
    counts[item.skill_id] = (counts[item.skill_id] || 0) + 1;
    assert.match(item.candidate_id, /^bcs-lit-candidate-[0-9]{3}$/);
    assert.ok(literatureSkills.has(item.skill_id));
    assert.ok(['BEGINNER','INTERMEDIATE','ADVANCED'].includes(item.difficulty));
    assert.equal(item.options.length, 4);
    assert.equal(new Set(item.options.map(option => option.id)).size, 4);
    assert.equal(new Set(item.options.map(option => option.text)).size, 4);
    assert.equal(item.options.filter(option => option.id === item.correct_option).length, 1);
    assert.equal(item.options.find(option => option.id === item.correct_option).text, item.correct_answer);
    assert.equal(item.official_question, false);
    assert.equal(item.practice_type, 'OVIDHAN_CREATED_BCS_STYLE');
    assert.equal(item.research_status, 'REVIEWED');
    assert.ok(item.source_refs.length > 0);
    item.source_refs.forEach(source => assert.ok(source.url && source.url.trim()));
    assert.doesNotMatch(JSON.stringify(item), /\[reference:[^\]]*\]|\uFFFD/i);
    assert.equal(JSON.stringify(item).isWellFormed(), true);
});
assert.deepEqual(counts, expectedCounts);
assert.equal(new Set(literaturePack.items.map(item => item.candidate_id)).size, 80);
assert.equal(new Set(literaturePack.items.map(item => item.question.trim())).size, 80);

assert.equal(graph.graph_version, 3);
assert.equal(graph.families.length, 12);
assert.equal(graph.skills.length, 56);
assert.equal(graph.skills.filter(skill => skill.status === 'ACTIVE').length, 56);
assert.equal(graph.skills.filter(skill => skill.status === 'PLANNED').length, 0);
const family = graph.families.find(entry => entry.family_id === 'LITERATURE');
assert.ok(family);
assert.deepEqual(new Set(family.child_skill_ids), literatureSkills);
const graphLiteratureSkills = graph.skills.filter(skill => skill.family_id === 'LITERATURE');
assert.equal(graphLiteratureSkills.length, 4);
assert.deepEqual(new Set(graphLiteratureSkills.map(skill => skill.id)), literatureSkills);
assert.ok(graphLiteratureSkills.every(skill => skill.status === 'ACTIVE'));
graphLiteratureSkills.forEach(skill => skill.example_item_ids.forEach(id => assert.equal(literaturePack.items.find(item => item.candidate_id === id).skill_id, skill.id)));
assert.equal(graph.skills.filter(skill => /^bcs_/.test(skill.id) && /liter|author|quotation|genre/.test(skill.id)).length, 0);
assert.equal(graph.item_mappings.length, 180);
assert.equal(new Set(graph.item_mappings.map(mapping => mapping.item_id)).size, 180);
assert.equal(graph.item_mappings.filter(mapping => mapping.item_id.startsWith('mm-')).length, 30);
assert.equal(graph.item_mappings.filter(mapping => mapping.item_id.startsWith('bcs-smartpath-')).length, 70);
assert.equal(graph.item_mappings.filter(mapping => mapping.item_id.startsWith('bcs-lit-candidate-')).length, 80);
const skillIds = new Set(graph.skills.map(skill => skill.id));
graph.item_mappings.forEach(mapping => assert.ok(skillIds.has(mapping.primary_skill_id)));

assert.deepEqual(goals.goal_ids, ['BCS','IELTS','BANK','UNIVERSITY_ADMISSION','GENERAL_ENGLISH','SPOKEN_CAREER']);
const literatureGoalMappings = goals.mappings.filter(mapping => literatureSkills.has(mapping.skill_id));
assert.equal(literatureGoalMappings.length, 4);
assert.ok(literatureGoalMappings.every(mapping => mapping.goal_id === 'BCS' && mapping.importance === 'CORE'));

assert.equal(mirror.items.length, 30);
mirror.addReviewedPack(grammarPack);
mirror.addLiteraturePack(literaturePack);
assert.equal(mirror.items.length, 180);
const allDestinations = router.mistakeDestinations(mirror.items, graph).concat(destinationGraph.destinations);
const literatureDestinations = allDestinations.filter(destination => destination.family_id === undefined && String(destination.item_id).startsWith('bcs-lit-candidate-'));
assert.equal(literatureDestinations.length, 80);
const NOW = Date.parse('2026-08-22T12:00:00.000Z');
const signal = overrides => Object.assign({attempts:1,initialResult:null,repairResult:null,retestResult:null,masteryStatus:'needs-repair',lastSeenAt:'2026-08-22T10:00:00.000Z',initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0}, overrides);
function run(state, destinations) {
    state = Object.assign({goal:'BCS',level:null,mistakeSignals:{},recentActions:[]}, state);
    return router.recommend({state,profile:profileApi.aggregate(mirror.items,state,graph),graph,transferGraph,goalGraph:goals,destinations:destinations || allDestinations,nowMs:NOW});
}
assert.match(run({goal:'BCS'}, literatureDestinations).item_id, /^bcs-lit-candidate-/);
assert.equal(run({goal:'BCS',mistakeSignals:{'bcs-lit-candidate-069':signal({retestResult:'incorrect',retestIncorrect:1})}}).item_id, 'bcs-lit-candidate-069');
assert.equal(run({goal:'BCS',mistakeSignals:{'bcs-lit-candidate-073':signal({initialResult:'incorrect',initialIncorrect:1})}}).item_id, 'bcs-lit-candidate-073');
const firstLiterature = run({goal:'BCS'}, literatureDestinations);
const afterRecent = run({goal:'BCS',recentActions:[{id:'mistake-mirror:'+firstLiterature.item_id,type:'mistake-mirror',result:'correct',at:'2026-08-22T11:00:00.000Z'}]}, literatureDestinations);
assert.notEqual(afterRecent.item_id, firstLiterature.item_id);
['GENERAL_ENGLISH','IELTS','BANK','UNIVERSITY_ADMISSION','SPOKEN_CAREER'].forEach(goal => {
    assert.ok(run({goal}).ranked_diagnostics.every(candidate => !String(candidate.item_id).startsWith('bcs-lit-candidate-')));
});
assert.ok(run({goal:'GENERAL_ENGLISH'}).item_id && !run({goal:'GENERAL_ENGLISH'}).item_id.startsWith('bcs-lit-candidate-'));
assert.equal(destinationGraph.destinations.find(item => item.skill_id === 'writing_precis').url, '/precis-summary-writing-bangla.html');
assert.equal(destinationGraph.destinations.find(item => item.skill_id === 'formal_letter_writing').url, '/formal-letter-writing-bangla.html');

const storage = learningApi.createMemoryStorage();
const learning = learningApi.createLearningFoundation({
    localStorage:storage, sessionStorage:learningApi.createMemoryStorage(),
    crypto:{randomUUID:()=> '50000000-0000-4000-8000-000000000001'},
    now:()=>new Date('2026-08-22T12:00:00.000Z'), location:{hostname:'localhost',pathname:'/test',search:''}
});
const learnerId = learning.getState().anonymousLearnerId;
assert.equal(learning.recordMistakeSignal('bcs-lit-candidate-069','initial','incorrect'), true);
assert.equal(learning.recordMistakeSignal('bcs-lit-candidate-069','repair','correct'), true);
assert.equal(learning.recordMistakeSignal('bcs-lit-candidate-069','retest','correct'), true);
const learnerState = learning.getState();
assert.equal(learnerState.anonymousLearnerId, learnerId);
assert.equal(learnerState.mistakeSignals['bcs-lit-candidate-069'].attempts, 3);
assert.equal(learnerState.mistakeSignals['bcs-lit-candidate-069'].retestResult, 'correct');
const literatureProfile = profileApi.aggregate(mirror.items, learnerState, graph);
assert.equal(literatureProfile.observedItemCount, 1);
assert.ok(literatureProfile.families.find(entry => entry.id === 'LITERATURE').itemIds.includes('bcs-lit-candidate-069'));
assert.doesNotMatch(read('mistake-mirror.js'), /localStorage|sessionStorage/);
assert.equal((read('mistake-mirror.js').match(/\/data\/bcs-literature-smartpath-v1\.json/g) || []).length, 1);
assert.equal((read('mistake-mirror.js').match(/\/data\/bcs-smartpath-practice-v1\.json/g) || []).length, 1);
assert.doesNotMatch([read('mistake-mirror.js'),read('mistake-profile.js')].join('\n'), /literature_(state|profile)|bcs_literature_(state|profile)/i);
assert.doesNotMatch(read('smartpath-router.js'), /Math\.random|fetch\(['"]https?:|XMLHttpRequest|api\.openai|openai\.com/i);

console.log(JSON.stringify({status:'PASS',literatureItems:80,counts,practiceItems:mirror.items.length,graph:{families:12,skills:56,active:56,planned:0,itemMappings:180},goals:goals.goal_ids.length,literatureGoalMappings:literatureGoalMappings.length}, null, 2));
