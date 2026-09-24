# OVIDHAN.NET — SEO-R0 forensic recovery audit

Audit date: 2026-09-24. Repository: `C:\dev\ovidhan2`.
Audited HEAD: `1049fc308e31f5cc9d0da2d9df912b48f69ab2f4`, matching the supplied production-main SHA.

Only this requested report was created. No dictionary generation, sitemap generation, experiment modification, hosting change, or deployment was performed. The pre-existing untracked `.wrangler/` directory was not changed. Findings concern repository evidence; the supplied production designation was not independently verified against deployed response bodies.

## FACT — Executive finding

The original 72-treatment/72-control experiment remains byte-intact at the audited commit. All 144 page hashes and six guard hashes match the recorded freeze. No later commit in the implementation-to-HEAD history changes those 144 paths. Later redirect and strategic-page work has no direct overlap with these pages.

The wider dictionary has a much larger content-delivery problem: 48,542 of 49,628 local HTML files contain an empty JSON-LD `description`; 47,875 contain no HTML anchor. These are literal source-pattern counts, not Google indexing classifications or proof that every matching page lacks all useful content.

The legacy explorer loads the dictionary but does not automatically render the word prefilled in the input on a plain `/word/name.html` visit. Automatic lookup is conditional on a `?word=` query parameter. The original controls are all legacy shells with empty initial results and empty DefinedTerm descriptions. This behavior existed at the original implementation commit and remains at HEAD.

## EVIDENCE — Scope and method

- Read Git status, commit history, generators, experiment manifests, frozen records, relevant reports, page source, shared JavaScript, redirects, robots, and all root sitemap XML/gzip files.
- Scanned all 49,628 `word/*.html` files with read-only Node code. Git also tracks 49,628 such files.
- Ran `node scripts/verify_learning_foundation_3b.js --compare reports/ovidhan-learning-foundation-3b-frozen-hashes.json` without `--write`: PASS, 72/72, 144 unique pages, zero changed/missing pages, zero changed guards, aggregate equal.
- Queried `git log 860634a542..HEAD -- <all 144 frozen paths>`: no entries. Compared later redirect targets with the frozen paths: no intersection.
- Inspected all frozen pages for static-answer, embedded-data, empty-schema, and anchor markers; inspected representative non-experiment pages individually.
- Ran an in-memory JavaScript initialization check with mocked DOM/fetch at `860634a542` and HEAD. Both performed one dictionary fetch and left `resultArea.innerHTML` empty on a plain URL. This establishes initialization behavior, not complete browser compatibility. A subsequent interactive-render probe lacked the browser `URL` global and was inconclusive; no browser or Google renderer test is claimed.
- Did not execute generators or analysis scripts that write reports. No new GSC exports or server logs were obtained.

## FACT — 1. Frozen experiment identity

This is Phase 2E/2F, not the later Phase 7A1 pilot.

| Artifact | Role |
|---|---|
| `reports/dictionary-seo-experiment-plan-2e.md` | Freeze contract, cohort definition, measurement and scale gates |
| `reports/dictionary-seo-treatment-manifest-2e.csv` | Authoritative 72 treatment URLs, paths, field-level publication flags |
| `reports/dictionary-seo-control-manifest-2e.csv` | Authoritative 72 control URLs and matching evidence |
| `reports/dictionary-seo-experiment-baseline-2e.csv` | Frozen baseline |
| `reports/dictionary-seo-top100-editorial-review-2e.csv` | Editorial review |
| `reports/dictionary-seo-top100-gate-2e.json` | Gate decisions |
| `reports/dictionary-seo-experiment-implementation-record-2f.json` | Implementation identity, counts and caveats |
| `reports/dictionary-seo-implementation-2f.json` | Generated paths and per-word publication decisions |
| `reports/ovidhan-learning-foundation-3b-frozen-hashes.json` | Per-page and guard hashes; aggregate freeze |
| `generate_word_pages.py` | Phase 2F manifest-driven generator |
| `validate_dictionary_top72_phase2f.py` | Original rollout validation code |
| `scripts/verify_learning_foundation_3b.js` | Current independently rerun freeze verifier |

