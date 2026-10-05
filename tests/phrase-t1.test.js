'use strict';
// Phrase T1 contract for the approved first production batch (ranks 1–6).
// Run: node tests/phrase-t1.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const lib = require('../scripts/phrase/lib');
const validate = require('../scripts/phrase/validate');
const { renderPhrasePage } = require('../scripts/phrase/render');
const build = require('../scripts/phrase/build-t1');
const check = require('../scripts/phrase/check-t1');

const root = lib.ROOT;
const EXPECTED = [
    'mind-it', 'as-your-wish', 'best-of-luck', 'where-are-you-from', 'my-pleasure',
    'excuse-me', 'what-are-you-doing', 'carry-on', 'how-are-you', 'who-are-you',
    'take-care', 'what-do-you-do', 'move-on', 'what-about-you', 'all-the-best',
    'same-to-you', 'how-are-you-doing', 'taken-for-granted', 'got-it', 'down-to-earth',
    'where-do-you-live', 'go-ahead', 'vice-versa', 'show-off', 'what-the-hell',
    'by-the-way', 'keep-it-up', 'what-do-you-mean', 'call-it-a-day', 'whats-up'
];
const APPROVED_BATCH = [
    'mind-it', 'as-your-wish', 'best-of-luck', 'where-are-you-from', 'my-pleasure', 'excuse-me'
];

function scenario(name, fn) {
    try { fn(); console.log('PASS', name); }
    catch (error) { console.error('FAIL', name); throw error; }
}

