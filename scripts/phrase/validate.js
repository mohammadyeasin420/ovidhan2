'use strict';

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./lib');

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function push(errors, ok, message) {
    if (!ok) errors.push(message);
}

function validateAllowlist(allowlist = lib.loadAllowlist()) {
    const errors = [];
    const expected = [
        'mind-it', 'as-your-wish', 'best-of-luck', 'where-are-you-from', 'my-pleasure',
        'excuse-me', 'what-are-you-doing', 'carry-on', 'how-are-you', 'who-are-you',
        'take-care', 'what-do-you-do', 'move-on', 'what-about-you', 'all-the-best',
        'same-to-you', 'how-are-you-doing', 'taken-for-granted', 'got-it', 'down-to-earth',
        'where-do-you-live', 'go-ahead', 'vice-versa', 'show-off', 'what-the-hell',
        'by-the-way', 'keep-it-up', 'what-do-you-mean', 'call-it-a-day', 'whats-up'
    ];
    push(errors, allowlist.cohort === lib.COHORT, 'allowlist cohort must be PHRASE-T1-30');
    push(errors, allowlist.count === 30, 'allowlist count must be 30');
    push(errors, allowlist.slugs.length === 30, 'allowlist must have 30 slugs');
    push(errors, JSON.stringify(allowlist.slugs) === JSON.stringify(expected), 'allowlist order/membership drifted');
    return errors;
}

function validateRichParagraph(label, item, errors) {
    push(errors, item && typeof item === 'object', label + ' must be an object');
    if (!item || typeof item !== 'object') return;
    push(errors, isNonEmptyString(item.text), label + ' text is required');
    for (const key of ['bold', 'italic', 'bn_spans']) {
        if (item[key] == null) continue;
        push(errors, Array.isArray(item[key]), label + '.' + key + ' must be an array');
        if (Array.isArray(item[key])) {
            for (const value of item[key]) {
                push(errors, isNonEmptyString(value), label + '.' + key + ' has an empty value');
                push(errors, item.text.includes(value), label + ' missing emphasis target: ' + value);
            }
        }
    }
}

