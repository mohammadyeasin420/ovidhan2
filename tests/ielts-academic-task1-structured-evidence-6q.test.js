"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const writing = require("../ielts-writing-practice.js");
const foundation = require("../learning-foundation.js");
const router = require("../smartpath-router.js");
const profile = require("../mistake-profile.js");

const data = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", name), "utf8"));
const gt = data("ielts-gt-writing-performance-v1.json");
const academic = data("ielts-academic-writing-performance-v1.json");
const repairs = data("ielts-writing-repair-retest-v1.json");
const graph = data("../skill-mistake-graph.json");
const destinations = data("../smartpath-destinations.json");
const goals = data("../goal-skill-requirements.json");
const clock = (() => { let n = 1000; return () => (n += 31000); })();

function finish(mode) {
  const session = writing.createWritingSession(gt, academic, clock, mode, repairs);
  session.setText("A learner response that must remain only in session memory.");
  session.finish();
  return session;
}

const task1 = finish("academic-task1");
assert.match(writing.renderTask1EvidenceCheck(task1.getState()), /Task 1 Evidence Check/);
["academic-task2", "gt-letter", "gt-essay"].forEach((mode) => assert.strictEqual(writing.renderTask1EvidenceCheck(finish(mode).getState()), ""));

writing.TASK1_CHECKS.forEach((type, index) => task1.setTask1Check(type, ["YES", "NO", "NOT_SURE", "NO"][index]));
assert.strictEqual(task1.getState().task1CheckCompleted, false, "temporary choices stay session-only");
const records = task1.completeTask1Check();
assert.deepStrictEqual(records.map((x) => x.checkType), writing.TASK1_CHECKS);
assert.strictEqual(records.find((x) => x.checkType === "COMPARISON").repairCode, null, "no invented comparison repair mapping");
assert.strictEqual(records.find((x) => x.checkType === "OVERVIEW").repairCode, "OVERVIEW_MISSING");

const storage = foundation.createMemoryStorage();
const learning = foundation.createLearningFoundation({localStorage:storage, sessionStorage:foundation.createMemoryStorage(), now:() => new Date("2026-08-28T12:00:00Z")});
assert.deepStrictEqual(learning.getState().task1StructuredEvidence, {}, "radio changes did not persist");
assert.strictEqual(writing.persistTask1CheckRecords(learning, records), true);
const state = learning.getState();
assert.strictEqual(Object.keys(state.task1StructuredEvidence).length, 4);
Object.values(state.task1StructuredEvidence).forEach((entry) => {
  assert.strictEqual(entry.provenance, "LEARNER_SELECTED");
  assert.strictEqual(entry.evidence_source, "SELF_REPORTED_RESPONSE_CHECK");
  assert.strictEqual(entry.confidence, "SELF_REPORTED");
  ["writing", "text", "paragraph", "score", "band", "mastery", "task_achievement"].forEach((field) => assert.strictEqual(Object.hasOwn(entry, field), false));
});
assert.strictEqual(learning.recordTask1StructuredEvidence({evidenceId:"ielts-task1-probe:x:overview",taskId:"x",skillId:"writing_visual_information_description",checkType:"OVERVIEW",evidenceSource:"OBJECTIVE_VISUAL_PROBE",objectiveResult:"CORRECT"}), true);
const probe = learning.getState().task1StructuredEvidence["ielts-task1-probe:x:overview"];
assert.strictEqual(probe.provenance, "OBJECTIVE_DETECTED");
assert.strictEqual(probe.confidence, "OBJECTIVE");
assert.strictEqual(probe.learner_answer, null);
assert.strictEqual(Object.hasOwn(probe, "criterion_result"), false);

const reloaded = foundation.createLearningFoundation({localStorage:storage, sessionStorage:foundation.createMemoryStorage(), now:() => new Date("2026-08-29T12:00:00Z")});
assert.strictEqual(Object.keys(reloaded.getState().task1StructuredEvidence).length, 5, "versioned evidence survives normalization");
const productive = profile.aggregate([], reloaded.getState(), {skills:[],item_mappings:[]}).productiveWeaknesses;
assert.ok(productive.length >= 1 && productive.every((entry) => entry.provenance === "LEARNER_SELECTED" && entry.confidence === "SELF_REPORTED"));
const retained = reloaded.getState();
Object.values(retained.task1StructuredEvidence).forEach((entry) => assert.strictEqual(entry.confidence, entry.evidence_source === "OBJECTIVE_VISUAL_PROBE" ? "OBJECTIVE" : "SELF_REPORTED"));
const recommendation = router.recommend({graph,destinations:destinations.destinations,goalGraph:goals,transferGraph:null,state:{...retained,goal:"IELTS"},profile:profile.aggregate([],retained,graph),nowMs:Date.parse("2026-08-29T12:00:00Z")});
assert.strictEqual(recommendation.primary_reason, "PRODUCTIVE_RETRY");
assert.strictEqual(recommendation.url, "/ielts-writing-practice-bangla.html?mode=academic-task1");

const yesStorage = foundation.createMemoryStorage();
const yesLearning = foundation.createLearningFoundation({localStorage:yesStorage,sessionStorage:foundation.createMemoryStorage(),now:() => new Date("2026-08-28T12:00:00Z")});
const yesSession = finish("academic-task1");
writing.TASK1_CHECKS.forEach((type) => yesSession.setTask1Check(type, "YES"));
assert.strictEqual(writing.persistTask1CheckRecords(yesLearning, yesSession.completeTask1Check()), true);
const yesState = yesLearning.getState();
assert.deepStrictEqual(yesState.productiveRetryEvidence, {});
assert.ok(Object.values(yesState.task1StructuredEvidence).every((entry) => !Object.hasOwn(entry,"mastery") && !Object.hasOwn(entry,"masteryStatus")));
assert.strictEqual(foundation.constants.STATE_VERSION, 9);

const source = fs.readFileSync(path.join(__dirname, "..", "ielts-writing-practice.js"), "utf8");
assert.ok(!/innerHTML\s*=.*writingResponse\.value/s.test(source), "no automatic writing inspection path");
console.log("PASS Phase 6Q Academic Task 1 structured evidence and self-check");
