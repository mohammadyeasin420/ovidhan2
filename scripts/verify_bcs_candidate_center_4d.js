'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'bcs', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'bcs', 'candidate-center.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'bcs', 'candidate-center.js'), 'utf8');
const model = JSON.parse(fs.readFileSync(path.join(root, 'data', 'bcs-candidate-intelligence-v1.json'), 'utf8'));

assert.match(html, /<title>[^<]+BCS Candidate Center[^<]*|<title>BCS Candidate Center[^<]*/i);
assert.match(html, /<meta name="description" content="[^"]{50,}">/i);
assert.match(html, /<link rel="canonical" href="https:\/\/ovidhan\.net\/bcs\/">/i);
assert.match(html, /<h1>[^<]+<\/h1>/i);
assert.doesNotMatch(html, /noindex/i);
assert.match(html, /https:\/\/bpsc\.gov\.bd\//);
assert.match(html, /Official BPSC/);
assert.match(html, /Verified batch update/);
assert.doesNotMatch(html, /<input/i, 'candidate center must not collect personal identifiers');
['roll number', 'registration number', 'NID', 'phone'].forEach(term => {
  assert.ok(html.toLowerCase().includes(term.toLowerCase()) || html.includes('ফোন'), `privacy disclosure missing ${term}`);
});

assert.equal(model.schema_version, 1);
assert.equal(model.journey_stages.length, 11);
assert.match(script, /fetch\('\/data\/bcs-candidate-intelligence-v1\.json'/);
assert.doesNotMatch(script, /const\s+stages\s*=\s*\[/, 'stage taxonomy must come from Phase 4C data');
model.journey_stages.forEach(stage => assert.ok(!script.includes(`stage_id: '${stage.stage_id}'`), `hard-coded stage ${stage.stage_id}`));
assert.match(script, /ovidhan_bcs_candidate_stage_v1/);
assert.match(script, /history\.pushState/);
assert.match(script, /popstate/);
assert.match(script, /bcs_center_view/);
assert.match(script, /bcs_stage_selected/);
assert.match(script, /bcs_official_source_open/);
assert.match(script, /bcs_learning_cta_click/);

const internalLinks = Array.from(html.matchAll(/href="(\/[^"]+)"/g), match => match[1].split('#')[0]);
internalLinks.forEach(urlPath => {
  if (urlPath === '/' || urlPath === '/bcs/') return;
  const diskPath = path.join(root, urlPath.replace(/^\//, ''));
  assert.ok(fs.existsSync(diskPath), `missing internal target: ${urlPath}`);
});

assert.match(css, /@media\(max-width:480px\)/);
assert.match(css, /min-height:46px/);
assert.match(css, /focus-visible/);
assert.match(css, /overflow-x:auto/);

console.log(JSON.stringify({
  status: 'PASS',
  canonical: 'https://ovidhan.net/bcs/',
  phase4cStages: model.journey_stages.length,
  internalLinksChecked: new Set(internalLinks).size,
  factualExamRecordsPublished: model.exam_records.length,
  officialExternalSources: 1,
  personalDataInputs: 0
}, null, 2));
