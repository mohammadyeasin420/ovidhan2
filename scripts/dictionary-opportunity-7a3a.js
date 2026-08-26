#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const START_SHA = '6e173161f831e9a5de387fc0a6b05044186a8657';
const summaryPath = path.join(root, 'reports', 'dictionary-opportunity-7a3a-summary.json');
const reportPath = path.join(root, 'reports', 'dictionary-opportunity-7a3a.md');
const text = value => typeof value === 'string' && value.trim() !== '';
const list = value => Array.isArray(value) && value.some(text);
const object = value => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).some(key => text(value[key]) || Array.isArray(value[key]) && value[key].length);
const pct = (count, total) => Number((100 * count / total).toFixed(2));
const canonicalUrl = slug => `https://ovidhan.net/word/${encodeURIComponent(slug).replace(/%2F/gi, '/')}.html`;
const normalizeKey = value => String(value || '').normalize('NFC').trim().toLocaleLowerCase('en-US');
const gitFiles = directory => execFileSync('git', ['ls-files', '-z', '--', directory], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean);
const samples = (items, predicate, limit = 5) => items.filter(predicate).slice(0, limit).map(item => item.slug);

function normalizeJoinUrl(input) {
  const decoded = decodeURI(String(input).trim()).normalize('NFC');
  const url = new URL(decoded);
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/{2,}/g, '/');
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
  return url.toString();
}

