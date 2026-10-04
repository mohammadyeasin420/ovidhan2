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

const livePage = (slug) => fs.readFileSync(path.join(root, 'word', slug + '.html'), 'utf8');

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
    return ctx;
}

module.exports = { root, appliedManifest, proposedManifest, appliedEntries, livePage, beforePage, beforeContext };