function validateRecord(record, { allowlist = lib.loadAllowlist(), root = lib.ROOT } = {}) {
    const errors = [];
    push(errors, record && typeof record === 'object', 'record must be an object');
    if (!record || typeof record !== 'object') return errors;

    push(errors, record.schema_version === '1.0.0', 'schema_version must be 1.0.0');
    push(errors, record.cohort === lib.COHORT, 'cohort must be PHRASE-T1-30');
    push(errors, record.status === 'REVIEWED', 'status must be REVIEWED');
    push(errors, isNonEmptyString(record.slug) && lib.SLUG_RE.test(record.slug), 'slug is invalid');
    push(errors, allowlist.slugs.includes(record.slug), 'slug is not in the frozen T1 allowlist');
    const expectedRank = allowlist.indexOf(record.slug) + 1;
    push(errors, record.rank === expectedRank, 'rank must match frozen allowlist order (' + expectedRank + ')');
    push(errors, isNonEmptyString(record.phrase), 'phrase is required');
    push(errors, isNonEmptyString(record.phrase_display), 'phrase_display is required');

    const seo = record.seo || {};
    push(errors, isNonEmptyString(seo.title), 'seo.title is required');
    push(errors, isNonEmptyString(seo.meta_description), 'seo.meta_description is required');
    push(errors, isNonEmptyString(seo.h1), 'seo.h1 is required');
    push(errors, isNonEmptyString(seo.learning_resource_description), 'seo.learning_resource_description is required');

    const quick = record.quick_answer || {};
    push(errors, Array.isArray(quick.bangla_meanings) && quick.bangla_meanings.length > 0, 'quick_answer.bangla_meanings required');
    push(errors, isNonEmptyString(quick.bangla_display), 'quick_answer.bangla_display required');
    push(errors, isNonEmptyString(quick.context_note_bn), 'quick_answer.context_note_bn required');
    if (Array.isArray(quick.bangla_meanings)) {
        for (const meaning of quick.bangla_meanings) push(errors, isNonEmptyString(meaning), 'empty Bangla meaning');
    }

    push(errors, record.overview && Array.isArray(record.overview.paragraphs) && record.overview.paragraphs.length > 0, 'overview paragraphs required');
    if (record.overview && Array.isArray(record.overview.paragraphs)) {
        record.overview.paragraphs.forEach((paragraph, index) => validateRichParagraph('overview[' + index + ']', paragraph, errors));
    }

    if (record.contexts != null) {
        push(errors, Array.isArray(record.contexts), 'contexts must be an array');
        if (Array.isArray(record.contexts)) {
            const bangla = new Set();
            record.contexts.forEach((context, index) => {
                const label = 'contexts[' + index + ']';
                push(errors, context && typeof context === 'object', label + ' must be an object');
                if (!context) return;
                push(errors, isNonEmptyString(context.id), label + '.id required');
                push(errors, isNonEmptyString(context.title_en), label + '.title_en required');
                push(errors, isNonEmptyString(context.bangla), label + '.bangla required');
                push(errors, Array.isArray(context.natural_alternatives) && context.natural_alternatives.length > 0, label + '.natural_alternatives required');
                push(errors, context.example && isNonEmptyString(context.example.en) && isNonEmptyString(context.example.bn), label + '.example required');
                if (context.bangla) {
                    push(errors, !bangla.has(context.bangla), label + ' duplicate Bangla meaning');
                    bangla.add(context.bangla);
                }
            });
        }
    }

    push(errors, isNonEmptyString(record.alternatives_intro), 'alternatives_intro required');
    push(errors, Array.isArray(record.alternatives) && record.alternatives.length > 0, 'alternatives required');
    if (Array.isArray(record.alternatives)) {
        for (const [index, item] of record.alternatives.entries()) {
            push(errors, isNonEmptyString(item.en), 'alternatives[' + index + '].en required');
            push(errors, isNonEmptyString(item.use_when_en), 'alternatives[' + index + '].use_when_en required');
        }
    }

    push(errors, Array.isArray(record.examples) && record.examples.length >= 3, 'at least 3 standalone examples required');
    if (Array.isArray(record.examples)) {
        const seenEn = new Set();
        const seenBn = new Set();
        record.examples.forEach((example, index) => {
            push(errors, isNonEmptyString(example.en), 'examples[' + index + '].en required');
            push(errors, isNonEmptyString(example.bn), 'examples[' + index + '].bn required');
            const en = lib.normalizeText(example.en);
            const bn = lib.normalizeText(example.bn);
            push(errors, !seenEn.has(en), 'duplicate example.en');
            push(errors, !seenBn.has(bn), 'duplicate example.bn');
            seenEn.add(en);
            seenBn.add(bn);
        });
    }

    push(errors, record.usage_when && Array.isArray(record.usage_when.paragraphs) && record.usage_when.paragraphs.length > 0, 'usage_when required');
    if (record.usage_when && Array.isArray(record.usage_when.paragraphs)) {
        record.usage_when.paragraphs.forEach((paragraph, index) => validateRichParagraph('usage_when[' + index + ']', paragraph, errors));
    }

    push(errors, record.usage_prefer_other && Array.isArray(record.usage_prefer_other.bullets) && record.usage_prefer_other.bullets.length > 0, 'usage_prefer_other required');
    if (record.usage_prefer_other && Array.isArray(record.usage_prefer_other.bullets)) {
        record.usage_prefer_other.bullets.forEach((bullet, index) => validateRichParagraph('usage_prefer_other[' + index + ']', bullet, errors));
    }

    push(errors, record.learner_warning && Array.isArray(record.learner_warning.paragraphs) && record.learner_warning.paragraphs.length > 0, 'learner_warning required');
    if (record.learner_warning && Array.isArray(record.learner_warning.paragraphs)) {
        record.learner_warning.paragraphs.forEach((paragraph, index) => validateRichParagraph('learner_warning[' + index + ']', paragraph, errors));
    }

    push(errors, Array.isArray(record.related_phrases), 'related_phrases must be an array');
    if (Array.isArray(record.related_phrases)) {
        for (const item of record.related_phrases) {
            push(errors, item && allowlist.slugs.includes(item.slug), 'related phrase must be in frozen T1: ' + (item && item.slug));
            push(errors, item && item.slug !== record.slug, 'related phrase cannot be self');
            push(errors, item && isNonEmptyString(item.label), 'related phrase label required');
        }
    }

    push(errors, Array.isArray(record.dictionary_links), 'dictionary_links must be an array');
    if (Array.isArray(record.dictionary_links)) {
        for (const item of record.dictionary_links) {
            push(errors, item && lib.SLUG_RE.test(item.slug), 'dictionary link slug invalid');
            push(errors, item && isNonEmptyString(item.label) && isNonEmptyString(item.note), 'dictionary link incomplete');
            if (item && item.slug) {
                const target = path.join(root, 'word', item.slug + '.html');
                push(errors, fs.existsSync(target), 'dictionary link missing: word/' + item.slug + '.html');
            }
        }
    }

    push(errors, Array.isArray(record.learning_links) && record.learning_links.length > 0, 'learning_links required');
    if (Array.isArray(record.learning_links)) {
        for (const item of record.learning_links) {
            push(errors, item && isNonEmptyString(item.href) && item.href.startsWith('/') && !item.href.startsWith('//'), 'learning link href invalid');
            push(errors, item && isNonEmptyString(item.label) && isNonEmptyString(item.note), 'learning link incomplete');
            if (item && item.href) {
                const target = lib.resolveLocalHref(item.href, root);
                push(errors, target && fs.existsSync(target), 'learning link missing: ' + item.href);
            }
        }
    }

    push(errors, Array.isArray(record.faq) && record.faq.length >= 3, 'at least 3 FAQ entries required');
    if (Array.isArray(record.faq)) {
        const questions = new Set();
        record.faq.forEach((item, index) => {
            push(errors, item && isNonEmptyString(item.question), 'faq[' + index + '].question required');
            push(errors, item && item.answer && isNonEmptyString(item.answer.text), 'faq[' + index + '].answer.text required');
            if (item && item.question) {
                const key = lib.normalizeText(item.question);
                push(errors, !questions.has(key), 'duplicate FAQ question');
                questions.add(key);
            }
            if (item && item.answer) validateRichParagraph('faq[' + index + '].answer', item.answer, errors);
        });
    }

    return errors;
}

