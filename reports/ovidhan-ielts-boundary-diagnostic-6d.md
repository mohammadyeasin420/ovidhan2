# Ovidhan IELTS Boundary Diagnostic Pilot — Phase 6D

## Integration record

- Starting SHA: `db41c02c3e350ad55bd104b607726997c05c990c`
- Branch: `codex/ielts-boundary-diagnostic-6d`
- Final commit: `feat: add IELTS boundary diagnostic pilot` (the immutable SHA is reported after commit creation)
- Scope: five governed files; no learning engine, graph, goal, SmartPath, storage-key, backend, analytics, AI, or frozen SEO changes

## Governed pilot

The original diagnostic remains exactly 40 scored questions. Four optional, non-scored transfer probes are loaded from `data/ielts-boundary-probes-v1.json`:

| Probe | Anchor | Canonical skill | Contrast dimension | Evidence ID |
|---|---|---|---|---|
| P01 | `ielts-diag-v1-q06` | `compound_subject_agreement` | `nearest_subject_number` | `ielts-boundary-v1:p01` |
| P02 | `ielts-diag-v1-q08` | `indefinite_article_a_an` | `initial_sound_exception` | `ielts-boundary-v1:p02` |
| P03 | `ielts-diag-v1-q07` | `gerund_after_preposition` | `new_preposition_context` | `ielts-boundary-v1:p03` |
| P04 | `ielts-diag-v1-q25` | `essay_thesis_focus` | `new_topic_same_thesis_structure` | `ielts-boundary-v1:p04` |

The asset is reviewed, tied to assessment `ielts-diagnostic-v1`, and pinned to question fingerprint `8885fda5188fe35301cda2ed2bdbeb255c460470b58c6cac544e4b31a9a8455d`.

## Contamination prevention and score isolation

The scored anchor is answered and locked before an optional probe appears. Anchor correctness and its explanation remain hidden while the probe is pending, so the scored answer is never hinted. Next and ArrowRight cannot bypass a pending probe; Previous remains available. Returning to a pending anchor shows the same probe again. Answered and skipped probes are not asked again.

Probe correctness is held in a separate runtime map and is never read by score or six-category calculations. It does not change readiness score, category percentages, IELTS band, mastery, Mistake Mirror, repair, retest, or SmartPath score. Skipping immediately reveals normal anchor feedback and creates no Boundary evidence.

## Evidence governance

Boundary evidence is assembled and recorded only inside the existing full-completion `showResults()` path. Only answered probes generate `BOUNDARY_PROBE` evidence through `recordSkillEvidence`; skipped probes and unfinished assessments generate none. Retakes reuse the four stable evidence IDs, allowing Learning Foundation to update the record and increment attempts. No raw question, option, explanation, or signal interpretation is persisted.

The four deterministic display interpretations are:

- correct anchor + correct probe: `TRANSFER_OBSERVED` — “Held in one nearby case”
- correct anchor + wrong probe: `BOUNDARY_CANDIDATE` — “Nearby context needs verification”
- wrong anchor + correct probe: `CONTEXT_SENSITIVE_SIGNAL` — “Mixed result across nearby cases”
- wrong anchor + wrong probe: `REPEATED_GAP_SIGNAL` — “Repeated gap across nearby cases”

Every answered interpretation states that one transfer check is not enough to prove mastery or weakness. The signal code is not persisted as a boundary diagnosis or mastery state. SmartPath weighting is deferred until empirical results show that a single nearby contrast is reliable and useful at scale.

## Privacy and fallback

The pilot is client-only. It adds no analytics, backend, AI, or storage key. Probe responses remain in memory until full completion. The asset is requested same-origin and validated for pilot ID, anchor assessment/hash, and probe array. A failed or invalid load is caught silently and leaves the Phase 6C diagnostic behavior available without blocking the learner or producing a console error from this code.

## Results and retake behavior

The permanent `boundarySignals` results container stays hidden unless at least one probe was answered. It renders only answered probes with friendly skill names, a cautious transfer label, and the non-mastery caveat—never a score, percentage, band, or mastery label. Retake resets every probe to `PENDING`, hides the section, and clears its grid before the next run, preventing duplicate content.

## Browser QA

Tested at `390×844` and `1440×900` against a local same-origin server.

- Exercised all four correct/wrong anchor–probe combinations and verified their exact labels.
- Verified skip, Previous while pending, return to pending anchor, answered-not-repeated, skipped-not-repeated, and ArrowRight blocking.
- Completed a 40-question run: score remained `8/40`, six category cards remained present, and four answered transfer cards appeared separately.
- Verified Transfer checks stay hidden after retake and the result grid is cleared without duplication.
- Verified hamburger opens on mobile.
- Mobile document width was `375/375` CSS pixels within the requested viewport; desktop was `1425/1425`; neither had horizontal overflow.
- No browser console errors or warnings were recorded in the initial run, completed results, desktop check, or retake/skip run.

## Automated QA

- `tests/boundary-diagnostic.test.js`: 11/11 passed, including all signal combinations, skip/incomplete/completed payload rules, score isolation, retake attempt increments, state isolation, and reset.
- Phase 6D verifier: passed with 40 scored questions, four probes, exact fingerprint, governed mappings/evidence IDs, completion-only persistence guards, graph counts, and actual frozen-file hashing.
- Regression and syntax commands are recorded in the final task handoff after the complete suite runs.

## Unchanged governed baselines

- Skill families: 14
- Active skills: 65
- Practice item mappings: 240
- Frozen SEO aggregate: `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`

## Limitations and future validation criteria

This is a four-item, one-contrast-per-skill pilot. It cannot establish mastery, weakness, general transfer, IELTS band, or population-level validity. Before expansion or SmartPath weighting, validation should measure completion/skip rates, item clarity, anchor-to-probe response patterns, retake stability, false-positive/false-negative risk, learner comprehension of the non-scored status, and whether repeated independent contrasts predict later canonical practice or retest performance without contaminating diagnostics.
