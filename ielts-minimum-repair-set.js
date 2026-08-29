/* Phase 6V — bounded pre-retry metadata; SmartPath remains the action owner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) root.OvidhanIeltsMinimumRepairSet = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const STATUS = Object.freeze({READY:"MINIMUM_REPAIR_SET",EMPTY:"NO_SPECIFIC_REPAIR"});
  const PACKS = Object.freeze({WRITING:"/data/ielts-writing-repair-retest-v1.json",SPEAKING:"/data/ielts-speaking-repair-retest-v1.json"});
  const TASKS = Object.freeze({
    ACADEMIC_TASK_1_VISUAL:{group:"WRITING",applicability:"ACADEMIC_TASK_1"},
    ACADEMIC_TASK_2_ESSAY:{group:"WRITING",applicability:"ACADEMIC_TASK_2"},
    GT_TASK_1_LETTER:{group:"WRITING",applicability:"GT_TASK_1"},
    GT_TASK_2_ARGUMENT:{group:"WRITING",applicability:"GT_TASK_2"},
    PART_2_EXTENDED_TURN:{group:"SPEAKING",applicability:"PART_2_EXTENDED_TURN"},
    PART_3_DISCUSSION_RESPONSE:{group:"SPEAKING",applicability:"PART_3_DISCUSSION_RESPONSE"}
  });
  function empty(recommendation) {
    return Object.freeze({status:STATUS.EMPTY,skill_id:recommendation&&recommendation.skill_id||null,repair_code:null,learner_label_en:null,learner_label_bn:null,task_type:recommendation&&recommendation.productive_task_type||null,pre_retry_steps:Object.freeze([]),retry_url:recommendation&&recommendation.url||null,provenance:null});
  }
  function eligible(recommendation) {
    const task=TASKS[recommendation&&recommendation.productive_task_type];
    return !!(recommendation&&recommendation.primary_reason==="PRODUCTIVE_RETRY"&&typeof recommendation.productive_repair_code==="string"&&recommendation.productive_repair_code&&task);
  }
  function resolve(recommendation, pack) {
    if (!eligible(recommendation)||!pack||!Array.isArray(pack.repair_codes)) return empty(recommendation);
    const task=TASKS[recommendation.productive_task_type];
    const matches=pack.repair_codes.filter(item=>item&&item.repair_code===recommendation.productive_repair_code);
    if (matches.length!==1) return empty(recommendation);
    const repair=matches[0], applicability=Array.isArray(repair.applicability)?repair.applicability:[];
    if (!applicability.includes(task.applicability)) return empty(recommendation);
    const stages=(Array.isArray(repair.activities)?repair.activities:[]).filter(activity=>activity&&activity.repair_code===repair.repair_code&&["NOTICE","REPAIR"].includes(activity.stage)).map(activity=>activity.stage);
    if (stages.length!==2||stages[0]!=="NOTICE"||stages[1]!=="REPAIR") return empty(recommendation);
    return Object.freeze({status:STATUS.READY,skill_id:recommendation.skill_id||null,repair_code:repair.repair_code,learner_label_en:String(repair.learner_label_en||""),learner_label_bn:String(repair.learner_label_bn||""),task_type:recommendation.productive_task_type,pre_retry_steps:Object.freeze(stages),retry_url:recommendation.url||null,provenance:"LEARNER_SELECTED"});
  }
  function load(recommendation, fetcher) {
    if (!eligible(recommendation)||typeof fetcher!=="function") return Promise.resolve(empty(recommendation));
    const path=PACKS[TASKS[recommendation.productive_task_type].group];
    return Promise.resolve(fetcher(path,{credentials:"same-origin"})).then(response=>response&&response.ok?response.json():Promise.reject(new Error("repair metadata unavailable"))).then(pack=>resolve(recommendation,pack)).catch(()=>empty(recommendation));
  }
  return Object.freeze({STATUS,PACKS,TASKS,empty,eligible,resolve,load});
});