function validateRenderedHtml(html, record, { released = null, allowlist = lib.loadAllowlist() } = {}) {
    const errors = [];
    const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    push(errors, h1s.length === 1, 'expected exactly one H1');
    const canonicals = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)].map((match) => {
        const href = match[0].match(/\bhref=["']([^"']+)["']/i);
        return href ? href[1] : '';
    });
    push(errors, canonicals.length === 1 && canonicals[0] === lib.pageUrl(record.slug), 'self-canonical required');
    push(errors, !/<meta\b[^>]*name=["']robots["'][^>]*noindex/i.test(html), 'noindex is forbidden');
    push(errors, html.includes('<title>' + lib.esc(record.seo.title) + '</title>') || html.includes('<title>' + record.seo.title + '</title>'), 'title missing');
    push(errors, html.includes(lib.esc(record.seo.meta_description)) || html.includes(record.seo.meta_description), 'meta description missing');
    push(errors, !/AggregateRating|FAQPage|"@type"\s*:\s*"Review"|DefinedTerm|Open English WordNet|OEWN_/i.test(html), 'prohibited schema/content present');
    push(errors, !/localhost|127\.0\.0\.1|file:\/\/|C:\\\\dev|research\//i.test(html), 'path leak');

    const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    push(errors, blocks.length === 2, 'expected exactly two JSON-LD blocks');
    const types = [];
    for (const block of blocks) {
        try {
            const parsed = JSON.parse(block[1]);
            types.push(parsed['@type']);
        } catch (error) {
            errors.push('malformed JSON-LD: ' + error.message);
        }
    }
    push(errors, types[0] === 'BreadcrumbList' && types[1] === 'LearningResource', 'JSON-LD types must be BreadcrumbList then LearningResource');
    push(errors, html.includes(lib.esc(record.quick_answer.bangla_display)) || html.includes(record.quick_answer.bangla_display), 'Bangla quick meaning missing from HTML');

    const releasedSet = new Set(released == null ? lib.releasedSlugs(lib.ROOT, allowlist) : released);
    const phraseHrefs = [...html.matchAll(/\bhref=["'](\/phrase\/[^"']+)["']/gi)].map((match) => match[1]);
    for (const href of phraseHrefs) {
        const match = href.match(/^\/phrase\/([a-z0-9]+(?:-[a-z0-9]+)*)\.html$/);
        if (!match) {
            errors.push('malformed phrase href: ' + href);
            continue;
        }
        const target = match[1];
        if (!allowlist.slugs.includes(target)) errors.push('phrase href not allowlisted: ' + href);
        if (!releasedSet.has(target)) errors.push('phrase href to unreleased slug: ' + href);
    }
    return errors;
}

module.exports = {
    validateAllowlist,
    validateRecord,
    validateRenderedHtml
};
