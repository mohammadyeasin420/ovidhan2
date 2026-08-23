# Ovidhan Phase 6E — IELTS Goal Requirement Map v1

## Governance result

- Starting SHA: `bf3660ad2ca033ca7b9bd78679589cf084444477`
- Governed asset: `data/ielts-goal-requirement-map-v1.json`
- Review status: `REVIEWED`
- Official source policy: `IELTS_OFFICIAL_ONLY`
- Requirements: **33**
- Accepted mapping relations: **17**
- Unique mapped ACTIVE canonical skills: **7**
- Explicit unmapped requirements: **16**

Counts above are derived from the final asset and are asserted by `scripts/verify_ielts_goal_requirements_6e.js`.

## Official source registry

Only IELTS.org is admitted:

- [IELTS test format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-test-format)
- [Academic Reading](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-test-format-in-detail/ielts-academic-reading)
- [General Training Reading](https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-test-format-in-detail/ielts-general-training-reading)
- [Listening](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-test-format-in-detail/ielts-listening)
- [Academic Writing](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-test-format-in-detail/ielts-academic-writing)
- [General Training Writing](https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-test-format-in-detail/ielts-general-training-writing)
- [Speaking](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-test-format-in-detail/ielts-speaking)
- [IELTS scoring in detail](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail)

The verifier rejects an empty registry, unresolved source IDs and hosts outside `ielts.org`.

## IELTS structure and governed requirements

The map preserves `SHARED`, `ACADEMIC` and `GENERAL_TRAINING`, with Listening, Reading, Writing and Speaking sections. Its 33 requirements comprise:

- Reading (6): Academic and GT main idea, specific information/detail, and writer views/claims.
- Listening (5 shared): main points, detailed information, following a conversation, connecting facts, and important information/relationships.
- Writing (16): Academic Task 1 visual description and overview; Academic and GT task constructs; Task Achievement/Task Response; Coherence and Cohesion; Lexical Resource; Grammatical Range and Accuracy; GT letter and register.
- Speaking (6 shared): Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation, Part 2 extended turn, and Part 3 explanation/analysis/discussion/speculation.

Reading reference resolution and logical inference are intentionally absent: the official governed asset does not promote constructs whose support is merely implied.

## Accepted mappings

| Requirement(s) | Canonical skill | Class | Current outcome |
|---|---|---|---|
| Academic + GT main idea | `reading_main_idea` | `DIRECT_TASK_ALIGNMENT` | `PRACTICE_GAP` |
| Academic + GT detail | `reading_supporting_detail` | `DIRECT_TASK_ALIGNMENT` | `PRACTICE_GAP` |
| Academic + GT writer views/claims | `reading_tone_purpose` | `SUPPORTING_LANGUAGE_FOUNDATION` | `PARTIALLY_COVERED`; tone/purpose is not equivalent to views/claims |
| Academic + GT Task 2 argument | `essay_thesis_focus` | `SUPPORTING_LANGUAGE_FOUNDATION` | `PARTIALLY_COVERED` |
| Academic + GT Task Response | `essay_thesis_focus` | `ASSESSMENT_CRITERION_ALIGNMENT` | `PRACTICE_GAP`; partial criterion coverage |
| Academic + GT Coherence and Cohesion | `essay_outline_structure` | `SUPPORTING_LANGUAGE_FOUNDATION` | `PARTIALLY_COVERED` |
| Academic + GT Lexical Resource | `word_choice_register` | `SUPPORTING_LANGUAGE_FOUNDATION` | `PARTIALLY_COVERED` |
| GT Task 1 letter | `formal_letter_writing` | `SUPPORTING_LANGUAGE_FOUNDATION` | `PARTIALLY_COVERED` |
| GT Task 1 register/style | `word_choice_register` | `DIRECT_TASK_ALIGNMENT` | `PRACTICE_GAP` |
| Speaking Lexical Resource | `word_choice_register` | `SUPPORTING_LANGUAGE_FOUNDATION` | `PARTIALLY_COVERED`; no speaking-performance evidence |

These rows expand to 17 requirement-to-skill relations. The only permitted classes are `DIRECT_TASK_ALIGNMENT`, `ASSESSMENT_CRITERION_ALIGNMENT` and `SUPPORTING_LANGUAGE_FOUNDATION`.

## Downgraded or rejected claims

