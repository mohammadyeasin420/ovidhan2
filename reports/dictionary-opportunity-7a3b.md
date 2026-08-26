# Phase 7A3B Real GSC Demand Overlay

Diagnostic prioritization only. Raw XLSX files remain outside Git. An absent performance row is **UNKNOWN**, not zero; an absent coverage row is **UNKNOWN**, not indexed. No permanent Tier A/B/C assignments or destructive SEO recommendations are made.

## Inputs and workbook observations

- Starting main: `f16255b4a7381011d03dc5e37db09a45d52ce560`
- Performance SHA-256: `c8eeb38ee815615cccb91d8513be9e78be87e1f382e43eef94627f0325fa227a`
- Coverage SHA-256: `9ee447fcb3e53d07256f35723afc3a5b0d21799040f9e1860e24e9358f4eb426`
- Performance: **1,000 rows**, **934 word URLs**, **66 non-word URLs**, **6 clicks**, **3115 impressions**, **6 clicked word URLs**.
- Coverage: **1,000 rows**, **993 word URLs**, **7 non-word URLs**; validation status `{"Pending": 1000}`.
- Normalized cross-export overlap: **0**. This zero applies only to these limited exports and is not a universal SEO rule.
- Known-baseline discrepancies: **0**.

### Position distribution (observed word cohort)

| Bucket | URLs |
|---|---:|
| TOP_20 | 93 |
| TOP_10 | 208 |
| BEYOND_50 | 291 |
| TOP_50 | 342 |

### Impression distribution

| Bucket | URLs |
|---|---:|
| 10_PLUS | 37 |
| 5_9 | 130 |
| 2_4 | 688 |
| 1 | 79 |

Descriptive observed signals: `{"HAS_CLICK": 6, "HAS_IMPRESSIONS": 934, "HIGHER_IMPRESSION_OBSERVED_P75_PLUS": 277, "TOP_10_OBSERVED": 208, "TOP_20_OBSERVED": 301}`. The higher-impression signal is the observed-cohort 75th percentile, not a universal SEO threshold.

## Joins and evidence coverage

- Performance → inventory: **839 successes**, **95 failures**.
- Coverage → inventory: **993 successes**, **0 failures**.
- Invalid/rejected GSC URLs: **0**.
- Performance states: `{"OBSERVED": 839, "UNKNOWN": 48789}`.
- Coverage states: `{"DISCOVERED_CURRENTLY_NOT_INDEXED": 993, "UNKNOWN": 48635}`.

The 95 performance join failures are extensionless `/word/<slug>` URLs. The canonical contract preserves `.html`, so the analyzer reports these failures and does not collapse them into tracked `/word/<slug>.html` pages.

## Transparent scoring

Scores exist only for the observed 934-word performance cohort. Search value = 50% impression percentile + 30% click percentile + 20% ranking-visibility percentile. Search improvement = 65% impression percentile + 35% inverse ranking-visibility percentile. Ties use average empirical percentiles. Unknown performance produces null scores, never synthetic zero.

## Operational classifications

| Label | Pages |
|---|---:|
| REVIEW_REQUIRED | 704 |
| UNKNOWN | 47,145 |
| CRAWL_BACKLOG | 993 |
| CONTENT_ENRICH | 811 |
| PROTECT | 204 |
| QUICK_WIN | 52 |
| WATCH | 6 |

Provisional tiers: `{"INSUFFICIENT_EVIDENCE": 48095, "PROVISIONAL_TIER_A_CANDIDATE": 48, "PROVISIONAL_TIER_B_CANDIDATE": 781, "REVIEW_REQUIRED": 704}`. These are candidates only; absence from GSC never creates Tier C.

Data readiness: `{"READY_PARTIAL": 4786, "READY_STRONG": 4653, "REVIEW_REQUIRED": 704, "WEAK_DATA": 39485}`.

Confidence: `{"HIGH": 22, "LOW": 945, "MEDIUM": 865, "UNKNOWN": 47796}`.

## Important intersections

