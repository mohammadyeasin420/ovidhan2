'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const schema = JSON.parse(fs.readFileSync(path.join(root, 'question-dna-v1.schema.json'), 'utf8'));
const graph = JSON.parse(fs.readFileSync(path.join(root, 'skill-mistake-graph.json'), 'utf8'));
const bank = JSON.parse(fs.readFileSync(path.join(root, 'question-bank.json'), 'utf8'));

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.properties.schema_version.const, 1);
['question_id', 'exam', 'subject', 'question_text', 'options', 'answer', 'taxonomy', 'provenance', 'verification', 'publication_status']
    .forEach(field => assert.ok(schema.required.includes(field), 'missing required field: ' + field));
assert.deepEqual(schema.properties.answer.properties.status.enum, ['OFFICIAL', 'VERIFIED', 'CORROBORATED', 'DISPUTED', 'UNVERIFIED']);
assert.deepEqual(schema.properties.provenance.items.properties.level.enum, ['A', 'B', 'C', 'D']);
assert.ok(schema.properties.taxonomy.required.includes('topic_id'));
assert.ok(schema.allOf.length >= 3, 'publication/dispute/official gates are required');
assert.ok(schema['x-ovidhan-validation-rules'].some(rule => rule.includes('skill-mistake-graph.json')));
assert.equal(graph.graph_version, 1);
assert.equal(graph.skills.length, 50);

const bcs = bank.questions.filter(question =>
    (Array.isArray(question.exam_tags) && question.exam_tags.includes('bcs')) ||
    /bcs/i.test(question._source_file || '')
);
const byText = new Map();
bcs.forEach(question => {
    const key = String(question.question_text || '').trim().toLowerCase();
    if (key) byText.set(key, (byText.get(key) || 0) + 1);
});
const duplicateTexts = Array.from(byText.values()).filter(count => count > 1).length;
const withProvenance = bcs.filter(question => question.source_url || question.source_reference || question.source_type).length;

assert.equal(bcs.length, 18, 'repository BCS inventory changed; repeat the provenance audit');
assert.equal(withProvenance, 0, 'legacy question provenance changed; review before migration');
assert.equal(duplicateTexts, 1, 'legacy duplicate count changed; review before migration');

console.log(JSON.stringify({
    status: 'PASS',
    schemaVersion: 1,
    graphVersion: graph.graph_version,
    graphSkills: graph.skills.length,
    existingBcsTaggedQuestions: bcs.length,
    existingBcsQuestionsWithProvenance: withProvenance,
    existingDuplicateQuestionTexts: duplicateTexts,
    trustedPilotRecordsCreated: 0,
    publicationGate: 'HOLD_UNTIL_SOURCE_AND_HUMAN_REVIEW'
}, null, 2));