Implementation: `860634a542e622a516e4a37e88e46568f9da31f9`, 2026-08-16; merged through `7a74e95430`. Baseline date: 2026-08-16, Bangladesh, Web, last three months. The implementation record says NOT DEPLOYED at its creation; that historical field does not establish today's deployment status.

Aggregate SHA-256:

`202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`

Algorithm: hash each page's raw bytes with SHA-256; form `path + NUL + pageHash + LF` for each of 144 pages; lexically sort the strings; concatenate; SHA-256 the result. The six guards are checked separately and are not included in this aggregate.

| Guard | Verified SHA-256 |
|---|---|
| Treatment manifest | `48649a0157e2d6b206ba8275d5fe774c0d0609cf478aeee59bf8dd2cd3fabc7f` |
| Control manifest | `6561f2f1e9ca4f24c0496e8f7d0a92a88c53a4cae0ad0bd3d0fe2913e2dab0c0` |
| Baseline CSV | `e4259cf0bfb44a9d9a8a3123a8588dce393ea377661e1c028a5c824876ccbd7c` |
| `sitemap.xml` | `736378b6bc69a5dc88228545f7e9e695fe1bc3b99595b32b4517ab15ddfb3ea7` |
| `robots.txt` | `84a4f09405bb9539c723636dce666a3640ee3f3d7cfc4512540bf78e74435e61` |
| `enriched-dictionary.json` | `3f3c0323dfc04c6d2130fd05eed5af0bc7e711470fa9df4647739e1cccf3bbd7` |

### Exact treatment/control differences

All 72 treatments have a static `dictionary-answer` article, word-specific H1, nonempty DefinedTerm description, and actual header/footer navigation. All 72 controls have no such answer article, an empty DefinedTerm description, and zero HTML anchors. Neither cohort contains the later `ovidhan-word-data` embedded payload; both use the shared explorer and full dictionary fetch.

Treatment publication flags, counted directly from the frozen CSV:

| Field | Published on treatment pages |
|---|---:|
| Bangla | 71 |
| English definition | 7 |
| Part of speech | 7 |
| Example | 0 |
| Synonyms | 2 |
| Antonyms | 2 |
| Word family | 1 |
| Pronunciation | 0 |

The seven definition/POS words are hosted, integration, street, provision, wide, saturday, and february. Integration omits Bangla and publishes antonym segregation. Provision publishes synonym proviso; wide publishes synonym broad and antonym narrow; hosted publishes family host. The other 65 treatments principally add the approved Bangla answer, not a full dictionary entry. Field flags constrain initial static publication; the shared interactive explorer still uses the unchanged source corpus after a user search.

Treatment titles follow `hosted Meaning in Bangla | Ovidhan`; descriptions contain the approved meaning/definition; canonical remains the corresponding `.html` URL. Controls follow `skewed – Ovidhan Learning Explorer` with boilerplate descriptions promising pronunciation, examples and related words; their canonical also points to `.html`.

**INFERENCE:** This is a bundled static-content, metadata, schema and navigation intervention, not a clean test of JavaScript rendering alone. The treatment/control source completeness differs substantially. The recorded matching quality is 14 strong, 8 acceptable and 50 weak; the implementation explicitly calls controls directional rather than a perfect causal match.

## FACT — 2. Current page delivery and quality

`word/hosted.html:6–48` contains a specific title, description, canonical, BreadcrumbList and DefinedTerm. At lines 342–359 its initial body contains hosted, হোস্ট করা, verb, “be the host of or for”, and family host. Those facts require no JavaScript. Its explorer result is initially empty.

`word/skewed.html:6–50` contains the word in the title, boilerplate metadata, input value and schema name/termCode. Its H1 is “Learning Explorer”, not a definition. There is no visible dictionary answer, the schema description is empty, and header/footer are comments rather than rendered navigation.

