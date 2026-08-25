# SEO Phase 7A1-D — Corrected JS-Shell Staticization Pilot

## Baseline architecture

All exact 48 human-approved pages were inspected from base main commit `9c666d3c12120c2a68197e408b51061087294961`. `STATIC_CORE` requires the baseline raw HTML to contain the correct word H1, Bangla meaning, English definition, and source part of speech. Anything missing one or more requirements is `JS_SHELL`.

- Approved population: 48
- `STATIC_CORE`: 5 — `acceptable`, `acting`, `aspects`, `association`, `beast`
- `JS_SHELL`: 43 — `buildings`, `businesses`, `cartridge`, `casual`, `cheap`, `comparison`, `constitution`, `dancing`, `degrees`, `doctor`, `dress`, `evil`, `exercise`, `forecast`, `gene`, `increase`, `internet`, `interviews`, `mass`, `merchants`, `model`, `name`, `nation`, `notebooks`, `objects`, `offers`, `packaging`, `popular`, `posters`, `process`, `proposal`, `psychology`, `pub`, `request`, `result`, `rules`, `stick`, `studies`, `sufficient`, `terminal`, `tests`, `textbooks`, `typical`

The complete 48-row architecture evidence is recorded in `reports/seo-word-pilot-7a1-baseline-architecture.json`.

## Corrected cohort

The 43 baseline JS shells were sorted by quality score descending and slug ascending. The last odd entry, `stick`, is unused. The remaining 42 pages form 21 adjacent pairs. SHA-256 of `first_slug|second_slug|7A1` assigns one treatment and one control per pair by first-hex-digit parity.

Treatment (21): `businesses`, `casual`, `dancing`, `degrees`, `exercise`, `gene`, `model`, `nation`, `pub`, `result`, `tests`, `dress`, `merchants`, `offers`, `popular`, `rules`, `studies`, `cartridge`, `mass`, `notebooks`, `packaging`.

Control (21): `textbooks`, `cheap`, `constitution`, `doctor`, `evil`, `increase`, `internet`, `posters`, `request`, `terminal`, `buildings`, `comparison`, `forecast`, `objects`, `process`, `psychology`, `sufficient`, `typical`, `interviews`, `name`, `proposal`.

Mean quality scores are 4.1667 treatment and 4.1905 control. Medians are 4.5 treatment and 4.0 control.

## Core-only staticization

Treatment raw HTML and embedded JSON use only English word, Bangla meaning, English definition, and part of speech. The embedded payload contains exactly `english`, `bangla`, `definition`, and optional `part_of_speech`. Generator code contains no rendering branches for pronunciation, examples, synonyms, antonyms, collocations, verb forms, or story.

The manifest explicitly records all rendering exclusions, `human_editorial_status: "approved_core"`, and `baseline_architecture: "JS_SHELL"` for every experiment entry. It separately documents the complete approved population, five static-core exclusions, and odd shell exclusion.

## Verification

`scripts/verify_seo_word_pilot_7a1.js` passes and proves:

- 5 static-core and 43 JS-shell classifications from the base commit
- only baseline JS shells enter treatment/control
- exactly 21 treatment word pages differ from base
- all 21 controls are byte-for-byte identical to base
- every unrelated word page is unchanged
- embedded payload keys are core-only and all forbidden fields are absent
- sitemap, robots, editorial audit, and frozen 144-page experiment are unchanged
- direct treatment load uses embedded data and the search path can lazy-load the full dictionary

The existing frozen verifier also passes at 72 treatment, 72 control, 144 unchanged pages, and aggregate SHA-256 `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.

Browser QA covered treatments `businesses`, `casual`, `exercise`, `gene`, `notebooks`, and `tests`; controls `textbooks`, `cheap`, and `proposal`; excluded static-core pages `acceptable`, `acting`, and `beast`; and odd unused shell `stick`. Treatments had one correct H1, static Bangla and definition, core-only embedded keys, no rendered example/related sections, no initial full-dictionary request, and no console errors. Controls and exclusions retained their baseline full-dictionary request. Searching `cheap` from treatment `businesses` lazy-loaded `/enriched-dictionary.json` and rendered the existing explorer result without console errors.

No sitemap, robots, frozen experiment, DNS, or Cloudflare deployment change was made. PR #46 remains review-only and must not be merged until the corrected diff is reviewed.
