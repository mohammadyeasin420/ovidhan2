#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourcePath = process.argv[2] || 'C:\\data\\ovidhan-7a3e-approved-content.md';
const expectedHash = 'A879BC75C02A8A8931231DD3EF3EB7847358C428543832501733B98FBE2649FE';
const startSha = '41922864fb2c735dbcfac9fe14e9941fd7a50179';
const targets = ['net', 'translation', 'tradeoff', 'without', 'must', 'accordance', 'during'];
const linkMap = {
  'Grammar': ['/grammar.html', 'Grammar'],
  'Basic Vocabulary': ['/basic-vocabulary-list.html', 'Basic Vocabulary'],
  'Speaking / Real-life English': ['/real-life-english.html', 'Speaking / Real-life English']
};
const evidenceLinks = {
  net: [['/bank-job-vocabulary.html', 'Bank Job Vocabulary'], ['/5000-common-english-words-bangla.html', '5000 Common English Words']],
  translation: [['/5000-common-english-words-bangla.html', '5000 Common English Words']],
  without: [['/5000-common-english-words-bangla.html', '5000 Common English Words']],
  must: [['/5000-common-english-words-bangla.html', '5000 Common English Words']],
  accordance: [['/5000-common-english-words-bangla.html', '5000 Common English Words']],
  during: [['/5000-common-english-words-bangla.html', '5000 Common English Words']]
};