- `word_choice_register` is downgraded from IELTS `CORE` to `SUPPORTING`; it does not cover full Writing or Speaking Lexical Resource.
- `formal_letter_writing` remains `OPTIONAL`, not universal IELTS `CORE`.
- `essay_thesis_focus` is not called an official “thesis” criterion. It partially aligns to Task Response and supports Task 2 argument work.
- `essay_outline_structure` supports, but does not equal, Coherence and Cohesion.
- `reading_tone_purpose` supports, but does not equal, writer views/claims.
- Reading skills are never used as Listening performance.
- Generic grammar skills and vocabulary MCQs are not treated as Speaking performance.
- `writing_precis`, `reading_reference` and `reading_inference` receive no IELTS governed requirement mapping.

## Complete canonical-skill gaps

All 16 explicit gaps resolve once and do not also appear as mappings:

1. Listening main points
2. Listening detailed information
3. Listening following a conversation
4. Listening recognising connections among facts
5. Listening important information and relationships
6. Academic Task 1 visual description
7. Academic Task 1 overview
8. Academic Task Achievement
9. Academic Grammatical Range and Accuracy
10. GT Task Achievement
11. GT Grammatical Range and Accuracy
12. Speaking Fluency and Coherence
13. Speaking Grammatical Range and Accuracy
14. Speaking Pronunciation
15. Speaking Part 2 extended turn
16. Speaking Part 3 explanation/analysis/discussion/speculation

The GT personal-letter residual gap is represented in the mapped relation's `coverage_note`, not duplicated as an unmapped requirement.

## Evidence matrix

| Evidence source | Current truth | Governance consequence |
|---|---|---|
| IELTS diagnostic v1 | 40 questions; 19 `MAPPED_OBJECTIVE`; 21 unmapped; 12 unique mapped skills | Objective evidence exists only for the declared mapped questions |
| Listening diagnostic items | 5 `UNMAPPED_PROXY` | No Listening performance evidence |
| Speaking diagnostic items | 5 `UNMAPPED_PROXY` | No Speaking performance evidence |
| Boundary pilot | Four probes: `compound_subject_agreement`, `indefinite_article_a_an`, `gerund_after_preposition`, `essay_thesis_focus` | Boundary evidence is claimed only for those four; `essay_thesis_focus` is writing-related |

Listening and Speaking items ask about strategy or language choice through MCQs; they do not require a learner to listen or speak. The map therefore cannot infer modality performance from them.

## Static destination matrix

`smartpath-destinations.json` contains exactly two destinations:

| Skill | Static destination | IELTS eligible | Phase 6E truth |
|---|---:|---:|---|
| `writing_precis` | Yes | No | Excluded from IELTS |
| `formal_letter_writing` | Yes | Yes | Conditional GT support |
| `reading_main_idea` | No | — | `PRACTICE_GAP` |
| `reading_supporting_detail` | No | — | `PRACTICE_GAP` |
| `reading_tone_purpose` | No | — | No static destination |
| `essay_thesis_focus` | No | — | No static destination |
| `essay_outline_structure` | No | — | No static destination |
| `word_choice_register` | No | — | No static destination |

Graph item mappings and generic pages are not counted as static SmartPath destinations.

## Final coarse IELTS map

| Skill | Importance |
|---|---|
| `present_perfect_time_reference` | `SUPPORTING` |
| `word_choice_register` | `SUPPORTING` |
| `formal_letter_writing` | `OPTIONAL` |
| `reading_main_idea` | `CORE` |
| `reading_supporting_detail` | `CORE` |
| `essay_thesis_focus` | `SUPPORTING` |
| `essay_outline_structure` | `SUPPORTING` |

Exactly seven mappings are present, all with `CURATED_REPOSITORY_MAPPING` evidence class.

## Why the formal-letter mapping is conditional

Official GT Task 1 may require a personal, semi-formal or formal letter. The current canonical skill supports formal and semi-formal writing but does not cover the complete range, especially personal letters. Its relation is therefore supporting and partial, while the coarse goal mapping remains optional. Its static destination does not remove the diagnostic evidence gap.

## Stability guards

- Skill graph unchanged: **14 families / 65 ACTIVE skills / 240 item mappings**.
- Frozen SEO aggregate unchanged: `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.
- Every frozen page and guard file is independently rehashed, and the page aggregate is recomputed.
- No diagnostic, Boundary, Learning Foundation, Mistake Profile, routing, destination, graph or frozen SEO file is modified.

## Limitations

This is an architecture and data-governance map, not a claim of complete IELTS preparation. Partial mappings do not establish full criterion mastery. The current static practice surface is sparse, Listening and Speaking have no modality-performance evidence, and no scores are estimated.

## Next build recommendation

Evidence-based priorities are:

1. Writing Coherence and Cohesion capability.
2. Academic Task 1 visual description plus overview.
3. Genuine Listening performance foundation.
4. Speaking Fluency and Coherence plus extended-turn capability.
5. Pronunciation later, because evaluation is more complex.

No relative Task 1/Task 2 weighting claim is made.
