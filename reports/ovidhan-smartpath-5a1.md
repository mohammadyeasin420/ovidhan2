# Ovidhan Phase 5A1 — SmartPath V1 + Bangla Transfer Foundation

## Scope and starting point

- Branch: `codex/smartpath-v1-5a1`
- Starting `main`: `af0fdaa50b62c910067a0dad38bda2505e4280f8`
- Architecture: one canonical English Skill Graph, separate curated Bangla-transfer knowledge, explicit goal mappings, anonymous bounded evidence, and one deterministic router.
- No AI, ML, external API, probability, learner-text collection, sitemap change, dictionary change, or frozen-cohort change.

## Canonical graph extension

`skill-mistake-graph.json` advances from graph version 1 to 2. The original 10 families, 50 skills, 30 item mappings, stable IDs and 14 explicit edges remain. One `WRITING` family and two active canonical skills are added:

- `writing_precis` — Précis and summary writing / প্রেসি ও সারাংশ লেখা
- `formal_letter_writing` — Formal letter writing / আনুষ্ঠানিক পত্র লেখা

Totals: 11 families, 52 skills, 30 item mappings and 14 explicit edges.

Node-level `prerequisites` and `related_skills` remain runtime-authoritative. The validator now rejects a retained explicit prerequisite/related edge that contradicts the corresponding node arrays. It deliberately does not infer missing duplicate edges. Full relationship normalization remains later debt. One pre-existing explicit `RELATED_TO` relationship between the two conjunction-pairing skills is now represented in both node arrays so the retained edge is not contradictory.

## Bangla-English transfer layer

`bangla-english-transfer-graph.json` contains exactly four reviewed optional Phase 3G hypotheses:

1. `ARTICLE_ABSENCE_TRANSFER` → `indefinite_article_a_an`
2. `POSTPOSITION_PREPOSITION_TRANSFER` → `adjective_preposition`
3. `WORD_ORDER_TRANSFER` → `english_svo_order`
4. `LITERAL_TRANSLATION_TRANSFER` → `fixed_expression`

Each record has a stable edge ID, `bn` source language, source pattern, canonical target skill, `TRANSFER_RISK_FOR`, `CURATED_TRANSFER_HYPOTHESIS`, honest internal editorial provenance, review state/date, scope, exclusions and version. There are no empirical co-mistake edges, prevalence fields, probabilities or causal learner claims. Legacy transfer objects remain in the canonical graph for backward compatibility, but SmartPath reads only the separate transfer layer.

## Goal requirements

`goal-skill-requirements.json` defines `BCS`, `IELTS`, `BANK`, `UNIVERSITY_ADMISSION`, `GENERAL_ENGLISH` and `SPOKEN_CAREER`. Every mapping is explicit and contains canonical skill ID, `CORE`/`SUPPORTING`/`OPTIONAL` importance, curated repository evidence class and rationale. University mappings are intentionally sparse and rely only on the existing reviewed University learning path and writing destinations; they do not claim a complete syllabus.

`learning-foundation.js` validates new goal selections against those six IDs. Unknown persisted legacy strings remain stored non-destructively but `getRoutingGoal()` returns `GENERAL_ENGLISH`. Invalid new values are rejected without crashing or rewriting existing state. State schema remains version 4 because no stored field was added.

## Reviewed destinations

`smartpath-destinations.json` adds reviewed guided-writing destinations:

- `content:writing_precis` → `/precis-summary-writing-bangla.html`, intermediate, about 18 minutes
- `content:formal_letter_writing` → `/formal-letter-writing-bangla.html`, intermediate, about 20 minutes

The Précis page now exposes `skill:writing_precis`; the Formal Letter page already exposed `skill:formal_letter_writing`. SmartPath also derives 30 reviewed Mistake Mirror destinations from the existing canonical item mappings. No textarea content is read or persisted.

## SmartPath V1 scoring

`smartpath-router.js` is framework-free, deterministic and independently testable. It uses static same-origin JSON fetches, makes no AI, external API or third-party network request, and falls back safely to the existing Mistake Profile recommendation logic when enhanced resources are unavailable. No service worker or full offline infrastructure is claimed. The timestamp is an explicit input. It returns one primary recommendation, optional ranked diagnostics, bounded score, priority band, primary/supporting reasons, factor breakdown and confidence band.