`learning-explorer.js:21–68` fetches `/enriched-dictionary.json` unless embedded data exists. In the ordinary/frozen non-embedded path it only calls `searchWord()` automatically when `URLSearchParams(window.location.search).get('word')` exists. The pathname and prefilled input do not trigger lookup. Definitions, examples, related content and learning interactions depend on JavaScript and, on these plain legacy URLs, user search interaction. A successful JavaScript fetch alone therefore does not fill the shell. The local source dictionary is 29,896,871 bytes before transport compression; network transfer size was not measured.

The new 7A1 and strategic pages use embedded data and static answers. Their behavior must not be generalized to the legacy population.

| Ordinary sample | Initial source finding | HTML anchors |
|---|---|---:|
| abandon | Static Bangla answer; DefinedTerm description is Bangla | 77 |
| ability | Static answer with English definition | 77 |
| apple | Static answer with English definition | 77 |
| beautiful | Static answer with English definition | 77 |
| education | Earlier small static page with meaningful DefinedTerm description | 0 |
| zebra | Earlier small static page with Bangla-based description | 0 |
| computer | Explorer shell; empty DefinedTerm description | 0 |
| 0 | Numeric explorer shell; empty DefinedTerm description | 0 |
| walmart | Entity/brand explorer shell; empty DefinedTerm description | 0 |
| slytherin | Entity explorer shell; empty DefinedTerm description | 0 |

**EVIDENCE — source-wide literal scan:** 49,628 HTML files; 48,542 containing `"description": ""`; 48,953 containing an exactly empty `resultArea`; 47,875 without any `<a` element; 28 with the newer embedded-data ID. Empty results can coexist with a useful static article, so these counts must not be added or treated as exclusive classes. The newer static marker count does not count older `dictionary-answer` articles.

**INFERENCE — schema quality:** Treatment schema conveys actual lexical content and matches the inspected visible answer; controls' named DefinedTerm objects convey no definition. Valid JSON syntax alone does not establish useful or sufficient structured data. A Bangla-only description is not equivalent to a reviewed English definition. This audit did not run an external schema validator or certify rich-result eligibility.

**INFERENCE — duplication and links:** Legacy pages vary mostly in word tokens, metadata and input values around a near-identical empty shell. Larger static pages also contain substantial repeated navigation/template content, but at least supply a word-specific answer. The 77 anchors on sampled larger static pages primarily reflect site navigation; they are not evidence of 77 contextual dictionary relationships. Hosted's family value is a span, not a link. An outgoing-anchor count does not establish inbound discovery or prove that pages are orphaned.

Google documents the distinction between initial HTML and rendered content and extracts crawlable links from HTML. That supports examining both paths; it does not establish the cause of this site's indexing loss. [Google JavaScript SEO documentation](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## EVIDENCE — 3. Repository timeline

Dates below are Git dates; messages describe historical intent, not proof of content quality or live deployment.

