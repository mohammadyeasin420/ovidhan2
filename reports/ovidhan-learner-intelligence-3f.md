# Ovidhan Phase 3F — Deterministic Learner Mistake Profile V1

Status: implementation complete; not merged or deployed

## A. Repository, branch, and SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/learner-intelligence-profile-3f`
- Starting `origin/main` SHA: `dcdd41008b40065b9140546920f593bba09e24f4`
- Starting worktree: clean

## B. Existing-state audit

Phase 3B provided one anonymous, versioned state document and allowlisted analytics. Phase 3C/3D supplied 30 stable reviewed item IDs with `micro_skill` and `mistake_family`, latest initial/repair/retest results, accessible interaction stages, and deterministic recommendations. Phase 3E and its register clarification were verified on main. The existing signal retained only latest outcomes plus a total attempt count, so Phase 3F adds bounded per-stage outcome counters to the same document rather than creating another identity or storage system.

## C. Learner-profile data model

State remains under the existing `ovidhan_learning_v1` key and advances from schema version 2 to 3. Each stable mistake ID retains latest results and adds six counters capped at 99: `initialCorrect`, `initialIncorrect`, `repairCorrect`, `repairIncorrect`, `retestCorrect`, and `retestIncorrect`. No sentence, explanation, full profile, name, or content payload is stored.

The derived profile is calculated at runtime and contains micro-skill/family IDs, status, evidence confidence, bounded evidence totals, internal weakness score, and contributing stable item IDs. It is not persisted as a second source of truth.

## D. Aggregation rules

The existing taxonomy is reused without aliases:

`item ID → item.micro_skill → item.mistake_family → learner profile`

Signals aggregate first by exact `micro_skill` and independently by exact `mistake_family`. Distinct-item diversity counts only IDs with an observed stage outcome. This shape is reusable beyond this page because aggregation depends on stable taxonomy fields, not DOM positions or page-specific labels.

## E. Status rules

- `NEW`: no observed interaction for the skill/family.
- `NEEDS_PRACTICE`: at least one item’s latest retest is incorrect, or bounded weakness score is at least 3.
- `IMPROVING`: some evidence exists but the thresholds for Needs practice, Stable, or Strong are not met; this includes repaired evidence with low diversity.
- `STABLE`: at least two distinct items, at least two successful retests, no unresolved latest retest, and score at or below 0.
- `STRONG`: at least three distinct items, at least three successful retests, at least two first-try successes, no unresolved latest retest, and score at or below −4.

One answer cannot produce Stable or Strong. A historical failure does not permanently lock a skill: latest unresolved state controls the hard weakness gate while historical evidence remains in the score.

## F. Confidence rules

- `LOW`: fewer than two distinct items or fewer than four total stage outcomes.
- `MEDIUM`: at least two distinct items and four outcomes.
- `HIGH`: at least three distinct items and nine outcomes.

Status and confidence are displayed separately. “Strong — Evidence: Low” cannot occur under the Strong criteria, while an early Improving or Needs-practice label can correctly carry Low evidence.

## G. Weakness scoring

Internal bounded score range: −10 to +10.

`2×initial failures + 2×repair failures + 3×retest failures − initial successes − repair successes − 2×retest successes`

Higher values indicate more need. The UI never exposes the number or presents false percentages, percentiles, ranks, or scientific precision.

## H. Next-best-action V2

Candidates exclude the current item and the two most recent completed item IDs. Remaining candidates are scored deterministically:

1. Latest failed retest: 100, `FAILED_RETEST`, High.
2. Unresolved initial/repair failure: 90, `UNRESOLVED_MISTAKE`, High.
3. Needs-practice family: 70, `WEAK_FAMILY`, Medium.
4. Improving family: 50, `REINFORCEMENT`, Medium.
5. Seen at least 24 hours ago: 40, `SPACED_REVIEW`, Low.
6. Unseen item: 30, `NEW_SKILL`, Low.
7. Other reviewed reinforcement: 20, `REINFORCEMENT`, Low.

Ties use stable item ID. Identical input and time produce identical output. This is simple recency, not a forgetting curve or claim of memory science. A timing defect found during QA was fixed: the profile now refreshes after completion enters recent history, so it cannot immediately recommend the item just completed.

## I. UI

A compact `Your English Mistake Profile` section appears immediately after Mistake Mirror while all static guide content stays intact. New learners see an explicit insufficient-evidence message. Observed families appear under non-shaming bilingual labels: Needs practice, Improving, Stable, and Strong, each with Low/Medium/High evidence. One profile recommendation includes a reason and an accessible 44px button that opens the exact reviewed item in Mistake Mirror. There is no modal, login, pseudo-AI copy, rank, or animation.

## J. Analytics

The existing adapter gains only three events:

- `mistake_profile_view`: `profile_state`, `evidence_band`.
- `next_action_selected`: `destination_id`, `reason_code`, `priority_band`.
- `next_action_started`: the same coarse recommendation fields.