const source = fs.readFileSync(sourcePath, 'utf8');
const actualHash = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex').toUpperCase();
if (actualHash !== expectedHash) throw new Error(`Approved content hash mismatch: ${actualHash}`);

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(value) {
  return escapeHtml(value.trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function plain(value) {
  return value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function parsePack(markdown) {
  const result = {};
  const sections = markdown.split(/^## WORD: /m).slice(1);
  for (const section of sections) {
    const newline = section.indexOf('\n');
    const slug = section.slice(0, newline).trim().toLowerCase();
    const fields = {};
    const fieldPattern = /^### \d+\. ([A-Z_ /]+)\r?\n([\s\S]*?)(?=^### \d+\.|^---|\z)/gm;
    let match;
    while ((match = fieldPattern.exec(section))) fields[match[1].trim()] = match[2].trim();
    result[slug] = fields;
  }
  return result;
}

function bullets(body) {
  return body.split(/\r?\n/).map(line => line.match(/^\s*-\s+(.+)$/)?.[1]).filter(Boolean);
}

function paragraphs(body) {
  return body.split(/\r?\n\s*\r?\n/).map(part => part.replace(/\r?\n/g, ' ').trim()).filter(Boolean);
}

function renderListSection(title, body, className = '') {
  if (!body || plain(body) === 'NONE') return '';
  const items = bullets(body);
  if (items.length) return `<section${className ? ` class="${className}"` : ''}><h2>${title}</h2><ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul></section>`;
  return `<section${className ? ` class="${className}"` : ''}><h2>${title}</h2>${paragraphs(body).map(item => `<p>${inline(item)}</p>`).join('')}</section>`;
}

function parseExamples(body) {
  const examples = [];
  const pattern = /^\d+\. \*\*English:\*\* ([\s\S]*?)\s{2,}\r?\n\s*\*\*Bangla:\*\* ([^\r\n]+)$/gm;
  let match;
  while ((match = pattern.exec(body))) examples.push({ english: match[1].trim(), bangla: match[2].trim() });
  return examples;
}

function renderConnections(slug, body) {
  const links = new Map();
  for (const item of bullets(body || '')) {
    const key = Object.keys(linkMap).find(name => item.startsWith(name));
    if (!key) continue;
    const [href, label] = linkMap[key];
    if (fs.existsSync(path.join(root, href.slice(1)))) links.set(href, label);
  }
  for (const [href, label] of evidenceLinks[slug] || []) {
    if (!fs.existsSync(path.join(root, href.slice(1)))) throw new Error(`${slug}: missing evidence-backed destination ${href}`);
    links.set(href, label);
  }
  return links.size ? `<section class="strategic-next"><h2>Next learning step</h2><ul>${[...links].map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></section>` : '';
}

function accordanceChrome() {
  const baseline = execFileSync('git', ['show', `${startSha}:word/accordance.html`], { cwd: root, encoding: 'utf8' });
  const prefix = baseline.match(/<body>([\s\S]*?)\s*<main>/)?.[1];
  const footer = baseline.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0];
  if (!prefix || !footer || !prefix.includes('function toggleMenu()')) throw new Error('Starting-main accordance chrome could not be preserved');
  return { prefix: prefix.trim(), footer };
}

function renderPractice(body) {
  const question = body.match(/\*\*Question:\*\* ([\s\S]*?)(?=\r?\n\*\*Options:)/)?.[1].trim();
  const options = body.match(/\*\*Options:\*\* ([^\r\n]+)/)?.[1].trim();
  const answer = body.match(/\*\*Correct answer:\*\* ([^\r\n]+)/)?.[1].trim();
  const explanation = body.match(/\*\*Bangla explanation:\*\* ([^\r\n]+)/)?.[1].trim();
  if (!question || !options || !answer || !explanation) throw new Error('Quick practice parsing failed');
  return `<section class="strategic-practice"><h2>Quick practice</h2><p class="practice-question">${inline(question)}</p><p><strong>Options:</strong> ${inline(options)}</p><details><summary>Check answer</summary><p><strong>Answer:</strong> ${inline(answer)}</p><p lang="bn">${inline(explanation)}</p></details></section>`;
}

function renderPage(slug, data) {
  const examples = parseExamples(data.EXAMPLES);
  if (examples.length !== 4) throw new Error(`${slug}: expected 4 examples, got ${examples.length}`);
  const title = plain(data.SEO_TITLE);
  const description = plain(data.META_DESCRIPTION);
  const shortAnswer = data.SHORT_ANSWER;
  const bangla = bullets(data.BANGLA_MEANING);
  const pos = bullets(data.PART_OF_SPEECH);
  const simple = bullets(data.SIMPLE_ENGLISH_MEANING);
  const article = `<article id="staticWordContent" class="dictionary-answer strategic-word-page">
<header class="strategic-word-hero">
<p class="strategic-eyebrow">English to Bangla dictionary</p>
<h1>${slug[0].toUpperCase() + slug.slice(1)} Meaning in Bangla</h1>
<p class="strategic-short-answer" lang="bn">${inline(shortAnswer)}</p>
<dl class="strategic-facts"><div><dt>English word</dt><dd>${escapeHtml(slug)}</dd></div><div><dt>Bangla meaning</dt><dd lang="bn">${bangla.map(inline).join(' · ')}</dd></div><div><dt>Part of speech</dt><dd>${pos.map(inline).join(', ')}</dd></div></dl>
</header>
<section><h2>Simple meaning</h2>${simple.map(item => `<p>${inline(item)}</p>`).join('')}</section>
<section><h2>বাংলায় সহজ ব্যাখ্যা</h2>${paragraphs(data.BANGLA_EXPLANATION).map(item => `<p lang="bn">${inline(item)}</p>`).join('')}</section>
<section><h2>Examples</h2><ol class="strategic-examples">${examples.map(example => `<li class="strategic-example"><p>${inline(example.english)}</p><p lang="bn">${inline(example.bangla)}</p></li>`).join('')}</ol></section>
${renderListSection('Usage note', data.USAGE_NOTE)}
${renderListSection('Common confusion', data.COMMON_CONFUSION, 'strategic-confusion')}
${renderListSection('Common learner mistake', data.COMMON_MISTAKE_FOR_BANGLA_LEARNERS, 'strategic-mistake')}
${renderListSection('Collocations and patterns', data.COLLOCATIONS || data['COLLOCATIONS / COMMON PATTERNS'])}
${renderListSection('Word family', data.WORD_FAMILY)}
${renderPractice(data.QUICK_PRACTICE)}
${renderConnections(slug, data.NEXT_LEARNING_CONNECTION)}
</article>`;
  const embedded = JSON.stringify({ english: slug, bangla: plain(bangla[0]), definition: plain(simple[0]), part_of_speech: pos.join(' / ') }).replace(/</g, '\\u003c');
  const chrome = slug === 'accordance' ? accordanceChrome() : null;
  const body = chrome ? `${chrome.prefix}
<main>
${article}
<div class="explorer-container strategic-word-search">
<h2>🔍 Learning Explorer</h2>
<p>Search another English word without leaving this page.</p>
<div class="search-box"><input id="wordInput" placeholder="Type a word..." type="text" value="${slug}"/><button class="btn-primary" onclick="searchWord()">Search</button></div>
<div id="resultArea"></div>
</div>
</main>
<script type="application/json" id="ovidhan-word-data">${embedded}</script>
<script src="../learning-explorer.js"></script>
${chrome.footer}` : `<!-- Header will be injected later -->
${article}
<div class="explorer-container strategic-word-search">
<h2>🔍 Learning Explorer</h2>
<p>Search another English word without leaving this page.</p>
<div class="search-box"><input id="wordInput" placeholder="Type a word..." type="text" value="${slug}"/><button class="btn-primary" onclick="searchWord()">Search</button></div>
<div id="resultArea"></div>
</div>
<!-- Footer will be injected later -->
<script type="application/json" id="ovidhan-word-data">${embedded}</script>
<script src="../learning-explorer.js"></script>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>${escapeHtml(title)}</title>
<meta content="${escapeHtml(description)}" name="description"/>
<link href="../styles.css" rel="stylesheet"/>
<link href="../strategic-word.css" rel="stylesheet"/>
<link href="https://ovidhan.net/word/${slug}.html" rel="canonical"/>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ovidhan.net' }, { '@type': 'ListItem', position: 2, name: title, item: `https://ovidhan.net/word/${slug}.html` }] }, null, 2)}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'DefinedTerm', name: slug, description: plain(shortAnswer), inLanguage: ['en', 'bn'], termCode: slug }, null, 2)}</script>
</head>
<body${chrome ? ' class="strategic-chrome-page"' : ''}>
${body}
</body>
</html>
`;
}

const pack = parsePack(source);
for (const slug of targets) {
  if (!pack[slug]) throw new Error(`Approved content missing: ${slug}`);
  fs.writeFileSync(path.join(root, 'word', `${slug}.html`), renderPage(slug, pack[slug]), 'utf8');
}
console.log(JSON.stringify({ status: 'PASS', approved_hash: actualHash, pages_written: targets.length }, null, 2));
