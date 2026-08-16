'use strict';
const assert = require('node:assert/strict');
const graph = require('../skill-mistake-graph.json');
const profile = require('../mistake-profile.js');
const { items } = require('../mistake-mirror.js');
function test(name, fn) { try { fn(); console.log('PASS', name); } catch (error) { console.error('FAIL', name); throw error; } }
function signal(values) { return Object.assign({initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0},values); }

test('graph has versioned 10-family 50-skill structure',()=>{assert.equal(graph.graph_version,1);assert.equal(graph.families.length,10);assert.equal(graph.skills.length,50);});
test('all 30 reviewed items map once to canonical skill and family',()=>{assert.equal(graph.item_mappings.length,30);assert.deepEqual(new Set(graph.item_mappings.map(x=>x.item_id)),new Set(items.map(x=>x.id)));});
test('article item resolves to canonical article skill and family',()=>{const t=profile.taxonomyFor(items.find(x=>x.id==='mm-article-apple'),graph);assert.equal(t.micro_skill,'indefinite_article_a_an');assert.equal(t.mistake_family,'ARTICLES');});
test('existing item-keyed evidence aggregates under canonical graph IDs without loss',()=>{const state={mistakeSignals:{'mm-good-at':Object.assign(signal({initialIncorrect:2,retestIncorrect:1}),{retestResult:'incorrect'})}};const p=profile.aggregate(items,state,graph);const family=p.families.find(x=>x.id==='PREPOSITIONS');assert.equal(p.observedItemCount,1);assert.equal(family.status,'NEEDS_PRACTICE');assert.ok(family.itemIds.includes('mm-good-at'));});
test('graph-related next action is deterministic and avoids current item',()=>{const state={mistakeSignals:{},recentActions:[]};const a=profile.recommendNext(items,state,'mm-article-apple',Date.parse('2026-08-16T12:00:00Z'),graph);const b=profile.recommendNext(items,state,'mm-article-apple',Date.parse('2026-08-16T12:00:00Z'),graph);assert.notEqual(a.item.id,'mm-article-apple');assert.equal(a.item.id,b.item.id);assert.equal(a.reason_code,'REINFORCEMENT');assert.ok(['mm-advice-uncountable','mm-information-uncountable'].includes(a.item.id));});
test('new learner graph does not invent weakness',()=>{const p=profile.aggregate(items,{mistakeSignals:{}},graph);assert.ok(p.families.every(x=>x.status==='NEW'));});
test('corrupt graph is rejected and fallback taxonomy remains available',()=>{const corrupt={graph_version:1,families:graph.families,skills:graph.skills,item_mappings:[{item_id:'mm-article-apple',primary_skill_id:'missing_skill',primary_family_id:'ARTICLES'}]};assert.equal(profile.setGraph(corrupt),false);const item=items[0];assert.equal(profile.taxonomyFor(item,null).micro_skill,item.micro_skill);});
test('optional transfer patterns remain separate from English skill nodes',()=>{const skillIds=new Set(graph.skills.map(x=>x.id));graph.transfer_patterns.forEach(x=>assert.equal(skillIds.has(x.id),false));});
console.log('PASS all skill-graph tests');
