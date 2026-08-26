# Phase 7A3C SEO Opportunity Quality Gate and URL Recovery Plan

Analysis and proposal only. No redirects, page changes, noindex decisions, deployments, or DNS changes were made.

## Extensionless URL forensic

- Observed extensionless GSC URLs: **95**
- Mapped to tracked `.html` targets: **95**
- Technically safe one-to-one 301 candidates: **95**
- Unresolved: **0**
- Suspected current internal source leak: **0**
- Classifications: `{"SAFE_301_TO_HTML": 95}`

The analyzer searched tracked sitemap locations, canonical tags, href/src references, JavaScript URL construction, structured data, and repository HTML. Generic current extensionless generator candidates: **0**. Exact current repository sources creating these extensionless URLs: **none found**. Generated analysis reports are excluded because they preserve observations rather than create live URLs. A proposal file is generated only for rows whose tracked target, canonical, sitemap membership, and dictionary record all validate. It is not deployed.

## Tier-A human quality gate

- `net`: **EDITORIAL_PRIORITY**; VALID_SECONDARY_WORD; 1 clicks / 9 impressions
- `translation`: **EDITORIAL_PRIORITY**; VALID_SECONDARY_WORD; 1 clicks / 9 impressions
- `tradeoff`: **EDITORIAL_PRIORITY**; VALID_SECONDARY_WORD; 1 clicks / 4 impressions
- `walmart`: **PROTECT_NO_EDITORIAL_EXPANSION**; PROPER_NAME_BRAND_OR_ENTITY; 1 clicks / 8 impressions
- `slytherin`: **PROTECT_NO_EDITORIAL_EXPANSION**; PROPER_NAME_BRAND_OR_ENTITY; 1 clicks / 12 impressions

All five remain protected. `walmart` and `slytherin` receive no editorial-expansion recommendation and are not deletion/noindex candidates.

## Complete SEO protection register

- Protected canonical URLs: **204**
- Clicked URLs protected: **6 / 6**
- Clicked set: `https://ovidhan.net/word/slytherin.html`, `https://ovidhan.net/word/net.html`, `https://ovidhan.net/word/translation.html`, `https://ovidhan.net/word/walmart.html`, `https://ovidhan.net/word/tradeoff.html`, `https://ovidhan.net/word/ua.html`

The separate protection CSV applies the unchanged 7A3B `PROTECT` rule across the complete observed canonical universe, independently of the bounded editorial-review queue. `ua` is retained as `SEO_PROTECT` plus human review and is not promoted to editorial priority.

## Bounded Tier-B review queue

- Queue size: **100**
- Full corrected Tier-B candidates considered before bounding: **824**
- Full Tier-B pages with explicit learner evidence: **23**
- Full Tier-B learner-source intersections: `{"bcs": 0, "general_english": 23, "ielts": 0, "job_workplace": 0}`
- Full Tier-B semantic counts: `{"INFLECTED_OR_DERIVED_FORM": 4, "UNKNOWN_REQUIRES_HUMAN_REVIEW": 801, "VALID_SECONDARY_WORD": 19}`
- High-confidence inflected/base relations: `creating → create`, `producing → produce`, `smaller → small`, `having → have`
- Pages with explicit learner evidence: **11**
- Semantic counts: `{"INFLECTED_OR_DERIVED_FORM": 3, "UNKNOWN_REQUIRES_HUMAN_REVIEW": 89, "VALID_SECONDARY_WORD": 8}`
- Action counts: `{"CONTENT_REPAIR": 3, "HUMAN_REVIEW": 92, "INTERNAL_LINK_OPPORTUNITY": 11, "SEO_PROTECT": 71}`

- `without` — score 107.68; 11 impressions; VALID_SECONDARY_WORD; sources: 5000-common-words-data.json
- `must` — score 97.83; 4 impressions; VALID_SECONDARY_WORD; sources: 5000-common-words-data.json
- `ambidextrous` — score 97.71; 10 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `wiser` — score 97.26; 12 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `société` — score 96.55; 14 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `revamp` — score 95.86; 8 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `spanned` — score 94.78; 12 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `vetted` — score 94.58; 11 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `demonstrably` — score 94.49; 10 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `tension` — score 94.09; 16 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `relational` — score 93.76; 11 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `viceroy` — score 93.11; 7 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `jor` — score 92.17; 8 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `recon` — score 91.56; 10 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `manpower` — score 90.97; 7 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `needing` — score 90.50; 8 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `demarcation` — score 90.16; 5 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `borrower` — score 89.50; 5 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none
- `provision` — score 88.95; 3 impressions; VALID_SECONDARY_WORD; sources: 5000-common-words-data.json
- `harshest` — score 88.73; 5 impressions; UNKNOWN_REQUIRES_HUMAN_REVIEW; sources: none

Unknown learner evidence stays unknown. Automatic `CORE_LEARNING_WORD` or `VALID_SECONDARY_WORD` requires membership in a concrete repository collection; otherwise the queue uses `UNKNOWN_REQUIRES_HUMAN_REVIEW`.

