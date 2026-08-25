const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const expectedXlsxHash = '9ee447fcb3e53d07256f35723afc3a5b0d21799040f9e1860e24e9358f4eb426';
const expectedApproved = `acceptable acting aspects association beast buildings businesses cartridge casual cheap comparison constitution dancing degrees doctor dress evil exercise forecast gene increase internet interviews mass merchants model name nation notebooks objects offers packaging popular posters process proposal psychology pub request result rules stick studies sufficient terminal tests textbooks typical`.split(' ');
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const fileHash = file => sha256(fs.readFileSync(file));
const rel = file => path.relative(root, file).replace(/\\/g, '/');
const aggregate = files => sha256(files.map(file => `${rel(file)}\0${fileHash(file)}\n`).sort().join(''));
const fail = message => { throw new Error(message); };

function findXlsx() {
  const candidates = [
    process.env.OVIDHAN_GSC_XLSX,
    path.join(os.homedir(), 'Downloads', 'https___ovidhan.net_-Coverage-Validation-2026-08-25.xlsx')
  ].filter(Boolean);
  return candidates.find(file => fs.existsSync(file)) || fail('Required GSC XLSX not found');
}

const xlsx = findXlsx();
assert.strictEqual(fileHash(xlsx), expectedXlsxHash, 'GSC XLSX hash mismatch');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seo-word-pilot-7a1-source.json'), 'utf8'));
assert.strictEqual(source.sha256, expectedXlsxHash);
assert.strictEqual(source.total_exported_url_count, 1000);
assert.strictEqual(source.word_url_count, 993);
assert.strictEqual(source.cohort_urls.length, 993);
assert.deepStrictEqual(source.cohort_urls, [...source.cohort_urls].sort(), 'GSC cohort URLs are not sorted');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seo-word-pilot-7a1.json'), 'utf8'));
assert.deepStrictEqual(manifest.counts, { total: 48, treatment: 24, control: 24, pairs: 24 });
assert.strictEqual(manifest.entries.length, 48);
assert.deepStrictEqual([...manifest.entries.map(entry => entry.slug)].sort(), [...expectedApproved].sort(), 'Approved cohort differs from exact 48-word list');
assert.strictEqual(new Set(manifest.entries.map(entry => entry.slug)).size, 48);
const treatment = manifest.entries.filter(entry => entry.group === 'treatment');
const control = manifest.entries.filter(entry => entry.group === 'control');
assert.strictEqual(treatment.length, 24);
assert.strictEqual(control.length, 24);
assert.strictEqual(treatment.filter(item => control.some(other => other.slug === item.slug)).length, 0);

const sorted = [...manifest.entries].sort((a, b) => b.quality_score - a.quality_score || a.slug.localeCompare(b.slug));
for (let index = 0; index < sorted.length; index += 2) {
  const pair = sorted.slice(index, index + 2);
  const pairId = `7A1-${String(index / 2 + 1).padStart(2, '0')}`;
  assert(pair.every(item => item.pair_id === pairId), `Invalid pair membership: ${pairId}`);
  const hash = sha256(`${pair[0].slug}|${pair[1].slug}|7A1`);
  assert(pair.every(item => item.assignment_sha256 === hash), `Invalid assignment hash: ${pairId}`);
  const treatmentIndex = parseInt(hash[0], 16) % 2;
  assert.strictEqual(pair[treatmentIndex].group, 'treatment', `Invalid treatment assignment: ${pairId}`);
  assert.strictEqual(pair[1 - treatmentIndex].group, 'control', `Invalid control assignment: ${pairId}`);
}

const sitemapFiles = Object.keys(manifest.baseline.sitemap_sha256).map(name => path.join(root, name));
const sitemapText = sitemapFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
for (const entry of manifest.entries) {
  assert(source.cohort_urls.includes(entry.url), `Not in GSC cohort: ${entry.url}`);
  assert.strictEqual(entry.in_gsc_export, true);
  assert.strictEqual(entry.in_sitemap, true);
  assert(fs.existsSync(path.join(root, 'word', `${entry.slug}.html`)), `Missing word file: ${entry.slug}`);
  assert(sitemapText.includes(entry.url), `Missing sitemap URL: ${entry.url}`);
}

