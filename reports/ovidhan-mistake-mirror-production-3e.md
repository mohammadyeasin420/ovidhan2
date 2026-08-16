# Ovidhan Phase 3E — Mistake Mirror production verification

Status: production functional; insufficient post-deployment analytics data; one register clarification awaiting review/deployment

Verification date: 2026-08-16

## A. Repository and main SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Verified `origin/main`: `5699c1c23d08611a10b1aee6f2f22695004ba323`
- Production-fix branch: `codex/mistake-mirror-production-3e`
- Branch starting SHA: `5699c1c23d08611a10b1aee6f2f22695004ba323`

## B. Phase 3D merge verification

After fetching origin, all required commits were verified as ancestors of `origin/main`:

- Phase 3C: `aee9e8354fc767b7153e706384bfb3c8e0588f56`
- Phase 3D implementation: `dca05dcd7d894c3ed5580a4fdb03af4ac62ffca6`
- Phase 3D handoff: `e10e278c25d1eb233ba666ae79f1149b799a1397`

Main is the PR #15 merge commit. Git history was not repaired or rewritten.

## C. Deployment verification

Verdict: **LIVE MATCH** for the merged Phase 3D implementation.

The page and all three required pilot assets return HTTP 200 over HTTPS. Plain HTTP redirects once to the exact HTTPS production URL. The rendered interface contains the merged accessibility behavior, one Mistake Mirror component, the complete existing guide, and the expected production navigation/footer.

## D. Live URL

`https://ovidhan.net/common-mistakes-bangladeshi-learners.html`

- Final URL: exact HTTPS page URL (debug query was used only for privacy-safe console event verification).
- Canonical: `https://ovidhan.net/common-mistakes-bangladeshi-learners.html`
- Title: `Common English Mistakes Bangladeshi Learners Make | Ovidhan`
- Meta description: present and useful.
- H1: correct and unique in the visible surface.
- Robots: no accidental `noindex`.
- Structured data: two JSON-LD blocks remain present.
- Required assets: `learning-foundation.js`, `mistake-mirror.js`, and `mistake-mirror.css`, all HTTP 200.

## E. Desktop QA

At 1366×768, document client/scroll widths were 1351/1351: no horizontal overflow. The unsuccessful path completed, feedback and next action rendered, body focus remained normal after reload, the component appeared once, all four Dakho links remained valid, and the browser console contained zero warnings/errors.

## F. Mobile QA

At 390×844, document client/scroll widths were 375/375: no horizontal overflow. Bangla and English content were readable, controls retained 44px targets, initial focus remained on the body, feedback received `role=status` focus, the page header/footer and Download App destinations remained present, and no duplicate component appeared.

## G. Successful learning-loop QA

The live path passed:

`diagnose correctly → bilingual explanation → correct repair → correct retest → one meaningful action → deterministic next action → second item`

The first item recommended `She ate an apple.` and the second item opened. Answered controls disabled, preventing duplicate interaction. The public session-action marker became `1`.

## H. Unsuccessful learning-loop QA

The live path also passed:

`incorrect diagnosis → explanation → unsuccessful repair → unsuccessful retest → completion record → deterministic next action`

The UI explicitly displayed “এটি আবার দেখুন”, the verified wrong/correct pair, both explanations, and the next item. After reload and repeating the same item, the public session-action marker remained `1`, confirming same-session meaningful-action deduplication.

## I. Learner-state verification

- Production uses schema version 2 under the existing Phase 3B storage key.
- State stores anonymous learner ID, bounded progress, stable mistake IDs, and bounded `mistakeSignals`; no content text is duplicated into the learner record.
- The live public action marker persisted across refresh and repeated completion did not increment it.
- Second-item continuation worked.
- Automated tests verify anonymous/session IDs, normalization, persistence, bounded signals, corrupt-state recovery, session expiry behavior, action dedupe, and memory fallback when storage is unavailable.
- Browser storage contents were not inspected, deleted, or migrated during QA. No account or login was introduced.

## J. Analytics event audit

All events use the Phase 3B common context (`page_id`, `content_type`, `intent`, `goal`) plus only the properties listed below. Dedupe keys are stored as `event_name:key` in the capped same-session set.

| Event | Trigger | Additional allowed properties | Dedupe |
|---|---|---|---|
| `mistake_mirror_start` | Initial reviewed item render or intentional second-item open | `mistake_id`, `mistake_family` | Once per item/session |
| `mistake_answer` | First diagnosis submission | `mistake_id`, `mistake_family`, `result`, `option_id`, `attempt_number` | Once per item/session |
| `mistake_repair_start` | Intentional transition into repair | `mistake_id`, `mistake_family` | Once per item/session |
| `mistake_repair_result` | Repair choice submitted | `mistake_id`, `mistake_family`, `result`, `option_id`, `attempt_number` | Once per item/session |
| `mistake_retest_result` | Immediate retest submitted | same result fields | Once per item/session |
| `mistake_session_complete` | Retest completes the item | `mistake_id`, `mistake_family`, `result`, `mastery_status` | Once per item/session |
| `mistake_next_action` | Deterministic next item is offered | `mistake_id`, `destination_id`, `reason_code`, `score_band` | Once per source item/session |
| `dakho_cta_view` | Attributed CTA reaches the visibility threshold | `cta_id`, `cta_context`, `trigger`, `install_status` | Once per CTA context/session |
| `dakho_cta_click` | Attributed CTA is clicked | same CTA fields | Once per CTA context/session |

