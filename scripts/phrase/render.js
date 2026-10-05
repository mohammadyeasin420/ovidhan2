'use strict';

const lib = require('./lib');
const validate = require('./validate');

function jsonLd(value) {
    return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

function paragraphHtml(item, attrs = '') {
    const lang = item.lang ? ' lang="' + lib.esc(item.lang) + '"' : '';
    return '<p' + attrs + lang + '>' + lib.wrapMarks(item.text, item) + '</p>';
}

function buildStructuredData(record) {
    const url = lib.pageUrl(record.slug);
    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: lib.SITE + '/' },
            { '@type': 'ListItem', position: 2, name: lib.BREADCRUMB_PARENT.name, item: lib.BREADCRUMB_PARENT.url },
            { '@type': 'ListItem', position: 3, name: record.phrase, item: url }
        ]
    };
    const resource = {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        '@id': url + '#resource',
        name: record.seo.h1,
        headline: record.seo.h1,
        description: record.seo.learning_resource_description,
        url,
        inLanguage: ['en', 'bn'],
        learningResourceType: 'Language learning guide',
        educationalLevel: 'Beginner to Intermediate',
        isAccessibleForFree: true,
        about: { '@type': 'Thing', name: record.phrase },
        isPartOf: { '@type': 'WebSite', name: 'Ovidhan', url: lib.SITE + '/' }
    };
    return { breadcrumb, resource };
}

function renderArticle(record, { released = [] } = {}) {
    const releasedSet = new Set(released);
    const lines = [];
    const phrase = record.phrase;
    lines.push('        <article class="phrase-entry">');
    lines.push('            <nav class="phrase-breadcrumb" aria-label="Breadcrumb">');
    lines.push('                <ol>');
    lines.push('                    <li><a href="/">Home</a></li>');
    lines.push('                    <li><a href="' + lib.BREADCRUMB_PARENT.href + '">' + lib.esc(lib.BREADCRUMB_PARENT.name) + '</a></li>');
    lines.push('                    <li><span aria-current="page">' + lib.esc(phrase) + '</span></li>');
    lines.push('                </ol>');
    lines.push('            </nav>');
    lines.push('');
    const h1 = record.seo.h1;
    const display = record.phrase_display;
    if (!h1.startsWith(display)) throw new Error('seo.h1 must start with phrase_display');
    lines.push('            <h1><span class="phrase-headword">' + lib.esc(display) + '</span>' + lib.esc(h1.slice(display.length)) + '</h1>');
    lines.push('');
    lines.push('            <section class="phrase-quick" aria-label="Direct Bangla meaning">');
    lines.push('                <p class="phrase-kicker">English expression</p>');
    lines.push('                <p class="phrase-term">' + lib.esc(phrase) + '</p>');
    lines.push('                <p class="phrase-bn-label">বাংলা অর্থ</p>');
    lines.push('                <p class="phrase-bn" lang="bn">' + lib.esc(record.quick_answer.bangla_display) + '</p>');
    lines.push('                <p class="phrase-note">' + lib.esc(record.quick_answer.context_note_bn) + '</p>');
    lines.push('            </section>');
    lines.push('');
    lines.push('            <section class="phrase-section" aria-labelledby="what-it-means">');
    lines.push('                <h2 id="what-it-means">What “' + lib.esc(phrase) + '” means</h2>');
    for (const paragraph of record.overview.paragraphs) lines.push('                ' + paragraphHtml(paragraph));
    lines.push('            </section>');
    lines.push('');

    if (Array.isArray(record.contexts) && record.contexts.length) {
        lines.push('            <section class="phrase-section" aria-labelledby="by-context">');
        lines.push('                <h2 id="by-context">Meaning by context</h2>');
        lines.push('                <ul class="phrase-grid">');
        record.contexts.forEach((context, index) => {
            lines.push('                    <li class="phrase-card">');
            lines.push('                        <h3>' + (index + 1) + '. ' + lib.esc(context.title_en) + '</h3>');
            lines.push('                        <p><span class="phrase-label">বাংলা</span> · <span lang="bn" class="phrase-alt">' + lib.esc(context.bangla) + '</span></p>');
            lines.push('                        <p><span class="phrase-label">Natural English</span> · ' + lib.esc(context.natural_alternatives.join(' / ')) + '</p>');
            lines.push('                        <div class="phrase-example">');
            lines.push('                            <p class="phrase-example-en" lang="en">' + lib.esc(context.example.en) + '</p>');
            lines.push('                            <p class="phrase-example-bn" lang="bn">' + lib.esc(context.example.bn) + '</p>');
            lines.push('                        </div>');
            lines.push('                    </li>');
        });
        lines.push('                </ul>');
        lines.push('            </section>');
        lines.push('');
    }

    lines.push('            <section class="phrase-section" aria-labelledby="alternatives">');
    lines.push('                <h2 id="alternatives">More natural English alternatives</h2>');
    lines.push('                <p>' + lib.esc(record.alternatives_intro) + '</p>');
    lines.push('                <ul>');
    for (const item of record.alternatives) {
        lines.push('                    <li><strong>' + lib.esc(item.en) + '</strong> — ' + lib.esc(item.use_when_en) + '</li>');
    }
    lines.push('                </ul>');
    lines.push('            </section>');
    lines.push('');

    lines.push('            <section class="phrase-section" aria-labelledby="examples">');
    lines.push('                <h2 id="examples">Example sentences</h2>');
    for (const example of record.examples) {
        lines.push('                <div class="phrase-example">');
        lines.push('                    <p class="phrase-example-en" lang="en">' + lib.esc(example.en) + '</p>');
        lines.push('                    <p class="phrase-example-bn" lang="bn">' + lib.esc(example.bn) + '</p>');
        lines.push('                </div>');
    }
    lines.push('            </section>');
    lines.push('');

    lines.push('            <section class="phrase-section" aria-labelledby="when-heard">');
    lines.push('                <h2 id="when-heard">When learners may hear or use “' + lib.esc(phrase) + '”</h2>');
    for (const paragraph of record.usage_when.paragraphs) lines.push('                ' + paragraphHtml(paragraph));
    lines.push('            </section>');
    lines.push('');

    lines.push('            <section class="phrase-section" aria-labelledby="when-other">');
    lines.push('                <h2 id="when-other">When another expression is more natural</h2>');
    lines.push('                <ul>');
    for (const bullet of record.usage_prefer_other.bullets) {
        lines.push('                    <li>' + lib.wrapMarks(bullet.text, bullet) + '</li>');
    }
    lines.push('                </ul>');
    lines.push('            </section>');
    lines.push('');

    lines.push('            <section class="phrase-section" aria-labelledby="warning">');
    lines.push('                <h2 id="warning">Common learner mistake</h2>');
    for (const paragraph of record.learner_warning.paragraphs) lines.push('                ' + paragraphHtml(paragraph));
    lines.push('            </section>');
    lines.push('');

    const relatedItems = [];
    for (const item of record.related_phrases || []) {
        const note = item.note ? ' — ' + lib.esc(item.note) : '';
        if (releasedSet.has(item.slug)) {
            relatedItems.push('<li><a href="/phrase/' + lib.esc(item.slug) + '.html">' + lib.esc(item.label) + '</a>' + note + '</li>');
        } else {
            relatedItems.push('<li><span>' + lib.esc(item.label) + '</span>' + note + '</li>');
        }
    }
    for (const item of record.dictionary_links || []) {
        relatedItems.push('<li><a href="/word/' + lib.esc(item.slug) + '.html">' + lib.esc(item.label) + '</a> — ' + lib.esc(item.note) + '</li>');
    }
    if (relatedItems.length) {
        lines.push('            <section class="phrase-section" aria-labelledby="related">');
        lines.push('                <h2 id="related">Related expressions</h2>');
        lines.push('                <ul class="phrase-links">');
        for (const item of relatedItems) lines.push('                    ' + item);
        lines.push('                </ul>');
        lines.push('            </section>');
        lines.push('');
    }

    lines.push('            <section class="phrase-section" aria-labelledby="ovidhan-links">');
    lines.push('                <h2 id="ovidhan-links">Useful Ovidhan learning links</h2>');
    lines.push('                <ul class="phrase-links">');
    for (const item of record.learning_links) {
        lines.push('                    <li><a href="' + lib.esc(item.href) + '">' + lib.esc(item.label) + '</a> — ' + lib.esc(item.note) + '</li>');
    }
    lines.push('                </ul>');
    lines.push('            </section>');
    lines.push('');

    lines.push('            <section class="phrase-section phrase-faq" aria-labelledby="faq">');
    lines.push('                <h2 id="faq">FAQ</h2>');
    for (const item of record.faq) {
        lines.push('                <details>');
        lines.push('                    <summary>' + lib.esc(item.question) + '</summary>');
        lines.push('                    ' + paragraphHtml(item.answer));
        lines.push('                </details>');
    }
    lines.push('            </section>');
    lines.push('        </article>');
    return lines.join('\n');
}