function fieldState(entry) {
  const singularExample = text(entry?.example);
  const pluralExamples = list(entry?.examples);
  const exampleValues = [singularExample ? entry.example.trim() : '', ...(Array.isArray(entry?.examples) ? entry.examples.filter(text).map(x => x.trim()) : [])].filter(Boolean);
  const generic = exampleValues.length > 0 && exampleValues.every(value => /^(I know the word ['\"]|Learning ['\"].+['\"] helps your vocabulary\.|['\"].+['\"] is common in English\.|Can you use ['\"].+['\"] in a sentence\?|This is an? .+\.)$/i.test(value));
  return {
    english: text(entry?.english), bangla: text(entry?.bangla), definition: text(entry?.definition),
    part_of_speech: text(entry?.part_of_speech) && entry.part_of_speech.trim().toLowerCase() !== 'unknown',
    example: singularExample, examples: pluralExamples, usable_example: exampleValues.length > 0 && !generic,
    synonyms: list(entry?.synonyms), antonyms: list(entry?.antonyms), pronunciation: text(entry?.pronunciation),
    collocations: list(entry?.collocations), verb_forms: object(entry?.verb_forms), story: text(entry?.story),
    word_family: list(entry?.word_family), bcs_importance: text(entry?.bcs_importance), ielts_importance: text(entry?.ielts_importance),
    common_mistake: text(entry?.common_mistake) || list(entry?.common_mistakes)
  };
}

function main() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'enriched-dictionary.json'), 'utf8'));
  const pilot = JSON.parse(fs.readFileSync(path.join(root, 'data', 'seo-word-pilot-7a1.json'), 'utf8'));
  const architectureEvidence = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'seo-word-pilot-7a1-baseline-architecture.json'), 'utf8'));
  const editorialAudit = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'seo-word-pilot-7a1-editorial-review.json'), 'utf8'));
  const approved = new Set(pilot.approved_population.map(normalizeKey));
  const rejected = new Set(editorialAudit.entries.map(x => normalizeKey(x.slug)).filter(x => !approved.has(x)));
  const treatment = new Set(pilot.entries.filter(x => x.group === 'treatment').map(x => normalizeKey(x.slug)));
  const control = new Set(pilot.entries.filter(x => x.group === 'control').map(x => normalizeKey(x.slug)));
  const staticCore = new Set(architectureEvidence.entries.filter(x => x.baseline_architecture === 'STATIC_CORE').map(x => normalizeKey(x.slug)));
  if (approved.size !== 48 || rejected.size !== 29 || treatment.size !== 21 || control.size !== 21 || staticCore.size !== 5) throw new Error('Frozen Phase 7A1 evidence counts changed');

  const dictionaryByWord = new Map();
  dictionary.forEach((entry, index) => {
    const key = normalizeKey(entry.english || entry.word || entry.en);
    if (key && !dictionaryByWord.has(key)) dictionaryByWord.set(key, { entry, index });
  });
  // The tracked corpus deliberately includes word/.html; retain it as an empty-slug anomaly.
  const pagePaths = gitFiles('word').filter(file => /^word\/.*\.html$/u.test(file));
  const sitemapFiles = gitFiles('.').filter(file => /^sitemap(?:-index|-part-\d+)?\.xml$/i.test(file));
  const sitemapText = sitemapFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const sitemapUrls = new Set([...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => normalizeJoinUrl(match[1])));
  const rows = [];
  const canonicalTargets = new Map();

  for (const file of pagePaths) {
    const slug = file.slice(5, -5).normalize('NFC');
    const key = normalizeKey(slug);
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const found = dictionaryByWord.get(key);
    const fields = fieldState(found?.entry);
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    let canonical = null;
    try { canonical = canonicalMatch ? normalizeJoinUrl(canonicalMatch[1]) : null; } catch { canonical = null; }
    if (canonical) canonicalTargets.set(canonical, (canonicalTargets.get(canonical) || 0) + 1);
    const hasExplorer = /learning-explorer\.js/i.test(html);
    const hasStaticAnswer = /id=["']staticWordContent["']/i.test(html);
    let architecture = 'UNKNOWN_REQUIRES_REVIEW';
    if (staticCore.has(key)) architecture = 'STATIC_CORE';
    else if (treatment.has(key)) architecture = '7A1_TREATMENT_STATIC';
    else if (control.has(key)) architecture = '7A1_CONTROL_JS_SHELL';
    else if (hasStaticAnswer) architecture = 'OTHER_STATIC';
    else if (hasExplorer) architecture = 'OTHER_JS_SHELL';
    const definedTerm = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]).find(x => /"@type"\s*:\s*"DefinedTerm"/i.test(x));
    const emptyDefinedTerm = Boolean(definedTerm && /"description"\s*:\s*"\s*"/i.test(definedTerm));
    const flags = [];
    if (slug.length <= 2) flags.push('slug_length_le_2');
    if (slug.length === 0) flags.push('empty_slug');
    if (/\d/.test(slug)) flags.push('contains_digits');
    if (/[^\x00-\x7F]/.test(slug)) flags.push('non_ascii_slug');
    if (slug.length >= 30) flags.push('unusually_long_slug_ge_30');
    if (!found) flags.push('dictionary_record_missing');
    if (found && !fields.english) flags.push('suspicious_empty_headword');
    if (found && !fields.bangla) flags.push('missing_bangla');
    if (found && !fields.definition) flags.push('missing_definition');
    if (found && !fields.part_of_speech) flags.push('missing_pos');
    if (emptyDefinedTerm) flags.push('empty_definedterm_description');
    if (architecture.endsWith('JS_SHELL')) flags.push('generic_js_shell');
    const expected = normalizeJoinUrl(canonicalUrl(slug));
    if (!sitemapUrls.has(expected)) flags.push('page_not_in_sitemap');
    if (!canonical) flags.push('canonical_missing_or_invalid');
    if (/\$\{|\{\{|%7B%7B|%24%7B/i.test(file + ' ' + (canonicalMatch?.[1] || ''))) flags.push('literal_template_url_pattern');
    rows.push({ slug, key, file, dictionary_index: found?.index ?? null, fields, architecture, editorial_status: approved.has(key) ? 'approved' : rejected.has(key) ? 'rejected' : 'unreviewed', canonical, expected_url: expected, in_sitemap: sitemapUrls.has(expected), flags });
  }
  for (const row of rows) if (row.canonical && canonicalTargets.get(row.canonical) > 1) row.flags.push('duplicate_canonical_target');

  const pagesByExpectedUrl = new Set(rows.map(row => row.expected_url));
  const sitemapWordUrls = [...sitemapUrls].filter(url => new URL(url).pathname.startsWith('/word/') && new URL(url).pathname.endsWith('.html'));
  const sitemapWithoutPage = sitemapWordUrls.filter(url => !pagesByExpectedUrl.has(url));
  const pageKeys = new Set(rows.map(row => row.key));
  const dictionaryWithoutPage = [...dictionaryByWord.keys()].filter(key => !pageKeys.has(key));
  const dictionaryRecordsWithoutPage = dictionary.filter(entry => !pageKeys.has(normalizeKey(entry.english || entry.word || entry.en))).length;
  const countRows = predicate => rows.filter(predicate).length;
  const coverage = {};
  for (const field of Object.keys(fieldState({}))) {
    const count = countRows(row => row.fields[field]);
    coverage[field] = { count, percentage_of_pages: pct(count, rows.length), percentage_of_matches: pct(count, countRows(row => row.dictionary_index !== null)) };
  }
  const architectures = Object.fromEntries(['STATIC_CORE', '7A1_TREATMENT_STATIC', '7A1_CONTROL_JS_SHELL', 'OTHER_JS_SHELL', 'OTHER_STATIC', 'UNKNOWN_REQUIRES_REVIEW'].map(name => [name, countRows(row => row.architecture === name)]));
  const editorial = Object.fromEntries(['approved', 'rejected', 'unreviewed'].map(name => [name, countRows(row => row.editorial_status === name)]));
  const flagNames = ['slug_length_le_2', 'empty_slug', 'contains_digits', 'non_ascii_slug', 'unusually_long_slug_ge_30', 'suspicious_empty_headword', 'dictionary_record_missing', 'missing_bangla', 'missing_definition', 'missing_pos', 'empty_definedterm_description', 'generic_js_shell', 'page_not_in_sitemap', 'canonical_missing_or_invalid', 'duplicate_canonical_target', 'literal_template_url_pattern'];
  const structuralFlags = Object.fromEntries(flagNames.map(flag => [flag, countRows(row => row.flags.includes(flag))]));
  structuralFlags.sitemap_entry_without_page = sitemapWithoutPage.length;
  const intersections = {
    bangla_and_definition: countRows(row => row.fields.bangla && row.fields.definition),
    bangla_definition_and_pos: countRows(row => row.fields.bangla && row.fields.definition && row.fields.part_of_speech),
    bangla_definition_pos_and_usable_example: countRows(row => row.fields.bangla && row.fields.definition && row.fields.part_of_speech && row.fields.usable_example)
  };
  const result = {
    schema: 'ovidhan-dictionary-opportunity-7a3a-summary-v1', generated_at: new Date().toISOString(), starting_sha: START_SHA, analyzed_head: head,
    scope: { diagnostic_only: true, gsc_values_imported: false, final_tiers_assigned: false },
    inventory: { tracked_word_pages: rows.length, unicode_named_word_pages: countRows(row => /[^\x00-\x7F]/.test(row.slug)), dictionary_records: dictionary.length, unique_dictionary_headwords: dictionaryByWord.size, duplicate_dictionary_records: dictionary.length - dictionaryByWord.size, page_dictionary_matches: countRows(row => row.dictionary_index !== null), page_without_dictionary_record: countRows(row => row.dictionary_index === null), dictionary_records_without_page: dictionaryRecordsWithoutPage, dictionary_record_without_page: dictionaryWithoutPage.length, unique_dictionary_headword_without_page: dictionaryWithoutPage.length, sitemap_word_urls: sitemapWordUrls.length, pages_in_sitemap: countRows(row => row.in_sitemap), sitemap_entry_without_page: sitemapWithoutPage.length },
    coverage, intersections, architecture: architectures, editorial_status: editorial, structural_flags: structuralFlags,
    samples: {
      high_data_quality: samples(rows, r => r.fields.bangla && r.fields.definition && r.fields.part_of_speech && r.fields.usable_example && r.fields.synonyms && r.fields.antonyms),
      missing_data: samples(rows, r => !r.dictionary_index || !r.fields.bangla || !r.fields.definition || !r.fields.part_of_speech),
      static_core: samples(rows, r => r.architecture === 'STATIC_CORE'), treatment_7a1: samples(rows, r => r.architecture === '7A1_TREATMENT_STATIC'), control_7a1: samples(rows, r => r.architecture === '7A1_CONTROL_JS_SHELL'),
      approved: samples(rows, r => r.editorial_status === 'approved'), rejected: samples(rows, r => r.editorial_status === 'rejected'), suspicious_slugs: samples(rows, r => r.flags.some(f => ['slug_length_le_2','contains_digits','non_ascii_slug','unusually_long_slug_ge_30','literal_template_url_pattern'].includes(f))),
      page_without_dictionary: samples(rows, r => r.dictionary_index === null), dictionary_without_page: dictionaryWithoutPage.slice(0, 5), sitemap_without_page: sitemapWithoutPage.slice(0, 5)
    },
    gsc_join_contract: { key: 'normalized canonical URL', fields: ['url','clicks','impressions','ctr','position','coverage_issue'], missing_row_state: 'UNKNOWN (never synthetic zero)', normalization: ['trim and parse URL','decode percent-encoding and normalize Unicode to NFC','force https','lowercase host and map www.ovidhan.net to ovidhan.net','remove query and fragment','collapse duplicate slashes','remove trailing slash except root','preserve .html','reject invalid/non-URL input'] },
    opportunity_model: { state_domain: ['KNOWN_POSITIVE','KNOWN_NEGATIVE','UNKNOWN'], families: { search_demand: ['gsc_clicks','gsc_impressions','gsc_ctr','gsc_average_position','indexation_coverage'], data_quality: ['bangla','definition','part_of_speech','usable_lexical_data','editorial_status'], learner_value: ['general_english','bcs','ielts','workplace_job','speaking_real_life'], page_readiness: ['static_answer','architecture','canonical','sitemap','indexability'], risk: ['structural_anomalies','missing_data','editorial_rejection'] }, rule: 'Score only known evidence. Unknown is excluded from both numerator and denominator; it is never converted to zero. Preserve raw evidence and family confidence alongside any future score.' },
    tier_intent: { TIER_A: 'High strategic opportunity; planning range 2,000-5,000.', TIER_B: 'Valid useful secondary priority; planning range 10,000-20,000.', TIER_C: 'Long-tail, weak, questionable, or low-evidence inventory; never an automatic delete/noindex decision.' }
  };
  fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(reportPath, renderReport(result) + '\n');
  console.log(JSON.stringify({ status: 'PASS', report: path.relative(root, reportPath), summary: path.relative(root, summaryPath), inventory: result.inventory, architecture: result.architecture, editorial_status: result.editorial_status }, null, 2));
}

function renderReport(r) {
  const cov = Object.entries(r.coverage).map(([name, value]) => `| ${name} | ${value.count.toLocaleString('en-US')} | ${value.percentage_of_pages.toFixed(2)}% |`).join('\n');
  const arch = Object.entries(r.architecture).map(([name, count]) => `| ${name} | ${count.toLocaleString('en-US')} |`).join('\n');
  const flags = Object.entries(r.structural_flags).map(([name, count]) => `| ${name} | ${count.toLocaleString('en-US')} |`).join('\n');
  const sampleLines = Object.entries(r.samples).map(([name, values]) => `- ${name}: ${values.length ? values.map(x => `\`${x}\``).join(', ') : 'none detected'}`).join('\n');
  return `# Phase 7A3A Dictionary Opportunity Inventory\n\nGenerated deterministically from Git-tracked repository evidence. This is diagnostic only: no GSC values were fabricated, no final opportunity tiers were assigned, and every risk signal is a review flag rather than an indexing or deletion recommendation.\n\n## Baseline and inventory\n\n- Required starting main: \`${r.starting_sha}\`\n- Analyzed HEAD at generation: \`${r.analyzed_head}\`\n- Tracked word pages: **${r.inventory.tracked_word_pages.toLocaleString('en-US')}**\n- Unicode-named pages: **${r.inventory.unicode_named_word_pages.toLocaleString('en-US')}**\n- Dictionary records: **${r.inventory.dictionary_records.toLocaleString('en-US')}** (${r.inventory.unique_dictionary_headwords.toLocaleString('en-US')} unique normalized headwords)\n- Page/dictionary matches: **${r.inventory.page_dictionary_matches.toLocaleString('en-US')}**\n- Pages without dictionary record: **${r.inventory.page_without_dictionary_record.toLocaleString('en-US')}**\n- Unique dictionary headwords without page: **${r.inventory.dictionary_record_without_page.toLocaleString('en-US')}**\n- Pages in sitemap: **${r.inventory.pages_in_sitemap.toLocaleString('en-US')}**; sitemap word URLs: **${r.inventory.sitemap_word_urls.toLocaleString('en-US')}**; sitemap entries without tracked page: **${r.inventory.sitemap_entry_without_page.toLocaleString('en-US')}**\n\n## Dictionary data coverage\n\nPercentages use all tracked word pages as denominator. POS value \`unknown\` is treated as missing. Singular \`example\` and plural \`examples\` are counted separately. \`usable_example\` excludes only explicitly detected repository-wide generic templates; it is not a claim of editorial trust.\n\n| Field | Count | Pages |\n|---|---:|---:|\n${cov}\n\nIntersections: Bangla + definition **${r.intersections.bangla_and_definition.toLocaleString('en-US')}**; + POS **${r.intersections.bangla_definition_and_pos.toLocaleString('en-US')}**; + machine-usable example **${r.intersections.bangla_definition_pos_and_usable_example.toLocaleString('en-US')}**.\n\n## Page architecture\n\n| Class | Count |\n|---|---:|\n${arch}\n\nThe frozen 7A1 manifest is authoritative for treatment/control. \`STATIC_CORE\` uses its frozen baseline evidence. Outside that cohort, \`OTHER_STATIC\` requires the explicit static-answer marker; \`OTHER_JS_SHELL\` requires the Learning Explorer script.\n\n## Editorial evidence\n\n- Approved: **${r.editorial_status.approved}**\n- Rejected: **${r.editorial_status.rejected}**\n- Unreviewed: **${r.editorial_status.unreviewed.toLocaleString('en-US')}**\n\nThese are the existing 7A1 judgments (48 approved and the other 29 audited candidates rejected), preserved without semantic reinterpretation.\n\n## Structural risk flags\n\n| Flag | Count |\n|---|---:|\n${flags}\n\nFlags may overlap. They are evidence for review, not automatic noindex/deletion rules.\n\n## Representative samples\n\n${sampleLines}\n\n## Future opportunity model\n\nEvery input has one of three states: **KNOWN_POSITIVE**, **KNOWN_NEGATIVE**, or **UNKNOWN**. Families are search demand (GSC clicks, impressions, CTR, position, coverage), data quality, learner value, page readiness, and risk. A future score must operate only on known evidence, preserve raw inputs and family confidence, and exclude unknown evidence from both numerator and denominator. Missing external evidence must never become zero.\n\nIntended planning tiers are: Tier A high strategic opportunity (roughly 2,000-5,000); Tier B useful secondary pages (roughly 10,000-20,000); Tier C long-tail/weak/questionable/low-evidence. Tier C never implies automatic deletion or noindex. Demand, rankings, backlinks, or learner usefulness protect a URL from destructive action pending review.\n\n## GSC canonical-URL join contract\n\nImporter fields: \`url\`, \`clicks\`, \`impressions\`, \`ctr\`, \`position\`, \`coverage_issue\`. Join on normalized canonical URL: trim/parse; URL-decode; normalize Unicode NFC; force HTTPS; lowercase host; map www to apex; remove query/fragment; collapse duplicate slashes; remove trailing slash except root; preserve \`.html\`. Invalid URLs are rejected. A missing GSC row remains **UNKNOWN**, never a fabricated zero.\n\n## Major findings and 7A3B\n\nThe inventory separates a large product corpus from page readiness and demand evidence. 7A3B should import a dated GSC export under the documented join contract, measure join failures explicitly, add reviewed learner-value sources, and produce provisional scores with coverage/confidence. It should protect URLs with positive demand or other known value and route anomalies and editorial rejections to human review before any indexability decision.\n\n## Reproduction\n\nRun \`node scripts/dictionary-opportunity-7a3a.js\`. The script validates frozen 7A1 evidence counts before analysis and writes only this report and its compact JSON summary; it does not retain a 49,628-row artifact.\n`;
}

main();
