# Ovidhan Free IELTS Beta measurement — Phase 6T

## Contract

The measured funnel is ENTRY → TEST TYPE → PRACTICE START → EVIDENCE CREATED → WEAKNESS MAP → NEXT ACTION → REPAIR START → RETRY COMPLETE → RETURN → optional DAKHO CTA. Phase 6T reuses `OvidhanLearning.track()`, its event/property allowlists, `sanitizedProperties()`, and the existing gtag transport. It adds no analytics engine, direct gtag call, backend, score, mastery inference, or learner-facing feature.

The four new events are `ielts_practice_started`, `ielts_evidence_created`, `ielts_repair_started`, and `ielts_retry_completed`. Their only domain properties are `test_type`, `skill_area`, `task_type`, `evidence_kind`, `provenance`, `repair_code`, `outcome`, `learner_state`, and where applicable the existing `evidence_area_count`. Foundation page context remains bounded. `ielts_free_entry_view` always reports bounded `test_type`, `evidence_area_count` (0–4), and `learner_state`. Its state is `NEW_NO_EVIDENCE` when no retained IELTS evidence exists and `RETURNING_WITH_EVIDENCE` when at least one IELTS skill area has retained evidence; generic session count is not used.

Objective Reading/Listening and objective visual probes use `OBJECTIVE`. Writing/Speaking self-review and Task 1 `SELF_REPORTED_RESPONSE_CHECK` use `LEARNER_SELECTED`; Task 1 `OBJECTIVE_VISUAL_PROBE` uses `OBJECTIVE`. Canonical evidence kinds are `OBJECTIVE`, `OBJECTIVE_AUDIO_COMPREHENSION`, `SPEAKING_PERFORMANCE_ATTEMPT`, `WRITING_PERFORMANCE_ATTEMPT`, `SELF_REPORTED_RESPONSE_CHECK`, and `OBJECTIVE_VISUAL_PROBE`. Objective outcomes are normalized to `OBJECTIVE_CORRECT` or `OBJECTIVE_INCORRECT`. Self-reported outcomes remain the bounded `CREATED`, `YES`, `NO`, `NOT_SURE`, `BETTER`, `TRY_AGAIN`, or `SAME` values. Test types, skill areas, task types, provenance, repair codes, learner states, evidence counts, evidence kinds, and outcomes are enum/range checked at the analytics boundary; invalid arbitrary values are omitted. `BETTER` and `YES` are self-report, never mastery. Failed evidence writes emit nothing.

## Metrics

- Stage conversion: unique eligible sessions reaching each stage divided by the previous stage and by entry sessions.
- Evidence creation rate: entry sessions with at least one successful evidence write.
- Repair activation: sessions with a real repair start divided by sessions selecting/viewing a next action.
- Retry completion: sessions with a completed objective retest or productive self-review divided by repair starts, segmented by bounded outcome.
- Return-with-evidence rate: entry sessions classified `RETURNING_WITH_EVIDENCE` from retained IELTS evidence, not unrelated activity or generic session count.
- Optional Dakho interest: existing `dakho_cta_view` and `dakho_cta_click`, emitted by IELTS pages with `IELTS_FREE_BETA` context; never duplicated as a new CTA event. The common-mistakes instrumentation gate does not control IELTS CTA observation or clicks.

Major product decisions require at least 7 full days and preferably 100+ Free IELTS entry sessions. Below that threshold the finding is **INSUFFICIENT TRAFFIC**, not product failure. Real-world funnel data is not yet available in this implementation phase.

## Privacy

Writing/repair text, audio, transcript, names, email, phone, free-form responses, anonymous learner/session identifiers as GA properties, band scores, and criterion scores are excluded by event allowlists and stripped by the existing sanitizer. Analytics transport failures are caught and cannot interrupt evidence persistence or learner flow.
