'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=process.env.OVIDHAN_6O_SOURCE||'C:\\data\\ovidhan-ielts-6o-approved-content.md';
const expected='ADCA74AD73BB98D9BCFCB22CF654C963B4A8A5CB0CEB38ADBA518F0E545E18C3',expectedBytes=64001;
const bytes=fs.readFileSync(source),actual=crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
if(bytes.length!==expectedBytes)throw new Error(`Approved source size mismatch: ${bytes.length}`);
if(actual!==expected)throw new Error(`Approved source SHA mismatch: ${actual}`);
const text=bytes.toString('utf8').replace(/\r\n?/g,'\n');
const field=(body,name,next='[a-z_]+')=>{const match=body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*(?:${next}):\\*\\*|$)`,'i'));return match?match[1].trim():'';};
function choices(content){
 const labelled=[...content.matchAll(/^\*\*(Response [AB]|Version [AB]|Option [AB]):\*\*\s*\n([\s\S]*?)(?=^\*\*(?:Response [AB]|Version [AB]|Option [AB]):\*\*|$)/gm)].map(m=>({value:m[1],label:`${m[1]}: ${m[2].trim()}`}));
 if(labelled.length>1)return labelled;
 const letters=[...content.matchAll(/^([A-D])\.\s+(.+)$/gm)].map(m=>({value:m[1],label:`${m[1]}. ${m[2]}`}));
 return letters.length>1?letters:[];
}
const disclaimer=text.match(/^## PRODUCT DISCLAIMER\n([\s\S]*?)(?=^---$)/m)?.[1]||'';
const english=disclaimer.match(/\*\*English:\*\*\s*\n([\s\S]*?)(?=\n\*\*Bangla:)/)?.[1].trim()||'';
const bangla=disclaimer.match(/\*\*Bangla:\*\*\s*\n([\s\S]*)/)?.[1].trim()||'';
const codes=[];
for(const match of text.matchAll(/^## REPAIR CODE (\d+) — ([A-Z_]+)\n([\s\S]*?)(?=^## REPAIR CODE |^## GLOBAL VALIDATION TABLE)/gm)){
 const order=Number(match[1]),code=match[2],body=match[3],definition=body.split(/^### NOTICE$/m)[0];
 const applicability=field(definition,'applicability').split('\n').map(x=>x.replace(/^[-*]\s*/,'').trim()).filter(Boolean);
 const learnerSelfCheck=field(definition,'learner_self_check').split('\n').map(x=>x.replace(/^\d+\.\s*/,'').trim()).filter(Boolean),activities=[];
 for(const activityMatch of body.matchAll(/^### (NOTICE|REPAIR|RETEST)\n([\s\S]*?)(?=^### (?:NOTICE|REPAIR|RETEST|Next retry action)|^---$)/gm)){
  const activityBody=activityMatch[2],content=field(activityBody,'content','learner_action'),action=field(activityBody,'learner_action','answer_or_check');
  const control=activityMatch[1]==='NOTICE'?'OBJECTIVE':/\bRecord\b/i.test(action)?'RECORD':/\b(?:Rewrite|correct|Identify)\b/i.test(action)?'TEXT':'TEXT';
  activities.push({activity_id:field(activityBody,'activity_id','repair_code'),repair_code:field(activityBody,'repair_code','stage'),stage:field(activityBody,'stage','task_context'),task_context:field(activityBody,'task_context','instruction_en'),instruction_en:field(activityBody,'instruction_en','instruction_bn'),instruction_bn:field(activityBody,'instruction_bn','content'),content_markdown:content,learner_action:action,answer_or_check_markdown:field(activityBody,'answer_or_check','explanation_bn'),explanation_bn:field(activityBody,'explanation_bn','why_other_options_fail_bn'),why_other_options_fail_bn:field(activityBody,'why_other_options_fail_bn','(?!)'),control_type:control,objective_choices:control==='OBJECTIVE'?choices(content):[]});
 }
 const next=body.match(/^### Next retry action\n([\s\S]*?)(?=^---$)/m)?.[1]||'';
 codes.push({order,repair_code:code,learner_label_en:field(definition,'learner_label_en'),learner_label_bn:field(definition,'learner_label_bn'),explanation_en:field(definition,'explanation_en'),explanation_bn:field(definition,'explanation_bn'),why_it_matters_bn:field(definition,'why_it_matters_bn'),applicability,learner_self_check:learnerSelfCheck,activities,next_retry_action_en:field(next,'next_retry_action_en'),next_retry_action_bn:field(next,'next_retry_action_bn')});
}
if(codes.length!==10||codes.some(x=>x.activities.length!==3))throw new Error('Approved source structure mismatch');
const pack={schema:'ovidhan-ielts-speaking-repair-retest-v1',phase:'6O',product:'IELTS Speaking Repair & Retest',content_origin:'OVIDHAN_CREATED',review_status:'REVIEWED_APPROVED',approved_source:{path:'C:\\data\\ovidhan-ielts-6o-approved-content.md',sha256:expected,size_bytes:expectedBytes},official_ielts_questions:false,automatic_speech_diagnosis:false,pronunciation_scoring:false,band_prediction:false,raw_audio_policy:'SESSION_BROWSER_MEMORY_ONLY',disclaimer:{english,bangla},repair_codes:codes};
fs.writeFileSync(path.join(root,'data','ielts-speaking-repair-retest-v1.json'),JSON.stringify(pack,null,2)+'\n','utf8');
console.log(JSON.stringify({status:'BUILT',repairCodes:codes.length,activities:codes.flatMap(x=>x.activities).length,approvedSourceSha256:actual},null,2));
