# Ovidhan Phase 3D — Mistake Mirror release and measurement gate

Status: release gate with one editorial warning; not deployed

## A. Repository, branch, and SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Phase 3D branch: `codex/mistake-mirror-release-gate-3d`
- Phase 3D starting SHA: `aee9e8354fc767b7153e706384bfb3c8e0588f56`
- `origin/main` at precheck: `5b660e0f959122ad68e654eba2888633b5d33acf`

## B. Phase 3C dependency verification

The exact Phase 3C commit `aee9e8354fc767b7153e706384bfb3c8e0588f56` exists locally and on `origin/codex/mistake-mirror-pilot-3c`. Its tree was clean and complete. It was not yet an ancestor of `origin/main`, so this release-gate branch was created directly from the verified Phase 3C commit. Main was not modified.

## C. Exact files changed

Phase 3D changes exactly seven files:

- `learning-foundation.js`
- `mistake-mirror.css`
- `mistake-mirror.js`
- `scripts/verify_mistake_mirror_3c.js`
- `tests/learning-foundation.test.js`
- `tests/mistake-mirror.test.js`
- `reports/ovidhan-mistake-mirror-3d.md`

The scope is limited to accessibility/measurement fixes, tests, and this report.

## D. 30-item editorial review

Each row was reviewed for a genuinely erroneous source, natural correction, unambiguous answer, accurate English and Bangla explanations, defensible classification, reasonable difficulty, and absence of unsupported L1-transfer or Bangladesh-prevalence claims.

| # | Item ID | Wrong | Correct | Category / micro-skill / family | Difficulty | Result |
|---:|---|---|---|---|---|---|
| 1 | `mm-agree-verb` | I am agree with you. | I agree with you. | usage / agree-verb / agree-verb | beginner | PASS |
| 2 | `mm-third-person-s` | She go to school every day. | She goes to school every day. | grammar / subject-verb-agreement / subject-verb-agreement | beginner | PASS |
| 3 | `mm-did-base-verb` | I did not went there. | I did not go there. | grammar / past-after-did / past-after-did | beginner | PASS |
| 4 | `mm-discuss-object` | We discussed about the problem. | We discussed the problem. | grammar / unnecessary-preposition / unnecessary-preposition | beginner | PASS |
| 5 | `mm-article-apple` | She ate a apple. | She ate an apple. | grammar / articles / articles | beginner | PASS |
| 6 | `mm-modal-base` | He can speaks English. | He can speak English. | grammar / modal-base-verb / modal-base-verb | beginner | PASS |
| 7 | `mm-double-negative` | I do not know nothing. | I do not know anything. | grammar / double-negative / double-negative | beginner | PASS |
| 8 | `mm-good-at` | She is good in mathematics. | She is good at mathematics. | usage / fixed-preposition / fixed-preposition | beginner | PASS |
| 9 | `mm-senior-to` | He is senior than me. | He is senior to me. | usage / fixed-preposition / fixed-preposition | beginner | PASS |
| 10 | `mm-depend-on` | Success depends of hard work. | Success depends on hard work. | usage / fixed-preposition / fixed-preposition | beginner | PASS |
| 11 | `mm-interested-in` | I am interested on music. | I am interested in music. | usage / fixed-preposition / fixed-preposition | beginner | PASS |
| 12 | `mm-yesterday-past` | I have seen him yesterday. | I saw him yesterday. | grammar / past-time-marker / past-time-marker | beginner | PASS |
| 13 | `mm-one-of-plural` | One of my friend lives in Dhaka. | One of my friends lives in Dhaka. | grammar / one-of-plural / one-of-plural | intermediate | PASS |
| 14 | `mm-much-many` | There are much students here. | There are many students here. | grammar / countability / countability | intermediate | PASS |
| 15 | `mm-fewer-less` | There are less cars today. | There are fewer cars today. | grammar / countability / countability | intermediate | WARN |
| 16 | `mm-since-for` | I have lived here since five years. | I have lived here for five years. | grammar / since-for / since-for | intermediate | PASS |
| 17 | `mm-married-to` | She is married with a doctor. | She is married to a doctor. | usage / fixed-preposition / fixed-preposition | intermediate | PASS |
| 18 | `mm-listen-to` | Please listen me. | Please listen to me. | usage / fixed-preposition / fixed-preposition | intermediate | PASS |
| 19 | `mm-explain-to` | Please explain me the rule. | Please explain the rule to me. | usage / verb-pattern / verb-pattern | intermediate | PASS |
| 20 | `mm-arrive-at` | We arrived to the station early. | We arrived at the station early. | usage / fixed-preposition / fixed-preposition | intermediate | PASS |
| 21 | `mm-home-no-to` | I am going to home. | I am going home. | grammar / unnecessary-preposition / unnecessary-preposition | intermediate | PASS |
| 22 | `mm-news-singular` | The news are surprising. | The news is surprising. | grammar / subject-verb-agreement / subject-verb-agreement | intermediate | PASS |
| 23 | `mm-people-plural` | People is waiting outside. | People are waiting outside. | grammar / subject-verb-agreement / subject-verb-agreement | intermediate | PASS |
| 24 | `mm-information-uncountable` | I need an information. | I need some information. | grammar / countability / countability | intermediate | PASS |
| 25 | `mm-advice-uncountable` | She gave me an advice. | She gave me some advice. | grammar / countability / countability | intermediate | PASS |
| 26 | `mm-look-forward-gerund` | I look forward to meet you. | I look forward to meeting you. | usage / verb-pattern / verb-pattern | intermediate | PASS |
| 27 | `mm-used-to-base` | I used to played football. | I used to play football. | usage / verb-pattern / verb-pattern | intermediate | PASS |
| 28 | `mm-prefer-to` | I prefer tea than coffee. | I prefer tea to coffee. | usage / fixed-preposition / fixed-preposition | intermediate | PASS |
| 29 | `mm-although-no-but` | Although it was raining, but we went out. | Although it was raining, we went out. | grammar / conjunction-pairing / conjunction-pairing | intermediate | PASS |
| 30 | `mm-because-no-so` | Because I was tired, so I went home. | Because I was tired, I went home. | grammar / conjunction-pairing / conjunction-pairing | intermediate | PASS |

