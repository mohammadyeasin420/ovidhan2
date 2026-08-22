# Ovidhan SmartPath BCS Literature 5B2

## Architecture and input

Phase 5B2 adds `data/bcs-literature-smartpath-v1.json`, a versioned same-origin governed asset copied from the authoritative reviewed input. The pack contains 80 Ovidhan-created BCS-style Literature questions and retains per-item editorial source references. Source URLs are provenance metadata only; the runtime makes no request to those sites.

Mistake Mirror now loads the existing 70-item grammar pack and the Literature pack once each, normalizes their distinct schemas, and adds both to the same runtime item collection. Literature uses `candidate_id` as the stable item ID, `skill_id` as its canonical skill, `LITERATURE` as its canonical family, `learning_note_en` as English feedback, and the existing initial/repair/retest interaction engine.

## Provenance and counts

All 80 Literature items retain `practice_type: OVIDHAN_CREATED_BCS_STYLE`, `official_question: false`, and `research_status: REVIEWED`. They are not official or past BPSC questions.

- Literary period identification: 15
- Author/work attribution: 35
- Quotation attribution: 20
- Genre/form identification: 10
- Literature total: 80
- Existing governed practice preserved: 100
- Final governed practice and mapping total: 180

## Canonical graph and goals

Graph version 3 contains 12 families and 56 ACTIVE skills. The new `LITERATURE` family contains exactly four reusable skills: `literary_period_identification`, `author_work_attribution`, `quotation_attribution`, and `genre_form_identification`. The previous 11 families, 52 skills, and 100 mappings remain intact.

All four Literature skills are CORE mappings for BCS, with rationales tied to the reviewed current BPSC Literature scope. No Literature mapping was added for IELTS, BANK, UNIVERSITY_ADMISSION, GENERAL_ENGLISH, or SPOKEN_CAREER. The Bangla-English Transfer Graph remains unchanged because Literature knowledge is not a Bangla-L1 transfer pattern.

## SmartPath, evidence, profile, and retention

Literature items become ordinary reviewed Mistake Mirror destinations for the BCS goal. A goal-eligibility constraint is applied before the unchanged SmartPath scoring calculation, including in legacy fallbacks, so unseen Literature does not leak into non-BCS goals. `FAILED_RETEST` and `UNRESOLVED_MISTAKE` retain their priority, while recent-item suppression remains active.

Literature attempts use the existing anonymous learner state, mistake signals, initial/repair/retest counters, timestamps, mastery status, recent actions, retention behavior, and canonical Mistake Profile aggregation. The profile renders learner-facing Literature family and skill labels from the canonical graph. No new learner identity, profile, storage key, raw text field, backend, AI, or external API was added.

## Validation

The Phase 5B2 validator verifies the reviewed pack structure and provenance, exact 15/35/20/10 distribution, 12/56/56/0 graph counts, preserved 30+70 mappings, 180 final mappings, BCS-only goal support, deterministic Literature routing, priority hierarchy, recency suppression, grammar and writing regressions, shared learner evidence, and privacy constraints.

All repository Node suites and required graph, SmartPath 5A1, Phase 5B1, Phase 5B2, Candidate Intelligence, Candidate Center, syntax, and diff gates pass. Frozen SEO verification remains 72 treatment plus 72 control pages with aggregate SHA-256 `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.

## Browser QA and limitations

The live local page was exercised at 390×844 and 1440×900. Both sizes had no horizontal overflow, one SmartPath recommendation, intact navigation, and no console warnings/errors. The mobile hamburger changed `aria-expanded` from `false` to `true` and back to `false`; repair and retest were completed through the existing engine.

Persisted local learner evidence correctly kept higher-priority grammar prerequisites ahead of unseen Literature. Consequently, the five representative long Literature prompts could not be directly selected for visual inspection through the learner-facing route in this session. Their exact presence and four-option structure are automated-validator covered, but prompt-specific visual wrapping is not claimed.

This phase is not an official BPSC question bank, complete BCS preparation, AI personalization, probabilistic mastery model, or new spaced-repetition system.
