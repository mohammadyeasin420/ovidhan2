# Ovidhan Phase 4D — BCS Candidate Center MVP

## A. Starting SHA

`origin/main` and local `main` were clean and equal at `c1becad27e79b20689a55eff4711c1c485d30351`, the merge commit for Phase 4C PR #22. Phase 4C head `7b490fcb28f5139b8cd4ee14023254b0c83e0b4b` is an ancestor.

## B. Branch

`codex/bcs-candidate-center-4d`. No merge or deployment was performed. The existing implementation is being finalized after human desktop review.

## C. Existing BCS URL inventory

Existing public preparation URLs are preserved: `bcs-500-words.html`, `bcs-english-diagnostic.html`, `bcs-english-grammar-bangla.html`, `bcs-english-mock-test.html`, both question-pattern pages, `bcs-english-synonyms-antonyms.html`, `bcs-vocabulary-guide.html`, `learning-path-bcs.html`, and two mock-test pages. These remain supporting content. The legacy compiled bank still contains 18 BCS-tagged questions with no trusted provenance and was not changed or exposed as Question DNA.

## D. Canonical hub decision

`/bcs/` was unused and does not cannibalize a prior hub. It is the authoritative Candidate Center route; existing preparation URLs keep their own canonicals. The shared header template and `exam-prep.html` now point their BCS navigation entry to `/bcs/`. No destructive redirect or URL deletion was made.

## E. Exact files changed

- `bcs/index.html` (new)
- `bcs/candidate-center.css` (new)
- `bcs/candidate-center.js` (new)
- `learning-foundation.js`
- `tests/learning-foundation.test.js`
- `header.html`
- `exam-prep.html`
- `scripts/verify_bcs_candidate_center_4d.js` (new)
- `reports/ovidhan-bcs-candidate-center-4d.md` (new)

## F. Candidate Center architecture

The mobile-first static page provides a Bangla-first hero, stage selector, deterministic next action, six existing English preparation pathways, source/trust labels, an official-information safe state, and respectful result-status guidance. There is no backend, account, authentication, result checker, framework, or AI.

## G. Phase 4C integration

The page fetches `/data/bcs-candidate-intelligence-v1.json`, requires schema V1 and exactly 11 stages, and renders labels, actions, transitions, and learning CTA from that canonical model. It does not define a second stage array or publish an exam record.

## H. Stage UI

The native labelled select is populated from all 11 bilingual Phase 4C stages. Only a validated stable stage ID is optionally stored under `ovidhan_bcs_candidate_stage_v1`. The page asks for no name, roll, registration number, NID, phone, or result data.

## I. Deterministic next-action logic

Selection resolves the exact canonical stage record and renders its description, candidate actions, next-stage labels, and optional canonical learning CTA. URL hash history uses `#stage=STABLE_ID`; `pushState` and `popstate` support navigation. Reload prefers the hash and then local stage state. No learner outcome or failure reason is inferred.

## J. English preparation pathways

All targets exist locally: BCS English Diagnostic, BCS Grammar, BCS Vocabulary, Mistake Mirror, BCS English Mock Test, and BCS Learning Path. Written and viva stage CTAs use the Phase 4C mappings to existing writing and interview-English routes.

## K. Official-source handling

No date, deadline, circular, seat plan, result, answer key, or candidate record is published. The official area explicitly states that no verified batch update is available. It links only to `https://bpsc.gov.bd/`, verified on 2026-08-17 as the Bangladesh Public Service Commission official government site. Future claims remain subject to Phase 4C provenance and human approval.

## L. Provenance UI

Compact badges distinguish `Official BPSC`, `Official Government`, and `Ovidhan guidance`. The official link is labelled as an external authoritative source; preparation guidance is explicitly not government instruction.

## M. Analytics