V1 bounded factors:

- Failed retest: +140
- Unresolved mistake: +110
- Review due after at least one day: +20
- Needs-practice skill: +35; improving reinforcement: +16
- Direct recent mistake relevance: +18
- Goal: CORE +16, SUPPORTING +9, OPTIONAL +4
- Difficulty: bounded −20 to +6
- Unready dependent skill: −25
- Needed prerequisite destination: +28
- Curated transfer risk: +4 only
- Gateway value: 3 per explicit node-array dependent, capped at +12
- Repetition: −4 per matching recent action, capped at −20
- Last-two-action penalty: −35
- Unseen reviewed skill: +5

Urgent direct evidence therefore remains above all ordinary goal, transfer, gateway and new-skill combinations. Transfer can only be a supporting factor.

Reason vocabulary is bounded to `FAILED_RETEST`, `UNRESOLVED_MISTAKE`, `WEAK_SKILL`, `REVIEW_DUE`, `GOAL_CORE_SKILL`, `PREREQUISITE_NEEDED`, `TRANSFER_RISK`, `GATEWAY_SKILL`, `NEW_SKILL` and `REINFORCEMENT`.

Prerequisite evidence is considered sufficient only for `STABLE`/`STRONG`, or at least two distinct items plus two correct retests and non-positive weakness. One immediate correct answer is not mastery. Gateway value uses only canonical node-level prerequisite arrays.

## UI and fallback

`common-mistakes-bangladeshi-learners.html` contains one small “আজ আপনার SmartPath” panel. It shows a canonical skill, one conservative Bangla explanation, reviewed approximate time and one action. Internal score, percentage and AI language are absent. Mistake actions open the existing Diagnose → Repair → Retest loop; writing actions navigate to reviewed pages.

If SmartPath assets fail, the panel delegates to the existing `mistake-profile.js::recommendNext()` result. Existing Mistake Profile and Mistake Mirror remain unchanged in behavior.

## Analytics and privacy

SmartPath reuses `next_action_selected` and `next_action_started` rather than adding duplicate events. Existing allowlisted fields are destination, canonical skill/family, reason and priority. No full graph/profile, goal free text, learner answer, writing, audio, transcript, PII, school, region or location is emitted.

## Verification

Automated checks passed:

- Phase 3B frozen/foundation validator: 72 treatment + 72 control, 144 unchanged pages
- Phase 3C Mistake Mirror surface/SEO validator
- Phase 3F learner-profile release scenarios
- Phase 3G graph validator updated for graph V2 and relationship contradiction detection
- Phase 4C Candidate Intelligence validator updated for the reviewed graph extension
- Phase 4D Candidate Center validator
- Phase 5A1 validator
- Learning Foundation tests, including stable/legacy goal behavior
- Mistake Mirror tests
- Mistake Profile tests
- Retention tests, including unchanged D1/D7/D30 behavior
- Skill Graph tests, preserving all 30 mappings
- Transfer Graph tests
- Goal Requirement tests
- SmartPath Router deterministic/scoring/fallback/privacy tests
- JavaScript syntax checks and `git diff --check`

Frozen aggregate remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`; sitemap, robots, dictionary data, manifests, baseline hashes, 72 treatment pages and 72 control pages are unchanged.

Browser QA passed at 390×844 and 1440×900: header/menu behavior remained functional, no horizontal overflow appeared, Bangla wrapped correctly, the recommendation action was visible, and SmartPath successfully opened and completed the existing Diagnose → Repair → Retest loop. Browser console warnings/errors were zero.

## Known limitations

- Goal selection UI is not introduced in this phase; safe routing defaults to General English until a stable goal is set.
- University mappings are intentionally incomplete.
- Only two reviewed non-Mistake-Mirror content destinations exist.
- Writing quality is not graded and learner writing is not inspected.
- Transfer knowledge is curated hypothesis only, not empirical evidence.
- No delayed unaided retest scheduler or SmartGuard behavior exists.
- No production analytics export or measured SmartPath outcome baseline exists.
- Canonical node arrays and explicit relationship edges remain partially duplicated pending a later controlled normalization.
