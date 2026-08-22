const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const destinations = require('../smartpath-destinations.json').destinations;
const hub = read('ielts-guide.html');
const redirect = read('ielts-preparation-bangla.html');
const diagnostic = read('ielts-diagnostic.html');
const roadmap = read('learning-path-ielts.html');
const vocabulary = read('ielts-vocabulary-2026-bangla-meaning.html');
const report = read('reports/ovidhan-ielts-hub-trust-6b.md');

assert.match(hub, /IELTS Preparation Hub/);
assert.match(hub, /href="\/ielts-diagnostic\.html"/);
assert.match(hub, /href="\/learning-path-ielts\.html"/);
assert.match(hub, /Sources reviewed 22 August 2026/);
assert.equal((hub.match(/https:\/\/ielts\.org\/take-a-test\/test-types\//g) || []).length, 4);
assert.match(hub, /Academic Writing Task 1 — Visual information/);
assert.match(hub, /This section is specific to Academic IELTS/);
assert.match(hub, /General Training:<\/strong> Writing Task 1 is a letter/);
assert.doesNotMatch(hub, /<h2>[^<]*Writing \(Task 1 – Report\)<\/h2>|<p>Task 1 requires you to describe a chart, graph, or diagram/);
assert.match(redirect, /rel="canonical" href="https:\/\/ovidhan\.net\/ielts-guide\.html"/);
assert.match(redirect, /http-equiv="refresh" content="0;url=\/ielts-guide\.html"/);
assert.match(redirect, /noindex,follow/);
assert.match(diagnostic, /ovidhan_ielts_diagnostic_v2/);
assert.match(diagnostic, /href="\/learning-path-ielts\.html"/);
assert.match(roadmap, /does not estimate an official IELTS band score/);
assert.doesNotMatch(vocabulary, /800\+|৮০০\+|প্রতিটি শব্দ IELTS পরীক্ষায়/);
assert.match(report, /Future innovation — Boundary Diagnostic/);

for (const n of [1,2,3,4]) {
  const file = fs.readdirSync(path.join(root, 'listening')).find(name => name.startsWith(`ielts-listening-section-${n}-`));
  const page = read(path.join('listening', file));
  assert.match(page, /IELTS-Style Listening Practice/);
  assert.match(page, /not authentic or official IELTS audio/);
  assert.doesNotMatch(page, new RegExp(`/listening/ielts-section-${n}\\.html`));
}

const precis = destinations.find(item => item.skill_id === 'writing_precis');
const formal = destinations.find(item => item.skill_id === 'formal_letter_writing');
assert.deepEqual(precis.goal_ids, ['BCS','BANK','UNIVERSITY_ADMISSION','GENERAL_ENGLISH']);
assert.ok(!precis.goal_ids.includes('IELTS'));
assert.deepEqual(formal.goal_ids, ['BCS','IELTS','UNIVERSITY_ADMISSION','GENERAL_ENGLISH','SPOKEN_CAREER']);
console.log(JSON.stringify({status:'PASS',hub:'ielts-guide.html',redirect:'ielts-preparation-bangla.html',diagnosticState:'ovidhan_ielts_diagnostic_v2',ieltsPrecisEligible:false,ieltsFormalLetterEligible:true}, null, 2));