| Date | Commit(s) | Observed change |
|---|---|---|
| Jul 12 | `7298ce0d13`, `8a58fe2444` | Restoration/upload described approximately 5,000 enriched dictionary pages |
| Jul 12 | `bd40dc0e5a` | `generate-word-pages.py` era: collocations, exam badges and internal links |
| Jul 14 | `63b9a4448b` / `9cd0871eff` | Automatic sitemap/master-build work in history |
| Jul 17 | `bcbcfe4801` | Corpus directly counted at 5,527 JSON records |
| Jul 17 | `42315d5788` | Corpus directly counted at 9,473 records |
| Jul 18 | `b0503b2678`, `b94bb1444e` | Partial then 50K expansion; final corpus directly counted at 50,489 records; adds numeric and empty-slug pages as well as words |
| Jul 22 | `c519ba3062`, `0d1130fe43`, `7d33020700` | Split sitemaps and gzip parts; four roughly 12.5K sets |
| Jul 23 | `9ff61eee94` and alphabet-batch commits through `e8e04d634a` | Enhanced generator and alphabet-wide page updates |
| Jul 28 | `e526de8fd5` | Dictionary restoration described as 49,516 files |
| Jul 30 | `85a161d532` | Header/footer integration and reading lessons |
| Aug 9 | `7d2b6bd0e3`, `b32920e2d0` | Sitemap/broken-link and indexing/metadata cleanup |
| Aug 15 | `501d52f5dc` | Ten-page static pilot using `generate_word_pages.py` |
| Aug 15–16 | `bf0896789d`, `84827cf71f`, `a2fbb7e9d3` | First 1,000-page static batch, site layout, stricter example filtering |
| Aug 16 | `22118bd653`, `97821d504e`, `8d820e31f6` | Indexability/evidence/Bangladesh opportunity audits |
| Aug 16 | `0ccfb388b4`, `860634a542` | 2E freeze and 2F 72-page controlled implementation |
| Aug 25 | `4b20b28efa`, `5754e3a731`, `95f5c3f0ef` | Separate 7A1 pilot; corrected baseline classification and isolated staticization; final 21 treatment/21 control |
| Aug 26 | `405f9038df`, `42b705f3d3`, `eafd7f65bd` | Dictionary inventory and real-GSC opportunity overlay |
| Aug 26 | `b758c2c2b3`, `ab55bc2610` | Quality gate, protection register, bounded editorial queue and redirect proposals |
| Aug 26 | `4ab7d25dc4` | 95 exact extensionless-to-HTML 301 rules |
| Aug 26 | `7873512f86` | Seven strategic upgrades: accordance, during, must, net, tradeoff, translation, without |
| Aug 27 | `c2f5de0cc6` | Later-phase compatibility changes in the 7A1 verifier; frozen 144-page raw-hash checks retained |

Generator identities matter: `generate-word-pages.py`, `generate_enhanced_word_pages.py`, and `generate_word_pages.py` are different files. The current underscore generator requires an explicit generation mode; its Phase 2F mode checks the exact manifest hash, 72 rows and field decisions. Its separate explicit batch/full modes mean it should not be treated as a universal immutable-freeze enforcement layer. None was run here.

`scripts/generate-static-word-pages.js` implements the separate 7A1 experiment from its baseline commit. `scripts/generate-strategic-word-pages-7a3e.js` handles the seven strategic pages.

Current `generate_sitemap.py` discovers existing HTML once, deduplicates paths and supports splitting beyond 50,000 URLs. `generate_sitemap_fast.py` is marked obsolete and refuses to overwrite the sitemap. Existing split files remain alongside the newer principal sitemap.

**FACT:** Current corpus remains 50,489 records. The frozen 2F report records 41,016 missing Bangla values and 45,806 missing definitions. Those historical quality totals are report evidence, not independently reclassified editorial judgments in this audit. They contradict interpreting the expansion commit's “with Bangla meanings” title as proof of complete coverage.

## FACT — 4. Later change and contamination assessment

1. Original treatment/control files: unchanged since implementation, no intervening path history, current raw hashes match.
2. Manifests, baseline, source corpus, principal sitemap and robots: match frozen guard hashes.
3. Shared explorer: changed in 7A1 to support embedded entries and lazy dictionary loading. None of the original 144 pages has that payload, so they remain on the non-embedded branch. Initialization still fetches the full corpus and only automatically searches for `?word=`. This is a shared dependency change, but no differential treatment/control change was demonstrated.
4. `styles.css` and `footer.html`: no implementation-to-HEAD differences. `header.html` changes the BCS destination to `/bcs/`; frozen treatments contain their old header inline and remain byte-identical. Shell controls do not dynamically inject that header in the inspected source.
5. The 95 redirect targets have zero overlap with the original 144 pages.
6. The 7A3C proposed editorial batch included provision, wallet, integration and street, which are frozen treatments. A proposal is not an implementation: the actual seven-page `7873512f86` change excludes all four. This is a close call documented in planning, not observed contamination.
7. The separate 7A1 pilot has 21/21 pages and five excluded pre-existing static-core pages, not 72/72. Its manifest is `data/seo-word-pilot-7a1.json`; its architecture and editorial records are separate. Do not combine its outcomes with the original experiment.
8. `c2f5de0cc6` adjusts 7A1 verification for later work and line-ending comparisons. The original 144-page raw-byte checks remain, and the independent original verifier passes now.

