'use strict';
const assert = require('node:assert/strict');
const router = require('../smartpath-router.js');
const profileApi = require('../mistake-profile.js');
const { items } = require('../mistake-mirror.js');
const graph = require('../skill-mistake-graph.json');
const transferGraph = require('../bangla-english-transfer-graph.json');
const goalGraph = require('../goal-skill-requirements.json');
const destinationGraph = require('../smartpath-destinations.json');
const NOW = Date.parse('2026-08-21T12:00:00.000Z');

function test(name, fn) { try { fn(); console.log('PASS', name); } catch (error) { console.error('FAIL', name); throw error; } }
function signal(overrides) { return Object.assign({attempts:0,initialResult:null,repairResult:null,retestResult:null,masteryStatus:'needs-repair',lastSeenAt:'2026-08-21T10:00:00.000Z',initialCorrect:0,initialIncorrect:0,repairCorrect:0,repairIncorrect:0,retestCorrect:0,retestIncorrect:0},overrides); }
function destinations() { return router.mistakeDestinations(items, graph).concat(destinationGraph.destinations); }
function run(state, overrides) {
    state = Object.assign({goal:null,level:null,mistakeSignals:{},recentActions:[]}, state || {});
    const profile = profileApi.aggregate(items, state, graph);
    return router.recommend(Object.assign({state,profile,graph,transferGraph,goalGraph,destinations:destinations(),nowMs:NOW}, overrides || {}));
}

