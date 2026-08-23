'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pack = require('../data/ielts-task2-argument-practice-v1.json');
const graph = require('../skill-mistake-graph.json');
const goals = require('../goal-skill-requirements.json');
const requirements = require('../data/ielts-goal-requirement-map-v1.json');
const destinations = require('../smartpath-destinations.json');
const mirror = require('../mistake-mirror.js');

const expectedIds = Array.from({length:40}, (_, i) => `ielts-task2-argument-${String(i + 1).padStart(3, '0')}`);
const subtypes = new Set(['CLAIM_SUPPORT_ALIGNMENT','REASON_RELEVANCE','EXAMPLE_RELEVANCE','DEVELOPMENT_COMPLETENESS','OFF_TOPIC_DETECTION','COUNTERPOINT_RESPONSE','ARGUMENT_PROGRESSION','TASK_PART_COVERAGE']);
const focuses = new Set([...subtypes].map(value => value.toLowerCase()));
const countBy = (records, field) => Object.fromEntries([...new Set(records.map(item => item[field]))].sort().map(value => [value, records.filter(item => item[field] === value).length]));

assert.equal(pack.schema_version, 1);
assert.equal(pack.pack_id, 'ielts-task2-argument-practice-v1');
assert.equal(pack.review_status, 'REVIEWED');
assert.equal(pack.items.length, 40);
assert.deepEqual([...pack.items.map(item => item.id)].sort(), expectedIds);
assert.equal(new Set(pack.items.map(item => item.id)).size, 40);
assert.deepEqual(countBy(pack.items, 'difficulty'), {ADVANCED:10,FOUNDATION:12,INTERMEDIATE:18});
assert.deepEqual(countBy(pack.items, 'correct_option'), {A:10,B:10,C:10,D:10});
assert.deepEqual(countBy(pack.items, 'item_subtype'), Object.fromEntries([...subtypes].sort().map(value => [value,5])));
assert.deepEqual(countBy(pack.items, 'micro_focus'), Object.fromEntries([...focuses].sort().map(value => [value,5])));
for (const item of pack.items) {
  assert.equal(item.skill_id, 'writing_argument_development'); assert.equal(item.family, 'WRITING');
  assert.ok(subtypes.has(item.item_subtype)); assert.ok(focuses.has(item.micro_focus));
  assert.deepEqual(item.options.map(option => option.id), ['A','B','C','D']);
  assert.equal(new Set(item.options.map(option => option.text)).size, 4);
  assert.equal(item.correct_answer, item.options.find(option => option.id === item.correct_option).text);
  ['question_en','question_bn','context_en','context_bn','explanation_en','explanation_bn','common_wrong_reason_bn'].forEach(field => assert.ok(item[field] && item[field].trim(), `${item.id} missing ${field}`));
  assert.equal(item.official_question, false); assert.equal(item.practice_type, 'OVIDHAN_CREATED_IELTS_STYLE'); assert.equal(item.research_status, 'REVIEWED'); assert.deepEqual(item.goal_ids, ['IELTS']);
  assert.doesNotMatch(Object.keys(item).join('|'), /learner_(text|writing)|raw_(text|writing)|writing_submission|productive_(score|evidence)|textarea/i);
  assert.doesNotMatch(JSON.stringify(item), /band\s*[0-9]|predicted band|readiness\s*%|task response mastered|productive writing mastered|guaranteed score improvement/i);
}
assert.equal(new Set(pack.items.map(item => item.question_en.trim().toLowerCase())).size, 40);
assert.equal(new Set(pack.items.map(item => item.context_en.trim().toLowerCase())).size, 40);

