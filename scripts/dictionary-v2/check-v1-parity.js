'use strict';
// SEO-R6A: compares every Dictionary V2 record with the CURRENT live V1 HTML page.
// Read-only: it never writes to word/*.html.
//
// Usage: node scripts/dictionary-v2/check-v1-parity.js [--json <report-path>]
// Exit 1 if any record fails parity. Known V1 contamination (declared in the record) is reported, not failed.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

function checkParity(record, html, cleanupEntry = null) {
    const differences = [];
    const flags = [];
    const page = lib.extractV1Page(html);
    for (const problem of page.problems) differences.push({ field: 'page_structure', detail: problem });
    // SEO-R6C: an enriched record may place the V1 sense after other senses; parity is always checked against the v1_primary sense.
    const v1Senses = record.senses.filter((s) => s.v1_primary === true);
    if (v1Senses.length !== 1) return { slug: record.slug, status: 'FAIL', differences: [{ field: 'v1_primary', detail: 'expected exactly one v1_primary sense, found ' + v1Senses.length }], flags };
    const sense = v1Senses[0];
    // A deliberately revised V1 learner field (v1_revision) is compared by its preserved V1 original, never by the new text.
    const v1Text = sense.v1_revision ? sense.v1_revision.v1_original : {};
    const compare = (field, pageValue, recordValue) => {
        if (pageValue !== recordValue) differences.push({ field, page: pageValue, record: recordValue });
    };
    compare('h1', page.h1, record.headword + ' meaning in Bangla');
    compare('part_of_speech', page.part_of_speech, sense.pos);
    compare('bangla_meaning', page.bangla_meaning, v1Text.bangla_meaning !== undefined ? v1Text.bangla_meaning : sense.bangla_meaning.display);
    // SEO-R6B: a cleaned record (v1_original) is in one of two honest states. The live page still shows the audited
    // contaminated definition (PASS_PENDING_CLEANUP) or has been cleaned to exactly the record's definition (PASS_CLEANED).
    const original = sense.definition.v1_original;
    let cleanupState = null;
    if (original) {
        if (page.definition === original.text) cleanupState = 'PENDING';
        else if (page.definition === sense.definition.text) cleanupState = 'CLEANED';
        else differences.push({ field: 'definition', page: page.definition, record: sense.definition.text, detail: 'page definition is neither the audited V1 text nor the cleaned definition' });
    } else compare('definition', page.definition, sense.definition.text);
    compare('bangla_explanation', page.bangla_explanation, v1Text.bangla_explanation !== undefined ? v1Text.bangla_explanation : sense.bangla_explanation.text);
    compare('example_en', page.example_en, v1Text.example_en !== undefined ? v1Text.example_en : sense.examples[0].en);
    compare('example_bn', page.example_bn, v1Text.example_bn !== undefined ? v1Text.example_bn : sense.examples[0].bn);
    const sourceText = page.source_line_text || '';
    for (const needle of [record.attribution.definition_source, record.attribution.license, record.attribution.editorial_statement]) {
        if (!sourceText.includes(needle)) differences.push({ field: 'attribution_text', detail: 'source line lacks "' + needle + '"' });
    }
    for (const href of [record.attribution.source_url, record.attribution.license_url]) {
        if (!page.source_line_hrefs.includes(href)) differences.push({ field: 'attribution_link', detail: 'source line lacks link ' + href });
    }
    const pageHash = lib.sha256Lf(Buffer.from(html, 'utf8'));
    const expectedHash = cleanupState === 'CLEANED' ? (cleanupEntry && cleanupEntry.page.sha256_lf_after_expected) : record.provenance.v1_migration.source_page_sha256_lf;
    if (pageHash !== expectedHash) differences.push({ field: 'page_sha256_lf', page: pageHash, record: expectedHash || null, detail: cleanupState === 'CLEANED' ? 'cleaned page differs from the manifest AFTER hash' : 'page changed since migration' });
    if (cleanupState === 'PENDING') flags.push('PENDING_CLEANUP:' + original.contamination.map((c) => c.kind).join(','));
    else if (cleanupState === 'CLEANED') flags.push('CLEANED:' + original.contamination.map((c) => c.kind).join(','));
    else if (sense.definition.contamination) {
        flags.push(...sense.definition.contamination.map((c) => 'KNOWN_V1_CONTAMINATION:' + c.kind));
    } else if (sense.definition.oewn_definition !== sense.definition.text) {
        differences.push({ field: 'definition', detail: 'definition differs from OEWN definition but no contamination is declared' });
    }
    let status = 'PASS';
    if (differences.length) status = 'FAIL';
    else if (cleanupState === 'PENDING') status = 'PASS_PENDING_CLEANUP';
    else if (cleanupState === 'CLEANED') status = 'PASS_CLEANED';
    else if (flags.length) status = 'PASS_KNOWN_CONTAMINATION';
    return { slug: record.slug, status, differences, flags };
}

function runParity(root = lib.ROOT) {
    const cohort = lib.readJson(path.join(root, 'dictionary-v2', 'prototype-cohort.json'));
    const manifestPath = path.join(root, 'dictionary-v2', 'definition-cleanup-manifest.json');
    const entries = new Map(fs.existsSync(manifestPath) ? lib.readJson(manifestPath).entries.map((e) => [e.slug, e]) : []);
    const results = cohort.words.map((slug) => {
        const record = lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json'));
        const html = lib.readV1Page(slug, root); // the V1 page: the live page, or its baseline once SEO-R6E replaced it with a V2 page
        return checkParity(record, html, entries.get(slug) || null);
    });
    const count = (s) => results.filter((r) => r.status === s).length;
    return {
        report: 'ovidhan.dictionary-v2.v1-parity/1',
        records: results.length,
        pass: count('PASS'),
        pass_known_contamination: count('PASS_KNOWN_CONTAMINATION'),
        pass_pending_cleanup: count('PASS_PENDING_CLEANUP'),
        pass_cleaned: count('PASS_CLEANED'),
        fail: count('FAIL'),
        results
    };
}

function main() {
    const argv = process.argv.slice(2);
    let jsonPath = null;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--json') jsonPath = argv[++i];
        else throw new Error('Unknown argument: ' + argv[i]);
    }
    const report = runParity();
    for (const r of report.results) {
        console.log(r.status.padEnd(26) + r.slug.padEnd(14) + (r.flags.join(',') || '') + (r.differences.length ? ' DIFFS=' + JSON.stringify(r.differences) : ''));
    }
    console.log('PARITY: ' + report.pass + ' pass, ' + report.pass_known_contamination + ' pass with known V1 contamination, ' + report.pass_pending_cleanup + ' pass pending cleanup, ' + report.pass_cleaned + ' pass cleaned, ' + report.fail + ' fail, of ' + report.records);
    if (jsonPath) fs.writeFileSync(jsonPath, lib.canonicalJson(report), 'utf8');
    if (report.fail) process.exit(1);
}

module.exports = { checkParity, runParity };
if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
