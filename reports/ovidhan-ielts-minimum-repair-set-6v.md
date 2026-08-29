# Phase 6V — IELTS Minimum Repair Set

## Outcome

The Free IELTS Weakness Map now shows a bounded pre-retry plan only when SmartPath's retained next action is a genuine `PRODUCTIVE_RETRY` with an exact learner-selected Writing or Speaking repair code. SmartPath remains the sole next-action owner and its retry URL is unchanged.

## Safety rules

- Resolve exactly one reviewed definition matching `productive_repair_code`; never infer or substitute a repair.
- Require an explicit, closed mapping from `productive_task_type` to the repair definition's applicability.
- Include only `NOTICE` and `REPAIR` as `pre_retry_steps`; `RETEST` remains outside the minimum repair set.
- Return `NO_SPECIFIC_REPAIR` for missing, unknown, duplicate, task-inapplicable, objective Reading/Listening, or `SELF_REPORTED_IMPROVED` recommendations.
- Return bounded labels and identifiers only. No learner writing, audio, transcript, diagnosis, score, band, readiness, or mastery data is introduced.
- Fetch only the relevant Writing or Speaking pack after an eligible productive recommendation exists. Fetch or metadata failure preserves the normal SmartPath action.

## UI and routing

The concise bilingual plan appears inside the existing Next Best Action card and names the exact selected repair. It does not duplicate activity content. Academic/General Training filtering and every SmartPath destination remain owned by the existing routing code.

## Verification

`tests/ielts-minimum-repair-set-6v.test.js` covers exact Writing and Speaking resolution, stage bounding, safe empty cases, non-bundling, sole SmartPath action ownership, unchanged Academic/GT URLs, bounded output, lazy pack selection, metadata-load failure, and frozen hashes. All historical JavaScript tests and the production dry build are run before handoff.

Phase 6T observation continues. This branch is not merged and not deployed.