test('identical state input and time produce identical output', () => {
    const state={goal:'BCS',mistakeSignals:{},recentActions:[]};
    assert.deepEqual(run(state),run(state));
});
test('failed retest outranks every ordinary factor', () => {
    const result=run({goal:'BCS',mistakeSignals:{'mm-listen-to':signal({initialIncorrect:1,retestIncorrect:1,retestResult:'incorrect'})},recentActions:[]});
    assert.equal(result.item_id,'mm-listen-to'); assert.equal(result.primary_reason,'FAILED_RETEST'); assert.equal(result.priority_band,'HIGH');
});
test('unresolved mistake outranks goal-new content', () => {
    const result=run({goal:'BCS',mistakeSignals:{'mm-depend-on':signal({initialIncorrect:1,initialResult:'incorrect'})},recentActions:[]});
    assert.equal(result.item_id,'mm-depend-on'); assert.equal(result.primary_reason,'UNRESOLVED_MISTAKE');
});
test('direct learner weakness outranks a transfer-only hypothesis', () => {
    const result=run({mistakeSignals:{'mm-much-many':signal({initialIncorrect:2,repairIncorrect:1,retestIncorrect:1,retestResult:'incorrect'})},recentActions:[]});
    assert.equal(result.item_id,'mm-much-many'); assert.notEqual(result.primary_reason,'TRANSFER_RISK');
});
test('a recently practised item receives bounded penalties', () => {
    const base=run({recentActions:[]});
    const repeated=run({recentActions:[{id:'mistake-mirror:'+base.item_id,type:'mistake-mirror',result:'correct',at:'2026-08-21T11:00:00.000Z'}]});
    const prior=base.ranked_diagnostics.find(x=>x.destination_id===base.destination_id);
    const after=repeated.ranked_diagnostics.find(x=>x.destination_id===base.destination_id);
    assert.ok(after.score < prior.score); assert.equal(after.score_breakdown.recently_practiced_penalty,-35);
});
test('goal mapping changes ranking only through explicit mappings', () => {
    const noMappings={schema_version:1,goal_ids:goalGraph.goal_ids,mappings:[]};
    const a=run({goal:'BCS'},{goalGraph:noMappings});
    const b=run({goal:'BCS'});
    const mapped=b.ranked_diagnostics.filter(x=>x.score_breakdown.goal_relevance>0);
    assert.ok(mapped.length); assert.ok(a.ranked_diagnostics.every(x=>x.score_breakdown.goal_relevance===0));
});
test('missing or unknown goal safely routes as GENERAL_ENGLISH without rewriting state', () => {
    assert.equal(run({goal:'legacy-free-text'}).goal_id,'GENERAL_ENGLISH');
    assert.equal(router.safeGoal(null),'GENERAL_ENGLISH');
});
test('unmet prerequisite is preferred and sufficient evidence permits dependent skill', () => {
    const customDest=[
      {destination_id:'lesson:simple-present',skill_id:'simple_present_form',url:'/verb-rules-bangla.html',activity_type:'LESSON',difficulty:'BEGINNER',estimated_minutes:8,review_status:'REVIEWED'},
      {destination_id:'lesson:third-person',skill_id:'third_person_s',url:'/subject-verb-agreement-bangla.html',activity_type:'LESSON',difficulty:'BEGINNER',estimated_minutes:8,review_status:'REVIEWED'}
    ];
    const emptyProfile={microSkills:[]};
    const unmet=router.recommend({state:{goal:null,recentActions:[],mistakeSignals:{}},profile:emptyProfile,graph,transferGraph:null,goalGraph:null,destinations:customDest,nowMs:NOW});
    assert.equal(unmet.skill_id,'simple_present_form'); assert.equal(unmet.primary_reason,'PREREQUISITE_NEEDED');
    const readyProfile={microSkills:[{id:'simple_present_form',status:'STABLE',confidence:'MEDIUM',evidence:{distinctItems:2,retestCorrect:2,weaknessScore:0}}]};
    const ready=router.recommend({state:{goal:null,recentActions:[],mistakeSignals:{}},profile:readyProfile,graph,transferGraph:null,goalGraph:{schema_version:1,mappings:[{goal_id:'GENERAL_ENGLISH',skill_id:'third_person_s',importance:'CORE',source_or_rationale:'test'}]},destinations:customDest,nowMs:NOW});
    assert.equal(ready.skill_id,'third_person_s'); assert.equal(ready.score_breakdown.prerequisite_readiness,0);
});
test('gateway value uses canonical node prerequisite arrays only', () => {
    const result=run({});
    result.ranked_diagnostics.forEach(candidate => {
        const dependents=graph.skills.filter(skill=>(skill.prerequisites||[]).includes(candidate.skill_id)).length;
        assert.equal(candidate.score_breakdown.gateway_value,Math.min(12,dependents*3));
    });
});
test('corrupt or missing supporting graphs fall back safely', () => {
    assert.deepEqual(router.validTransferEdges({schema_version:99,edges:[]},new Set()),[]);
    assert.deepEqual(router.validGoalMappings(null,new Set()),[]);
    assert.ok(run({}, {transferGraph:null,goalGraph:null}));
});
test('enhanced asset failure retains the existing recommendation fallback', () => {
    const fallback=router.fallbackRecommendation({
        OvidhanMistakeMirror:{items},
        OvidhanMistakeProfile:profileApi,
        OvidhanLearning:{getState:()=>({goal:null,mistakeSignals:{},recentActions:[]})}
    });
    assert.ok(fallback); assert.equal(fallback.fallback,true); assert.match(fallback.destination_id,/^mistake:/);
});
test('writing destinations resolve to their canonical pages', () => {
    const bySkill=new Map(destinationGraph.destinations.map(x=>[x.skill_id,x]));
    assert.equal(bySkill.get('writing_precis').url,'/precis-summary-writing-bangla.html');
    assert.equal(bySkill.get('formal_letter_writing').url,'/formal-letter-writing-bangla.html');
});
test('router is bounded and contains no random AI or third-party network dependency', () => {
    const source=require('node:fs').readFileSync(require.resolve('../smartpath-router.js'),'utf8');
    assert.doesNotMatch(source,/Math\.random|openai|fetch\(['"]https?:|XMLHttpRequest/i);
    const result=run({});
    assert.ok(router.REASONS.includes(result.primary_reason));
    assert.deepEqual(Object.keys(result.score_breakdown),['learner_weakness','review_urgency','goal_relevance','difficulty_fit','prerequisite_readiness','recent_mistake_relevance','curated_transfer_risk','gateway_value','repetition_penalty','recently_practiced_penalty','new_skill']);
});
test('goal selector initializes, persists through learner state, and reroutes immediately', () => {
    let goal='GENERAL_ENGLISH'; let reroutes=0; let changeHandler;
    const select={value:'',addEventListener:(type,handler)=>{assert.equal(type,'change');changeHandler=handler;}};
    const win={document:{getElementById:id=>id==='smartPathGoal'?select:null},OvidhanLearning:{getRoutingGoal:()=>goal,setGoal:value=>(goal=value)}};
    assert.equal(router.bindGoalSelector(win,()=>{reroutes+=1;}),true);
    assert.equal(select.value,'GENERAL_ENGLISH');
    select.value='BCS'; changeHandler();
    assert.equal(goal,'BCS'); assert.equal(select.value,'BCS'); assert.equal(reroutes,1);
});
test('contracts and analytics integration contain no raw learner content fields', () => {
    const contract=JSON.stringify({transferGraph,goalGraph,destinationGraph});
    assert.doesNotMatch(contract,/learner_text|raw_writing|audio|transcript|phone|email|school|precise_location/i);
});
