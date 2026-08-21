'use strict';
const assert = require('node:assert/strict');
const graph = require('../skill-mistake-graph.json');
const transfer = require('../bangla-english-transfer-graph.json');
const ids = new Set(graph.skills.map(skill => skill.id));
assert.equal(transfer.schema_version, 1);
assert.equal(transfer.edges.length, 4);
assert.deepEqual(new Set(transfer.edges.map(edge => edge.source_pattern_id)), new Set(['ARTICLE_ABSENCE_TRANSFER','POSTPOSITION_PREPOSITION_TRANSFER','WORD_ORDER_TRANSFER','LITERAL_TRANSLATION_TRANSFER']));
transfer.edges.forEach(edge => {
    ['edge_id','source_language','source_pattern_id','target_skill_id','relationship_type','evidence_class','provenance','review_status','reviewed_at','scope_notes','exclusions','version'].forEach(field => assert.ok(edge[field] !== undefined, `${edge.edge_id} missing ${field}`));
    assert.equal(edge.source_language, 'bn');
    assert.equal(edge.evidence_class, 'CURATED_TRANSFER_HYPOTHESIS');
    assert.notEqual(edge.evidence_class, 'EMPIRICAL_CO_MISTAKE');
    assert.ok(edge.provenance.length);
    assert.ok(ids.has(edge.target_skill_id));
    assert.equal(Object.hasOwn(edge, 'prevalence_rate'), false);
    assert.equal(Object.hasOwn(edge, 'probability'), false);
});
console.log('PASS transfer graph: 4 reviewed curated hypotheses');