**INFERENCE:** The original experiment is usable as a preserved directional cohort comparison. It is not a randomized causal proof and is not isolated from sitewide changes, crawler behavior, elapsed time or changing competition. Unchanged files cannot prove unchanged Google-selected canonicals, server responses or production exposure.

## FACT — 5. Sitemap architecture

`robots.txt` allows `/` and advertises only `https://ovidhan.net/sitemap.xml`.

| File/set | URL count | Word URLs | Duplicate exact locations within file |
|---|---:|---:|---:|
| `sitemap.xml` | 49,944 | 49,625 | 0 |
| `sitemap-part-1.xml` | 12,500 | 12,327 | 0 |
| `sitemap-part-2.xml` | 12,500 | 12,500 | 0 |
| `sitemap-part-3.xml` | 12,500 | 12,500 | 0 |
| `sitemap-part-4.xml` | 12,187 | 12,185 | 0 |
| Four-part union | 49,687 | 49,512 | 0 across parts |

Each gzip part has exactly the same ordered URL locations as its XML counterpart. `sitemap-index.xml` points to the four gzip parts, with 2026-07-22 lastmod values. It is not the sitemap advertised by robots. Its current GSC submission status is unknown.

There are 49,681 exact locations shared between the old part union and the principal sitemap. Thus the repository exposes overlapping sitemap architectures, even though neither architecture has duplicate locations internally. Overlap between sitemaps is not proof of duplicate content or an indexing penalty.

All enumerated word locations use `.html`; none is extensionless. All 49,625 principal word locations resolve to local files. The three tracked `word/*.html` files excluded from the main sitemap are `.html`, `header.html`, and `footer.html`. An older inventory report says 49,628 sitemap word URLs; direct parsing at this SHA yields 49,625, so the current measurement takes precedence.

The principal sitemap has 319 non-word URLs and is approximately 99.36% dictionary URLs. Learning pages are not in a clearly separated learning sitemap. Word URLs receive priority 0.6, while dictionary.html, learn.html and ielts-guide.html receive 0.5. `/bcs/` is absent; its earlier report explicitly deferred sitemap inclusion under the freeze. Some newer learning content is therefore not represented by this frozen inventory.

**INFERENCE:** Sitemap organization does not clearly communicate the site's learning-content hierarchy. Merely increasing priority would not fix this: Google ignores sitemap priority and changefreq values. Sitemaps aid discovery but do not guarantee indexing. [Google sitemap documentation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

**EVIDENCE — extensionless recovery:** `scripts/extensionless-word-redirects-7a3d.json` and `_redirects` implement 95 explicit 301 mappings. The 7A3C report found 95 extensionless GSC observations and no current internal source generating those URLs. That is historical bounded evidence, not proof that no other extensionless URLs exist or that deployed redirects behave correctly today.

## EVIDENCE — 6. Thirty representative URLs

Treatment and control samples are the first ten rows of their authoritative manifests, selected reproducibly rather than by desired outcome. Ordinary samples deliberately cover earlier static pages, ordinary shells, a numeric entry and entity entries; all ten were checked to be outside the original frozen cohorts and are also outside the named later 7A1 cohorts and seven strategic upgrades. This is a diagnostic sample, not a random prevalence estimate.

| # | Frozen treatment | Frozen control | Ordinary non-experiment |
|---:|---|---|---|
| 1 | https://ovidhan.net/word/hosted.html | https://ovidhan.net/word/skewed.html | https://ovidhan.net/word/abandon.html |
| 2 | https://ovidhan.net/word/integration.html | https://ovidhan.net/word/outlast.html | https://ovidhan.net/word/ability.html |
| 3 | https://ovidhan.net/word/outright.html | https://ovidhan.net/word/tire.html | https://ovidhan.net/word/apple.html |
| 4 | https://ovidhan.net/word/street.html | https://ovidhan.net/word/economical.html | https://ovidhan.net/word/computer.html |
| 5 | https://ovidhan.net/word/net-worth.html | https://ovidhan.net/word/militant.html | https://ovidhan.net/word/education.html |
| 6 | https://ovidhan.net/word/tension.html | https://ovidhan.net/word/monumental.html | https://ovidhan.net/word/beautiful.html |
| 7 | https://ovidhan.net/word/provision.html | https://ovidhan.net/word/quilt.html | https://ovidhan.net/word/zebra.html |
| 8 | https://ovidhan.net/word/ugly.html | https://ovidhan.net/word/on.html | https://ovidhan.net/word/0.html |
| 9 | https://ovidhan.net/word/wide.html | https://ovidhan.net/word/nun.html | https://ovidhan.net/word/walmart.html |
| 10 | https://ovidhan.net/word/saturday.html | https://ovidhan.net/word/vanish.html | https://ovidhan.net/word/slytherin.html |

