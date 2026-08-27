'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=process.env.OVIDHAN_6N_SOURCE||'C:\\data\\ovidhan-ielts-6n-approved-content.md';
const expected='0756331D90A429F579EFBAEDA4785986CBCCC1C99B5679BFB1837B625A8626D2';
const bytes=fs.readFileSync(source),actual=crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
if(actual!==expected)throw new Error(`Approved source SHA mismatch: ${actual}`);
const text=bytes.toString('utf8').replace(/\r\n?/g,'\n');
const field=(body,name,next='[a-z_]+')=>{const match=body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*(?:${next}):\\*\\*|$)`,'i'));return match?match[1].trim():'';};
function objectiveChoices(content){const choices=[];const paired=/^\*\*((?:Sentence|Thesis|Version) [AB]|Description [12]|Version [12]):\*\*\s*\n([\s\S]*?)(?=^\*\*(?:(?:Sentence|Thesis|Version) [AB]|Description [12]|Version [12]):\*\*|$)/gm;for(const match of content.matchAll(paired))choices.push({value:match[1],label:`${match[1]}: ${match[2].trim()}`});if(choices.length>1)return choices;const letters=[...content.matchAll(/^([A-D])\.\s+(.+)$/gm)].map(match=>({value:match[1],label:`${match[1]}. ${match[2]}`}));return letters.length>1?letters:[];}
const codes=[];
for(const match of text.matchAll(/^## REPAIR CODE (\d+) — ([A-Z_]+)\n([\s\S]*?)(?=^## REPAIR CODE |^## GLOBAL VALIDATION TABLE)/gm)){
  const order=Number(match[1]),code=match[2],body=match[3],definition=body.split(/^### NOTICE$/m)[0];
  const applicability=field(definition,'applicability').split('\n').map(x=>x.replace(/^[-*]\s*/,'').trim()).filter(Boolean);
  const learnerSelfCheck=field(definition,'learner_self_check').split('\n').map(x=>x.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  const activities=[];
  for(const activityMatch of body.matchAll(/^### (NOTICE|REPAIR|RETEST)\n([\s\S]*?)(?=^### (?:NOTICE|REPAIR|RETEST|Next retry action)|^---$)/gm)){
    const stage=activityMatch[1],activityBody=activityMatch[2],answer=field(activityBody,'answer_or_check','(?!)');
    const content=field(activityBody,'content','learner_action'),activityType=/^Correct answer:/i.test(answer)?'OBJECTIVE':'PRODUCTIVE';
    activities.push({activity_id:field(activityBody,'activity_id','repair_code'),repair_code:field(activityBody,'repair_code','stage'),stage:field(activityBody,'stage','task_context'),task_context:field(activityBody,'task_context','instruction_en'),instruction_en:field(activityBody,'instruction_en','instruction_bn'),instruction_bn:field(activityBody,'instruction_bn','content'),content_markdown:content,learner_action:field(activityBody,'learner_action','answer_or_check'),answer_or_check_markdown:answer,activity_type:activityType,objective_choices:activityType==='OBJECTIVE'?objectiveChoices(content):[]});
  }
  const next=body.match(/^### Next retry action\n([\s\S]*?)(?=^---$)/m)?.[1]||'';
  codes.push({order,repair_code:code,learner_label_en:field(definition,'learner_label_en'),learner_label_bn:field(definition,'learner_label_bn'),explanation_en:field(definition,'explanation_en'),explanation_bn:field(definition,'explanation_bn'),why_it_matters_bn:field(definition,'why_it_matters_bn'),applicability,learner_self_check:learnerSelfCheck,activities,next_retry_action_en:field(next,'next_retry_action_en'),next_retry_action_bn:field(next,'next_retry_action_bn')});
}
const pack={schema:'ovidhan-ielts-writing-repair-retest-v1',phase:'6N',content_origin:'OVIDHAN_CREATED',review_status:'CHATGPT_EDITORIALLY_REVIEWED',approved_source_sha256:expected,official_ielts_questions:false,automatic_diagnosis:false,score_generation:false,raw_response_policy:'SESSION_MEMORY_ONLY',repair_codes:codes};
fs.writeFileSync(path.join(root,'data','ielts-writing-repair-retest-v1.json'),JSON.stringify(pack,null,2)+'\n','utf8');
console.log(JSON.stringify({status:'BUILT',repairCodes:codes.length,activities:codes.reduce((n,x)=>n+x.activities.length,0),approvedSourceSha256:actual},null,2));