function renderPhrasePage(record, {
    shell = lib.loadShell(),
    css = lib.loadCss(),
    allowlist = lib.loadAllowlist(),
    released = lib.releasedSlugs(lib.ROOT, allowlist)
} = {}) {
    const recordErrors = validate.validateRecord(record, { allowlist });
    if (recordErrors.length) throw new Error('invalid record: ' + recordErrors.join('; '));
    if (!allowlist.slugs.includes(record.slug)) throw new Error('slug not allowlisted: ' + record.slug);

    const data = buildStructuredData(record);
    const out = [];
    out.push('<!DOCTYPE html>');
    out.push('<html lang="en">');
    out.push('<head>');
    out.push('    <meta charset="UTF-8">');
    out.push('    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    out.push('    <title>' + lib.esc(record.seo.title) + '</title>');
    out.push('    <meta name="description" content="' + lib.esc(record.seo.meta_description) + '">');
    out.push('    <link rel="stylesheet" href="../styles.css">');
    out.push('    <link rel="canonical" href="' + lib.pageUrl(record.slug) + '">');
    out.push('    <style id="phrase-entry-styles">');
    out.push(css);
    out.push('    </style>');
    out.push('    <script type="application/ld+json">');
    out.push(jsonLd(data.breadcrumb));
    out.push('</script>');
    out.push('    <script type="application/ld+json">');
    out.push(jsonLd(data.resource));
    out.push('</script>');
    out.push('</head>');
    out.push('<body>');
    out.push(shell.header.replace(/\n$/, ''));
    out.push('    <main>');
    out.push(renderArticle(record, { released }));
    out.push('    </main>');
    out.push(shell.footer.replace(/\n$/, ''));
    out.push('</body>');
    out.push('</html>');
    const html = out.join('\n') + '\n';
    const htmlErrors = validate.validateRenderedHtml(html, record, { released, allowlist });
    if (htmlErrors.length) throw new Error('render contract failed: ' + htmlErrors.join('; '));
    return html;
}

module.exports = {
    renderPhrasePage,
    buildStructuredData,
    renderArticle
};
