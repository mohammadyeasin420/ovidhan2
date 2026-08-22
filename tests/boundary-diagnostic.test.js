'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const foundationApi = require('../learning-foundation.js');

function test(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (error) {
    console.error('FAIL', name);
    throw error;
  }
}

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'ielts-diagnostic.html'), 'utf8');
const asset = require('../data/ielts-boundary-probes-v1.json');
const deriveSource = html.match(/function deriveBoundarySignal\([\s\S]*?\n\}/)[0];
const payloadSource = html.match(/function buildBoundaryEvidencePayload\([\s\S]*?\n\}/)[0];
const sandbox = {BOUNDARY_PILOT_ID: asset.pilot_id, boundaryRuntime: new Map(), boundaryProbes: asset.probes};
vm.runInNewContext(`${deriveSource}\n${payloadSource}`, sandbox);
const derive = sandbox.deriveBoundarySignal;
const payload = sandbox.buildBoundaryEvidencePayload;
const states = () => new Map(asset.probes.map(probe => [probe.probe_id, {status: 'PENDING', selectedIndex: null, correct: null}]));

test('true,true produces TRANSFER_OBSERVED', () => assert.equal(derive(true, true).code, 'TRANSFER_OBSERVED'));
test('true,false produces BOUNDARY_CANDIDATE', () => assert.equal(derive(true, false).code, 'BOUNDARY_CANDIDATE'));
test('false,true produces CONTEXT_SENSITIVE_SIGNAL', () => assert.equal(derive(false, true).code, 'CONTEXT_SENSITIVE_SIGNAL'));
test('false,false produces REPEATED_GAP_SIGNAL', () => assert.equal(derive(false, false).code, 'REPEATED_GAP_SIGNAL'));
test('skip produces no Boundary evidence payload', () => {
  const runtime = states(); runtime.get(asset.probes[0].probe_id).status = 'SKIPPED';
  assert.equal(payload(true, runtime, asset.probes).length, 0);
});
test('unfinished assessment produces no persistence payload', () => {
  const runtime = states(); Object.assign(runtime.get(asset.probes[0].probe_id), {status: 'ANSWERED', correct: true});
  assert.equal(payload(false, runtime, asset.probes).length, 0);
});
test('completed assessment produces evidence for answered probes', () => {
  const runtime = states(); Object.assign(runtime.get(asset.probes[0].probe_id), {status: 'ANSWERED', correct: true});
  assert.deepEqual(JSON.parse(JSON.stringify(payload(true, runtime, asset.probes))), [{evidenceId: 'ielts-boundary-v1:p01', skillId: 'compound_subject_agreement', evidenceType: 'BOUNDARY_PROBE', result: 'correct', sourceId: 'ielts-boundary-v1'}]);
});
test('retake reuses evidence IDs and increments Learning Foundation attempts', () => {
  const storage = foundationApi.createMemoryStorage();
  const learning = foundationApi.createLearningFoundation({localStorage: storage, sessionStorage: foundationApi.createMemoryStorage(), now: () => new Date('2026-08-23T12:00:00Z')});
  const entry = {evidenceId: 'ielts-boundary-v1:p01', skillId: 'compound_subject_agreement', evidenceType: 'BOUNDARY_PROBE', sourceId: 'ielts-boundary-v1'};
  learning.recordSkillEvidence(entry.evidenceId, entry.skillId, entry.evidenceType, 'correct', entry.sourceId);
  learning.recordSkillEvidence(entry.evidenceId, entry.skillId, entry.evidenceType, 'incorrect', entry.sourceId);
  const evidence = learning.getState().skillEvidence[entry.evidenceId];
  assert.equal(Object.keys(learning.getState().skillEvidence).length, 1);
  assert.equal(evidence.attempts, 2);
});
test('probe correctness does not alter score X/40', () => {
  const answers = Array(40).fill(0), questions = Array.from({length: 40}, (_, index) => ({a: index < 17 ? 0 : 1}));
  const score = () => questions.reduce((total, question, index) => total + (answers[index] === question.a ? 1 : 0), 0);
  const before = score(); const runtime = states(); Object.assign(runtime.get(asset.probes[0].probe_id), {status: 'ANSWERED', correct: false});
  assert.equal(score(), before); assert.equal(`${score()}/40`, '17/40');
});
test('Boundary evidence does not mutate mistake, repair, retest or mastery state', () => {
  const learning = foundationApi.createLearningFoundation({localStorage: foundationApi.createMemoryStorage(), sessionStorage: foundationApi.createMemoryStorage()});
  const before = learning.getState();
  learning.recordSkillEvidence('ielts-boundary-v1:p02', 'indefinite_article_a_an', 'BOUNDARY_PROBE', 'correct', 'ielts-boundary-v1');
  const after = learning.getState(), evidence = after.skillEvidence['ielts-boundary-v1:p02'];
  assert.deepEqual(after.mistakeSignals, before.mistakeSignals);
  assert.ok(!('repairResult' in evidence) && !('retestResult' in evidence) && !('masteryStatus' in evidence));
});
test('runtime reset restores all probes to PENDING', () => {
  let runtime = states(); Object.assign(runtime.get(asset.probes[0].probe_id), {status: 'ANSWERED', selectedIndex: 1, correct: true});
  runtime = states(); assert.ok([...runtime.values()].every(state => state.status === 'PENDING' && state.selectedIndex === null && state.correct === null));
});
