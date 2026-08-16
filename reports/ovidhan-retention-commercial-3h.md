# Ovidhan Product Intelligence Phase 3H — Retention + Commercial Instrumentation Foundation

## A. Repository / branch / SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/retention-commercial-foundation-3h`
- Starting `origin/main` SHA: `ee5c11efa77358e01a72dcc34e689896ae857f97`
- Phase 3G merge verified at that SHA; branch started clean from current `origin/main`.

## B. Retention model

- **New learner:** stable anonymous ID exists but no meaningful learning action has been recorded.
- **Returning learner:** the same anonymous learner performs a genuine learning action on a later UTC calendar day than their last learning action.
- **Active learning session:** the existing 30-minute session contains at least one deduplicated learning action.
- **Meaningful return:** a later-day visit plus its first genuine action. Page views, reloads, and same-day sessions never qualify alone.

Return buckets are mutually exclusive elapsed-day bands: `D1` = exactly one day; `D7` = 2–7 days; `D30` = 8–30 days; `LATER` = more than 30 days. These support cohort calculation without claiming production rates.

## C. Journey states

- `DISCOVERED`: zero meaningful actions.
- `ACTIVATED`: one or two meaningful actions.
- `ENGAGED`: at least three actions, before a meaningful return.
- `RETURNING`: at least two learning days and two actions.
- `DEEP_LEARNER`: at least three learning days, three action-bearing sessions, and five actions.

The model is deterministic and internal/analytics-only. No public badge, urgency, countdown, streak loss, or redesign was added.

## D. Retention metrics

Future cohort calculations can use:

- Day-1, Day-7-band, and Day-30-band meaningful returns: learners with a `learner_return` in the relevant bucket divided by eligible activated learners.
- First-session learning actions: bounded `firstSessionLearningActions`.
- Three-/five-action completion: existing `learning_session_3_actions` and `learning_session_5_actions`.
- Second-item continuation: a distinct second Mistake Mirror start/meaningful action after the first completion.
- Completed repair loop: `mistake_session_complete` following diagnose, repair, and retest for the same item/session.
- Repeat mistake practice: repeated bounded attempts for the same stable item ID across sessions.
- Returning learner actions: bounded `returningLearnerActionCount`.

Production rates: **INSUFFICIENT DATA**. No connected production analytics export or queryable analytics backend was supplied.

## E. Commercial readiness signals

V1 emits only coarse `commercial_readiness_signal` codes for `MEANINGFUL_RETURN` and `FIVE_MEANINGFUL_ACTIONS`. Existing events already represent diagnostic completion, weak-skill evidence, personalized next-action use, repair/retest, profile use, and Dakho CTA interaction. These indicate value received, never willingness to pay. No pricing, paywall, checkout, paid unlock, or sales prompt exists.

## F. Dakho funnel

The reconstructable path is: landing/source category → diagnostic or Mistake Mirror start → repair/retest/completion → profile view → selected/started next action → second distinct learning item → meaningful learner return → Dakho CTA view → Dakho CTA click. `install_status` remains `unknown`; a click is not an installation or paid conversion.

## G. Event taxonomy

Existing events remain authoritative. Only missing coarse lifecycle events were added:

- `learning_session_start`: first genuine action in a new 30-minute session.
- `learner_return`: first genuine action on a later learning day.
- `retention_checkpoint`: the same return with its D1/D7/D30/LATER band.
- `commercial_readiness_signal`: one of two bounded value-received milestones.

All use the existing adapter, anonymous/session envelope, property allowlist, and session dedupe. Existing page, action, 3/5 milestone, Mistake Mirror, profile, next-action, and Dakho events were not duplicated.

## H. Privacy

Allowed retention data is limited to anonymous learner/session IDs, stable content/skill/family IDs, coarse outcomes, bounded counts, ISO learning days/timestamps, journey state, reason code, and return bucket. Names, email, phone, school, precise location, IP identity, fingerprinting, raw text, audio, transcripts, messages, external browsing history, full profiles, and full graphs remain forbidden. Exact response time was not added because there is no current product requirement.

## I. Storage

The existing `ovidhan_learning_v1` document advances non-destructively from schema 3 to 4. Its bounded `retention` object contains `firstSeenAt`, `lastLearningAt`, at most 90 unique learning days, session count, meaningful action count, first-session action count, returning action count, and last return bucket. General counts cap at 9,999; first-session count caps at 99. Existing learner ID, goal, saved identifiers, progress, Mistake Mirror evidence, timestamps, and legacy keys are preserved. Corrupt/unavailable storage retains the existing safe recovery and memory fallback.

## J. Return recommendation logic

The Phase 3F/3G deterministic selector remains unchanged and already prioritizes failed retest/unresolved evidence, weak family, same skill, improving-family reinforcement, graph-related/prerequisite reinforcement, spaced review, and unseen practice with stable ID tie-breaking. Tests verify an unresolved failed retest wins on return and identical improving state produces the same non-current recommendation.

## K. Learning outcome metrics

- `MISTAKES_REPAIRED_PER_SESSION`: distinct items with an initial incorrect outcome and later correct retest divided by action-bearing sessions in the window.
- `REPAIRED_AND_RETAINED_RATE`: repaired items later answered correctly in a genuine delayed-retest window divided by repaired items eligible for that window. **NOT YET CLAIMABLE:** no delayed-retest scheduler/exposure exists.
- `SKILLS_IMPROVED_PER_RETURNING_LEARNER`: distinct canonical skills whose status improves between a learner’s prior action-bearing session and a meaningful return, divided by returning learners. **NOT YET DIRECTLY MEASURABLE:** current state retains evidence but not bounded historical status snapshots.

