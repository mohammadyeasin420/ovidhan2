'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pack = require('../data/ielts-reading-practice-v1.json');
const graph = require('../skill-mistake-graph.json');
const goals = require('../goal-skill-requirements.json');
const requirements = require('../data/ielts-goal-requirement-map-v1.json');
const destinations = require('../smartpath-destinations.json');
const frozen = require('../reports/ovidhan-learning-foundation-3b-frozen-hashes.json');
const mirror = require('../mistake-mirror.js');

const expectedIds = Array.from({length:40}, (_, index) => `ielts-reading-${String(index + 1).padStart(3, '0')}`);
const expectedPassages = Array.from({length:10}, (_, index) => `ielts-reading-passage-${String(index + 1).padStart(3, '0')}`);
const skillDistribution = {reading_inference:8,reading_main_idea:10,reading_reference:6,reading_supporting_detail:10,reading_tone_purpose:6};
const countBy = (records, field) => Object.fromEntries([...new Set(records.map(item => item[field]))].sort().map(value => [value, records.filter(item => item[field] === value).length]));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

assert.equal(pack.schema_version, 1);
assert.equal(pack.pack_id, 'ielts-reading-practice-v1');
assert.equal(pack.review_status, 'REVIEWED');
assert.equal(pack.passages.length, 10);
assert.equal(pack.items.length, 40);
assert.deepEqual(pack.passages.map(item => item.passage_id).sort(), expectedPassages);
assert.deepEqual(pack.items.map(item => item.id).sort(), expectedIds);
assert.equal(new Set(pack.passages.map(item => item.passage_id)).size, 10);
assert.equal(new Set(pack.items.map(item => item.id)).size, 40);
assert.deepEqual(countBy(pack.passages, 'test_type'), {ACADEMIC:5,GENERAL_TRAINING:5});
assert.deepEqual(countBy(pack.items, 'test_type'), {ACADEMIC:20,GENERAL_TRAINING:20});
assert.deepEqual(countBy(pack.items, 'skill_id'), skillDistribution);
assert.deepEqual(countBy(pack.items, 'difficulty'), {ADVANCED:10,FOUNDATION:12,INTERMEDIATE:18});
assert.deepEqual(countBy(pack.items, 'correct_option'), {A:10,B:10,C:10,D:10});
assert.deepEqual(pack.passage_distribution, {ACADEMIC:5,GENERAL_TRAINING:5});
assert.deepEqual(pack.question_test_type_distribution, {ACADEMIC:20,GENERAL_TRAINING:20});
assert.deepEqual(countBy(pack.items, 'skill_id'), Object.fromEntries(Object.entries(pack.skill_distribution).sort()));
assert.deepEqual(countBy(pack.items, 'difficulty'), Object.fromEntries(Object.entries(pack.difficulty_distribution).sort()));
assert.deepEqual(countBy(pack.items, 'correct_option'), Object.fromEntries(Object.entries(pack.correct_option_distribution).sort()));

const passages = new Map(pack.passages.map(passage => [passage.passage_id, passage]));
for (const passage of pack.passages) {
  assert.ok(passage.title_en && passage.text_en && passage.word_count > 0);
  assert.equal(passage.review_status, 'REVIEWED');
  assert.equal(pack.items.filter(item => item.passage_id === passage.passage_id).length, 4);
}
for (const item of pack.items) {
  assert.ok(passages.has(item.passage_id));
  assert.equal(passages.get(item.passage_id).test_type, item.test_type);
  assert.equal(item.family, 'READING_COMPREHENSION');
  assert.ok(Object.hasOwn(skillDistribution, item.skill_id));
  assert.deepEqual(item.options.map(option => option.id), ['A','B','C','D']);
  assert.equal(new Set(item.options.map(option => option.text)).size, 4);
  assert.equal(item.correct_answer, item.options.find(option => option.id === item.correct_option).text);
  ['question_en','question_bn','explanation_en','explanation_bn','evidence_locator_en','common_wrong_reason_bn'].forEach(field => assert.ok(item[field] && item[field].trim(), `${item.id} missing ${field}`));
  assert.equal(item.official_question, false);
  assert.equal(item.practice_type, 'OVIDHAN_CREATED_IELTS_STYLE');
  assert.equal(item.research_status, 'REVIEWED');
  assert.deepEqual(item.goal_ids, ['IELTS']);
  assert.doesNotMatch(JSON.stringify(item), /band\s*[0-9]|predicted band|readiness\s*%|official IELTS question/i);
}
assert.equal(new Set(pack.items.map(item => item.question_en.trim().toLowerCase())).size, 40);
assert.match(pack.items[0].explanation_en, /making D the correct summary/);
assert.match(pack.items[0].explanation_bn, /তাই D সঠিক সারসংক্ষেপ/);