The IELTS extractor reads **22** real static-table entries. General-English collection membership is learner-value evidence but no longer proves `CORE_LEARNING_WORD`. High-confidence dictionary/page relations classify `creating → create`, `producing → produce`, and `smaller → small` as `INFLECTED_OR_DERIVED_FORM`; `during` is explicitly verified as a non-match.

## First recommended editorial batch

Batch size: **11** (maximum 20).

Pre-M1 batch: `net`, `translation`, `tradeoff`, `without`, `must`, `provision`, `accordance`, `creating`, `producing`, `during`, `wallet`, `integration`, `smaller`, `street`.

Corrected batch:

- `net` — SEO_PROTECT, EDITORIAL_PRIORITY; Explicit 7A3C human judgment plus observed Google value
- `translation` — SEO_PROTECT, EDITORIAL_PRIORITY; Explicit 7A3C human judgment plus observed Google value
- `tradeoff` — SEO_PROTECT, EDITORIAL_PRIORITY; Explicit 7A3C human judgment plus observed Google value
- `without` — CONTENT_REPAIR, EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY, SEO_PROTECT; Observed demand plus explicit curated learner evidence and technical safety
- `must` — EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY; Observed demand plus explicit curated learner evidence and technical safety
- `provision` — EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY; Observed demand plus explicit curated learner evidence and technical safety
- `accordance` — EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY; Observed demand plus explicit curated learner evidence and technical safety
- `during` — CONTENT_REPAIR, EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY; Observed demand plus explicit curated learner evidence and technical safety
- `wallet` — CONTENT_REPAIR, EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY; Observed demand plus explicit curated learner evidence and technical safety
- `integration` — EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY, SEO_PROTECT; Observed demand plus explicit curated learner evidence and technical safety
- `street` — EDITORIAL_PRIORITY, INTERNAL_LINK_OPPORTUNITY; Observed demand plus explicit curated learner evidence and technical safety

## Internal-link opportunities

The first batch has **11** evidence-backed bidirectional link opportunities. Each recommendation ties an existing curated hub to the word page and the word page back to that same relevant hub; no mass or irrelevant links are proposed.

- `net`: `/bank-job-vocabulary.html -> /word/net.html` and `/word/net.html -> /bank-job-vocabulary.html` (source: `bank-job-vocabulary.html`)
- `net`: `/5000-common-english-words-bangla.html -> /word/net.html` and `/word/net.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `translation`: `/5000-common-english-words-bangla.html -> /word/translation.html` and `/word/translation.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `without`: `/5000-common-english-words-bangla.html -> /word/without.html` and `/word/without.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `must`: `/5000-common-english-words-bangla.html -> /word/must.html` and `/word/must.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `provision`: `/5000-common-english-words-bangla.html -> /word/provision.html` and `/word/provision.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `accordance`: `/5000-common-english-words-bangla.html -> /word/accordance.html` and `/word/accordance.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `during`: `/5000-common-english-words-bangla.html -> /word/during.html` and `/word/during.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `wallet`: `/basic-vocabulary-list.html -> /word/wallet.html` and `/word/wallet.html -> /basic-vocabulary-list.html` (source: `basic-vocabulary-list.html`)
- `integration`: `/5000-common-english-words-bangla.html -> /word/integration.html` and `/word/integration.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)
- `street`: `/5000-common-english-words-bangla.html -> /word/street.html` and `/word/street.html -> /5000-common-english-words-bangla.html` (source: `5000-common-words-data.json`)

## Unique Ovidhan word-page specification

Principle: **SEARCH ANSWER → UNDERSTANDING → USE → PRACTICE → LEARNER PROGRESS**.

1. **Instant Answer** — English, Bangla, POS, pronunciation
2. **Simple Meaning** — reviewed learner-friendly English definition and Bangla explanation
3. **Use It Correctly** — reviewed natural contextual examples
4. **Bangla Learner Mistake** — verified confusion or L1-transfer evidence only
5. **Word Family / Forms** — verified lexical forms
6. **Collocations** — verified collocations
7. **Similar / Confused Words** — reviewed useful contrast
8. **Goal Relevance** — explicit BCS, IELTS, job, or speaking collection membership
9. **30-Second Practice** — deterministic exercise sourced from verified fields
10. **Next Learning Step** — contextual link to an existing relevant Ovidhan/Dakho learning page

## Required counts

`{"coverage_backlog_overlap": 0, "editorial_priority": 11, "first_batch_size": 11, "internal_link_opportunities": 11, "overlap_7a1": 0, "pages_with_clicks": 6, "pages_with_learner_value_evidence": 16, "proper_name_entity_noise_review": 286}`

## Reproduction and limitations

Run `python scripts/dictionary-opportunity-7a3c.py` with the same external GSC workbooks. The analysis validates the Phase 7A3B hashes/headers, preserves unknown states, keeps semantic classification conservative, and produces bounded 95-row and 100-row forensic/review artifacts. Embedded deterministic tests: **PASS (13 cases)**. Historical or external sources not present in Git cannot be proven by this repository scan.
