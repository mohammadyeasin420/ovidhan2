/* Phase 6U — deterministic IELTS evidence-pattern intelligence; no scoring or diagnosis. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OvidhanIeltsWeaknessIntelligence = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const OBJECTIVE_STATES = Object.freeze(["INSUFFICIENT_EVIDENCE","SINGLE_OBJECTIVE_SIGNAL","REPEATED_OBJECTIVE_PATTERN","FAILED_RETEST","RESOLVED_ON_RETEST","MIXED_OBJECTIVE_EVIDENCE"]);
  const SELF_STATES = Object.freeze(["SELF_SELECTED_REPAIR","SELF_REPORTED_UNRESOLVED","SELF_REPORTED_IMPROVED","SELF_REVIEW_PENDING"]);
  const PRIORITY = Object.freeze({FAILED_RETEST:60,REPEATED_OBJECTIVE_PATTERN:50,SINGLE_OBJECTIVE_SIGNAL:40,MIXED_OBJECTIVE_EVIDENCE:30,RESOLVED_ON_RETEST:20,SELF_REPORTED_UNRESOLVED:15,SELF_SELECTED_REPAIR:14,SELF_REVIEW_PENDING:12,SELF_REPORTED_IMPROVED:10,INSUFFICIENT_EVIDENCE:0});
  const EXPLANATIONS = Object.freeze({
    INSUFFICIENT_EVIDENCE:"Not enough evidence · এখনও যথেষ্ট প্রমাণ নেই",
    SINGLE_OBJECTIVE_SIGNAL:"One objective signal · একটি Objective Practice Signal পাওয়া গেছে",
    REPEATED_OBJECTIVE_PATTERN:"Repeated objective pattern · একাধিক আলাদা Objective Practice-এ একই Pattern পাওয়া গেছে",
    FAILED_RETEST:"Failed retest · Objective Retest-এ উত্তরটি আবার ভুল হয়েছে",
    RESOLVED_ON_RETEST:"Resolved on retest · Objective Retest-এ উত্তরটি ঠিক হয়েছে; এটি শুধু এই Retest-এর Evidence",
    MIXED_OBJECTIVE_EVIDENCE:"Mixed objective evidence · Objective Practice Result একরকম নয়",
    SELF_SELECTED_REPAIR:"You identified this · আপনি নিজে এটি চিহ্নিত করেছেন",
    SELF_REPORTED_UNRESOLVED:"You identified this as unresolved · আপনি জানিয়েছেন এটি এখনও ঠিক হয়নি",
    SELF_REPORTED_IMPROVED:"You reported improvement · আপনি উন্নতি হয়েছে বলে জানিয়েছেন",
    SELF_REVIEW_PENDING:"Your self-review is pending · আপনার Self-review এখনও বাকি"
  });
  function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  function skillGroup(skillId) { const id=String(skillId||""); return id.startsWith("reading_")?"READING":id.startsWith("listening_")?"LISTENING":id.startsWith("speaking_")?"SPEAKING":id.startsWith("writing_")||id==="formal_letter_writing"?"WRITING":null; }
  function objectiveState(items) {
    if (!items.length) return "INSUFFICIENT_EVIDENCE";
    const failedRetest=items.some(x=>x.retest==="incorrect"), unresolved=items.filter(x=>x.initial==="incorrect"&&x.retest!=="correct"), resolved=items.filter(x=>x.initial==="incorrect"&&x.retest==="correct"), correct=items.filter(x=>x.initial==="correct"||x.retest==="correct");
    if (failedRetest) return "FAILED_RETEST";
    if (unresolved.length>=2) return "REPEATED_OBJECTIVE_PATTERN";
    if (unresolved.length===1) return correct.length ? "MIXED_OBJECTIVE_EVIDENCE" : "SINGLE_OBJECTIVE_SIGNAL";
    if (resolved.length&&resolved.length===items.length) return "RESOLVED_ON_RETEST";
    return "MIXED_OBJECTIVE_EVIDENCE";
  }
  function selfState(entry) {
    if (entry && (entry.reflection==="BETTER"||entry.resolution_state==="SELF_REPORTED_IMPROVED")) return "SELF_REPORTED_IMPROVED";
    if (entry && (entry.reflection==="TRY_AGAIN"||entry.reflection==="SAME"||entry.resolution_state==="SELF_REPORTED_UNRESOLVED")) return "SELF_REPORTED_UNRESOLVED";
    if (entry && entry.retest_completed) return "SELF_REVIEW_PENDING";
    return "SELF_SELECTED_REPAIR";
  }
  function aggregate(state, graph) {
    state=object(state); graph=object(graph);
    const mappings=new Map((graph.item_mappings||[]).map(x=>[x.item_id,x])), objective=new Map(), selected=[];
    function addObjective(skillId,itemId,initial,retest,source) {
      if (!skillGroup(skillId)||!itemId) return;
      const key=`${skillId}:${itemId}`, previous=objective.get(key)||{};
      objective.set(key,{skill_id:skillId,item_id:itemId,initial:retest?previous.initial||initial:initial||previous.initial,retest:retest||previous.retest||null,sources:[...new Set([...(previous.sources||[]),source].filter(Boolean))]});
    }
    Object.entries(object(state.skillEvidence)).forEach(([key,e])=>{if(e)addObjective(e.skill_id,e.item_id||e.evidence_id||key,e.result,null,e.evidence_type||"SKILL_EVIDENCE");});
    Object.entries(object(state.mistakeSignals)).forEach(([itemId,e])=>{const m=mappings.get(itemId);if(m&&e)addObjective(m.primary_skill_id,itemId,e.initialResult,e.retestResult,"MISTAKE_SIGNAL");});
    Object.entries(object(state.task1StructuredEvidence)).forEach(([key,e])=>{if(!e)return;if(e.evidence_source==="OBJECTIVE_VISUAL_PROBE")addObjective(e.skill_id,`${e.task_id||key}:${e.check_type||"probe"}`,String(e.objective_result||"").toLowerCase(),null,"OBJECTIVE_VISUAL_PROBE");else if(e.evidence_source==="SELF_REPORTED_RESPONSE_CHECK")selected.push({skill_id:e.skill_id,state:e.learner_answer==="YES"?"SELF_REPORTED_IMPROVED":"SELF_SELECTED_REPAIR",source_id:e.evidence_id||key});});
    Object.entries(object(state.productiveRetryEvidence)).forEach(([key,e])=>{if(e&&e.provenance==="LEARNER_SELECTED")selected.push({skill_id:e.skill_id,state:selfState(e),source_id:e.evidence_id||key,task_type:e.task_type});});
    const bySkill=new Map();
    objective.forEach(item=>{const list=bySkill.get(item.skill_id)||[];list.push(item);bySkill.set(item.skill_id,list);});
    const cards=[];
    bySkill.forEach((items,skillId)=>{const stateCode=objectiveState(items);cards.push({skill_id:skillId,group:skillGroup(skillId),state:stateCode,provenance:"OBJECTIVE",distinct_evidence_count:items.length,evidence_items:items.map(x=>x.item_id),explanation:EXPLANATIONS[stateCode],priority:PRIORITY[stateCode]});});
    selected.forEach(x=>cards.push({skill_id:x.skill_id,group:skillGroup(x.skill_id),state:x.state,provenance:"LEARNER_SELECTED",distinct_evidence_count:1,evidence_items:[x.source_id],task_type:x.task_type,explanation:EXPLANATIONS[x.state],priority:PRIORITY[x.state]}));
    return cards.filter(x=>x.group).sort((a,b)=>b.priority-a.priority||a.skill_id.localeCompare(b.skill_id)||a.state.localeCompare(b.state));
  }
  return Object.freeze({OBJECTIVE_STATES,SELF_STATES,PRIORITY,EXPLANATIONS,skillGroup,objectiveState,selfState,aggregate});
});