const changedWordFiles = execFileSync('git', ['diff', '--name-only', manifest.baseline.captured_from_main_sha, '--', 'word'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).sort();
const expectedChanged = treatment.map(entry => `word/${entry.slug}.html`).sort();
assert.deepStrictEqual(changedWordFiles, expectedChanged, 'Changed word files differ from treatment set');

for (const entry of control) {
  assert.strictEqual(fileHash(path.join(root, 'word', `${entry.slug}.html`)), manifest.baseline.cohort_page_sha256[entry.slug], `Control changed: ${entry.slug}`);
}
const wordFiles = fs.readdirSync(path.join(root, 'word')).filter(name => name.endsWith('.html')).sort().map(name => path.join(root, 'word', name));
assert.strictEqual(wordFiles.length, manifest.baseline.word_file_count);
const treatmentSlugs = new Set(treatment.map(entry => entry.slug));
const nonTreatmentFiles = wordFiles.filter(file => !treatmentSlugs.has(path.basename(file, '.html')));
assert.strictEqual(aggregate(nonTreatmentFiles), manifest.baseline.non_treatment_word_aggregate_sha256, 'A non-treatment word page changed');

const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'enriched-dictionary.json'), 'utf8'));
for (const entry of treatment) {
  const html = fs.readFileSync(path.join(root, 'word', `${entry.slug}.html`), 'utf8');
  const dictionaryEntry = dictionary[entry.dictionary_index];
  assert(dictionaryEntry, `Missing dictionary index: ${entry.slug}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/);
  assert(canonical && canonical[1] === entry.url, `Canonical mismatch: ${entry.slug}`);
  assert.strictEqual((html.match(/<h1(?:\s[^>]*)?>/g) || []).length, 1, `H1 count mismatch: ${entry.slug}`);
  assert(html.includes(dictionaryEntry.bangla.trim()), `Static Bangla missing: ${entry.slug}`);
  assert(html.includes(dictionaryEntry.definition.trim()), `Static definition missing: ${entry.slug}`);
  assert(!/<section class="examples"|<div class="examples"/.test(html), `Examples rendered: ${entry.slug}`);
  assert(!/<section class="synonyms"|<div class="related-words"/.test(html), `Synonyms/antonyms rendered: ${entry.slug}`);
  assert(!html.includes('${'), `Leaked template marker: ${entry.slug}`);
  const embeddedMatch = html.match(/<script type="application\/json" id="ovidhan-word-data">([\s\S]*?)<\/script>/);
  assert(embeddedMatch, `Embedded JSON missing: ${entry.slug}`);
  const article = html.match(/<article class="dictionary-answer"[\s\S]*?<\/article>/)?.[0] || '';
  assert(!article.includes(dictionaryEntry.example.trim()), `Example rendered: ${entry.slug}`);
  assert(!/class="(?:examples|related-words|synonyms|antonyms)"|<h2>(?:Examples|Synonyms|Antonyms)<\/h2>|<strong>(?:Examples|Related|Synonyms|Antonyms):?<\/strong>/i.test(article), `Example/synonym/antonym structure rendered: ${entry.slug}`);
  const embedded = JSON.parse(embeddedMatch[1]);
  assert.strictEqual((embedded.english || embedded.word || embedded.en).toLowerCase(), entry.slug);
  assert.deepStrictEqual(embedded, dictionaryEntry, `Embedded entry mismatch: ${entry.slug}`);
  const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const term = ldBlocks.find(block => block['@type'] === 'DefinedTerm');
  const crumbs = ldBlocks.find(block => block['@type'] === 'BreadcrumbList');
  assert(term && typeof term.description === 'string' && term.description.trim(), `DefinedTerm description missing: ${entry.slug}`);
  assert(crumbs && crumbs.itemListElement.at(-1).item === entry.url, `Breadcrumb invalid: ${entry.slug}`);
}

for (const [name, hash] of Object.entries(manifest.baseline.sitemap_sha256)) assert.strictEqual(fileHash(path.join(root, name)), hash, `Sitemap changed: ${name}`);
assert.strictEqual(fileHash(path.join(root, 'robots.txt')), manifest.baseline.robots_sha256, 'robots.txt changed');
assert.strictEqual(fileHash(path.join(root, 'reports', 'seo-word-pilot-7a1-editorial-review.json')), manifest.baseline.editorial_review_sha256, 'Editorial review JSON changed');
assert.strictEqual(fileHash(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json')), manifest.baseline.frozen_manifest_sha256, 'Frozen manifest changed');
const frozen = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json'), 'utf8'));
assert.strictEqual(frozen.uniquePageCount, 144);
for (const item of [...frozen.pages, ...frozen.guards]) assert.strictEqual(fileHash(path.join(root, item.path)), item.sha256, `Frozen file changed: ${item.path}`);

const runtime = fs.readFileSync(path.join(root, 'learning-explorer.js'), 'utf8');
assert(runtime.includes("document.getElementById('ovidhan-word-data')"), 'Embedded-data detection missing');
assert(runtime.includes('if (embeddedData)'), 'Embedded initial branch missing');
assert(runtime.includes('loadFullDictionary()'), 'Non-treatment/lazy full dictionary path missing');
assert(runtime.indexOf('if (embeddedData)') < runtime.indexOf('loadFullDictionary()\n    .then'), 'Embedded branch does not precede initial full load');
assert(runtime.includes('.then(() => searchWord())'), 'Lazy search continuation missing');
assert(!runtime.includes('seo-word-pilot-7a1-editorial-review'), 'Editorial review is referenced by runtime');

const scores = group => group.map(entry => entry.quality_score).sort((a, b) => a - b);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const median = values => (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
const treatmentScores = scores(treatment);
const controlScores = scores(control);
const maxPairDifference = Math.max(...Array.from({ length: 24 }, (_, index) => {
  const pair = manifest.entries.filter(entry => entry.pair_id === `7A1-${String(index + 1).padStart(2, '0')}`);
  return Math.abs(pair[0].quality_score - pair[1].quality_score);
}));
const result = {
  status: 'PASS',
  xlsx_sha256: expectedXlsxHash,
  gsc: { total: 1000, word: 993 },
  cohort: manifest.counts,
  changed_word_files: changedWordFiles.length,
  scores: {
    treatment_mean: mean(treatmentScores),
    control_mean: mean(controlScores),
    treatment_median: median(treatmentScores),
    control_median: median(controlScores),
    maximum_within_pair_difference: maxPairDifference
  },
  controls_unchanged: true,
  non_treatment_word_pages_unchanged: true,
  sitemap_robots_unchanged: true,
  frozen_experiment_unchanged: true,
  editorial_review_unchanged: true
};
console.log(JSON.stringify(result, null, 2));
