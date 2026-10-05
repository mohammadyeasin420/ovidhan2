'use strict';
// SEO-R7E proof renderer. The R6D/R6E allowlists stay at 12.
// Renders exactly inspection, incredible, and interact with the R7E phrase "Bengali".
//
//   node scripts/dictionary-v2/r7e-p1.js
//
// Writes those three word/<slug>.html files from their records. Does not touch the registry,
// sitemaps, the 12-word cohort, or the records themselves.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');
const render = require('./render');

const SLUGS = Object.freeze(['inspection', 'incredible', 'interact']);
const PHRASE = 'Bengali';

function main() {
    const shell = render.loadShell();
    const cohort = [...SLUGS];
    for (const slug of SLUGS) {
        const recordPath = path.join(lib.ROOT, 'dictionary-v2', 'r7e-p1', slug + '.json');
        const record = lib.readJson(recordPath);
        if (record.slug !== slug) throw new Error(slug + ': record slug mismatch');
        const html = render.renderPage(record, { mode: 'production', shell, cohort, phrase: PHRASE });
        const problems = render.productionContractProblems(html, record, { phrase: PHRASE });
        if (problems.length) throw new Error(slug + ': ' + problems.join('; '));
        const pagePath = path.join(lib.ROOT, 'word', slug + '.html');
        const crlf = html.replace(/\n/g, '\r\n');
        fs.writeFileSync(pagePath, crlf, 'utf8');
        console.log(slug + ' wrote word/' + slug + '.html (' + crlf.length + ' bytes, CRLF)');
    }
}

if (require.main === module) {
    try { main(); } catch (error) { console.error('FAILED: ' + error.message); process.exit(1); }
}
