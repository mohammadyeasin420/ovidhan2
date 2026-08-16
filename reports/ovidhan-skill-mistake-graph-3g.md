# Ovidhan Product Intelligence Phase 3G — Minimum Viable Skill + Mistake Graph

## A. Repository / branch / SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/skill-mistake-graph-3g`
- `origin/main` and branch starting SHA: `ad13952e0b691f801ab2bfae45a546ef290f1895`
- Required Phase 3F commit verified on `origin/main`: `1c4048c6fb52bc5d423c19240d21b2f0c59fee47`
- Working tree was clean when the branch was created from current `origin/main`.

## B. Graph design

`skill-mistake-graph.json` is a framework-free, version-controlled V1 taxonomy. It separates English learning families, reusable micro-skills, reviewed item mappings, typed edges, and optional Bangla L1 transfer hypotheses. It contains no learner records, frequency claims, question text, external API, database, or generated content.

## C. Top-level families

1. `ARTICLES` — Articles / আর্টিকেল
2. `PREPOSITIONS` — Prepositions / প্রিপজিশন
3. `VERB_SYSTEM` — Verb system / ক্রিয়ার রূপ ও কাল
4. `SUBJECT_VERB_AGREEMENT` — Subject–verb agreement / কর্তা–ক্রিয়ার মিল
5. `COUNTABILITY_QUANTIFIERS` — Countability and quantifiers / গণনীয়তা ও পরিমাণবাচক শব্দ
6. `VERB_PATTERNS` — Verb patterns / ক্রিয়ার গঠন
7. `SENTENCE_STRUCTURE` — Sentence structure / বাক্যের গঠন
8. `CONJUNCTIONS_CLAUSES` — Conjunctions and clauses / সংযোজক ও clause
9. `WORD_ORDER` — Word order / শব্দের ক্রম
10. `VOCABULARY_REGISTER` — Vocabulary and register / শব্দচয়ন ও ভাষার ধরন

## D. Exact micro-skill count

Exactly 50 bounded micro-skills across 10 families. The target was met without duplicating families; nodes not yet exercised by the 30-item pilot are marked `PLANNED` with an explicit orphan rationale.

## E. Complete node inventory

- `ARTICLES` (5): `indefinite_article_a_an`, `definite_article_the`, `zero_article`, `article_with_professions`, `article_with_countability`
- `PREPOSITIONS` (7): `preposition_time_at_in_on`, `preposition_place`, `adjective_preposition`, `verb_preposition`, `comparative_complement_preposition`, `movement_home_zero_preposition`, `duration_since_for`
- `VERB_SYSTEM` (8): `simple_present_form`, `simple_past_form`, `present_perfect_time_reference`, `auxiliary_did_base_form`, `modal_base_form`, `used_to_base_form`, `lexical_verb_without_be`, `stative_verb_aspect`
- `SUBJECT_VERB_AGREEMENT` (5): `third_person_s`, `plural_subject_agreement`, `grammatical_number_nouns`, `collective_subject_agreement`, `compound_subject_agreement`
- `COUNTABILITY_QUANTIFIERS` (5): `countable_uncountable_nouns`, `much_many`, `fewer_less_register`, `one_of_plural_noun`, `quantifier_agreement`
- `VERB_PATTERNS` (5): `transitive_verb_no_preposition`, `explain_something_to_someone`, `gerund_after_preposition`, `infinitive_complement`, `ditransitive_verb_pattern`
- `SENTENCE_STRUCTURE` (5): `standard_negation`, `sentence_fragment`, `run_on_sentence`, `parallel_structure`, `unnecessary_auxiliary`
- `CONJUNCTIONS_CLAUSES` (4): `although_without_but`, `because_without_so`, `coordinating_conjunctions`, `subordinate_clause_connection`
- `WORD_ORDER` (3): `english_svo_order`, `adverb_position`, `adjective_order`
- `VOCABULARY_REGISTER` (3): `fixed_expression`, `word_choice_register`, `commonly_confused_words`

## F. Edge types

V1 uses explicit `PREREQUISITE_OF`, `RELATED_TO`, `OFTEN_CONFUSED_WITH`, and `TRANSFER_PATTERN_FOR` relationships. Item practice and exam relevance stay as node fields because they are direct mappings/tags, not inferred graph relationships. Validator results: 14 explicit edges, no duplicate relationship, no self-reference, and no prerequisite cycle.

## G. Mapping of all 30 Mistake Mirror items

