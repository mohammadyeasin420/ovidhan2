# Ovidhan IELTS Trust, Hub Consolidation & Routing Safety — Phase 6B

## Scope and baseline

- Starting `main`: `e396976ab8b08aee6a39e5b637cc59fe9ab3fcbb`
- Branch: `codex/ielts-hub-trust-6b`
- Phase 6A architecture audit was present before implementation.
- This phase consolidates routing and claims. It does not migrate diagnostic evidence, change the graph, add skills, or alter the diagnostic storage key.

## Hub architecture

`ielts-guide.html` remains the single broad, self-canonical acquisition hub. It now sends learners first to the 40-question readiness diagnostic and then to the post-diagnostic roadmap, vocabulary starter list, IELTS-style listening practice, and existing general grammar/writing resources. The hub explicitly says the readiness diagnostic is neither an official IELTS test nor a band estimate.

`ielts-preparation-bangla.html` contained no unique material that was both absent from the hub/roadmap and safe to retain as a separate broad intent. The repository has no deploy configuration capable of expressing an HTTP 301. It is therefore a minimal project-compatible client redirect: `noindex,follow`, canonical to `/ielts-guide.html`, immediate meta refresh, `location.replace`, and an accessible fallback link. It no longer presents a second self-canonical hub.

The sitemap was not changed because it is a frozen SEO guard. The diagnostic remains discoverable through the hub. Its existing `ovidhan_ielts_diagnostic_v2` state and question engine are unchanged; only a roadmap link was added to the result path.

## Official-source claim record

Review date for every source: **2026-08-22**.

| Official URL | Exact learner-facing claim supported |
|---|---|
| `https://ielts.org/take-a-test/test-types/ielts-academic-test` | Academic has Listening, Reading, Writing and Speaking; Listening and Speaking are the same as General Training while Reading and Writing differ; published timings are approximately 30, 60, 60 and 11–14 minutes respectively. |
| `https://ielts.org/take-a-test/test-types/ielts-general-training-test` | General Training has the same four sections and the same stated cross-test differences and timings. |
| `https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing` | Academic Writing has two tasks; Task 1 requires at least 150 words and Task 2 at least 250 words. |
| `https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-writing` | General Training Writing has two tasks; Task 1 is a letter of at least 150 words and Task 2 an essay of at least 250 words; total Writing time is 60 minutes. |

Unsupported outcome promises, vocabulary quantity/universality claims, diagnostic band estimation, and official/full-mock equivalence were removed or qualified on the governed surfaces. The vocabulary URL retains its 2026 slug for compatibility; that date token is documented technical debt for a later migration, not an instruction to change the URL in this phase.

## Listening trust boundary

The mock page is labelled IELTS-style practice and states that it is Ovidhan-generated rather than official material. The four short listening pages identify browser-generated speech and say it is neither authentic nor official IELTS audio. Their four broken `/listening/ielts-section-[1-4].html` related links now point to the IELTS hub; the valid sequential lesson chain is retained.

## SmartPath routing safety

Static reviewed destinations now carry explicit `goal_ids` based on existing reviewed goal mappings. `writing_precis` is eligible for BCS, Bank, University Admission and General English, but not IELTS. `formal_letter_writing` retains reviewed IELTS eligibility as well as BCS, University Admission, General English and Spoken/Career English. No goal graph or runtime router behavior changed. Focused unit and Phase 6B contract tests guard both boundaries; BCS regressions remain required.

## Future boundary: diagnostic evidence

The diagnostic continues to produce a separate broad readiness summary in `ovidhan_ielts_diagnostic_v2`. A later separately governed phase may map individually reviewed questions to existing canonical Skill Graph IDs and migrate bounded evidence through Learning Foundation, Mistake Profile and SmartPath. That work must define provenance, migration, deduplication, retention, rollback and false-confidence safeguards before changing state. Phase 6B deliberately does none of it.

## Future innovation — Boundary Diagnostic

A future, separately governed Boundary Diagnostic may follow this sequence: clean scored diagnostic answer → canonical skill evidence → optional **NON-SCORED** nearby contrast probe after the answer → boundary evidence → SmartPath repair. It must never hint before the scored diagnostic answer, and the probe must not alter the diagnostic score. It must make no IELTS band prediction and requires no AI for V1. Empirical validation is required before scale, while diagnostics and retests must remain uncontaminated. This functionality is not implemented in Phase 6B.

## Verification record

Final command results, responsive browser checks, console observations, frozen SEO counts/hash, and commit SHA are recorded in the delivery handoff after the clean final run.
