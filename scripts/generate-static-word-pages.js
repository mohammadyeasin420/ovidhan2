const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'data', 'seo-word-pilot-7a1.json');
const approvedWords = `acceptable
acting
aspects
association
beast
buildings
businesses
cartridge
casual
cheap
comparison
constitution
dancing
degrees
doctor
dress
evil
exercise
forecast
gene
increase
internet
interviews
mass
merchants
model
name
nation
notebooks
objects
offers
packaging
popular
posters
process
proposal
psychology
pub
request
result
rules
stick
studies
sufficient
terminal
tests
textbooks
typical`.split('\n');

const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const fileHash = file => sha256(fs.readFileSync(file));
const textPresent = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) ? value.filter(textPresent).map(value => value.trim()) : [];
const objectPresent = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
const dictionaryWord = entry => entry.english || entry.word || entry.en;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const escapeAttribute = escapeHtml;
const embeddedJson = value => JSON.stringify(value).replace(/</g, '\\u003c');

function qualityScore(entry) {
  const anyExample = textPresent(entry.example) || strings(entry.examples).length > 0;
  return (textPresent(entry.pronunciation) ? 1 : 0)
    + (textPresent(entry.part_of_speech) ? 1 : 0)
    + (anyExample ? 2 : 0)
    + Math.min(strings(entry.synonyms).length, 3) * 0.5
    + Math.min(strings(entry.antonyms).length, 3) * 0.5
    + Math.min(strings(entry.collocations).length, 3) * 0.5
    + (objectPresent(entry.verb_forms) ? 1 : 0)
    + (textPresent(entry.story) ? 1 : 0);
}

function aggregate(files) {
  return sha256(files.map(file => `${path.relative(root, file).replace(/\\/g, '/')}\0${fileHash(file)}\n`).sort().join(''));
}

function staticPage(original, record, entry) {
  const shell = original.includes('<main')
    ? original
    : fs.readFileSync(path.join(root, 'word', 'abandon.html'), 'utf8');
  const word = String(dictionaryWord(entry)).trim();
  const url = record.url;
  const bangla = entry.bangla.trim();
  const definition = entry.definition.trim();
  const description = `${word} meaning in Bangla: ${bangla}. ${definition}`.slice(0, 160);
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ovidhan.net/' },
      { '@type': 'ListItem', position: 2, name: 'Dictionary', item: 'https://ovidhan.net/dictionary.html' },
      { '@type': 'ListItem', position: 3, name: word, item: url }
    ]
  };
  const definedTerm = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: word,
    description: definition,
    url,
    inLanguage: ['en', 'bn'],
    alternateName: bangla
  };
  const head = `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(word)} Meaning in Bangla | Ovidhan</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <meta name="robots" content="index,follow">
    <link rel="stylesheet" href="../styles.css">
    <link rel="canonical" href="${escapeAttribute(url)}">
    <script type="application/ld+json">${embeddedJson(breadcrumb)}</script>
    <script type="application/ld+json">${embeddedJson(definedTerm)}</script>
</head>`;
  const optional = [];
  if (textPresent(entry.part_of_speech)) optional.push(`<p class="part-of-speech"><strong>Part of speech:</strong> ${escapeHtml(entry.part_of_speech.trim())}</p>`);
  if (textPresent(entry.pronunciation)) optional.push(`<p class="pronunciation"><strong>Pronunciation:</strong> ${escapeHtml(entry.pronunciation.trim())}</p>`);
  if (objectPresent(entry.verb_forms)) {
    optional.push(`<section class="verb-forms"><h2>Verb forms</h2><dl>${Object.entries(entry.verb_forms).map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl></section>`);
  }
  if (strings(entry.collocations).length) {
    optional.push(`<section class="collocations"><h2>Collocations</h2><ul>${strings(entry.collocations).map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul></section>`);
  }
  const main = `<main>
    <article class="dictionary-answer" style="padding:2rem;">
        <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; <span aria-current="page">${escapeHtml(word)}</span></nav>
        <h1>${escapeHtml(word)} meaning in Bangla</h1>
        <p class="english-word"><strong>English word:</strong> ${escapeHtml(word)}</p>
        <p class="bangla-meaning"><strong>Bangla meaning:</strong> <span lang="bn">${escapeHtml(bangla)}</span></p>
        <p class="english-definition"><strong>English definition:</strong> ${escapeHtml(definition)}</p>
        ${optional.join('\n        ')}
        <p class="word-actions"><button type="button" onclick="speak(${escapeAttribute(JSON.stringify(word))})" class="btn-secondary">🔊 Hear word</button> <button type="button" onclick="saveWord(${escapeAttribute(JSON.stringify(word))})" class="btn-secondary">✅ Mark as learned</button> <span id="saveFeedback" aria-live="polite"></span></p>
    </article>
    <div class="explorer-container" style="padding:2rem;">
        <h2>🔍 Learning Explorer</h2>
        <div class="search-box">
            <input type="text" id="wordInput" placeholder="Type a word..." value="${escapeAttribute(word)}">
            <button onclick="searchWord()" class="btn-primary">Search</button>
        </div>
        <div id="resultArea" aria-live="polite"></div>
    </div>
    </main>
    <script type="application/json" id="ovidhan-word-data">${embeddedJson(entry)}</script>
    <script src="../learning-explorer.js"></script>`;
  return shell
    .replace(/<head>[\s\S]*?<\/head>/, head)
    .replace(/<main[^>]*>[\s\S]*?<\/main>\s*(?:<script type="application\/json" id="ovidhan-word-data">[\s\S]*?<\/script>\s*)?<script src=["']\.\.\/learning-explorer\.js["']><\/script>/, main);
}

if (approvedWords.length !== 48 || new Set(approvedWords).size !== 48) throw new Error('Approved cohort must contain exactly 48 unique words');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seo-word-pilot-7a1-source.json'), 'utf8'));
const auditFile = path.join(root, 'reports', 'seo-word-pilot-7a1-editorial-review.json');
const audit = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'enriched-dictionary.json'), 'utf8'));
const sitemapFiles = fs.readdirSync(root).filter(name => /^sitemap.*\.xml$/.test(name)).sort().map(name => path.join(root, name));
const sitemapText = sitemapFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const dictionaryLookup = new Map();
dictionary.forEach((entry, dictionaryIndex) => {
  const word = dictionaryWord(entry);
  if (word) dictionaryLookup.set(String(word).trim().toLowerCase(), { entry, dictionaryIndex });
});

