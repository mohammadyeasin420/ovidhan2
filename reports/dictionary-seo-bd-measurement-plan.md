# Bangladesh static-upgrade measurement plan

## Recommended cohort

Upgrade the Phase 2D Top 100 only after review. Freeze the selected URLs, implementation date, and baseline export before generation.

## Baseline

For every treatment and control URL record Bangladesh-filtered impressions, clicks, CTR, and average position for the comparable pre-change window. Retain Tier, rendering state, and query intent.

## Control group

Select 100 legacy pages not upgraded, matched to treatment pages by Tier, baseline Bangladesh-impression band (0, 1–4, 5–19, 20+), and position band (1–3, 4–10, 11–20, 21–50, 51+). Do not choose controls from alphabetical adjacency alone. Freeze this group before implementation.

## Observation windows

- 7 days: implementation/indexing sanity check only; expect Search Console delay and volatility.
- 28 days: first directional treatment-versus-control comparison.
- 56 days: primary evaluation window and scale/no-scale decision.

Use identical Bangladesh, Web filters and comparable calendar windows. Compare changes in impressions, clicks, CTR, and position between treatment and control. Do not claim causation from treatment-only before/after movement. Record crawl/index coverage and release anomalies alongside the metrics.

## Scale gate

Proceed beyond 100 only if validation remains clean and the 28/56-day treatment-control comparison shows credible improvement without indexing, rendering, or learner-quality regressions.