- `mm-agree-verb` → `lexical_verb_without_be` → `VERB_SYSTEM`; secondary `unnecessary_auxiliary`
- `mm-third-person-s` → `third_person_s` → `SUBJECT_VERB_AGREEMENT`; secondary `simple_present_form`
- `mm-did-base-verb` → `auxiliary_did_base_form` → `VERB_SYSTEM`; secondary `simple_past_form`
- `mm-discuss-object` → `transitive_verb_no_preposition` → `VERB_PATTERNS`
- `mm-article-apple` → `indefinite_article_a_an` → `ARTICLES`
- `mm-modal-base` → `modal_base_form` → `VERB_SYSTEM`
- `mm-double-negative` → `standard_negation` → `SENTENCE_STRUCTURE`
- `mm-good-at` → `adjective_preposition` → `PREPOSITIONS`; secondary `fixed_expression`
- `mm-senior-to` → `comparative_complement_preposition` → `PREPOSITIONS`; secondary `fixed_expression`
- `mm-depend-on` → `verb_preposition` → `PREPOSITIONS`
- `mm-interested-in` → `adjective_preposition` → `PREPOSITIONS`
- `mm-yesterday-past` → `present_perfect_time_reference` → `VERB_SYSTEM`; secondary `simple_past_form`
- `mm-one-of-plural` → `one_of_plural_noun` → `COUNTABILITY_QUANTIFIERS`; secondary `quantifier_agreement`
- `mm-much-many` → `much_many` → `COUNTABILITY_QUANTIFIERS`; secondary `quantifier_agreement`
- `mm-fewer-less` → `fewer_less_register` → `COUNTABILITY_QUANTIFIERS`; secondary `word_choice_register`
- `mm-since-for` → `duration_since_for` → `PREPOSITIONS`; secondary `present_perfect_time_reference`
- `mm-married-to` → `adjective_preposition` → `PREPOSITIONS`
- `mm-listen-to` → `verb_preposition` → `PREPOSITIONS`
- `mm-explain-to` → `explain_something_to_someone` → `VERB_PATTERNS`; secondary `ditransitive_verb_pattern`
- `mm-arrive-at` → `preposition_place` → `PREPOSITIONS`; secondary `verb_preposition`
- `mm-home-no-to` → `movement_home_zero_preposition` → `PREPOSITIONS`
- `mm-news-singular` → `grammatical_number_nouns` → `SUBJECT_VERB_AGREEMENT`
- `mm-people-plural` → `plural_subject_agreement` → `SUBJECT_VERB_AGREEMENT`; secondary `grammatical_number_nouns`
- `mm-information-uncountable` → `countable_uncountable_nouns` → `COUNTABILITY_QUANTIFIERS`; secondary `article_with_countability`
- `mm-advice-uncountable` → `countable_uncountable_nouns` → `COUNTABILITY_QUANTIFIERS`; secondary `article_with_countability`
- `mm-look-forward-gerund` → `gerund_after_preposition` → `VERB_PATTERNS`
- `mm-used-to-base` → `used_to_base_form` → `VERB_SYSTEM`
- `mm-prefer-to` → `comparative_complement_preposition` → `PREPOSITIONS`; secondary `fixed_expression`
- `mm-although-no-but` → `although_without_but` → `CONJUNCTIONS_CLAUSES`; secondary `subordinate_clause_connection`
- `mm-because-no-so` → `because_without_so` → `CONJUNCTIONS_CLAUSES`; secondary `subordinate_clause_connection`

All 30 stable item IDs map exactly once. No pedagogical item content was changed.

## H. Learner-state migration

The existing `ovidhan_learning_v1` schema and item-keyed evidence remain unchanged. At runtime, the profile resolves each current item through the canonical graph and aggregates the same counters under canonical IDs. Learner ID, session ID, evidence counters, outcomes, timestamps, status, and confidence are neither reset nor rewritten. If the graph is unavailable or rejected, the reviewed Phase 3F item taxonomy remains the safe fallback.

Versioning rules are embedded in the graph: display labels may change without changing IDs; additions are backward-compatible; deprecation retains the old ID and provides a replacement; splits retain an explicit legacy mapping; merges choose one canonical survivor and preserve aliases. Stored learner state is not destructively migrated merely for label changes.

## I. Next-action integration

Phase 3F priority bands and deterministic tie-breaking remain intact. After existing failed-retest, unresolved-mistake, weak-family, and same-skill rules, V1 can select a reviewed item connected by prerequisite/related skill edges as reinforcement. Selected/started events add allowlisted canonical `skill_id` and `family_id`; raw learner text and full profiles remain excluded.

## J. BCS compatibility

A future record can map `exam question ID → topic → primary_skill_id → family_id → bounded outcome`. Example only: `47th BCS Q18 → grammar → adjective_preposition → PREPOSITIONS → incorrect outcome`. Historical questions are not imported and the example makes no performance/frequency claim.

## K. Cross-exam compatibility

