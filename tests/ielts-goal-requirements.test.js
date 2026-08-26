'use strict';
const assert = require('node:assert/strict');
const asset = require('../data/ielts-goal-requirement-map-v1.json');
const goals = require('../goal-skill-requirements.json');
const graph = require('../skill-mistake-graph.json');
const destinations = require('../smartpath-destinations.json');
const diagnostic = require('../data/ielts-diagnostic-skill-map-v1.json');

const approvedSourceUrls = new Set([
  'https://ielts.org/take-a-test/test-types/ielts-academic-test',
  'https://ielts.org/take-a-test/test-types/ielts-general-training-test',
  'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
  'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-reading',
  'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
  'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing',
  'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-writing',
  'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking',
  'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail'
]);

const requirements = new Map(asset.requirements.map(requirement => [requirement.requirement_id, requirement]));
const mapped = new Set(asset.mapped_relations.map(relation => relation.requirement_id));
const unmapped = new Set(asset.unmapped_requirements.map(gap => gap.requirement_id));
requirements.forEach((_, id) => assert.equal(Number(mapped.has(id)) + Number(unmapped.has(id)), 1));
assert.ok(!asset.mapped_relations.some(relation => requirements.get(relation.requirement_id).section === 'LISTENING' && relation.skill_id.startsWith('reading_')));
assert.ok(diagnostic.items.filter(item => ['listening', 'speaking'].includes(item.broad_category)).every(item => item.mapping_status === 'UNMAPPED_PROXY' && item.evidence_type === null));
assert.ok(asset.mapped_relations.filter(relation => requirements.get(relation.requirement_id).section === 'SPEAKING').every(relation => relation.diagnostic_evidence === false));
assert.ok(asset.mapped_relations.filter(relation => requirements.get(relation.requirement_id).section === 'LISTENING').every(relation => relation.diagnostic_evidence === true));
const letter = asset.mapped_relations.find(relation => relation.requirement_id === 'writing_gt_task1_letter');
assert.deepEqual([letter.skill_id, letter.mapping_class, letter.coverage_status], ['formal_letter_writing', 'SUPPORTING_LANGUAGE_FOUNDATION', 'PARTIALLY_COVERED']);
const ieltsGoals = goals.mappings.filter(mapping => mapping.goal_id === 'IELTS');
assert.equal(ieltsGoals.length, 18);
assert.ok(!ieltsGoals.some(mapping => mapping.skill_id === 'writing_precis'));
assert.equal(ieltsGoals.find(mapping => mapping.skill_id === 'word_choice_register').importance, 'SUPPORTING');
assert.equal(ieltsGoals.find(mapping => mapping.skill_id === 'formal_letter_writing').importance, 'OPTIONAL');
assert.deepEqual(destinations.destinations.filter(destination => destination.goal_ids.includes('IELTS')).map(destination => destination.destination_id), ['content:formal_letter_writing','content:writing_coherence_cohesion','content:writing_visual_information_description','content:writing_argument_development','content:ielts_reading_main_idea','content:ielts_reading_supporting_detail','content:ielts_reading_inference','content:ielts_reading_tone_purpose','content:ielts_reading_reference','content:ielts_listening_main_point','content:ielts_listening_specific_detail','content:ielts_listening_conversation_tracking','content:ielts_listening_fact_connection','content:ielts_listening_information_relationship','content:ielts_speaking_extended_turn','content:ielts_speaking_discussion_response','content:ielts_writing_letter_task_response','content:ielts_academic_task1_writing','content:ielts_academic_task2_writing']);
assert.ok(asset.mapped_relations.filter(relation => ['reading_main_idea', 'reading_supporting_detail'].includes(relation.skill_id)).every(relation => relation.coverage_status === 'PARTIALLY_COVERED' && relation.static_destination === true));
const active = new Set(graph.skills.filter(skill => skill.status === 'ACTIVE').map(skill => skill.id));
assert.ok(asset.mapped_relations.every(relation => active.has(relation.skill_id)));
const sources = new Set(asset.sources.map(source => source.source_id));
assert.ok(asset.sources.every(source => source.access_date === '2026-08-23'));
assert.ok(asset.sources.every(source => approvedSourceUrls.has(source.url)));
assert.equal(new Set(asset.sources.map(source => source.url)).size, asset.sources.length);
assert.ok(asset.requirements.every(requirement => requirement.source_ids.length && requirement.source_ids.every(id => sources.has(id))));
assert.deepEqual([graph.families.length, active.size], [16, 76]);assert.equal(graph.item_mappings.length,536);assert.equal(new Set(graph.item_mappings.map(mapping=>mapping.item_id)).size,536);
console.log(JSON.stringify({status:'PASS', tests:13, requirements:asset.requirements.length, mappings:asset.mapped_relations.length, unmapped:asset.unmapped_requirements.length}, null, 2));
