const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const baseSha = '9c666d3c12120c2a68197e408b51061087294961';
const manifestPath = path.join(root, 'data', 'seo-word-pilot-7a1.json');
const architecturePath = path.join(root, 'reports', 'seo-word-pilot-7a1-baseline-architecture.json');
const approvedWords = `acceptable acting aspects association beast buildings businesses cartridge casual cheap comparison constitution dancing degrees doctor dress evil exercise forecast gene increase internet interviews mass merchants model name nation notebooks objects offers packaging popular posters process proposal psychology pub request result rules stick studies sufficient terminal tests textbooks typical`.split(' ');
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const fileHash = file => sha256(fs.readFileSync(file));
const textPresent = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) ? value.filter(textPresent).map(value => value.trim()) : [];
const objectPresent = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
const dictionaryWord = entry => entry.english || entry.word || entry.en;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const escapeAttribute = escapeHtml;
const jsonForScript = value => JSON.stringify(value).replace(/</g, '\\u003c');
const baseFile = relativePath => execFileSync('git', ['show', `${baseSha}:${relativePath}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const decodeHtmlText = html => html.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
function qualityScore(entry) {
  const anyExample = textPresent(entry.example) || strings(entry.examples).length > 0;
  return (textPresent(entry.pronunciation) ? 1 : 0) + (textPresent(entry.part_of_speech) ? 1 : 0) + (anyExample ? 2 : 0) + Math.min(strings(entry.synonyms).length, 3) * 0.5 + Math.min(strings(entry.antonyms).length, 3) * 0.5 + Math.min(strings(entry.collocations).length, 3) * 0.5 + (objectPresent(entry.verb_forms) ? 1 : 0) + (textPresent(entry.story) ? 1 : 0);
}
function inspectBaseline(slug, entry) {
  const html = baseFile(`word/${slug}.html`).toString('utf8');
  const text = decodeHtmlText(html);
  const h1Values = [...html.matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi)].map(match => decodeHtmlText(match[1]));
  const baseline_h1_presence = h1Values.some(value => value.toLowerCase().includes(slug) && /meaning in bangla/i.test(value));
  const baseline_bangla_presence = text.includes(entry.bangla.trim());
  const baseline_definition_presence = text.includes(entry.definition.trim());
  const baseline_pos_presence = !textPresent(entry.part_of_speech) || text.toLowerCase().includes(entry.part_of_speech.trim().toLowerCase());
  return { baseline_architecture: baseline_h1_presence && baseline_bangla_presence && baseline_definition_presence && baseline_pos_presence ? 'STATIC_CORE' : 'JS_SHELL', baseline_h1_presence, baseline_bangla_presence, baseline_definition_presence, baseline_pos_presence };
}
function corePayload(entry) {
  const payload = { english: String(dictionaryWord(entry)).trim(), bangla: entry.bangla.trim(), definition: entry.definition.trim() };
  if (textPresent(entry.part_of_speech)) payload.part_of_speech = entry.part_of_speech.trim();
  return payload;
}
function staticPage(shell, record, entry) {
  const payload = corePayload(entry);
  const { english: word, bangla, definition } = payload;
  const url = record.url;
  const description = `${word} meaning in Bangla: ${bangla}. ${definition}`.slice(0, 160);
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ovidhan.net/' }, { '@type': 'ListItem', position: 2, name: 'Dictionary', item: 'https://ovidhan.net/dictionary.html' }, { '@type': 'ListItem', position: 3, name: word, item: url }] };
  const definedTerm = { '@context': 'https://schema.org', '@type': 'DefinedTerm', name: word, description: definition, url, inLanguage: ['en', 'bn'], alternateName: bangla };
  const head = `<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${escapeHtml(word)} Meaning in Bangla | Ovidhan</title>\n    <meta name="description" content="${escapeAttribute(description)}">\n    <meta name="robots" content="index,follow">\n    <link rel="stylesheet" href="../styles.css">\n    <link rel="canonical" href="${escapeAttribute(url)}">\n    <script type="application/ld+json">${jsonForScript(breadcrumb)}</script>\n    <script type="application/ld+json">${jsonForScript(definedTerm)}</script>\n</head>`;
  const pos = payload.part_of_speech ? `<p class="part-of-speech"><strong>Part of speech:</strong> ${escapeHtml(payload.part_of_speech)}</p>` : '';
  const main = `<main>\n    <article class="dictionary-answer" style="padding:2rem;">\n        <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; <span aria-current="page">${escapeHtml(word)}</span></nav>\n        <h1>${escapeHtml(word)} meaning in Bangla</h1>\n        <p class="english-word"><strong>English word:</strong> ${escapeHtml(word)}</p>\n        <p class="bangla-meaning"><strong>Bangla meaning:</strong> <span lang="bn">${escapeHtml(bangla)}</span></p>\n        <p class="english-definition"><strong>English definition:</strong> ${escapeHtml(definition)}</p>\n        ${pos}\n        <p class="word-actions"><button type="button" onclick="speak(${escapeAttribute(JSON.stringify(word))})" class="btn-secondary">🔊 Hear word</button> <button type="button" onclick="saveWord(${escapeAttribute(JSON.stringify(word))})" class="btn-secondary">✅ Mark as learned</button> <span id="saveFeedback" aria-live="polite"></span></p>\n    </article>\n    <div class="explorer-container" style="padding:2rem;">\n        <h2>🔍 Learning Explorer</h2>\n        <div class="search-box"><input type="text" id="wordInput" placeholder="Type a word..." value="${escapeAttribute(word)}"><button onclick="searchWord()" class="btn-primary">Search</button></div>\n        <div id="resultArea" aria-live="polite"></div>\n    </div>\n    </main>\n    <script type="application/json" id="ovidhan-word-data">${jsonForScript(payload)}</script>\n    <script src="../learning-explorer.js"></script>`;
  return shell.replace(/<head>[\s\S]*?<\/head>/, head).replace(/<main[^>]*>[\s\S]*?<\/main>\s*<script src=["']\.\.\/learning-explorer\.js["']><\/script>/, main);
}
if (approvedWords.length !== 48 || new Set(approvedWords).size !== 48) throw new Error('Approved population must be exactly 48 unique words');
const source = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seo-word-pilot-7a1-source.json'), 'utf8'));
const auditPath = path.join(root, 'reports', 'seo-word-pilot-7a1-editorial-review.json');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'enriched-dictionary.json'), 'utf8'));
const sitemapFiles = fs.readdirSync(root).filter(name => /^sitemap.*\.xml$/.test(name)).sort();
const sitemapText = sitemapFiles.map(name => fs.readFileSync(path.join(root, name), 'utf8')).join('\n');
const lookup = new Map();
dictionary.forEach((entry, dictionaryIndex) => { const word = dictionaryWord(entry); if (word) lookup.set(String(word).trim().toLowerCase(), { entry, dictionaryIndex }); });
const population = approvedWords.map(slug => {
  const found = lookup.get(slug); const editorial = audit.entries.find(entry => entry.slug === slug); const url = `https://ovidhan.net/word/${slug}.html`;
  if (!found || !editorial || !source.cohort_urls.includes(url) || !sitemapText.includes(url)) throw new Error(`Approved population gate failed: ${slug}`);
  return { slug, word: String(dictionaryWord(found.entry)).trim(), url, entry: found.entry, dictionaryIndex: found.dictionaryIndex, qualityScore: qualityScore(found.entry), editorialGroup: editorial.review_group, ...inspectBaseline(slug, found.entry) };
});
const eligible = population.filter(item => item.baseline_architecture === 'JS_SHELL').sort((a, b) => b.qualityScore - a.qualityScore || a.slug.localeCompare(b.slug));
if (eligible.length < 12) throw new Error(`Only ${eligible.length} baseline JS_SHELL entries; implementation stopped`);
const paired = eligible.slice(0, Math.floor(eligible.length / 2) * 2); const oddUnused = eligible.slice(paired.length); const assigned = [];
for (let index = 0; index < paired.length; index += 2) { const pair = paired.slice(index, index + 2); const pairId = `7A1-${String(index / 2 + 1).padStart(2, '0')}`; const assignmentHash = sha256(`${pair[0].slug}|${pair[1].slug}|7A1`); const treatmentIndex = parseInt(assignmentHash[0], 16) % 2; pair.forEach((candidate, pairIndex) => assigned.push({ ...candidate, pairId, assignmentHash, group: pairIndex === treatmentIndex ? 'treatment' : 'control' })); }
const assignedBySlug = new Map(assigned.map(item => [item.slug, item]));
const previousManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); const previousBySlug = new Map(previousManifest.entries.map(item => [item.slug, item.group]));
const architectureReport = { schema: 'ovidhan-seo-word-pilot-7a1-baseline-architecture-v1', base_main_sha: baseSha, classification_rule: 'STATIC_CORE requires the correct word H1, Bangla meaning, English definition, and source POS (when present) in baseline raw HTML; otherwise JS_SHELL.', counts: { approved_population: 48, static_core: population.length - eligible.length, js_shell: eligible.length, experiment_treatment: assigned.filter(item => item.group === 'treatment').length, experiment_control: assigned.filter(item => item.group === 'control').length, unused_odd_shell: oddUnused.length }, entries: population.map(item => ({ word: item.word, slug: item.slug, previous_group: previousBySlug.get(item.slug), group: assignedBySlug.get(item.slug)?.group || (item.baseline_architecture === 'STATIC_CORE' ? 'unused_static_core' : 'unused_odd_shell'), baseline_architecture: item.baseline_architecture, baseline_h1_presence: item.baseline_h1_presence, baseline_bangla_presence: item.baseline_bangla_presence, baseline_definition_presence: item.baseline_definition_presence, baseline_pos_presence: item.baseline_pos_presence })) };
fs.writeFileSync(architecturePath, JSON.stringify(architectureReport, null, 2) + '\n');
for (const item of population) fs.writeFileSync(path.join(root, 'word', `${item.slug}.html`), baseFile(`word/${item.slug}.html`));
const completeShell = baseFile('word/abandon.html').toString('utf8');
for (const item of assigned.filter(item => item.group === 'treatment')) fs.writeFileSync(path.join(root, 'word', `${item.slug}.html`), staticPage(completeShell, item, item.entry));
const baseline = { captured_from_main_sha: baseSha, word_file_count: Number(execFileSync('git', ['ls-tree', '-r', '--name-only', baseSha, 'word'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(name => name.endsWith('.html')).length), cohort_page_sha256: Object.fromEntries(population.map(item => [item.slug, sha256(baseFile(`word/${item.slug}.html`))])), sitemap_sha256: Object.fromEntries(sitemapFiles.map(name => [name, fileHash(path.join(root, name))])), robots_sha256: fileHash(path.join(root, 'robots.txt')), editorial_review_sha256: fileHash(auditPath), frozen_manifest_sha256: fileHash(path.join(root, 'reports', 'ovidhan-learning-foundation-3b-frozen-hashes.json')) };
const records = assigned.sort((a, b) => a.pairId.localeCompare(b.pairId) || a.group.localeCompare(b.group)).map(item => ({ word: item.word, slug: item.slug, url: item.url, dictionary_index: item.dictionaryIndex, quality_score: item.qualityScore, pair_id: item.pairId, assignment_sha256: item.assignmentHash, group: item.group, human_editorial_status: 'approved_core', baseline_architecture: 'JS_SHELL', available_fields: ['english', 'bangla', 'definition', ...(textPresent(item.entry.part_of_speech) ? ['part_of_speech'] : [])], in_gsc_export: true, in_sitemap: true }));
const manifest = { schema: 'ovidhan-seo-word-static-pilot-7a1-v2', hypothesis: 'Does converting a JS-shell word page to useful static raw HTML improve crawl/index behavior?', approved_population_source: 'Exact human-approved 48-word list supplied for Phase 7A1-C', approved_population: approvedWords, assignment_rule: 'Filter to baseline JS_SHELL; sort by quality_score descending then slug ascending; drop final odd entry; pair adjacent entries; SHA-256(first_slug + "|" + second_slug + "|7A1"); even first hex digit assigns first member to treatment, odd assigns second.', quality_score_formula: previousManifest.quality_score_formula, render_example: false, render_examples: false, render_synonyms: false, render_antonyms: false, render_collocations: false, render_verb_forms: false, render_story: false, counts: { approved_population_count: 48, eligible_js_shell_count: eligible.length, experiment_treatment_count: records.filter(item => item.group === 'treatment').length, experiment_control_count: records.filter(item => item.group === 'control').length, unused_static_core_count: population.length - eligible.length, unused_odd_shell_count: oddUnused.length }, unused: { static_core: population.filter(item => item.baseline_architecture === 'STATIC_CORE').map(item => item.slug).sort(), odd_shell: oddUnused.map(item => item.slug) }, baseline, entries: records };
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ counts: manifest.counts, treatment: records.filter(item => item.group === 'treatment').map(item => item.slug), control: records.filter(item => item.group === 'control').map(item => item.slug), unused: manifest.unused }, null, 2));