function gitLines(args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
        .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

scenario('frozen allowlist count, membership, and order are immutable', () => {
    const allowlist = lib.loadAllowlist(root);
    assert.deepEqual(validate.validateAllowlist(allowlist), []);
    assert.equal(allowlist.cohort, 'PHRASE-T1-30');
    assert.equal(allowlist.count, 30);
    assert.equal(allowlist.slugs.length, 30);
    assert.deepEqual([...allowlist.slugs], EXPECTED);
});

scenario('approved first batch has exactly six reviewed records', () => {
    assert.deepEqual(lib.listRecordSlugs(root), [...APPROVED_BATCH].sort());
});

scenario('each approved record validates and matches frozen rank', () => {
    const allowlist = lib.loadAllowlist(root);
    APPROVED_BATCH.forEach((slug, index) => {
        const record = lib.loadRecord(slug, root);
        assert.deepEqual(validate.validateRecord(record, { allowlist, root }), [], slug);
        assert.equal(record.rank, index + 1, slug);
        assert.equal(record.status, 'REVIEWED', slug);
        assert.equal(record.examples.length >= 3, true, slug);
        assert.equal(record.faq.length >= 3, true, slug);
        assert.ok(record.quick_answer.bangla_display.trim().length > 0, slug);
    });
});

scenario('renderer is deterministic for the approved batch and preserves contracts', () => {
    const allowlist = lib.loadAllowlist(root);
    const shell = lib.loadShell(root);
    const css = lib.loadCss(root);
    for (const slug of APPROVED_BATCH) {
        const record = lib.loadRecord(slug, root);
        const first = renderPhrasePage(record, { allowlist, shell, css });
        const second = renderPhrasePage(record, { allowlist, shell, css });
        assert.equal(first, second, slug);
        assert.equal((first.match(/<h1\b/g) || []).length, 1, slug);
        assert.ok(first.includes('<link rel="canonical" href="https://ovidhan.net/phrase/' + slug + '.html">'), slug);
        assert.ok(first.includes('<title>' + lib.esc(record.seo.title) + '</title>'), slug);
        assert.ok(first.includes('content="' + lib.esc(record.seo.meta_description) + '"'), slug);
        assert.ok(first.includes(record.quick_answer.bangla_display), slug);
        assert.equal(first.includes('noindex'), false, slug);
        assert.equal(/DefinedTerm|Open English WordNet|FAQPage|AggregateRating|"Review"/.test(first), false, slug);
        const blocks = [...first.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
        assert.equal(blocks.length, 2, slug);
        assert.equal(blocks[0]['@type'], 'BreadcrumbList', slug);
        assert.equal(blocks[1]['@type'], 'LearningResource', slug);
        assert.deepEqual(validate.validateRenderedHtml(first, record), [], slug);
    }
});

scenario('related phrase hrefs are limited to the reviewed release set', () => {
    const allowlist = lib.loadAllowlist(root);
    const released = lib.releasedSlugs(root, allowlist);
    assert.deepEqual([...released].sort(), [...APPROVED_BATCH].sort());

    const best = lib.loadRecord('best-of-luck', root);
    assert.equal(best.related_phrases.some((item) => item.slug === 'all-the-best'), true);
    const where = lib.loadRecord('where-are-you-from', root);
    assert.equal(where.related_phrases.some((item) => item.slug === 'where-do-you-live'), true);

    const shell = lib.loadShell(root);
    const css = lib.loadCss(root);
    const bestHtml = renderPhrasePage(best, { allowlist, shell, css, released });
    const whereHtml = renderPhrasePage(where, { allowlist, shell, css, released });
    assert.equal(bestHtml.includes('href="/phrase/all-the-best.html"'), false);
    assert.equal(whereHtml.includes('href="/phrase/where-do-you-live.html"'), false);
    assert.ok(bestHtml.includes('<span>all the best</span>'));
    assert.ok(whereHtml.includes('<span>where do you live</span>'));

    const linked = renderPhrasePage(best, {
        allowlist,
        shell,
        css,
        released: [...released, 'all-the-best']
    });
    assert.ok(linked.includes('href="/phrase/all-the-best.html"'));
    assert.equal(linked.includes('<span>all the best</span>'), false);

    const bad = validate.validateRecord({
        ...best,
        related_phrases: [{ slug: 'not-in-t1', label: 'nope', note: 'bad' }]
    }, { allowlist, root });
    assert.ok(bad.some((msg) => /related phrase must be in frozen T1/.test(msg)));
});

scenario('approved pages exist under phrase/ and check passes without touching word/', () => {
    const beforeWord = gitLines(['status', '--porcelain', '--', 'word']);
    for (const slug of APPROVED_BATCH) {
        assert.equal(fs.existsSync(path.join(root, 'phrase', slug + '.html')), true, slug);
        assert.equal(check.checkSlug(slug, root).endsWith(slug + '.html'), true, slug);
        const html = fs.readFileSync(path.join(root, 'phrase', slug + '.html'), 'utf8');
        assert.ok(html.includes('id="phrase-entry-styles"'), slug);
        assert.ok(html.includes('class="phrase-entry"'), slug);
        assert.equal(html.includes('dictionary-v2-entry-styles'), false, slug);
        assert.equal(html.includes('learning-explorer.js'), false, slug);
        const phraseHrefs = [...html.matchAll(/\bhref=["'](\/phrase\/[^"']+)["']/gi)].map((match) => match[1]);
        for (const href of phraseHrefs) {
            const target = href.match(/^\/phrase\/([a-z0-9-]+)\.html$/)[1];
            assert.ok(APPROVED_BATCH.includes(target), slug + ' -> ' + href);
            assert.equal(fs.existsSync(path.join(root, 'phrase', target + '.html')), true, href);
        }
    }
    const afterWord = gitLines(['status', '--porcelain', '--', 'word']);
    assert.deepEqual(afterWord, beforeWord);
    assert.equal(gitLines(['diff', '--name-only', 'HEAD', '--', 'word']).length, 0);
    const htmlFiles = fs.readdirSync(path.join(root, 'phrase')).filter((name) => name.endsWith('.html')).sort();
    assert.deepEqual(htmlFiles, APPROVED_BATCH.map((slug) => slug + '.html').sort());
});

scenario('unknown slug, path escape, and full T1 build all fail closed', () => {
    assert.throws(() => build.build({ slug: 'not-a-phrase', root }), /allowlisted|unknown/i);
    assert.throws(() => build.build({ slug: '../outside-path', root }), /unsafe slug|allowlisted|unknown/i);
    assert.throws(() => lib.assertOutputPath(path.join(root, 'word', 'mind.html'), root), /word|escapes|phrase/i);
    assert.throws(() => build.build({ all: true, root }), /missing reviewed records for 24/);
    assert.equal(lib.listRecordSlugs(root).length, 6);
});

console.log('All Phrase T1 first-batch checks passed.');