## UNKNOWN — What this audit cannot establish

- The supplied GSC snapshot is user-reported: 7,216 indexed; 45,973 not indexed; 32,824 discovered-not-indexed; 11,395 crawled-not-indexed. The latter two total 44,219, leaving 1,754 in other exclusion categories. No dated previous snapshot was supplied to measure the magnitude or timing of loss.
- Exact GSC property, collection date, sitemap filters, historical indexing trend, exclusions by cohort, Google-selected canonicals and last crawl dates.
- Whether Google received the current repository HTML, a different deployment, redirects, cache variants, errors or resource failures. No live origin, CDN logs, Googlebot logs or URL Inspection results were examined.
- Which pages Google actually rendered and whether its rendered output remained empty. The repository and initialization probe make that plausible; they do not substitute for URL Inspection.
- The production start date of the frozen experiment, deployment continuity, and treatment-versus-control outcomes at days 7, 28 and 56.
- Submitted or retained old sitemap indexes, exact historical external sources of extensionless URLs, and inbound-link completeness.
- Whether sparse content, delayed discovery/rendering, canonical selection or another factor explains individual exclusions. No manual action or algorithmic penalty is inferred.

## INFERENCE — Recovery diagnosis

The strongest repository-supported hypothesis is that the expansion increased the number of discoverable URLs much faster than the number of useful initial answers. Empty legacy shells, incomplete source records, boilerplate descriptions, empty schema descriptions and limited contextual navigation give a coherent explanation for weak indexing eligibility. The plain-URL initialization behavior strengthens this hypothesis beyond a generic “Google cannot run JavaScript” explanation.

However, current exclusion counts alone do not prove a recent regression or identify its triggering commit. Earlier 5K pages, restored files, 1,000-page static work, the frozen 72-page cohort, the newer 21-page pilot and the seven strategic upgrades are different populations. They must be measured separately.

## RECOMMENDATION — Audit follow-up only

1. Preserve the original manifests, pages and baseline. Use them for a directional comparison; do not scale or reset the experiment based on treatment-only growth.
2. Obtain dated GSC exports and URL Inspection evidence for the thirty listed URLs, including last crawl, selected canonical, rendered HTML, indexing reason and sitemap association. Record the actual deployment date before interpreting 28/56-day results.
3. Compare original 72/72 cohorts using the frozen Bangladesh/Web filter and matching windows. Report absolute counts, rates and the weak-match limitation. The baseline record contains only 109 treatment impressions versus 87 control impressions and zero clicks in both groups; small movements are noisy.
4. Separately diagnose legacy-shell initialization and verified data availability on non-experiment URLs. A future repair proposal should specify exactly what useful answer appears without interaction and how it is reviewed; do not launch broad regeneration from this audit.
5. Reconcile submitted sitemap architecture and current learning-page coverage in a later reviewed proposal. Preserve protected/performing URLs and experiment boundaries. Do not infer removal/noindex decisions from missing fields or low impressions alone.
6. Extend future experiment monitoring beyond page hashes to shared runtime, routing, response headers, deployment identity and rendered content. This is a recommendation, not an implemented change.

No recovery changes were implemented. The verdict concerns the preserved repository experiment's usability for a limited directional comparison, not proof of production exposure or experiment success.

A. EXISTING EXPERIMENT IS USABLE
