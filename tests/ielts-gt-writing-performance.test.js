'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const runtime=require('../ielts-writing-practice.js'),learning=require('../learning-foundation.js');
const root=path.resolve(__dirname,'..'),pack=require('../data/ielts-gt-writing-performance-v1.json');

assert.deepEqual(['',' one ','one\ttwo','বাংলা লেখা পরীক্ষা'].map(runtime.countWords),[0,1,2,3]);
let now=1000,session=runtime.createWritingSession(pack,()=>now);
assert.equal(session.getState().mode,'letter');
assert.equal(session.finish(),null,'empty attempts are not completed');
assert.equal(session.setText('one two three'),3);now=66000;
let evidence=session.finish();
assert.deepEqual(evidence,{evidenceId:'ielts-gt-writing-v1:gt-task1-letter-001',skillId:'writing_letter_task_response',evidenceType:'WRITING_PERFORMANCE_ATTEMPT',taskType:'GT_TASK_1_LETTER',sourceId:'gt-task1-letter-001',durationBucket:'60_TO_119_SECONDS'});
assert.equal(session.getState().stage,'review');
assert.equal(pack.self_review_frameworks.GT_TASK_1_LETTER.length,6);
session.revise();assert.equal(session.getState().text,'one two three','revise preserves the same response');
session.next();assert.equal(session.getState().text,'','next clears raw text');assert.equal(session.getState().index,1);
session.setText('private draft');session.changeMode('essay');assert.equal(session.getState().text,'','mode change clears raw text');assert.equal(session.getState().mode,'essay');
assert.equal(pack.self_review_frameworks.GT_TASK_2_ARGUMENT.length,6);
session.setText('position and reasons');now+=35000;evidence=session.finish();assert.equal(evidence.taskType,'GT_TASK_2_ARGUMENT');assert.equal(evidence.skillId,'writing_argument_development');

const storage=learning.createMemoryStorage(),foundation=learning.createLearningFoundation({localStorage:storage});
assert.equal(foundation.recordPerformanceEvidence(evidence.evidenceId,evidence.skillId,evidence.evidenceType,evidence.taskType,evidence.sourceId,evidence.durationBucket),true);
const saved=foundation.getState().performanceEvidence[evidence.evidenceId];
assert.deepEqual(Object.keys(saved).sort(),['attempt_count','duration_bucket','evidence_id','evidence_type','first_seen_at','last_seen_at','skill_id','source_id','task_type'].sort());
assert.doesNotMatch(JSON.stringify(saved),/position and reasons|raw|text|word_count|exact_word|score|band|quality|correct/i);
assert.equal(learning.createLearningFoundation({localStorage:storage}).getState().performanceEvidence[evidence.evidenceId].attempt_count,1);
const fresh=runtime.createWritingSession(pack,()=>now);assert.equal(fresh.getState().text,'','a refreshed session starts without draft text');

const page=fs.readFileSync(path.join(root,'ielts-writing-practice-bangla.html'),'utf8'),source=fs.readFileSync(path.join(root,'ielts-writing-practice.js'),'utf8');
assert.match(page,/https:\/\/ovidhan\.net\/ielts-writing-practice-bangla\.html/);assert.match(page,/href="\/ielts-guide\.html"/);
assert.ok(page.indexOf('/learning-foundation.js')<page.indexOf('/ielts-writing-practice.js'));
assert.match(page,/class="announce-bar"/);assert.match(page,/class="site-header"/);assert.match(page,/class="footer-grid"/);
assert.match(page,/@media\(max-width:900px\).*\.mega-menu\{display:none;order:3;flex:0 0 100%/s);
assert.ok((page.match(/https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.ovidhan\.dictionary/g)||[]).length>=2);
assert.doesNotMatch(source,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|fetch\([^)]*(upload|submit)|openai|gemini|anthropic/i);
assert.doesNotMatch(source,/band prediction|calculateScore|quality assessment/i);
console.log('PASS IELTS GT writing performance tests');
