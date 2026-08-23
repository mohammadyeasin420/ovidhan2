'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const asset = require('../data/ielts-goal-requirement-map-v1.json');
const goals = require('../goal-skill-requirements.json');
const graph = require('../skill-mistake-graph.json');
const destinations = require('../smartpath-destinations.json');
const diagnostic = require('../data/ielts-diagnostic-skill-map-v1.json');
const boundary = require('../data/ielts-boundary-probes-v1.json');
const frozen = require('../reports/ovidhan-learning-foundation-3b-frozen-hashes.json');
const sha256 = relativePath => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex');

assert.equal(asset.schema_version, 1);
assert.equal(asset.map_id, 'ielts-goal-requirements-v1');
assert.equal(asset.review_status, 'REVIEWED');
assert.equal(asset.official_source_policy, 'IELTS_OFFICIAL_ONLY');
assert.ok(asset.sources.length > 0, 'source registry empty');
const approvedSourceUrls = new Map([
  ['IELTS_TEST_FORMAT', 'https://ielts.org/take-a-test/test-types/ielts-academic-test'],
  ['IELTS_GT_TEST_FORMAT', 'https://ielts.org/take-a-test/test-types/ielts-general-training-test'],
  ['IELTS_READING_FORMAT', 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading'],
  ['IELTS_GT_READING_FORMAT', 'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-reading'],
  ['IELTS_LISTENING_FORMAT', 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening'],
  ['IELTS_ACADEMIC_WRITING', 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing'],
  ['IELTS_GT_WRITING', 'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-writing'],
  ['IELTS_SPEAKING_FORMAT', 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking'],
  ['IELTS_SCORING', 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail']
]);
const sourceIds = new Set();
const sourceUrls = new Set();
for (const source of asset.sources) {
  assert.ok(!sourceIds.has(source.source_id), `duplicate source ID ${source.source_id}`);
  sourceIds.add(source.source_id);
  const url = new URL(source.url);
  assert.ok(url.hostname === 'ielts.org' || url.hostname.endsWith('.ielts.org'), `non-official source host ${url.hostname}`);
  assert.equal(source.host, 'ielts.org');
  assert.equal(source.access_date, '2026-08-23', `missing or incorrect access_date ${source.source_id}`);
  assert.equal(source.url, approvedSourceUrls.get(source.source_id), `unapproved source URL ${source.source_id}`);
  assert.ok(!sourceUrls.has(source.url), `duplicate source URL ${source.url}`);
  sourceUrls.add(source.url);
}
assert.equal(asset.sources.length, approvedSourceUrls.size, 'official source registry size');

const testTypes = new Set(['SHARED', 'ACADEMIC', 'GENERAL_TRAINING']);
const sections = new Set(['LISTENING', 'READING', 'WRITING', 'SPEAKING']);
const mappingClasses = new Set(['DIRECT_TASK_ALIGNMENT', 'ASSESSMENT_CRITERION_ALIGNMENT', 'SUPPORTING_LANGUAGE_FOUNDATION']);
const coverageStatuses = new Set(['COVERED', 'PARTIALLY_COVERED', 'EVIDENCE_GAP', 'PRACTICE_GAP', 'CANONICAL_SKILL_GAP']);
const requirementIds = new Set();
for (const requirement of asset.requirements) {
  assert.ok(!requirementIds.has(requirement.requirement_id), `duplicate requirement ID ${requirement.requirement_id}`);
  requirementIds.add(requirement.requirement_id);
  assert.ok(testTypes.has(requirement.test_type), `invalid test_type ${requirement.test_type}`);
  assert.ok(sections.has(requirement.section), `invalid section ${requirement.section}`);
  assert.ok(requirement.source_ids.length > 0, `requirement ${requirement.requirement_id} has no source`);
  requirement.source_ids.forEach(id => assert.ok(sourceIds.has(id), `unresolved source ID ${id}`));
  assert.doesNotMatch(requirement.official_requirement, /^implied$/i, `merely implied requirement ${requirement.requirement_id}`);
}

const activeSkills = new Set(graph.skills.filter(skill => skill.status === 'ACTIVE').map(skill => skill.id));
const requirementById = new Map(asset.requirements.map(requirement => [requirement.requirement_id, requirement]));
const relationPairs = new Set();
for (const relation of asset.mapped_relations) {
  assert.ok(requirementIds.has(relation.requirement_id), `unknown mapped requirement ${relation.requirement_id}`);
  assert.ok(activeSkills.has(relation.skill_id), `mapped skill not ACTIVE: ${relation.skill_id}`);
  assert.ok(mappingClasses.has(relation.mapping_class), `invalid mapping class ${relation.mapping_class}`);
  assert.ok(coverageStatuses.has(relation.coverage_status), `invalid coverage status ${relation.coverage_status}`);
  if (relation.coverage_status === 'PARTIALLY_COVERED') assert.ok(relation.coverage_note, `partial relation missing note ${relation.requirement_id}`);
  const pair = `${relation.requirement_id}\0${relation.skill_id}`;
  assert.ok(!relationPairs.has(pair), `duplicate requirement-skill pair ${pair}`);
  relationPairs.add(pair);
  const requirement = requirementById.get(relation.requirement_id);
  assert.ok(!(requirement.section === 'LISTENING' && relation.skill_id.startsWith('reading_')), 'reading skill mapped as Listening performance');
}

const unmappedIds = new Set();
for (const gap of asset.unmapped_requirements) {
  assert.ok(requirementIds.has(gap.requirement_id), `unknown unmapped requirement ${gap.requirement_id}`);
  assert.ok(!unmappedIds.has(gap.requirement_id), `duplicate unmapped requirement ${gap.requirement_id}`);
  assert.ok(coverageStatuses.has(gap.coverage_status), `invalid gap status ${gap.coverage_status}`);
  unmappedIds.add(gap.requirement_id);
}
const mappedIds = new Set(asset.mapped_relations.map(relation => relation.requirement_id));
for (const id of requirementIds) assert.equal(Number(mappedIds.has(id)) + Number(unmappedIds.has(id)), 1, `requirement must resolve exactly once: ${id}`);

const proxies = diagnostic.items.filter(item => ['listening', 'speaking'].includes(item.broad_category));
assert.equal(proxies.length, 10);
assert.ok(proxies.every(item => item.mapping_status === 'UNMAPPED_PROXY' && item.primary_skill_id === null && item.evidence_type === null));
assert.ok(asset.mapped_relations.filter(relation => ['LISTENING', 'SPEAKING'].includes(requirementById.get(relation.requirement_id).section)).every(relation => relation.diagnostic_evidence === false), 'proxy treated as performance evidence');

const gtLetter = asset.mapped_relations.find(relation => relation.requirement_id === 'writing_gt_task1_letter');
assert.ok(gtLetter);
assert.equal(gtLetter.skill_id, 'formal_letter_writing');
assert.equal(gtLetter.mapping_class, 'SUPPORTING_LANGUAGE_FOUNDATION');
assert.equal(gtLetter.coverage_status, 'PARTIALLY_COVERED');

const ieltsGoals = goals.mappings.filter(mapping => mapping.goal_id === 'IELTS');
assert.equal(ieltsGoals.length, 9, 'IELTS coarse mapping count');
assert.ok(ieltsGoals.every(mapping => mapping.evidence_class === 'CURATED_REPOSITORY_MAPPING'));
assert.equal(ieltsGoals.find(mapping => mapping.skill_id === 'word_choice_register').importance, 'SUPPORTING');
assert.equal(ieltsGoals.find(mapping => mapping.skill_id === 'formal_letter_writing').importance, 'OPTIONAL');
assert.ok(!ieltsGoals.some(mapping => mapping.skill_id === 'writing_precis'), 'writing_precis coarse IELTS leakage');

const ieltsDestinationSkills = destinations.destinations.filter(destination => destination.goal_ids.includes('IELTS')).map(destination => destination.skill_id);
assert.deepEqual(ieltsDestinationSkills, ['formal_letter_writing', 'writing_coherence_cohesion', 'writing_visual_information_description']);
assert.ok(!destinations.destinations.find(destination => destination.skill_id === 'writing_precis').goal_ids.includes('IELTS'), 'writing_precis IELTS eligibility');
for (const relation of asset.mapped_relations) {
  const actual = ieltsDestinationSkills.includes(relation.skill_id);
  assert.equal(relation.static_destination, actual, `incorrect static destination claim ${relation.skill_id}`);
}
for (const skill of ['reading_main_idea', 'reading_supporting_detail']) {
  assert.ok(asset.mapped_relations.filter(relation => relation.skill_id === skill).every(relation => relation.coverage_status === 'PRACTICE_GAP'));
}

assert.equal(diagnostic.items.length, 40);
assert.equal(diagnostic.items.filter(item => item.mapping_status === 'MAPPED_OBJECTIVE').length, 19);
assert.equal(diagnostic.items.filter(item => item.mapping_status !== 'MAPPED_OBJECTIVE').length, 21);
assert.equal(new Set(diagnostic.items.filter(item => item.mapping_status === 'MAPPED_OBJECTIVE').map(item => item.primary_skill_id)).size, 12);
assert.deepEqual(new Set(boundary.probes.map(probe => probe.primary_skill_id)), new Set(['compound_subject_agreement', 'indefinite_article_a_an', 'gerund_after_preposition', 'essay_thesis_focus']));
assert.equal(graph.families.length, 14);
assert.equal(activeSkills.size, 67);
assert.equal(graph.item_mappings.length, 320);

assert.equal(frozen.aggregateSha256, '202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0');
for (const item of [...frozen.pages, ...frozen.guards]) assert.equal(sha256(item.path), item.sha256, `frozen file changed ${item.path}`);
const recomputedAggregate = crypto.createHash('sha256').update(frozen.pages.map(page => `${page.path}\0${sha256(page.path)}\n`).sort().join('')).digest('hex');
assert.equal(recomputedAggregate, frozen.aggregateSha256, 'frozen aggregate changed');

const result = {
  status: 'PASS',
  requirements: asset.requirements.length,
  mappingRelations: asset.mapped_relations.length,
  uniqueMappedSkills: new Set(asset.mapped_relations.map(relation => relation.skill_id)).size,
  unmapped: asset.unmapped_requirements.length,
  ieltsCoarseMappings: ieltsGoals.map(mapping => ({skill_id: mapping.skill_id, importance: mapping.importance})),
  diagnostic: {questions: 40, mapped: 19, unmapped: 21, uniqueSkills: 12},
  graph: {families: 14, activeSkills: 67, itemMappings: 320},
  frozenAggregateSha256: frozen.aggregateSha256
};
console.log(JSON.stringify(result, null, 2));
module.exports = result;