Live debug output confirmed the entire first-item sequence, a second `mistake_mirror_start`, and Dakho CTA views in the expected order. `answer_viewed` and legacy-compatible `app_cta_view` also fired.

## K. Privacy audit

PASS. The allowlist strips raw learner text, names, email, phone, exact personal identity, audio, transcript, free-form answers, arbitrary properties, and sensitive information. Stable editorial IDs and coarse results are allowed. Analytics failure is isolated from product behavior. No new tracker or SDK was added.

## L. Dakho CTA attribution

The website can measure a visibility-qualified CTA view and an outbound CTA click by stable context (`navigation`, `mistakes-section`, `footer`, or `floating`). A click is always recorded with `install_status: unknown`. The website cannot currently verify installation or connect a Play Store install callback, so no install or conversion is inferred.

## M. Available production metrics

The event schema can support page opportunities, intentional diagnosis answers, repair entry/results, retest results, item completions, next-action offers, second-item starts, and Dakho views/clicks. There is no separate explanation-view event; `mistake_repair_start` is the defensible proxy for entering the explanation-to-repair step. A `mistake_next_action` is an offer, not a click; a different subsequent `mistake_mirror_start` is the continuation evidence.

No connected aggregate production analytics dataset was available in this task. Therefore no trustworthy page-view totals, learner counts, numerators, denominators, or segment rates can be reported.

## N. Baseline determination

**INSUFFICIENT POST-DEPLOYMENT DATA**

The technical schema is ready and live events were verified interactively, but a behavioral baseline cannot be manufactured from one QA session. Future reporting should show raw numerator/denominator for diagnostic activation, loop completion, immediate repair success, second-item continuation, repeat learner, and Dakho CTA CTR. Immediate retest must not be called long-term mastery.

Canonical funnel:

`Google/internal discovery → common-mistakes page → diagnostic → mistake identified → explanation/repair → retest → local learner state → deterministic next action → repeated learning → Dakho CTA → install unknown`

## O. Editorial warning decision

Production currently uses an absolute fewer/less explanation. Phase 3E applies only the authorized minimal clarification on the fix branch:

- Formal or edited English prefers `fewer` with plural countable nouns.
- `Less` also occurs informally.

Both English and Bangla explanations were updated; the wrong/correct sentences, item ID, family, answer logic, and all other records remain unchanged. A dedicated regression test protects the register distinction. This clarification is not yet deployed.

## P. Performance

Production responses and observed transferred sizes:

| Resource | HTTP | Raw bytes | Compressed transfer bytes |
|---|---:|---:|---:|
| HTML | 200 | 70,038 | 13,860 |
| `learning-foundation.js` | 200 | 30,067 | 6,520 |
| `mistake-mirror.js` | 200 | 15,340 | 4,746 |
| `mistake-mirror.css` | 200 | 1,681 | 644 |

The page loads each pilot JS/CSS asset once. No missing pilot asset, duplicate component, framework, new dependency, or console-breaking error was found. The existing Google tag and Google Fonts remain pre-existing requests.

## Q. Frozen dictionary verification

Before implementation, the existing verifier passed with 72 treatment, 72 control, and 144 unique frozen pages. Aggregate SHA-256 remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`. Both manifests, the experiment baseline, sitemap, robots, and `enriched-dictionary.json` matched their guard hashes. The same verification is required after the Phase 3E edit.

The experiment checkpoints remain Day 7: 2026-08-23, Day 28: 2026-09-13, and Day 56: 2026-10-11. No new dictionary batch was generated.

## R. Bugs found

- Production-breaking defects: 0.
- Privacy/security defects: 0.
- Analytics correctness defects: 0.
- Serious accessibility defects: 0.
- Editorial warning: 1, the already-known fewer/less register nuance; minimally clarified on this branch.

## S. Exact files changed

- `mistake-mirror.js`
- `tests/mistake-mirror.test.js`
- `reports/ovidhan-mistake-mirror-production-3e.md`

## T. Commit SHA

Editorial implementation commit: `f6c2ce2919cfe5a22c6ee36f0b3747fe46dda04f` (`Clarify fewer and less register guidance`). The diagnostic report is committed separately afterward on the same branch so it can contain the exact implementation SHA.

## U. Push status

The implementation commit was pushed successfully only to `origin/codex/mistake-mirror-production-3e`. The final report-only commit and remote synchronization are verified in the task handoff.

## V. Final recommendation

Human-review and merge the narrow register clarification, then deploy through the normal process. Start measurement only after excluding QA traffic where possible and confirming aggregate event ingestion. At Day 7, report raw funnel counts or `INSUFFICIENT DATA`. Do not start Phase 3F automatically. The recommended next product phase, only after 3E review, is a documented deterministic learner-intelligence specification that reuses item IDs, mistake families, micro-skills, outcomes, and next-action rules before any competitive-exam implementation.
