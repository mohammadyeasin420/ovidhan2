'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bcs-candidate-intelligence-v1.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'bcs-candidate-intelligence-v1.schema.json'), 'utf8'));
const graph = JSON.parse(fs.readFileSync(path.join(root, 'skill-mistake-graph.json'), 'utf8'));
const frozen = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json'), 'utf8'));

assert.equal(schema.properties.schema_version.const, 1);
assert.equal(model.schema_version, 1);
assert.deepEqual(model.source_policy.candidate_facing_publishable, ['OFFICIAL_BPSC', 'OFFICIAL_GOVERNMENT']);
assert.equal(model.journey_stages.length, 11);
assert.equal(model.exam_records.length, 0, '4C must not fabricate exam/date/result records');

const ids = model.journey_stages.map(stage => stage.stage_id);
assert.equal(new Set(ids).size, ids.length, 'stage IDs must be unique');
const idSet = new Set(ids);
model.journey_stages.forEach(stage => {
  [...stage.previous_stage_ids, ...stage.next_stage_ids].forEach(id => assert.ok(idSet.has(id), `unknown transition ${stage.stage_id} -> ${id}`));
  assert.ok(stage.actions.length > 0);
  if (stage.learning_cta) {
    assert.equal(stage.learning_cta.optional, true);
    assert.ok(stage.learning_cta.href.startsWith('/'));
  }
});
assert.ok(model.journey_stages.some(stage => stage.next_stage_ids.length > 1), 'journey must allow non-linear paths');

const forbidden = new Set(model.candidate_state_contract.forbidden_fields);
['name','nid','phone','address','email','registration_number','roll_number'].forEach(field => assert.ok(forbidden.has(field)));
model.candidate_state_contract.allowed_fields.forEach(field => assert.ok(!forbidden.has(field)));
const analyticsForbidden = new Set(model.analytics_contract.forbidden_properties);
['registration_number','roll_number','raw_answer'].forEach(field => assert.ok(analyticsForbidden.has(field)));
assert.equal(model.analytics_contract.high_cardinality_properties_allowed, false);
assert.equal(model.watcher_contract.autonomous_publication, false);
assert.equal(model.watcher_contract.pipeline.at(-2), 'HUMAN_SOURCE_GATE');

assert.equal(graph.graph_version, 3);
assert.equal(graph.skills.length, 65);
assert.ok(graph.skills.some(skill => skill.id === 'writing_precis'));
assert.ok(graph.skills.some(skill => skill.id === 'formal_letter_writing'));
const ctas = model.journey_stages.filter(stage => stage.learning_cta).map(stage => stage.learning_cta.action_id);
assert.deepEqual(ctas, ['OPEN_ENGLISH_DIAGNOSTIC','OPEN_WRITING_PRACTICE','OPEN_INTERVIEW_ENGLISH','OPEN_MISTAKE_MIRROR']);

const frozenPaths = frozen.pages.map(page => page.path);
assert.equal(frozenPaths.length, 144);
frozen.pages.forEach(page => assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, page.path))).digest('hex'), page.sha256, `frozen page changed: ${page.path}`));
frozen.guards.forEach(guard => assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, guard.path))).digest('hex'), guard.sha256, `frozen guard changed: ${guard.path}`));
assert.equal(frozen.aggregateSha256, '202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0');

console.log(JSON.stringify({
  status: 'PASS', schemaVersion: model.schema_version, journeyStages: ids.length,
  validTransitions: model.journey_stages.reduce((sum, stage) => sum + stage.next_stage_ids.length, 0),
  factualExamRecords: model.exam_records.length, candidateFacingSourceClasses: model.source_policy.candidate_facing_publishable,
  analyticsEvents: model.analytics_contract.events.length, graphSkills: graph.skills.length,
  frozenSeoPages: frozenPaths.length, frozenAggregateSha256: '202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0'
}, null, 2));