const candidates = approvedWords.map(slug => {
  const audited = audit.entries.find(entry => entry.slug === slug);
  const found = dictionaryLookup.get(slug);
  const url = `https://ovidhan.net/word/${slug}.html`;
  if (!audited || !found || !source.cohort_urls.includes(url)) throw new Error(`Approved word failed source gates: ${slug}`);
  if (!fs.existsSync(path.join(root, 'word', `${slug}.html`))) throw new Error(`Missing word page: ${slug}`);
  if (!sitemapText.includes(url)) throw new Error(`Missing from sitemap: ${url}`);
  return { slug, word: String(dictionaryWord(found.entry)).trim(), url, entry: found.entry, dictionaryIndex: found.dictionaryIndex, qualityScore: qualityScore(found.entry) };
}).sort((a, b) => b.qualityScore - a.qualityScore || a.slug.localeCompare(b.slug));

const assigned = [];
for (let index = 0; index < candidates.length; index += 2) {
  const pair = candidates.slice(index, index + 2);
  const pairId = `7A1-${String(index / 2 + 1).padStart(2, '0')}`;
  const assignmentHash = sha256(`${pair[0].slug}|${pair[1].slug}|7A1`);
  const treatmentIndex = parseInt(assignmentHash[0], 16) % 2;
  pair.forEach((candidate, pairIndex) => assigned.push({ ...candidate, pairId, assignmentHash, group: pairIndex === treatmentIndex ? 'treatment' : 'control' }));
}
const treatmentSlugs = new Set(assigned.filter(item => item.group === 'treatment').map(item => item.slug));
const wordFiles = fs.readdirSync(path.join(root, 'word')).filter(name => name.endsWith('.html')).sort().map(name => path.join(root, 'word', name));
const nonTreatmentFiles = wordFiles.filter(file => !treatmentSlugs.has(path.basename(file, '.html')));

let baseline;
if (fs.existsSync(manifestPath)) {
  const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  baseline = existing.baseline;
  if (!baseline) throw new Error('Existing manifest has no baseline');
} else {
  baseline = {
    captured_from_main_sha: '9c666d3c12120c2a68197e408b51061087294961',
    word_file_count: wordFiles.length,
    all_word_aggregate_sha256: aggregate(wordFiles),
    non_treatment_word_aggregate_sha256: aggregate(nonTreatmentFiles),
    cohort_page_sha256: Object.fromEntries(assigned.map(item => [item.slug, fileHash(path.join(root, 'word', `${item.slug}.html`))])),
    sitemap_sha256: Object.fromEntries(sitemapFiles.map(file => [path.basename(file), fileHash(file)])),
    robots_sha256: fileHash(path.join(root, 'robots.txt')),
    editorial_review_sha256: fileHash(auditFile),
    frozen_manifest_sha256: fileHash(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json'))
  };
}

const records = assigned.sort((a, b) => a.pairId.localeCompare(b.pairId) || a.group.localeCompare(b.group)).map(item => ({
  word: item.word,
  slug: item.slug,
  url: item.url,
  dictionary_index: item.dictionaryIndex,
  quality_score: item.qualityScore,
  pair_id: item.pairId,
  assignment_sha256: item.assignmentHash,
  group: item.group,
  available_fields: ['bangla', 'definition', 'example', 'part_of_speech', 'pronunciation', 'synonyms', 'antonyms', 'collocations', 'verb_forms', 'story'].filter(field => textPresent(item.entry[field]) || strings(item.entry[field]).length || objectPresent(item.entry[field])),
  in_gsc_export: true,
  in_sitemap: true
}));
const manifest = {
  schema: 'ovidhan-seo-word-static-pilot-7a1-v1',
  approved_cohort_source: 'Human-approved 48-word list supplied for Phase 7A1-C',
  assignment_rule: 'Sort by quality_score descending then slug ascending; form adjacent pairs; SHA-256(pair_slug_1 + "|" + pair_slug_2 + "|7A1"); even first hex digit assigns first member to treatment, odd assigns second.',
  quality_score_formula: '+1 pronunciation; +1 part_of_speech; +2 any singular example or examples-array item; +0.5 each for up to 3 synonyms; +0.5 each for up to 3 antonyms; +0.5 each for up to 3 collocations; +1 non-empty verb_forms object; +1 story.',
  rendering_exclusions: ['example', 'examples', 'synonyms', 'antonyms'],
  counts: { total: 48, treatment: 24, control: 24, pairs: 24 },
  baseline,
  entries: records
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

for (const item of assigned.filter(item => item.group === 'treatment')) {
  const pagePath = path.join(root, 'word', `${item.slug}.html`);
  const generated = staticPage(fs.readFileSync(pagePath, 'utf8'), item, item.entry);
  fs.writeFileSync(pagePath, generated);
}

console.log(JSON.stringify({ treatment: records.filter(record => record.group === 'treatment').map(record => record.slug), control: records.filter(record => record.group === 'control').map(record => record.slug) }, null, 2));