## L. Production baseline availability

**ANALYTICS SCHEMA READY — BASELINE DATA NOT YET AVAILABLE.**

The repository has an event adapter and local debug evidence, but no connected production GA export, warehouse, analytics API, or provided event dataset from which defensible numerators, denominators, bot exclusions, cohort eligibility, or retention rates can be calculated.

## M. 28-day measurement plan

- **Day 0:** production asset/status smoke test; event payload, dedupe, storage migration, console, mobile, privacy, and frozen SEO verification.
- **Day 7:** activation/event sanity; raw eligible learners, first action, 3/5 milestones, repair-loop ordering, second-item continuation, missing/duplicate events, and Dakho view/click sanity.
- **Day 14:** early D1/D7-band return review with cohort eligibility and raw numerator/denominator; investigate path differences without causal claims.
- **Day 28:** retention/engagement decision using activation, second-item continuation, completed repair loops, returning learner rate, actions per returning learner, and Dakho CTA CTR.

Guardrails: no material page-speed regression, no frozen/SEO change, no new privacy payload, and no learning-flow breakage.

## N. Commercial prototype prerequisites

Future concept only: **BCS English Weakness Repair Plan** — free reviewed diagnostic → canonical weakness map → deterministic seven-day plan → optional small paid unlock. Still required: reviewed/licensed BCS item corpus, goal selection, plan content and scheduling, delayed-retest semantics, entitlement/account design, pricing research, consent/privacy review, payment/refund/legal flow, attribution, support, and a real retention baseline. No BCS implementation or commercial surface was built.

## O. Competitive moat checkpoint

- **Easy to copy:** one Mistake Mirror UI, static CTA placement, basic anonymous session counters.
- **Moderate:** reviewed 30-item taxonomy, bounded learner-state migration, 50-node bilingual Skill Graph, deterministic recommendation rules, privacy-safe event contract.
- **Harder to copy with data:** longitudinal item→skill outcomes, repaired/retained evidence, reliable return cohorts, and measured path effectiveness—only after sufficient genuine production history. Current architecture prepares this; it does not claim the data moat already exists.

## P. AI/ML readiness

The structured contract can support later research using item ID, canonical skill/family, context, initial/repair/retest outcomes, bounded attempt count, status derivable from prior evidence, next-action reason, session ID, journey stage, and return bucket. A future study would still need explicit historical status snapshots and governed exports. No AI, LLM API, vector database, model, or raw learner text was added.

## Q. Performance

- `learning-foundation.js`: 37,974 raw bytes / 8,011 gzip bytes.
- Phase 3H delta: +6,421 raw bytes / +1,287 gzip bytes versus `origin/main`.
- Relevant runtime assets (`learning-foundation.js`, `mistake-profile.js`, graph JSON): 90,160 raw bytes / 18,669 gzip bytes.
- Network impact: zero new asset requests; the existing foundation asset grew and the existing same-origin graph request is unchanged.
- Frameworks, analytics SDKs, external APIs: none.
- Browser console warnings/errors: 0.

## R. Tests

- Phase 3H scenarios: 7/7 PASS.
- Learning foundation: 23/23 PASS.
- Skill Graph: 8/8 PASS plus graph validator PASS.
- Mistake Profile: 9/9 PASS.
- Mistake Mirror: 6/6 PASS across all 30 records.
- Phase 3F release scenarios: 6/6 PASS.
- Phase 3C static/SEO surface: PASS.
- Frozen verifier: PASS 72/72/144.

Coverage includes new learner, returning learner, refresh, same-day session, meaningful later-day return, D1/D7/D30 logic, bounded state, corrupt/unavailable storage, unresolved/improving return recommendations, privacy allowlists, CTA install unknown, and prior behavior.

## S. Human QA

Scenarios 1–7 passed through deterministic scenario tests. Browser QA additionally exercised the visible Mistake Mirror diagnose→explain→repair path and profile on the real page. At 390×844 and 1440×900, content remained visible with no horizontal overflow. Canonical/title remained correct and console warnings/errors were zero. Analytics-unavailable behavior is fail-open for learning.

## T. SEO / frozen verification

Before and after implementation: treatment 72, control 72, unique frozen pages 144, changed/missing pages 0, changed guards 0. Aggregate SHA-256 remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`. Sitemap, robots, enriched dictionary, manifests, experiment baseline, dictionary metadata/schema/internal links, and all frozen pages are unchanged.

## U. Exact files changed

- `learning-foundation.js`
- `tests/learning-foundation.test.js`
- `tests/retention-foundation.test.js` (new)
- `reports/ovidhan-retention-commercial-3h.md` (new)

## V. Git diff --check

Pending final gate; authoritative result is recorded in the final handoff.

## W. Commit SHA

Assigned after this report is included in the commit and recorded in the final handoff. A commit cannot embed its own final SHA because changing the report changes that SHA.

## X. Push status

Pending final validated commit and branch-only push; authoritative result is recorded in the final handoff.

## Y. Deployment status

Not merged and not deployed. Main is not modified by this branch.

## Z. Recommended next action

Obtain a governed production event export with documented bot/test filtering and cohort eligibility. Perform Day-0 schema verification, then wait for enough eligible learners to report raw numerators/denominators at Day 7/14/28. Do not start pricing, payment, BCS content, or adaptive/AI work until retention and repair-loop evidence supports a narrowly reviewed experiment.
