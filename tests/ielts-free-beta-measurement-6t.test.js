"use strict";
const assert=require("assert"),fs=require("fs"),path=require("path");
const foundation=require("../learning-foundation.js"),map=require("../ielts-weakness-map.js");
const root=path.join(__dirname,".."),read=name=>fs.readFileSync(path.join(root,name),"utf8"),load=name=>JSON.parse(read(name));
const forbidden={writing_text:"secret",repair_text:"private",audio:"blob",transcript:"words",name:"Learner",email:"x@y.test",phone:"123",anonymousLearnerId:"id",sessionId:"sid",band_score:9,criterion_score:8,learner_response:"free form"};
const events=[],local=foundation.createMemoryStorage();
const learning=foundation.createLearningFoundation({localStorage:local,sessionStorage:foundation.createMemoryStorage(),transport:(event,properties)=>events.push({event,properties})});

// Exact event allowlists and forbidden-property stripping.
for(const event of ["ielts_practice_started","ielts_evidence_created","ielts_repair_started","ielts_retry_completed"])
  assert.equal(learning.trackIeltsFunnel(event,{test_type:"ACADEMIC",skill_area:"WRITING",task_type:"ACADEMIC_TASK_1_VISUAL",evidence_kind:"SELF_REPORTED_RESPONSE_CHECK",provenance:"LEARNER_SELECTED",repair_code:"OVERVIEW_MISSING",outcome:"BETTER",evidence_area_count:4,...forbidden}),true);
assert.equal(learning.track("not_an_event",{}),false);
const serialized=JSON.stringify(events);for(const key of Object.keys(forbidden))assert.ok(!serialized.includes(`\"${key}\"`));for(const value of ["secret","private","blob","words","Learner","x@y.test","free form"])assert.ok(!serialized.includes(value));
assert.deepEqual(Object.keys(events[0].properties).sort(),["content_type","goal","intent","learner_state","page_id","skill_area","task_type","test_type"].sort());

// Learner state is derived only from retained IELTS evidence, not generic sessions.
assert.equal(events[0].properties.learner_state,"NEW_NO_EVIDENCE");
learning.recordLearningAction("phase6t:first","ielts-practice","correct");
const returningEvents=[],returning=foundation.createLearningFoundation({localStorage:local,sessionStorage:foundation.createMemoryStorage(),transport:(event,properties)=>returningEvents.push({event,properties})});
returning.recordLearningAction("phase6t:return","ielts-practice","correct");
returning.trackIeltsFunnel("ielts_practice_started",{skill_area:"READING",task_type:"READING_MISTAKE_MIRROR"});
assert.equal(returningEvents.at(-1).properties.learner_state,"NEW_NO_EVIDENCE");

// All writing task types plus Reading/Listening/Speaking metadata.
for(const task of ["ACADEMIC_TASK_1_VISUAL","ACADEMIC_TASK_2_ESSAY","GT_TASK_1_LETTER","GT_TASK_2_ARGUMENT"])
  assert.equal(learning.recordPerformanceEvidence(`ielts-writing:${task.toLowerCase()}`,task.includes("TASK_1_VISUAL")?"writing_visual_information_description":task==="GT_TASK_1_LETTER"?"writing_letter_task_response":"writing_argument_development","WRITING_PERFORMANCE_ATTEMPT",task,"source","UNDER_30_SECONDS"),true);
assert.equal(learning.recordPerformanceEvidence("ielts-speaking:part2","speaking_extended_turn","SPEAKING_PERFORMANCE_ATTEMPT","PART_2_EXTENDED_TURN","part2","30_TO_59_SECONDS"),true);
assert.equal(learning.recordSkillEvidence("ielts-listening:item","listening_signposting","OBJECTIVE_AUDIO_COMPREHENSION","incorrect","item"),true);
assert.equal(learning.recordSkillEvidence("bad","listening_signposting","OBJECTIVE_AUDIO_COMPREHENSION","maybe","item"),false);
assert.ok(events.some(x=>x.event==="ielts_evidence_created"&&x.properties.skill_area==="LISTENING"&&x.properties.provenance==="OBJECTIVE"));
assert.ok(events.some(x=>x.event==="ielts_evidence_created"&&x.properties.skill_area==="SPEAKING"&&x.properties.provenance==="LEARNER_SELECTED"));
assert.deepEqual(learning.getIeltsAnalyticsContext(),{test_type:"ACADEMIC",evidence_area_count:3,learner_state:"RETURNING_WITH_EVIDENCE"});

// Task 1 self-report versus objective probe; YES and BETTER never become mastery.
assert.equal(learning.recordTask1StructuredEvidence({evidenceId:"task1:self",taskId:"academic-task1-001",skillId:"writing_visual_information_description",checkType:"OVERVIEW",evidenceSource:"SELF_REPORTED_RESPONSE_CHECK",learnerAnswer:"YES"}),true);
assert.equal(learning.recordTask1StructuredEvidence({evidenceId:"task1:probe",taskId:"academic-task1-001",skillId:"writing_visual_information_description",checkType:"DATA_CHECK",evidenceSource:"OBJECTIVE_VISUAL_PROBE",objectiveResult:"CORRECT"}),true);
assert.ok(events.some(x=>x.properties.evidence_kind==="SELF_REPORTED_RESPONSE_CHECK"&&x.properties.provenance==="LEARNER_SELECTED"));
assert.ok(events.some(x=>x.properties.evidence_kind==="OBJECTIVE_VISUAL_PROBE"&&x.properties.provenance==="OBJECTIVE"));

