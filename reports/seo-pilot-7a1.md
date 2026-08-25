# SEO Phase 7A1-C — 24 Treatment / 24 Matched Control Static Word Pilot

## Delivery state

- Starting `main`: `9c666d3c12120c2a68197e408b51061087294961`
- Branch: `codex/seo-word-static-pilot-7a1`
- GSC source SHA-256: `9ee447fcb3e53d07256f35723afc3a5b0d21799040f9e1860e24e9358f4eb426`
- GSC export: 1,000 URLs, including 993 `/word/*.html` URLs
- Human-approved cohort: exactly 48 words
- Assignment: 24 adjacent quality-matched pairs, 24 treatment and 24 control
- Deployment: not performed
- Merge: not performed

## Selection and assignment

Only the exact 48-word list supplied for Phase 7A1-C is eligible. The generator validates every word against the GSC-derived source, editorial audit, dictionary, existing page, and all repository sitemap files.

Entries are sorted by quality score descending and slug ascending. Adjacent entries form pairs. For each pair, SHA-256 is calculated from `first_slug|second_slug|7A1`; an even first hexadecimal digit assigns the first member to treatment, while an odd digit assigns the second. The other member is control.

The score formula is: +1 pronunciation; +1 part of speech; +2 any singular example or examples-array item; +0.5 for each of up to three synonyms; +0.5 for each of up to three antonyms; +0.5 for each of up to three collocations; +1 non-empty `verb_forms`; +1 story.

Treatment mean score is 4.125 and control mean is 4.1875. Treatment median is 4.0 and control median is 4.25. Maximum within-pair score difference is 0.5.

## Treatment URLs

- https://ovidhan.net/word/acceptable.html
- https://ovidhan.net/word/acting.html
- https://ovidhan.net/word/aspects.html
- https://ovidhan.net/word/association.html
- https://ovidhan.net/word/beast.html
- https://ovidhan.net/word/casual.html
- https://ovidhan.net/word/dancing.html
- https://ovidhan.net/word/degrees.html
- https://ovidhan.net/word/dress.html
- https://ovidhan.net/word/exercise.html
- https://ovidhan.net/word/gene.html
- https://ovidhan.net/word/interviews.html
- https://ovidhan.net/word/merchants.html
- https://ovidhan.net/word/model.html
- https://ovidhan.net/word/name.html
- https://ovidhan.net/word/nation.html
- https://ovidhan.net/word/offers.html
- https://ovidhan.net/word/packaging.html
- https://ovidhan.net/word/popular.html
- https://ovidhan.net/word/pub.html
- https://ovidhan.net/word/result.html
- https://ovidhan.net/word/rules.html
- https://ovidhan.net/word/stick.html
- https://ovidhan.net/word/studies.html

## Static treatment content

Each treatment page contains a unique title, description, exact canonical, `index,follow`, exactly one H1, English word, Bangla meaning, English definition, available part of speech, valid `DefinedTerm` and `BreadcrumbList` JSON-LD, and one embedded dictionary entry. Examples, synonyms, and antonyms are not rendered. HTML, attributes, metadata, JSON-LD, and embedded JSON use context-appropriate escaping. The canonical always uses the approved slug.

The existing full site header, navigation, footer, stylesheet, and Learning Explorer search remain present. Pages with a legacy minimal shell are upgraded from the repository's existing complete word-page shell rather than retaining placeholder header/footer comments.

## Runtime integration

On treatment direct load, `learning-explorer.js` parses `#ovidhan-word-data`, initializes the current word, and does not request the full dictionary. Searching the displayed word does not duplicate static meaning or definition. Searching another word lazy-loads `/enriched-dictionary.json` and continues through the existing search behavior. Pages without embedded data retain their original initial full-dictionary path.

The editorial audit JSON is build-time evidence only. No runtime or generated page references or loads it. It is not copied into page content and does not select treatment/control assignments.

## Representative raw HTML

