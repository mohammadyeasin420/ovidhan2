# Phase 7A3A Dictionary Opportunity Inventory

Generated deterministically from Git-tracked repository evidence. This is diagnostic only: no GSC values were fabricated, no final opportunity tiers were assigned, and every risk signal is a review flag rather than an indexing or deletion recommendation.

## Baseline and inventory

- Required starting main: `6e173161f831e9a5de387fc0a6b05044186a8657`
- Analyzed HEAD at generation: `405f9038dfc79061b144ca3ac54edd17f2cfe1a0`
- Tracked word pages: **49,628**
- Unicode-named pages: **114**
- Dictionary records: **50,489** (50,486 unique normalized headwords)
- Page/dictionary matches: **48,953**
- Pages without dictionary record: **675**
- Unique dictionary headwords without page: **1,533**
- Pages in sitemap: **49,628**; sitemap word URLs: **49,628**; sitemap entries without tracked page: **0**

## Dictionary data coverage

Percentages use all tracked word pages as denominator. POS value `unknown` is treated as missing. Singular `example` and plural `examples` are counted separately. `usable_example` excludes only explicitly detected repository-wide generic templates; it is not a claim of editorial trust.

| Field | Count | Pages |
|---|---:|---:|
| english | 48,953 | 98.64% |
| bangla | 9,468 | 19.08% |
| definition | 4,682 | 9.43% |
| part_of_speech | 4,682 | 9.43% |
| example | 4,994 | 10.06% |
| examples | 0 | 0.00% |
| usable_example | 976 | 1.97% |
| synonyms | 4,682 | 9.43% |
| antonyms | 461 | 0.93% |
| pronunciation | 0 | 0.00% |
| collocations | 2 | 0.00% |
| verb_forms | 0 | 0.00% |
| story | 0 | 0.00% |
| word_family | 3,769 | 7.59% |
| bcs_importance | 0 | 0.00% |
| ielts_importance | 0 | 0.00% |
| common_mistake | 0 | 0.00% |

Intersections: Bangla + definition **4,682**; + POS **4,682**; + machine-usable example **908**.

## Page architecture

| Class | Count |
|---|---:|
| STATIC_CORE | 5 |
| 7A1_TREATMENT_STATIC | 21 |
| 7A1_CONTROL_JS_SHELL | 21 |
| OTHER_JS_SHELL | 48,906 |
| OTHER_STATIC | 0 |
| UNKNOWN_REQUIRES_REVIEW | 675 |

The frozen 7A1 manifest is authoritative for treatment/control. `STATIC_CORE` uses its frozen baseline evidence. Outside that cohort, `OTHER_STATIC` requires the explicit static-answer marker; `OTHER_JS_SHELL` requires the Learning Explorer script.

## Editorial evidence

- Approved: **48**
- Rejected: **29**
- Unreviewed: **49,551**

These are the existing 7A1 judgments (48 approved and the other 29 audited candidates rejected), preserved without semantic reinterpretation.

## Structural risk flags

| Flag | Count |
|---|---:|
| slug_length_le_2 | 883 |
| empty_slug | 1 |
| contains_digits | 387 |
| non_ascii_slug | 114 |
| unusually_long_slug_ge_30 | 0 |
| suspicious_empty_headword | 0 |
| dictionary_record_missing | 675 |
| missing_bangla | 39,485 |
| missing_definition | 44,271 |
| missing_pos | 44,271 |
| empty_definedterm_description | 48,548 |
| generic_js_shell | 48,927 |
| page_not_in_sitemap | 0 |
| canonical_missing_or_invalid | 0 |
| duplicate_canonical_target | 0 |
| html_url_context_literal_template_pattern | 0 |
| sitemap_entry_without_page | 0 |

Flags may overlap. They are evidence for review, not automatic noindex/deletion rules. `html_url_context_literal_template_pattern` scans current tracked word-page HTML only in bounded URL contexts (URL-bearing attributes, quoted absolute/relative URL strings, and CSS `url()`). A zero does not establish that historical or repository-wide template-URL leakage never existed.

## Representative samples

- high_data_quality: `accepted`, `accessible`, `activities`, `advanced`, `alive`
- missing_data: ``, `0`, `0f`, `0s`, `1`
- static_core: `acceptable`, `acting`, `aspects`, `association`, `beast`
- treatment_7a1: `businesses`, `cartridge`, `casual`, `dancing`, `degrees`
- control_7a1: `buildings`, `cheap`, `comparison`, `constitution`, `doctor`
- approved: `acceptable`, `acting`, `aspects`, `association`, `beast`
- rejected: `allow`, `amazing`, `as`, `battery`, `binding`
- suspicious_slugs: ``, `0`, `0f`, `0s`, `1`
- page_without_dictionary: ``, `500`, `59`, `62`, `64`
- dictionary_without_page: `con`, `and/or`, `it's`, `don't`, `i'm`
- sitemap_without_page: none detected

## Future opportunity model

Every input has one of three states: **KNOWN_POSITIVE**, **KNOWN_NEGATIVE**, or **UNKNOWN**. Families are search demand (GSC clicks, impressions, CTR, position, coverage), data quality, learner value, page readiness, and risk. A future score must operate only on known evidence, preserve raw inputs and family confidence, and exclude unknown evidence from both numerator and denominator. Missing external evidence must never become zero.

Intended planning tiers are: Tier A high strategic opportunity (roughly 2,000-5,000); Tier B useful secondary pages (roughly 10,000-20,000); Tier C long-tail/weak/questionable/low-evidence. Tier C never implies automatic deletion or noindex. Demand, rankings, backlinks, or learner usefulness protect a URL from destructive action pending review.

## GSC canonical-URL join contract

Importer fields: `url`, `clicks`, `impressions`, `ctr`, `position`, `coverage_issue`. Join on normalized canonical URL: trim/parse; URL-decode; normalize Unicode NFC; force HTTPS; lowercase host; map www to apex; remove query/fragment; collapse duplicate slashes; remove trailing slash except root; preserve `.html`. Invalid URLs are rejected. A missing GSC row remains **UNKNOWN**, never a fabricated zero.

## Major findings and 7A3B

The inventory separates a large product corpus from page readiness and demand evidence. 7A3B should import a dated GSC export under the documented join contract, measure join failures explicitly, add reviewed learner-value sources, and produce provisional scores with coverage/confidence. It should protect URLs with positive demand or other known value and route anomalies and editorial rejections to human review before any indexability decision.

## Reproduction

Run `node scripts/dictionary-opportunity-7a3a.js`. The script validates frozen 7A1 evidence counts before analysis and writes only this report and its compact JSON summary; it does not retain a 49,628-row artifact.

