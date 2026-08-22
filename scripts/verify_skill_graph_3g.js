'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const graphPath = path.join(root, 'skill-mistake-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const { items, addReviewedPack } = require('../mistake-mirror.js');
const reviewedPack = require('../data/bcs-smartpath-practice-v1.json');
assert.equal(items.length, 30, 'original Mistake Mirror item count');
assert.equal(reviewedPack.length, 70, 'reviewed practice-pack item count');
addReviewedPack(reviewedPack);
const allowedEdges = new Set(['PREREQUISITE_OF','RELATED_TO','OFTEN_CONFUSED_WITH','TRANSFER_PATTERN_FOR','PRACTICED_BY','RELEVANT_TO_EXAM']);
function unique(values, label) { assert.equal(new Set(values).size, values.length, `duplicate ${label}`); }
function noDuplicates(values, label) { assert.equal(new Set(values).size, values.length, `duplicate relationship in ${label}`); }

assert.equal(graph.graph_version, 2);
assert.equal(graph.schema_version, 1);
assert.equal(graph.families.length, 11);
assert.equal(graph.skills.length, 52);
assert.equal(items.length, 100);
assert.equal(graph.item_mappings.length, 100);
unique(graph.families.map(family => family.family_id), 'family ID');
unique(graph.skills.map(skill => skill.id), 'skill ID');
unique(graph.item_mappings.map(mapping => mapping.item_id), 'item mapping');
unique(graph.edges.map(edge => `${edge.from}|${edge.to}|${edge.type}`), 'edge');

const familyIds = new Set(graph.families.map(family => family.family_id));
const skillIds = new Set(graph.skills.map(skill => skill.id));
const transferIds = new Set(graph.transfer_patterns.map(pattern => pattern.id));
const itemIds = new Set(items.map(item => item.id));
assert.equal(itemIds.size, 100);
assert.equal(items.filter(item => item.id.startsWith('mm-')).length, 30);
assert.equal(items.filter(item => item.id.startsWith('bcs-smartpath-')).length, 70);
const mappingsBySkill = new Map(graph.skills.map(skill => [skill.id, []]));
graph.item_mappings.forEach(mapping => mappingsBySkill.get(mapping.primary_skill_id).push(mapping.item_id));
graph.families.forEach(family => {
    assert.match(family.family_id, /^[A-Z0-9_]+$/);
    assert.ok(family.name_en && family.name_bn && family.description);
    noDuplicates(family.child_skill_ids, family.family_id + ' children');
    family.child_skill_ids.forEach(id => assert.ok(skillIds.has(id), `missing child ${id}`));
    family.related_family_ids.forEach(id => assert.ok(familyIds.has(id) && id !== family.family_id));
});
graph.skills.forEach(skill => {
    ['id','name_en','name_bn','family_id','description','difficulty_band','status','version'].forEach(field => assert.ok(skill[field] !== undefined, `${skill.id} missing ${field}`));
    assert.match(skill.id, /^[a-z0-9_]+$/);
    assert.match(skill.name_bn, /[\u0980-\u09ff]/);
    assert.ok(familyIds.has(skill.family_id));
    assert.ok(graph.families.find(family => family.family_id === skill.family_id).child_skill_ids.includes(skill.id));
    ['prerequisites','related_skills','common_mistake_families','example_item_ids','exam_relevance'].forEach(field => assert.ok(Array.isArray(skill[field])));
    noDuplicates(skill.prerequisites, skill.id + ' prerequisites'); noDuplicates(skill.related_skills, skill.id + ' related');
    skill.prerequisites.forEach(id => assert.ok(skillIds.has(id) && id !== skill.id));
    skill.related_skills.forEach(id => assert.ok(skillIds.has(id) && id !== skill.id));
    skill.example_item_ids.forEach(id => assert.ok(itemIds.has(id), `${skill.id} has unknown example ${id}`));
    assert.ok(skill.example_item_ids.length || skill.orphan_reason, `${skill.id} is undocumented orphan`);
    if (mappingsBySkill.get(skill.id).length) {
        assert.equal(skill.status, 'ACTIVE', `${skill.id} has reviewed practice but is not ACTIVE`);
        assert.ok(skill.example_item_ids.length, `${skill.id} has reviewed practice but no example items`);
        assert.notEqual(skill.orphan_reason, 'Canonical coverage for future reviewed items.', `${skill.id} retains stale future-review metadata`);
    }
});
graph.item_mappings.forEach(mapping => {
    assert.ok(itemIds.has(mapping.item_id)); assert.ok(skillIds.has(mapping.primary_skill_id)); assert.ok(familyIds.has(mapping.primary_family_id));
    assert.equal(graph.skills.find(skill => skill.id === mapping.primary_skill_id).family_id, mapping.primary_family_id);
    noDuplicates(mapping.secondary_skill_ids, mapping.item_id + ' secondary');
    mapping.secondary_skill_ids.forEach(id => assert.ok(skillIds.has(id) && id !== mapping.primary_skill_id));
});
assert.deepEqual(new Set(graph.item_mappings.map(mapping => mapping.item_id)), itemIds);
graph.edges.forEach(edge => {
    assert.ok(allowedEdges.has(edge.type));
    assert.ok(skillIds.has(edge.from) || transferIds.has(edge.from));
    assert.ok(skillIds.has(edge.to)); assert.notEqual(edge.from, edge.to);
});

// Node arrays remain the runtime authority in Phase 5A1. Any retained explicit
// prerequisite/related edge must agree with them, but missing duplicate edges
// are intentionally not inferred during this compatibility phase.
graph.edges.filter(edge => edge.type === 'PREREQUISITE_OF').forEach(edge => {
    assert.ok(graph.skills.find(skill => skill.id === edge.to).prerequisites.includes(edge.from), `contradictory prerequisite edge ${edge.from} -> ${edge.to}`);
});
graph.edges.filter(edge => edge.type === 'RELATED_TO').forEach(edge => {
    const from = graph.skills.find(skill => skill.id === edge.from);
    const to = graph.skills.find(skill => skill.id === edge.to);
    assert.ok(from.related_skills.includes(edge.to) || to.related_skills.includes(edge.from), `contradictory related edge ${edge.from} -> ${edge.to}`);
});

const prerequisiteMap = new Map(graph.skills.map(skill => [skill.id, new Set(skill.prerequisites)]));
graph.edges.filter(edge => edge.type === 'PREREQUISITE_OF').forEach(edge => prerequisiteMap.get(edge.to).add(edge.from));
function visit(id, visiting, visited) {
    if (visiting.has(id)) throw new Error(`circular prerequisite at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id); prerequisiteMap.get(id).forEach(parent => visit(parent, visiting, visited)); visiting.delete(id); visited.add(id);
}
const visited = new Set(); skillIds.forEach(id => visit(id, new Set(), visited));
console.log(JSON.stringify({status:'PASS',graphVersion:graph.graph_version,families:graph.families.length,skills:graph.skills.length,itemMappings:graph.item_mappings.length,edges:graph.edges.length,transferPatterns:graph.transfer_patterns.length},null,2));