Editorial result: PASS 29, WARN 1, FAIL 0.

## E. Flagged record

`mm-fewer-less` is correct guidance for formal edited English, but “less” with plural count nouns occurs in informal usage. Human editorial review should either approve the current prescriptive framing for this learning context or add a concise register qualifier in a later documented correctness fix. Phase 3D does not silently rewrite it.

## F. Accessibility findings

The loop uses native buttons, a labelled group, real headings, textual correct/incorrect markers, bilingual explanations, and a useful `noscript` fallback. Phase 3D fixed three clear issues: answered options are now disabled, feedback receives programmatic focus and `role=status`, and each intentionally opened stage heading receives focus. Initial page load retains normal body focus. Focus rings are visibly gold, option/continuation controls have a 44px minimum target, and no color alone communicates an outcome. The component has no motion, focus trap, microphone, or gesture-only action.

## G. Functional and mobile findings

Both successful and unsuccessful diagnose/repair/retest paths are verified at 390×844 and a representative desktop viewport. Checks cover completion recording, deterministic next action, second-item continuation, no duplicate completion, no horizontal overflow, page content preservation, and console errors. Existing Dakho links remain normal outbound links; analytics always records installation as `unknown`.

## H. Analytics funnel verification

The observable funnel is:

1. `answer_viewed` — eligible guide view proxy.
2. `mistake_mirror_start` — reviewed item rendered.
3. `mistake_answer` — diagnosis outcome.
4. `mistake_repair_start` — explanation received and repair entered.
5. `mistake_repair_result` — repair outcome.
6. `mistake_retest_result` — immediate retest outcome.
7. `mistake_session_complete` — item completion.
8. `mistake_next_action` — deterministic offer.
9. A later `mistake_mirror_start` with another item ID — continuation.
10. `dakho_cta_view` / `dakho_cta_click` — contextual outbound funnel.

Phase 3D wires the already-allowlisted Dakho events to the existing attributed links while retaining Phase 3B `app_cta_view` and `app_cta_click` compatibility. Event dedupe remains per event/context/session.

## I. Privacy verification

Only allowlisted stable IDs, coarse outcomes, attempt number, reason code, score band, and CTA context/trigger are transported. Raw learner text, free-form answers, PII, query strings, audio, transcripts, arbitrary fields, inferred installs, and third-party tracking are absent. Analytics failure cannot break the learning loop.

## J. Learning metric definitions

All rates use distinct stable event/session/item keys within the chosen measurement window and exclude known test traffic where the analytics environment permits it.