// Real repair and completed self-review outcomes only.
const productive=(stage,reflection)=>learning.recordProductiveRetryEvidence({evidenceId:"ielts-productive-retry:part2:fluency",skillId:"speaking_extended_turn",taskType:"PART_2_EXTENDED_TURN",sourceId:"part2",repairCode:"FLUENCY_PAUSE_CONTROL",stage,reflection});
assert.equal(productive("SELECTED"),true);assert.equal(events.filter(x=>x.event==="ielts_repair_started").length,1);
assert.equal(productive("REPAIR_STARTED"),true);assert.equal(events.filter(x=>x.event==="ielts_repair_started").length,2);
for(const outcome of ["BETTER","TRY_AGAIN","SAME"]){assert.equal(productive("REFLECTED",outcome),true);assert.equal(events.at(-1).properties.outcome,outcome);}
assert.doesNotMatch(JSON.stringify(learning.getState().productiveRetryEvidence),/mastery/i);

// Objective reading correct/incorrect retest, and entry/practice dedupe.
for(const outcome of ["correct","incorrect"])assert.equal(learning.recordMistakeSignal("ielts-reading-001","retest",outcome),true);
assert.ok(events.some(x=>x.event==="ielts_retry_completed"&&x.properties.outcome==="OBJECTIVE_CORRECT"&&x.properties.provenance==="OBJECTIVE"));
assert.ok(events.some(x=>x.event==="ielts_retry_completed"&&x.properties.outcome==="OBJECTIVE_INCORRECT"&&x.properties.provenance==="OBJECTIVE"));
const entry=learning.getIeltsAnalyticsContext();assert.equal(learning.track("ielts_free_entry_view",entry,{dedupeKey:"free-beta-entry"}),true);
assert.deepEqual(events.at(-1).properties,{page_id:"unknown",content_type:"unknown",intent:"unknown",goal:"unknown",...entry});
assert.equal(learning.track("ielts_free_entry_view",entry,{dedupeKey:"free-beta-entry"}),false);
assert.equal(learning.trackIeltsFunnel("ielts_practice_started",{skill_area:"READING",task_type:"READING_MISTAKE_MIRROR"},{dedupeKey:"item"}),true);
assert.equal(learning.trackIeltsFunnel("ielts_practice_started",{skill_area:"READING",task_type:"READING_MISTAKE_MIRROR"},{dedupeKey:"item"}),false);

// Invalid arbitrary IELTS values are stripped at the analytics boundary.
learning.trackIeltsFunnel("ielts_evidence_created",{skill_area:"MADE_UP",task_type:"ARBITRARY_TASK",evidence_kind:"RAW_TEXT",provenance:"GUESSED",outcome:"CORRECT",repair_code:"WHATEVER"});
for(const key of ["skill_area","task_type","evidence_kind","provenance","outcome","repair_code"])assert.equal(Object.hasOwn(events.at(-1).properties,key),false);
learning.track("ielts_free_entry_view",{test_type:"OTHER",evidence_area_count:999,learner_state:"RETURNING"});
for(const key of ["test_type","evidence_area_count","learner_state"])assert.equal(Object.hasOwn(events.at(-1).properties,key),false);

// Existing Dakho analytics actually emits on IELTS pages with the bounded context.
assert.match(read("ielts-writing-practice-bangla.html"),/data-learning-cta="contextual-dakho-app" data-cta-context="IELTS_FREE_BETA"/);
const cta={dataset:{learningCta:"contextual-dakho-app",ctaContext:"IELTS_FREE_BETA"},closest(){return this;}};
let clickHandler;const ctaEvents=[];
const document={body:{dataset:{learningInstrumentation:"ielts-writing-performance-6m"}},documentElement:{dataset:{}},readyState:"complete",referrer:"",querySelectorAll:()=>[cta],querySelector:()=>null,addEventListener:(name,handler)=>{if(name==="click")clickHandler=handler;}};
class Observer{constructor(callback){this.callback=callback;}observe(target){this.callback([{isIntersecting:true,target}]);}unobserve(){}}
const ctaLearning=foundation.createLearningFoundation({window:{document,location:{hostname:"ovidhan.com",pathname:"/ielts-writing-practice-bangla.html",search:""},IntersectionObserver:Observer},transport:(event,properties)=>ctaEvents.push({event,properties})});
ctaLearning.initPilotInstrumentation();clickHandler({target:cta});
for(const event of ["dakho_cta_view","dakho_cta_click"]){const found=ctaEvents.find(x=>x.event===event);assert.ok(found);assert.equal(found.properties.cta_context,"IELTS_FREE_BETA");assert.equal(found.properties.trigger,"ielts-free-beta");}
const failing=foundation.createLearningFoundation({transport:()=>{throw new Error("analytics down")}});assert.doesNotThrow(()=>failing.trackIeltsFunnel("ielts_practice_started",{skill_area:"WRITING",task_type:"GT_TASK_1_LETTER"}));

// Phase 6S trust and Academic/GT routing remain unchanged.
const graph=load("skill-mistake-graph.json"),empty=map.buildWeaknessMap({},graph,null,"ACADEMIC");
assert.equal(empty.evidenceAreaCount,0);assert.doesNotMatch(map.render(empty),/MASTER|STRONG/);
for(const type of map.TEST_TYPES){const filtered=map.destinationsForTestType(load("smartpath-destinations.json").destinations,type);assert.ok(filtered.length>0);}
console.log("PASS Phase 6T Free IELTS funnel measurement");