`acceptable`:

```html
<article class="dictionary-answer" style="padding:2rem;"> <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; <span aria-current="page">acceptable</span></nav> <h1>acceptable meaning in Bangla</h1> <p class="english-word"><strong>English word:</strong> acceptable</p> <p class="bangla-meaning"><strong>Bangla meaning:</strong> <span lang="bn">গ্রহণযোগ্য</span></p> <p class="english-definition"><strong>English definition:</strong> worthy of acceptance or satisfactory</p>
```

`casual`:

```html
<article class="dictionary-answer" style="padding:2rem;"> <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; <span aria-current="page">casual</span></nav> <h1>casual meaning in Bangla</h1> <p class="english-word"><strong>English word:</strong> casual</p> <p class="bangla-meaning"><strong>Bangla meaning:</strong> <span lang="bn">নৈমিত্তিক</span></p> <p class="english-definition"><strong>English definition:</strong> marked by blithe unconcern</p>
```

`studies`:

```html
<article class="dictionary-answer" style="padding:2rem;"> <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/dictionary.html">Dictionary</a> &rsaquo; <span aria-current="page">studies</span></nav> <h1>studies meaning in Bangla</h1> <p class="english-word"><strong>English word:</strong> studies</p> <p class="bangla-meaning"><strong>Bangla meaning:</strong> <span lang="bn">অধ্যয়ন</span></p> <p class="english-definition"><strong>English definition:</strong> a detailed critical inspection</p>
```

UTF-8 embedded JSON sizes are 458 bytes (`acceptable`), 440 bytes (`casual`), and 577 bytes (`studies`). Initial browser-observed assets for each were exactly `/styles.css` and `/learning-explorer.js`; none requested `/enriched-dictionary.json` on initial load.

## Browser verification

Ten treatment pages were tested across different initial letters: `acceptable`, `beast`, `casual`, `dancing`, `exercise`, `gene`, `interviews`, `model`, `nation`, and `studies`. Every page had one correct H1, static Bangla and definition content, embedded single-entry data, only the stylesheet/runtime initial assets, and no console warning or error.

Controls `cheap`, `internet`, and `textbooks` remained legacy pages without embedded data and requested `/enriched-dictionary.json` initially. Unrelated pages `abandon`, `keyboard`, and `youth` also retained the full-dictionary initial path. No tested control or unrelated page produced a console warning or error.

On `acceptable`, searching for `cheap` lazy-loaded `/enriched-dictionary.json`, rendered the existing Explorer result and interactive controls, and produced no console warning or error.

## Integrity verification

The deterministic verifier checks the XLSX hash and 1,000/993 source counts; exact approved list; 24/24 counts; pairing and SHA assignment; GSC/page/sitemap membership; changed-page set; control and non-treatment hashes; treatment canonical/H1/static content/JSON-LD/embedded JSON; rendering exclusions; lazy and non-treatment runtime paths; all sitemap hashes; robots; editorial audit hash; and every frozen experiment page and guard hash.

Final verifier result: PASS.

- Exactly 24 word files changed, all treatments.
- All 24 controls are byte-for-byte unchanged.
- Every non-treatment word page is unchanged by deterministic aggregate.
- All sitemap files and `robots.txt` are unchanged.
- All 144 frozen experiment pages and every frozen guard are unchanged.
- `reports/seo-word-pilot-7a1-editorial-review.json` retains SHA-256 `c702b4bf0cb34ab253a01fb393045977e7bba7ff9da05bf3fec3d96776dbd388`.

## Remaining risk

The approved source content remains human-reviewed selection input rather than newly authored dictionary content, but some examples and related-word data remain generic or imperfect inside the embedded entry. They are deliberately not rendered in treatment static content. Production deployment must exclude the `reports/` audit directory from public assets; this branch performs no deployment and the website has no runtime reference to the audit JSON. Human browser and editorial sign-off are still recommended before merge or deployment.