- **Pilot start rate:** sessions with `mistake_answer` ÷ eligible sessions with `answer_viewed`. This treats the first diagnosis submission as intentional start.
- **Diagnosis completion rate:** item starts reaching `mistake_answer` ÷ `mistake_mirror_start` item starts.
- **Repair-attempt rate:** items reaching `mistake_repair_result` ÷ items with `mistake_answer`.
- **Retest completion rate:** items reaching `mistake_retest_result` ÷ items with `mistake_repair_result`.
- **Immediate repair success rate:** items with an incorrect `mistake_answer` followed by correct `mistake_retest_result` ÷ items with an incorrect `mistake_answer` that reach retest.
- **Next-action continuation rate:** offered item IDs followed by a different-item `mistake_mirror_start` in the same session ÷ `mistake_next_action` offers.
- **Multi-item session rate:** sessions completing at least two distinct mistake IDs ÷ sessions completing at least one.
- **Dakho CTA view-to-click rate:** sessions with `dakho_cta_click` ÷ sessions with `dakho_cta_view`, using matching CTA context.
- **Primary — mistakes repaired per learner session:** distinct items with an incorrect diagnosis and later correct immediate retest ÷ sessions with at least one `mistake_answer`.

Immediate retest is an immediate learning proxy, not evidence of durable mastery.

**Future repaired-and-retained rate:** items repaired immediately and answered correctly in a defined delayed retest window ÷ items eligible for that delayed retest. **NOT YET MEASURABLE:** the current pilot has no delayed-retest scheduler or exposure event.

## K. Measurement-window plan

- **Day 0:** production smoke verification for assets, both interaction paths, event payloads, console, mobile layout, canonical/SEO content, and frozen guards.
- **Day 7:** traffic and funnel sanity; check missing/duplicated events, step ordering, event-to-session joins, CTA contexts, bot/test contamination, and implementation errors.
- **Day 14:** first behavioral review only if denominators and traffic are meaningful. Otherwise report `INSUFFICIENT DATA` and continue observation.
- **Day 28:** decide to continue, correct, pause, or propose a separately reviewed expansion. Compare rates and failure families without claiming retention.

No unsupported fixed minimum sample size is set. Report raw numerator/denominator and uncertainty. Do not expand the 30-item set during the window except for documented critical correctness fixes.

## L. Phase 3E Skill/Mistake Graph preparation

Documentation only: a future graph can treat the stable item ID as an activity node, `mistake_family` as a misconception node, `micro_skill` as the teachable-skill node, category as a broader domain, and coarse learner outcome as a time-stamped edge. Reviewed relationships could later connect those nodes to Grammar, Vocabulary, BCS previous questions, bank-job questions, IELTS, and a privacy-safe weakness profile. Eligibility and recommendations should continue to use reviewed relationships and stable reason codes. Phase 3D adds no graph, content, AI, or new exercise engine.

## M. Frozen SEO verification

The existing verifier checks all 72 treatment pages, 72 control pages, 144 unique frozen pages, both manifests, sitemap, robots, enriched dictionary, and experiment baseline against the Phase 3B record. Before and after results are recorded in final validation. Any changed page or guard is a release failure.

## N. Tests

- Learning-foundation unit tests: PASS 15, WARN 0, FAIL 0.
- Mistake Mirror dataset/algorithm suites: PASS 5, WARN 0, FAIL 0, covering all 30 records.
- Accessibility/surface/SEO verifier: PASS 1, WARN 0, FAIL 0.
- Frozen experiment verification: PASS 1, WARN 0, FAIL 0; 144/144 pages and all guards unchanged.
- Browser release scenarios: PASS 2, WARN 0, FAIL 0 (successful mobile flow and unsuccessful desktop flow).
- Browser focus regression: PASS 1, WARN 0, FAIL 0 (body on load, status after answer, heading after transition).
- Editorial records: PASS 29, WARN 1, FAIL 0.

Automated total: PASS 22, WARN 0, FAIL 0. Browser scenario total: PASS 3, WARN 0, FAIL 0. Editorial total: PASS 29, WARN 1, FAIL 0.

## O. Git status

`git diff --check` passes; only non-failing Git line-ending notices appear on Windows. The pre-commit working tree contains only the seven exact Phase 3D paths listed above.

## P–R. Commit, push, and deployment

Recorded after the one Phase 3D commit. Only `codex/mistake-mirror-release-gate-3d` may be pushed. No merge or deployment is authorized.

## S. Recommended next action

Have a human editor decide the one flagged register-sensitive item, review this gate, and merge only through the normal review process. After an authorized deployment, run the limited Day 0/7/14/28 measurement plan. Do not begin Phase 3E automatically.