const readingSkills = Object.keys(skillDistribution);
assert.ok(readingSkills.every(id => graph.skills.some(skill => skill.id === id && skill.status === 'ACTIVE' && skill.family_id === 'READING_COMPREHENSION')));
assert.deepEqual([graph.families.length,graph.skills.filter(item => item.status === 'ACTIVE').length,graph.skills.filter(item => item.status === 'PLANNED').length,graph.item_mappings.length],[15,73,0,480]);
const mappings = graph.item_mappings.filter(item => item.item_id.startsWith('ielts-reading-'));
assert.equal(mappings.length, 40);
assert.deepEqual(new Set(mappings.map(item => item.item_id)), new Set(expectedIds));
assert.ok(mappings.every(mapping => mapping.primary_family_id === 'READING_COMPREHENSION' && pack.items.find(item => item.id === mapping.item_id).skill_id === mapping.primary_skill_id));
assert.equal(new Set(graph.item_mappings.map(item => item.item_id)).size, 480);
assert.equal(goals.mappings.filter(item => item.goal_id === 'IELTS').length, 15);

const requirementIds = ['reading_academic_main_idea','reading_gt_main_idea','reading_academic_detail','reading_gt_detail','reading_academic_writer_views_claims','reading_gt_writer_views_claims'];
for (const requirementId of requirementIds) {
  const relation = requirements.mapped_relations.find(item => item.requirement_id === requirementId);
  assert.ok(relation);
  assert.equal(relation.coverage_status, 'PARTIALLY_COVERED');
  assert.equal(relation.static_destination, true);
  assert.equal(relation.boundary_evidence, false);
  assert.match(relation.coverage_note, /but|does not/i);
}
assert.equal(requirements.mapped_relations.length, 30);
assert.equal(requirements.unmapped_requirements.length, 9);

const readingDestinations = destinations.destinations.filter(item => readingSkills.includes(item.skill_id));
assert.equal(readingDestinations.length, 5);
assert.ok(readingDestinations.every(item => item.url === '/ielts-reading-practice-bangla.html' && item.activity_type === 'GUIDED_READING_PRACTICE' && item.review_status === 'REVIEWED'));
const page = read('ielts-reading-practice-bangla.html');
assert.match(page, /data-default-item="ielts-reading-001"/);
assert.match(page, /Academic ও General Training/);
assert.match(page, /10 passages · 40 reviewed items/);
assert.match(page, /mistake-mirror\.js/);
assert.doesNotMatch(page, /<textarea|predicted band|readiness\s*%|full IELTS Reading mock test<\/h1>/i);
const normalized = mirror.normalizeIeltsReadingPack(pack);
assert.equal(normalized.length, 40);
assert.equal(new Set(normalized.map(item => item.passage)).size, 10);
assert.ok(normalized.every(item => item.type === 'multiple-choice' && item.mistake_family === 'READING_COMPREHENSION' && item.passage && item.evidence_locator_en));
mirror.addIeltsReadingPack(pack);
assert.ok(expectedIds.every(id => mirror.items.some(item => item.id === id)));
assert.equal(mirror.initialItemFor({dataset:{defaultItem:'ielts-reading-001'}},{hash:''}).id, 'ielts-reading-001');
assert.match(read('mistake-mirror.js'), /ielts-reading-practice-v1\.json/);

assert.equal(frozen.aggregateSha256, '202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0');
for (const item of [...frozen.pages, ...frozen.guards]) assert.equal(sha256(item.path), item.sha256, `frozen file changed ${item.path}`);

console.log(JSON.stringify({
  status:'PASS', passages:pack.passages.length, items:pack.items.length,
  passageTestTypes:countBy(pack.passages,'test_type'), questionTestTypes:countBy(pack.items,'test_type'),
  skills:countBy(pack.items,'skill_id'), difficulty:countBy(pack.items,'difficulty'), answers:countBy(pack.items,'correct_option'),
  sourceCorrection:{item_id:'ielts-reading-001',fields:['explanation_en','explanation_bn'],from:'B',to:'D'},
  graph:{families:14,activeSkills:68,plannedSkills:0,itemMappings:440,addedMappings:40},
  requirementMap:{relations:25,unmapped:14,updatedReadingRelations:requirementIds,coverageStatus:'PARTIALLY_COVERED'},
  runtime:{items:normalized.length,passages:new Set(normalized.map(item => item.passage)).size,destination:'/ielts-reading-practice-bangla.html',destinationSkills:readingSkills.length},
  frozenAggregateSha256:frozen.aggregateSha256
}, null, 2));