Every skill carries simple relevance tags chosen from `GENERAL_ENGLISH`, `BCS`, `BANK`, `NTRCA`, `UNIVERSITY_ADMISSION`, `IELTS`, `SSC`, `HSC`, `WORKPLACE`, and `SPEAKING`. These are editorial relevance flags, not transfer-rate claims.

## L. Bangla L1 transfer layer

Four optional hypotheses are separate from English skill identity: `ARTICLE_ABSENCE_TRANSFER`, `POSTPOSITION_PREPOSITION_TRANSFER`, `WORD_ORDER_TRANSFER`, and `LITERAL_TRANSLATION_TRANSFER`. Each is explicitly optional/editorial and must not be treated as the cause of every error. No frequency statistic is present.

## M. Analytics / data readiness

The existing analytics adapter remains the sole emitter. It now accepts canonical `skill_id` and `family_id` for next-action selection/start alongside `destination_id`, `reason_code`, and `priority_band`. Existing bounded item/stage/result counters are suitable for later statistical work. No PII, raw learner sentence, full graph, full profile, invasive device data, model call, or new telemetry store was added.

## N. Graph validation

`scripts/verify_skill_graph_3g.js` validates stable JSON, graph version, exact pilot mapping coverage, unique family/skill/transfer IDs, family membership, all references, secondary mappings, duplicate/self edges, prerequisite cycles, Bangla labels, required node fields, and explicit reasons for planned/orphan nodes. Result: PASS; 10 families, 50 skills, 30 mappings, 14 edges, 4 transfer patterns.

## O. Human taxonomy QA

All 50 nodes were reviewed for bounded scope, reuse beyond Mistake Mirror, English/Bangla label clarity, correct family, prerequisites/related skills, examples, difficulty, exam relevance, status, and version. Active nodes are grounded by reviewed item IDs; planned nodes identify the future content gap rather than pretending evidence exists. Review found no duplicate family and no item that required altering its pedagogy to fit.

## P. Performance

- Graph JSON: 38,643 raw bytes; 6,553 gzip bytes.
- Integration: one same-origin static JSON request on the non-dictionary Mistake Mirror page; failure is caught locally.
- JavaScript impact: small framework-free changes in existing `mistake-profile.js` and two analytics allowlist fields; no graph database, framework, external API, LLM, vector store, or paid inference.

## Q. Mobile / UI regression

In-app browser QA passed at 390×844 and 1440×900. Mistake Mirror and profile stayed visible, no horizontal overflow occurred, the Diagnose→explain→Repair interaction remained functional, and canonical `Verb system · ক্রিয়ার রূপ ও কাল` rendered from the fetched graph after evidence. The canonical URL/title and the existing static learning content remained present. Console warnings/errors: 0.

## R. Frozen SEO verification

Before and after: treatment 72, control 72, unique frozen pages 144, changed/missing pages 0, changed guards 0. Aggregate SHA-256 remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`. Sitemap, robots, enriched dictionary, manifests, experiment baseline, dictionary schema, internal linking, and all frozen pages are unchanged.

## S. Exact files changed

- `skill-mistake-graph.json` (new)
- `mistake-profile.js`
- `learning-foundation.js`
- `scripts/verify_skill_graph_3g.js` (new)
- `tests/skill-graph.test.js` (new)
- `tests/learning-foundation.test.js`
- `reports/ovidhan-skill-mistake-graph-3g.md` (new)

## T. Automated tests

- Phase 3G graph validator: PASS.
- Phase 3G graph tests: 8/8 PASS, including all seven required scenarios across graph and foundation suites.
- Learning foundation: 17/17 PASS, including corrupt storage and analytics privacy.
- Phase 3F profile: 9/9 PASS.
- Mistake Mirror dataset: 6/6 PASS across all 30 reviewed records.
- Phase 3F release scenarios: 6/6 PASS.
- Phase 3C SEO/static-surface regression: PASS.
- Frozen Phase 3B verifier: PASS 72/72/144.

## U. Git diff --check

PASS; no whitespace errors. Git reports only the existing Windows checkout line-ending advisory for touched JavaScript files.

## V. Commit SHA

The exact Phase 3G commit SHA is assigned only after this report is included in the commit; it is recorded in the authoritative final handoff (`git rev-parse HEAD`). A commit cannot truthfully embed its own SHA because changing that text changes the SHA.

## W. Push status

Pending final validated commit and branch-only push; authoritative result is recorded in the final handoff.

## X. Deployment status

Not merged and not deployed. Main remains untouched by this branch work.

## Y. Recommended Phase 3H / Phase 4A

Run named editorial review of the 50-node taxonomy and the four optional transfer hypotheses, then map a small reviewed historical-question sample to the existing IDs. Measure mapping disagreements and recommendation outcomes before adding skills, frequency fields, or statistical/adaptive models. Keep the dictionary SEO experiment frozen throughout.
