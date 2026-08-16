# Phase 2E controlled experiment freeze

## Frozen cohorts

- Treatment: **72** editorially approved legacy URLs from the Phase 2D Top 100.
- Control: **72** unchanged legacy URLs selected by tier, Bangladesh impression band, position band, source completeness, and rendering state.
- Baseline date: **2026-08-16**
- GSC filter: **Country = Bangladesh; Search type = Web; Period = Last 3 months**

Cohorts must not be silently changed after implementation. Any change requires a new versioned manifest and a reset baseline.

## Phase 2F implementation contract

The future generator must require `reports/dictionary-seo-treatment-manifest-2e.csv` as an explicit allowlist and refuse implicit/full generation. Only rows with `allowlisted=true` may be generated. Field-level publish flags and omissions in the manifest are mandatory. Existing Learning Explorer and production header/footer remain. Controls receive no static upgrade.

## Measurement

- 7 days: implementation, crawl, canonical, structured-data, and indexing sanity only.
- 28 days: first directional Bangladesh treatment-versus-control comparison.
- 56 days: primary scale/no-scale evaluation.

Compare relative treatment-versus-control movement in BD impressions, clicks, CTR, and average position. Account for Search Console delay, low counts, and volatility. Raw treatment growth alone is not success.

## Scale gate

Do not scale unless Phase 2F passes page validation and the 28/56-day comparison shows credible improvement without rendering, indexability, learner-quality, or control-integrity regressions. Weak control matches disclosed in the Phase 2E report require human acceptance before implementation.