const skill = graph.skills.find(item => item.id === 'writing_argument_development');
assert.ok(skill && skill.status === 'ACTIVE' && skill.family_id === 'WRITING');
assert.ok(graph.families.find(item => item.family_id === 'WRITING').child_skill_ids.includes(skill.id));
assert.deepEqual([graph.families.length,graph.skills.filter(item => item.status === 'ACTIVE').length,graph.skills.filter(item => item.status === 'PLANNED').length,graph.item_mappings.length],[14,68,0,440]);
const mappings = graph.item_mappings.filter(item => item.item_id.startsWith('ielts-task2-argument-'));
assert.equal(mappings.length, 40); assert.deepEqual(new Set(mappings.map(item => item.item_id)), new Set(expectedIds));
assert.ok(mappings.every(item => item.primary_skill_id === skill.id && item.primary_family_id === 'WRITING'));
const goalMapping = goals.mappings.filter(item => item.goal_id === 'IELTS' && item.skill_id === skill.id);
assert.equal(goalMapping.length, 1); assert.equal(goalMapping[0].importance, 'CORE');

const requiredRelations = {
  writing_academic_task2_argument:['DIRECT_TASK_ALIGNMENT','EVIDENCE_GAP'],
  writing_gt_task2_argument:['DIRECT_TASK_ALIGNMENT','EVIDENCE_GAP'],
  writing_academic_task_response:['ASSESSMENT_CRITERION_ALIGNMENT','PARTIALLY_COVERED'],
  writing_gt_task_response:['ASSESSMENT_CRITERION_ALIGNMENT','PARTIALLY_COVERED']
};
for (const [requirementId, expected] of Object.entries(requiredRelations)) {
  const relation = requirements.mapped_relations.find(item => item.requirement_id === requirementId && item.skill_id === skill.id);
  assert.ok(relation); assert.equal(relation.mapping_class, expected[0]); assert.equal(relation.coverage_status, expected[1]);
  assert.equal(relation.diagnostic_evidence, false); assert.equal(relation.boundary_evidence, false); assert.equal(relation.static_destination, true);
  assert.match(relation.coverage_note, /productive/i); assert.ok(!requirements.unmapped_requirements.some(item => item.requirement_id === requirementId));
}
const destination = destinations.destinations.find(item => item.skill_id === skill.id);
assert.ok(destination); assert.equal(destination.url, '/ielts-task2-argument-development-bangla.html'); assert.deepEqual(destination.goal_ids, ['IELTS']);
const page = read('ielts-task2-argument-development-bangla.html'), runtime = read('mistake-mirror.js');
assert.match(page, /data-default-item="ielts-task2-argument-001"/); assert.match(page, /Academic ও General Training/); assert.match(page, /mistake-mirror\.js/);
assert.doesNotMatch(page, /<textarea|Band\s*7|predicted band|readiness\s*%|Task Response mastered|guaranteed score improvement/i);
const normalized = mirror.normalizeTask2ArgumentPack(pack); assert.equal(normalized.length, 40); assert.ok(normalized.every(item => item.micro_skill === skill.id && item.type === 'multiple-choice'));
mirror.addTask2ArgumentPack(pack); assert.ok(expectedIds.every(id => mirror.items.some(item => item.id === id)));
assert.equal(mirror.initialItemFor({dataset:{defaultItem:'ielts-task2-argument-001'}},{hash:''}).id, 'ielts-task2-argument-001');
assert.match(runtime, /ielts-task2-argument-practice-v1\.json/); assert.doesNotMatch(runtime + page, /api\.openai|openai\.com|XMLHttpRequest|fetch\(['"]https?:/i);

console.log(JSON.stringify({status:'PASS',items:pack.items.length,difficulty:countBy(pack.items,'difficulty'),answers:countBy(pack.items,'correct_option'),subtypes:countBy(pack.items,'item_subtype'),microFocus:countBy(pack.items,'micro_focus'),graph:{families:14,activeSkills:68,plannedSkills:0,itemMappings:440},ieltsGoalMapping:{skill:skill.id,importance:goalMapping[0].importance},requirementRelations:Object.keys(requiredRelations),runtimeItems:normalized.length,destination:destination.url,productiveEvidence:false},null,2));
