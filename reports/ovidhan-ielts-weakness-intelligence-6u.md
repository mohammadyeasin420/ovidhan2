# Phase 6U — Empirical IELTS Weakness Intelligence

## Scope

The Free IELTS Weakness Map now derives conservative, explainable patterns only from retained learner practice evidence. The implementation adds no AI, score or band prediction, readiness claim, productive-response diagnosis, raw writing, audio, or transcript handling. SmartPath remains the only next-action recommendation engine. Academic and General Training filtering is unchanged.

## Deterministic rules

- `INSUFFICIENT_EVIDENCE`: no retained objective item for the skill.
- `SINGLE_OBJECTIVE_SIGNAL`: one distinct unresolved objective failure.
- `REPEATED_OBJECTIVE_PATTERN`: at least two genuinely distinct unresolved objective items for one skill.
- `FAILED_RETEST`: any retained objective retest is incorrect; this outranks ordinary initial failures.
- `RESOLVED_ON_RETEST`: initial failures were corrected on objective retest. This describes only the retained retest result.
- `MIXED_OBJECTIVE_EVIDENCE`: at least one unresolved incorrect item and at least one correct or corrected item are both retained. Correct-only evidence is conservatively `INSUFFICIENT_EVIDENCE`; it is never described as conflicting evidence or a weakness.
- Productive Writing/Speaking uses only `SELF_SELECTED_REPAIR`, `SELF_REPORTED_UNRESOLVED`, `SELF_REPORTED_IMPROVED`, and `SELF_REVIEW_PENDING`, always with `LEARNER_SELECTED` provenance.

Evidence identity is skill plus the retained `source_id` when available, then item/evidence identifier as fallback. Different attempt IDs from the same source item collapse before counts are computed. Active failed retests and repeated unresolved patterns sort above single signals; resolved evidence sorts below active objective evidence and receives a map summary card even when the legacy failed-only path emits no card. The map displays bilingual explanations and keeps objective versus learner-selected provenance visible.

Academic Task 1 self-checks remain check-specific: Overview, Important Features, Comparison, and Data Check retain their own selected answer and card. A Task 1 `YES` remains a learner-selected `YES`; only a genuine productive retry reflection such as `BETTER` produces `SELF_REPORTED_IMPROVED`.

## Verification

`tests/ielts-weakness-intelligence-6u.test.js` covers empty evidence, single versus repeated evidence, duplicate collapse, failed and corrected retests, productive self-report boundaries, `BETTER`, routing, raw-content exclusion, and the frozen experiment. All 24 repository JavaScript test files pass, including historical Phase 6P–6T coverage. The production script is run without `-Deploy` and without `-AllowDirty` after committing, so its clean-worktree guard remains meaningful.

Expected production invariants: 49,628 word pages, 114 Unicode-named pages, dictionary SHA-256 `d0f257582f33917590de802d53ec863a0fde67d7c30f281ca99207dc54ffdc17`, and frozen aggregate SHA-256 `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.