The existing first-party learning adapter now allowlists the six Phase 4C BCS events and only bounded `exam_id`, `stage_id`, `source_type`, `action_id`, and `surface` properties as applicable. The MVP emits center view, stage selection, official-source open, and learning CTA clicks. Tests prove name, roll, and registration-number properties are stripped.

## N. SEO changes

The new page has a unique title, useful description, self-referencing canonical, one H1, crawlable internal links, and no `noindex`. It contains no fabricated FAQ or keyword stuffing. No existing BCS preparation canonical changed.

## O. Sitemap/canonical changes

Canonical: `https://ovidhan.net/bcs/`. `sitemap.xml` was deliberately not changed because it is a frozen experiment guard whose byte hash must remain unchanged. Shared navigation provides crawl discovery. Adding the one route to the sitemap must wait until the frozen guard policy is deliberately revised in a separately approved phase.

## P. Mobile QA

**MOBILE HUMAN QA: NOT YET VERIFIED.** Static mobile safeguards are present: 480/760 px breakpoints, single-column stage panels below 760 px, single-column cards below 480 px, 46–50 px interactive controls, wrapped trust badges, and no floating/sticky CTA. No mobile visual-pass claim is made.

## Q. Desktop QA

**DESKTOP HUMAN VISUAL QA: PASS.** This was human-executed desktop visual QA in Chrome at `http://localhost:4173/bcs/`, not Codex automated browser QA. Human screenshots verified successful rendering; visible header/navigation; correct Bangla and English rendering; visible stage selector and deterministic next-action panel; all BCS English preparation cards; Official BPSC area; provenance/trust labels; result/status caution area; and footer. No obvious desktop horizontal overflow, duplicated layout components, overlapping content, or obstructing floating CTA was observed.

## R. Accessibility observations

Implemented: skip link, semantic main/sections/navigation, labelled native select, `aria-live` action result, clear external-link semantics, visible keyboard focus, sufficient control height, heading hierarchy, and text alternatives for icon-only decoration. Browser-based keyboard and contrast observation remains deferred with the blocked QA.

## S. Performance delta

New Candidate Center files: 17,652 raw / 6,263 gzip bytes. `learning-foundation.js` grows from 38,036/8,035 to 39,156/8,151 raw/gzip bytes: +1,120 raw / +116 gzip. Total production asset delta: approximately +18,772 raw / +6,379 gzip bytes. No dependency or framework was added.

## T. Network delta

On `/bcs/`: one document plus four same-origin assets/requests (CSS, Candidate Center JS, existing learning foundation, and existing Phase 4C JSON). No font, AI, backend, database, or third-party analytics request was added. The official BPSC URL is requested only after a user click.

## U. Regression results

PASS: Phase 4D validator; Phase 4C validator; Phase 4A Question DNA/source validator; Phase 3H retention 7/7; Phase 3G graph validator and 8/8 tests; learning foundation including BCS privacy test; Mistake Profile 9/9; Mistake Mirror static check and 6/6 tests; Phase 3F 6/6; `git diff --check`. Runtime browser QA is blocked, not failed.

## V. Frozen experiment verification

PASS: 72 treatment + 72 control = 144 unchanged pages. Aggregate SHA-256 remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`. Sitemap, robots, enriched dictionary, treatment/control manifests, and baseline hashes remain unchanged.

## W. Risks

Mobile human QA remains incomplete. The Candidate Center has no verified exam/batch feed, watcher, production funnel baseline, or sitemap entry. Existing preparation pages contain legacy claims outside the new provenance model and were not automatically migrated.

## X. Deferred items

Complete future 390×844 human mobile QA before claiming a mobile visual PASS. Exam ingestion, result lookup, notifications, and watcher deployment remain out of scope.

## Y. Exact expected live URL

`https://ovidhan.net/bcs/`

## Z. Final recommendation

Commit and push the existing implementation only after the minimal Phase 4D/4C, BCS privacy, frozen SEO, and diff checks pass. Keep mobile QA explicitly unverified, and do not merge or deploy.
