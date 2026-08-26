#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourcePath = process.argv[2] || 'C:\\data\\ovidhan-7a3e-approved-content.md';
const expectedHash = 'A879BC75C02A8A8931231DD3EF3EB7847358C428543832501733B98FBE2649FE';
const startSha = '41922864fb2c735dbcfac9fe14e9941fd7a50179';
const originalCandidates = ['net', 'translation', 'tradeoff', 'without', 'must', 'provision', 'accordance', 'during', 'wallet', 'integration', 'street'];
const frozenExclusions = ['integration', 'provision', 'street', 'wallet'];
const targets = ['net', 'translation', 'tradeoff', 'without', 'must', 'accordance', 'during'];

function plain(value) { return value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); }
function text(value) { return value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function comparable(value) { return value.replace(/\s+([,.;:!?।—–/])/g, '$1').replace(/\s+/g, ' ').trim(); }
function semanticText(value) { return value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''); }
function bullets(body) { return body.split(/\r?\n/).map(line => line.match(/^\s*-\s+(.+)$/)?.[1]).filter(Boolean); }

function parsePack(markdown) {
  const result = {};
  for (const section of markdown.split(/^## WORD: /m).slice(1)) {
    const newline = section.indexOf('\n');
    const slug = section.slice(0, newline).trim().toLowerCase();
    const fields = {};
    const pattern = /^### \d+\. ([A-Z_ /]+)\r?\n([\s\S]*?)(?=^### \d+\.|^---)/gm;
    let match;
    while ((match = pattern.exec(section))) fields[match[1].trim()] = match[2].trim();
    result[slug] = fields;
  }
  return result;
}

function schemas(html, slug) {
  const values = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  assert(values.some(value => value['@type'] === 'BreadcrumbList'), `${slug}: BreadcrumbList missing`);
  const term = values.find(value => value['@type'] === 'DefinedTerm');
  assert(term, `${slug}: DefinedTerm missing`);
  return term;
}

async function verifySearchBehavior(html) {
  const embedded = JSON.parse(html.match(/<script type="application\/json" id="ovidhan-word-data">([\s\S]*?)<\/script>/)[1]);
  const elements = {
    wordInput: { value: 'translation', addEventListener() {} }, resultArea: { innerHTML: '' },
    staticWordContent: { hidden: false }, 'ovidhan-word-data': { textContent: JSON.stringify(embedded) }
  };
  let fetchCount = 0;
  const runtime = fs.readFileSync(path.join(root, 'learning-explorer.js'), 'utf8');
  const context = {
    console, URL, URLSearchParams, setTimeout, clearTimeout,
    fetch: async url => { assert.strictEqual(url, '/enriched-dictionary.json'); fetchCount += 1; return { ok: true, json: async () => [{ english: 'translation', bangla: 'অনুবাদ', definition: 'a translated text', part_of_speech: 'noun' }] }; },
    document: { getElementById: id => elements[id] || null, querySelector: () => ({ setAttribute() {} }), createElement: () => ({ setAttribute() {} }), head: { appendChild() {} } },
    window: { location: 'https://ovidhan.net/word/net.html', history: { pushState() {} }, dispatchEvent() {}, speechSynthesis: { cancel() {}, speak() {} } },
    localStorage: { getItem: () => null, setItem() {} }, CustomEvent: function () {}, SpeechSynthesisUtterance: function () {}
  };
  vm.runInNewContext(runtime, context, { filename: 'learning-explorer.js' });
  assert.strictEqual(elements.staticWordContent.hidden, false, 'Static content hidden on initial load');
  assert.strictEqual(fetchCount, 0, 'Initial load fetched full dictionary');
  context.searchWord();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(fetchCount, 1, 'Dynamic search did not lazy-load dictionary exactly once');
  assert.strictEqual(elements.staticWordContent.hidden, true, 'Dynamic search did not hide static content');
  assert(elements.resultArea.innerHTML.includes('translation'), 'Dynamic result did not render searched word');
}

async function main() {
  assert(fs.existsSync(sourcePath), 'Approved content source missing');
  const sourceBuffer = fs.readFileSync(sourcePath);
  const hash = crypto.createHash('sha256').update(sourceBuffer).digest('hex').toUpperCase();
  assert.strictEqual(hash, expectedHash, 'Approved content source hash mismatch');
  const pack = parsePack(sourceBuffer.toString('utf8'));
  const frozen = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json'), 'utf8'));
  const frozenWords = new Set(frozen.pages.map(item => item.word));
  assert.deepStrictEqual(originalCandidates.filter(slug => frozenWords.has(slug)).sort(), frozenExclusions, '11-word/frozen-144 intersection changed');
  assert.deepStrictEqual(targets.filter(slug => frozenWords.has(slug)), [], 'A safe target is frozen');
  for (const item of [...frozen.pages, ...frozen.guards]) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, item.path))).digest('hex');
    assert.strictEqual(actual, item.sha256, `Frozen file changed: ${item.path}`);
  }
  const changedWords = execFileSync('git', ['diff', '--name-only', startSha, '--', 'word'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).sort();
  assert.deepStrictEqual(changedWords, targets.map(slug => `word/${slug}.html`).sort(), 'Changed word-page scope differs from the authorized safe 7');

  let internalLinks = 0;
  for (const slug of targets) {
    const data = pack[slug];
    assert(data, `${slug}: approved source section missing`);
    const html = fs.readFileSync(path.join(root, 'word', `${slug}.html`), 'utf8');
    const pageText = comparable(text(html));
    assert.strictEqual((html.match(/<h1(?:\s[^>]*)?>/g) || []).length, 1, `${slug}: H1 count mismatch`);
    assert(html.includes(`<h1>${slug[0].toUpperCase() + slug.slice(1)} Meaning in Bangla</h1>`), `${slug}: page-specific H1 missing`);
    assert.strictEqual(text(html.match(/<title>([\s\S]*?)<\/title>/)[1]), plain(data.SEO_TITLE), `${slug}: title mismatch`);
    const meta = html.match(/<meta content="([^"]+)" name="description"\/>/);
    assert(meta && meta[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') === plain(data.META_DESCRIPTION), `${slug}: meta description mismatch`);
    assert(html.includes(`<link href="https://ovidhan.net/word/${slug}.html" rel="canonical"/>`), `${slug}: canonical mismatch`);
    const term = schemas(html, slug);
    assert.strictEqual(term.name, slug, `${slug}: DefinedTerm name mismatch`);
    assert.strictEqual(term.termCode, slug, `${slug}: DefinedTerm termCode mismatch`);
    assert.strictEqual(term.description, plain(data.SHORT_ANSWER), `${slug}: DefinedTerm description mismatch`);
    assert(term.description.length > 0, `${slug}: DefinedTerm description empty`);
    assert.deepStrictEqual(term.inLanguage, ['en', 'bn'], `${slug}: DefinedTerm language mismatch`);
    assert(semanticText(pageText).includes(semanticText(plain(bullets(data.BANGLA_MEANING)[0]))), `${slug}: static Bangla meaning missing`);
    assert(semanticText(pageText).includes(semanticText(plain(bullets(data.SIMPLE_ENGLISH_MEANING)[0]))), `${slug}: simple meaning missing`);
    const staticShort = html.match(/<p class="strategic-short-answer"[^>]*>([\s\S]*?)<\/p>/);
    assert(staticShort && semanticText(text(staticShort[1])) === semanticText(plain(data.SHORT_ANSWER)), `${slug}: short answer missing`);
    assert.strictEqual((html.match(/class="strategic-example"/g) || []).length, 4, `${slug}: example count mismatch`);
    assert.strictEqual((html.match(/id="staticWordContent"/g) || []).length, 1, `${slug}: duplicate static answer`);
    assert.strictEqual((html.match(/id="resultArea"/g) || []).length, 1, `${slug}: duplicate dynamic result area`);
    assert(html.includes('<details><summary>Check answer</summary>'), `${slug}: static answer disclosure missing`);
    const practiceQuestion = plain(data.QUICK_PRACTICE.match(/\*\*Question:\*\* ([\s\S]*?)(?=\r?\n\*\*Options:)/)[1]);
    const practiceAnswer = plain(data.QUICK_PRACTICE.match(/\*\*Correct answer:\*\* ([^\r\n]+)/)[1]);
    assert(pageText.includes(practiceQuestion) && pageText.includes(practiceAnswer), `${slug}: approved practice missing`);
    assert(!/noindex/i.test(html), `${slug}: noindex present`);
    if (plain(data.COMMON_MISTAKE_FOR_BANGLA_LEARNERS) === 'NONE') assert(!html.includes('Common learner mistake'), `${slug}: fake mistake section rendered`);
    for (const href of [...html.matchAll(/href="(\/[^"]+)"/g)].map(match => match[1])) {
      if (href.startsWith('/word/')) continue;
      assert(fs.existsSync(path.join(root, href.slice(1))), `${slug}: broken internal link ${href}`);
      internalLinks += 1;
    }
  }
  await verifySearchBehavior(fs.readFileSync(path.join(root, 'word', 'net.html'), 'utf8'));
  console.log(JSON.stringify({ status: 'PASS', approved_hash: hash, original_candidates: originalCandidates.length, frozen_exclusions: frozenExclusions, pages: targets.length, examples: targets.length * 4, internal_links: internalLinks, frozen_144: 'PASS', search_behavior: 'PASS' }, null, 2));
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