Common Phase 3B context remains. Full profile contents, scores, histories, sentences, and arbitrary fields are rejected. Existing Mistake Mirror and Dakho events are unchanged.

## K. Privacy

The profile is first-party and based only on reviewed item IDs and learning outcomes. It stores or transmits no name, email, phone, location, school, typed text, private message, audio, transcript, off-site browsing, or exact identity. No account, cross-site identifier, external tracker, AI service, or collective-statistics claim was added.

## L. Migration

Schema v2 signals normalize into v3. When an old latest-stage result exists without counters, the matching counter safely seeds to 1; explicit existing counters remain authoritative. All counters are bounded, malformed IDs are rejected, corrupt documents recover, unavailable storage falls back to memory, and legacy keys are not deleted. Existing anonymous learner and session IDs remain intact.

## M. Performance

Current relevant asset sizes:

| Asset | Raw bytes | Gzip bytes |
|---|---:|---:|
| `learning-foundation.js` | 31,503 | 6,713 |
| `mistake-mirror.js` | 16,597 | 5,139 |
| `mistake-profile.js` | 10,287 | 3,270 |
| `mistake-mirror.css` | 2,517 | 813 |
| Pilot HTML | 71,973 | 13,950 |

Compared with merged Phase 3E, total relevant impact is approximately 15,751 raw bytes and 4,115 gzip bytes. The new profile engine itself is 10,287 raw / 3,270 gzip bytes. No framework, package, model, API, vector store, or network data fetch was added.

## N. Mobile QA

At 390×844: client/scroll widths 375/375, no horizontal overflow, one Mirror and one Profile, body focus preserved on load, bilingual empty state readable, profile recommendation starts the correct reviewed item and focuses its heading, result feedback receives status focus, Needs-practice status renders after failure, and 44px controls remain usable.

At 1366×768: client/scroll widths 1351/1351, no overflow, compact profile grid, static guide and two JSON-LD blocks present, one of each component, body focus preserved, and zero console warnings/errors.

## O. Automated tests

- Learning foundation: 17 PASS, 0 WARN, 0 FAIL.
- Existing Mistake Mirror: 6 PASS, 0 WARN, 0 FAIL across all 30 records.
- Mistake Profile model/recommendation/privacy: 9 PASS, 0 WARN, 0 FAIL.
- Surface/accessibility/SEO verifier: 1 PASS, 0 WARN, 0 FAIL.
- Phase 3F scenarios/regression: 6 PASS, 0 WARN, 0 FAIL.
- Frozen verification: 1 PASS, 0 WARN, 0 FAIL.

Automated total: 40 PASS, 0 WARN, 0 FAIL.

## P. Human scenarios

1. New learner: explicit insufficient-evidence state; no mastery label — PASS.
2. Repeated article failure: Articles becomes Needs practice — PASS.
3. Failure then successful repair/retest: status becomes Improving with low evidence — PASS.
4. Repeated success across three reviewed family items: eligible for Strong; confidence remains separately derived — PASS.
5. Mixed evidence: latest unresolved failed retest wins recommendation priority — PASS.
6. Corrupt/unavailable storage: existing recovery and memory fallback tests pass without destructive migration — PASS.

Browser QA additionally verified scenario 1, a live Needs-practice transition, profile-driven item start, and post-completion weak-family recommendation without immediate repetition.

## Q. SEO preservation

The existing title, description, canonical, H1, static educational guide, structured data, internal links, header, footer, diagnostics, and JavaScript-disabled guide remain. The personalized profile is additive and does not replace indexable content. No `noindex` was added.

## R. Frozen dictionary verification

Before and after implementation: treatment 72, control 72, unique frozen pages 144, changed/missing pages 0, changed guards 0. Aggregate remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`. Sitemap, robots, enriched dictionary, manifests, experiment baseline, dictionary schema, and dictionary linking remain unchanged.

## S. Exact files changed

- `common-mistakes-bangladeshi-learners.html`
- `learning-foundation.js`
- `mistake-mirror.css`
- `mistake-mirror.js`
- `mistake-profile.js`
- `scripts/verify_mistake_mirror_3c.js`
- `scripts/verify_learner_profile_3f.js`
- `tests/learning-foundation.test.js`
- `tests/mistake-profile.test.js`
- `reports/ovidhan-learner-intelligence-3f.md`

## T. Git diff check

Recorded after final validation. Only Windows line-ending notices are acceptable; whitespace errors are not.

## U–W. Commit, push, and deployment

The implementation must use commit message `Build deterministic learner Mistake Profile V1` and push only `codex/learner-intelligence-profile-3f`. Exact final SHA and synchronization are recorded in the task handoff. No merge or deployment is authorized.

## X. Recommended next phase

After human review and a separately authorized deployment, validate real profile/event behavior and collect a limited evidence window. The next product-development phase should specify a reusable deterministic Learning Passport contract that can accept reviewed evidence from Mistake Mirror and, later, historical BCS items through the same item → micro-skill → family → outcome pipeline. Do not import exam content or add AI until that contract and real learner demand are reviewed.
