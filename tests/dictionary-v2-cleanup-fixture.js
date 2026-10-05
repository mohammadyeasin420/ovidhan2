'use strict';
// SEO-R6B.3: shared test fixture for the definition-cleanup tests.
//
// The real repository is now in the POST-APPLICATION state (275 pages cleaned, manifest APPLIED). Tests that need the
// PRE-APPLICATION input must not depend on live production pages, so this module reconstructs the BEFORE pages:
//   BEFORE page = AFTER page with the two replacements swapped back (cleanup.reverseCleanup),
// and each reconstruction is accepted only if its hash equals the audited BEFORE hash recorded in the manifest.
// Nothing here writes to disk.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('../scripts/dictionary-v2/lib');
const cleanup = require('../scripts/dictionary-v2/definition-cleanup');

const root = lib.ROOT;
const appliedManifest = cleanup.loadManifest();
const proposedManifest = cleanup.asProposed(appliedManifest);
const appliedEntries = new Map(appliedManifest.entries.map((e) => [e.slug, e]));
const cache = new Map();

const livePage = (slug) => lib.readV1Page(slug); // the live V1 page, or its baseline once SEO-R6E replaced it with a V2 page

// The page as it was before the cleanup (clean/frozen pages are returned unchanged).
function beforePage(slug) {
    if (cache.has(slug)) return cache.get(slug);
    const entry = appliedEntries.get(slug);
    let html = livePage(slug);
    if (entry) {
        const reversed = cleanup.reverseCleanup(html, entry);
        if (reversed.errors.length) throw new Error('cannot reconstruct the BEFORE page of "' + slug + '": ' + reversed.errors.join('; '));
        html = reversed.html;
    }
    cache.set(slug, html);
    return html;
}

// A cleanup context whose pages are in the BEFORE state.
function beforeContext() {
    const ctx = cleanup.makeContext();
    ctx.readPage = beforePage;
    // The manifest is the closed 2,326-page V1 audit. Do not validate it against later approvals.
    ctx.registry = cleanup.corpusRegistry(appliedManifest);
    return ctx;
}

// SEO-R6C enriched 8 cohort records (extra senses, V1 sense possibly not first). The cleanup logic is about the
// single-sense V1 form, so v1Form() reduces a record to exactly the V1_MIGRATION record it was migrated as.
function v1Form(record) {
    const out = JSON.parse(JSON.stringify(record));
    if (out.record_status !== 'EDITORIAL_ENRICHED') return out;
    const v1 = out.senses.find((s) => s.v1_primary === true);
    out.senses = [{ ...require('../scripts/dictionary-v2/r6c-enrich').restoreV1Learner(v1), sense_id: 's1' }];
    out.record_status = 'V1_MIGRATION';
    out.schema_version = v1.definition.v1_original ? '1.1.0' : '1.0.0';
    delete out.editorial_enrichment;
    delete out.usage_notes;
    return out;
}
const v1Record = (slug) => v1Form(lib.readJson(path.join(root, 'dictionary-v2', 'records', slug + '.json')));

module.exports = { root, appliedManifest, proposedManifest, appliedEntries, livePage, beforePage, beforeContext, v1Form, v1Record };
