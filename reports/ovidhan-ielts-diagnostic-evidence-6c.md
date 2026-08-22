# Ovidhan IELTS Diagnostic → Canonical Evidence — Phase 6C

## Baseline and scope

- Starting `main`: `b7e055dc8f3ce1e80ab5de2f0e829559bd095bf7`
- Branch: `codex/ielts-diagnostic-evidence-6c`
- Purpose: connect the existing completed 40-question Ovidhan readiness diagnostic to shared, bounded canonical evidence without creating an IELTS-specific engine.
- Graph remains 14 families, 65 ACTIVE skills, and 240 practice mappings. No graph node, goal mapping, destination eligibility, diagnostic question text, option, answer, explanation, or band prediction changed.

## Reviewed 40-question inventory

The manifest `data/ielts-diagnostic-skill-map-v1.json` contains every stable ID from `ielts-diag-v1-q01` through `ielts-diag-v1-q40` exactly once. All records and the assessment are `REVIEWED`; the practice type is `OVIDHAN_CREATED_DIAGNOSTIC` and `official_question` is false.

- Mapped objective items: **24**
- Unmapped items: **16**
- Exact canonical skills used: `compound_subject_agreement`, `essay_outline_structure`, `essay_thesis_focus`, `fixed_expression`, `gerund_after_preposition`, `grammatical_number_nouns`, `indefinite_article_a_an`, `reading_inference`, `reading_main_idea`, `reading_reference`, `reading_supporting_detail`, `reading_tone_purpose`, `subordinate_clause_connection`, `word_choice_register`.

Unmapped groups:

- Questions 1, 2 and 5: second conditional, past perfect sequencing, and future passive have no precise current canonical skill.
- Question 16: word-family derivation has no precise current canonical skill.
- Question 24: passage organisation has no precise current canonical reading skill.
- Question 28: cohesive relative-clause rewriting has no precise current canonical skill.
- Questions 31–35: listening-strategy/text proxies are not listening-performance evidence.
- Questions 36–40: speaking strategy/language-choice proxies are not speaking-performance evidence.

## Shared evidence ledger

Learning Foundation state advances safely from version 4 to version 5 and adds generic `skillEvidence` inside the existing `ovidhan_learning_v1` store. `recordSkillEvidence(evidenceId, skillId, evidenceType, result, sourceId)` validates bounded opaque identifiers, canonical-skill-shaped IDs, allowed evidence types and `correct|incorrect` results. Each record holds only evidence ID, skill ID, evidence type, source ID, result, first/last timestamps and a capped attempt count. The ledger is capped at 250 records.

The same evidence ID is updated on retake, so attempts and recency change without inflating distinct evidence. The schema admits `BOUNDARY_PROBE` as a future generic evidence type, but Phase 6C neither records nor infers boundary evidence.

No question text, passage, option, selected-answer text, learner-written text, audio, transcript, identity, PII, repair result, retest result, mastery status, or band estimate is stored.

## Completion and legacy behavior

Stable question IDs are attached without changing question content. Canonical observations are recorded only inside the existing full-completion result path and only for `MAPPED_OBJECTIVE` records. Unmapped questions still contribute to the unchanged six-category Ovidhan readiness result but create no canonical evidence.

The legacy `ovidhan_ielts_diagnostic_v2` broad summary may still be read for display continuity. It is never converted to canonical evidence. After shared persistent evidence succeeds, it is cleared and is no longer written as authoritative state. If shared persistence is unavailable, the diagnostic remains usable and may retain the legacy display summary when local storage itself is available. No replacement IELTS-only key was created.

## Profile and SmartPath semantics

Mistake Profile exposes `diagnosticEvidence` and `diagnosticGap` separately on canonical micro-skills. Diagnostic-only observations leave existing `NEW`, `NEEDS_PRACTICE`, `IMPROVING`, `STABLE`, and `STRONG` calculations untouched. Correct diagnostic evidence does not create mastery; incorrect evidence does not create a failed retest or unresolved mistake.

SmartPath adds deterministic `DIAGNOSTIC_GAP` with a modest score of 24. Priority remains failed retest > unresolved mistake > established weak skill > diagnostic gap. Only eligible reviewed destinations can receive the signal. IELTS still excludes `writing_precis`; existing Formal Letter eligibility is unchanged. If no eligible IELTS destination matches, no unrelated BCS-only route is invented.

The results CTA sets the existing shared goal to `IELTS` only when the learner explicitly activates “Continue with IELTS SmartPath”, then navigates to the existing SmartPath surface. Merely completing the diagnostic does not overwrite the learner goal.

## Privacy and limitations

All persistence is local, bounded and text-free. There is no external API, backend, AI, probability, confidence percentage, scientific-looking mastery metric, or new storage key. Diagnostic signals are practice candidates that require verification. Strategy proxies and productive Listening/Speaking/Writing performance remain outside canonical evidence until suitable reviewed assessments exist.

## Phase 6D readiness

The generic ledger can later store a separately governed `BOUNDARY_PROBE` observation after a clean scored answer. Phase 6D must preserve non-scored probes, avoid pre-answer hints, validate boundary inference empirically, and keep diagnostics/retests uncontaminated. No contrast probe or boundary inference is implemented here.

## Verification and delivery

Browser QA executed the real 40-answer completion path at 390×844: the result screen and 14 canonical-skill signal cards rendered, only the 24 mapped items were eligible to write evidence, the mobile menu opened without overflow, and the console was clean. A second full retake retained the same 14 observed skill cards while unit/verifier inspection confirmed one bounded record per stable evidence ID with incremented attempts. Explicit CTA activation navigated to the existing SmartPath surface, selected the shared `IELTS` goal, and exposed no précis route. At 1440×900, start, answer feedback and layout passed without overflow or console warnings/errors. Storage-unavailable behavior is covered by the existing and extended Learning Foundation harness: the diagnostic remains functional using the in-memory fallback.

Required unit, regression, privacy, graph, routing, frozen SEO and diff gates are run before delivery. The final containing commit SHA and clean status are reported in the handoff. Compare/PR URL: `https://github.com/mohammadyeasin420/ovidhan2/compare/main...codex/ielts-diagnostic-evidence-6c`.