- observed_performance_strong_lexical: **18**; samples: `https://ovidhan.net/word/accordance.html`, `https://ovidhan.net/word/creates.html`, `https://ovidhan.net/word/creating.html`, `https://ovidhan.net/word/establish.html`, `https://ovidhan.net/word/examples.html`
- observed_performance_weak_lexical: **811**; samples: `https://ovidhan.net/word/3rd.html`, `https://ovidhan.net/word/4s.html`, `https://ovidhan.net/word/5d.html`, `https://ovidhan.net/word/6c.html`, `https://ovidhan.net/word/abbas.html`
- observed_performance_editorial_rejection: **0**; samples: none
- observed_performance_structural_anomaly: **839**; samples: `https://ovidhan.net/word/3rd.html`, `https://ovidhan.net/word/4s.html`, `https://ovidhan.net/word/5d.html`, `https://ovidhan.net/word/6c.html`, `https://ovidhan.net/word/abbas.html`
- coverage_backlog_strong_lexical: **48**; samples: `https://ovidhan.net/word/acceptable.html`, `https://ovidhan.net/word/acting.html`, `https://ovidhan.net/word/aspects.html`, `https://ovidhan.net/word/association.html`, `https://ovidhan.net/word/beast.html`
- coverage_backlog_weak_lexical: **902**; samples: `https://ovidhan.net/word/1g.html`, `https://ovidhan.net/word/4pm.html`, `https://ovidhan.net/word/abbreviated.html`, `https://ovidhan.net/word/absorption.html`, `https://ovidhan.net/word/abu.html`
- coverage_backlog_missing_dictionary: **14**; samples: `https://ovidhan.net/word/62.html`, `https://ovidhan.net/word/andys.html`, `https://ovidhan.net/word/australias.html`, `https://ovidhan.net/word/bosss.html`, `https://ovidhan.net/word/freddys.html`
- clicked_by_readiness: {"READY_STRONG": 2, "WEAK_DATA": 4}
- top10_by_readiness: {"READY_PARTIAL": 3, "READY_STRONG": 5, "REVIEW_REQUIRED": 1, "WEAK_DATA": 193}

## Top bounded candidate examples

- `https://ovidhan.net/word/net.html` — observed 9 impressions/1 clicks at position 4.78; ready strong; 1 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/translation.html` — observed 9 impressions/1 clicks at position 6.89; ready strong; 1 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/walmart.html` — observed 8 impressions/1 clicks at position 6.38; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/slytherin.html` — observed 12 impressions/1 clicks at position 10.42; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/tradeoff.html` — observed 4 impressions/1 clicks at position 12.00; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/tafe.html` — observed 10 impressions/0 clicks at position 6.50; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/newsweek.html` — observed 27 impressions/0 clicks at position 9.59; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/huawei.html` — observed 10 impressions/0 clicks at position 7.10; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/unconventional.html` — observed 43 impressions/0 clicks at position 10.47; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/princeton.html` — observed 8 impressions/0 clicks at position 6.88; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/producing.html` — observed 10 impressions/0 clicks at position 9.40; ready strong; 1 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/catwoman.html` — observed 7 impressions/0 clicks at position 4.86; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/shenanigans.html` — observed 12 impressions/0 clicks at position 10.83; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/ied.html` — observed 10 impressions/0 clicks at position 9.70; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE
- `https://ovidhan.net/word/sephora.html` — observed 10 impressions/0 clicks at position 9.80; weak data; 4 structural flags — PROVISIONAL_TIER_A_CANDIDATE

The committed candidate CSV contains 500 rows and is ordered deterministically by provisional tier, search value, impressions, and slug. It includes both value/protection and improvement fields rather than collapsing them into one opaque score.

## Frozen 7A1 observations

- Treatment observed performance: **0 / 21**
- Control observed performance: **0 / 21**
- Treatment in exported coverage backlog: **21 / 21**
- Control in exported coverage backlog: **21 / 21**

These observations do not support a causal staticization conclusion because the exports are limited and the performance date window is not an experiment-specific causal evaluation.

## Limitations and next use

The performance workbook is capped at 1,000 exported page rows, and the coverage workbook represents one issue only. Learner-value scores remain unknown unless separately reviewed evidence is imported. `Pending` is neither indexed nor fixed. Candidate confidence reflects evidence coverage, not semantic correctness or guaranteed SEO uplift.

## Reproduction and tests

Run `python scripts/dictionary-opportunity-7a3b.py` with `openpyxl` available. The script validates hashes, sheets, headers, filters, metadata, URL normalization, duplicate aggregation, known-zero versus unknown semantics, score reproducibility, stable ordering, and literal-template false-positive behavior. Embedded deterministic tests: **PASS (9 cases)**.

