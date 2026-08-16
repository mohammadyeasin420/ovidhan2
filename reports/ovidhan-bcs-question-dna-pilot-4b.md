# Ovidhan Phase 4B — Verified BCS Question DNA Pilot: Source-Gate Report

Audit date: 2026-08-16. Outcome: source gate blocked; no trusted pilot dataset was created.

## A. Repository / branch / starting SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/bcs-question-dna-pilot-4b`
- Starting `origin/main` SHA: `8690e836a231a8f9ff58f9492c27fa7b25d50d87`
- Phase 4A merge verified on `origin/main`; branch started with a clean working tree.

## B. Selected BCS examination

Investigated the Phase 4A candidate: **46th BCS Preliminary, English questions 36–45** (the first ten questions in the English section, often described informally as English questions 1–10).

## C. Why selected

The exam is completed and identifiable through an [official BPSC preliminary-result file](https://bpsc.portal.gov.bd/sites/default/files/files/bpsc.portal.gov.bd/psc_exam/3105f8ef_3d8e_495f_9270_b3465a288e9c/bcs46_prelli_result.pdf). Multiple secondary transcriptions are discoverable, ten questions are manageable, and the set includes grammar/vocabulary structures relevant to the Phase 3G graph. Selection for investigation did not imply acceptance.

No alternative examination was forced after this candidate failed: the same audit did not reveal another cohort with a stronger official question-paper/answer-key chain.

## D. Source inventory

### Level A

- BPSC 46th preliminary result: proves exam/result identity only; contains neither the English question text nor an answer key.
- No stable official BPSC 46th preliminary question paper, set-specific option order, answer key, or correction notice was located.

### Candidate Level C/D material

1. [Medha 46th BCS Preliminary Question PDF](https://medha.com.bd/wp-content/uploads/2025/03/46th-BCS-Preliminary-Question-PDF.pdf): 122-page secondary PDF with transcribed questions and extensive publisher explanations. It is not an original BPSC scan.
2. [BCS Analysis transcription](https://bcsanalysis.com/46th-bcs-preliminary-question/): secondary HTML transcription/solution.
3. [Prothom Alo solution list](https://www.prothomalo.com/chakri/chakri-suggestion/wce7m7gxn7): reputable secondary article identifying set 2/code Kapotakkho, but it publishes answer letters without the corresponding full question/options transcription.
4. Search results expose other coaching/blog/image/PDF copies, but no inspected source establishes independent custody of an original paper or official answer authority.

These sources may be useful discovery leads; they do not jointly satisfy the character-by-character and set-identity requirements.

## E. Publication-rights assessment

- Factual exam metadata: usable with source attribution.
- Internal research/comparison: `CLEAR_FOR_INTERNAL_RESEARCH` for references and limited audit notes.
- Full question reproduction: `REVIEW_REQUIRED_FOR_PUBLICATION`; no legal certainty was inferred.
- Ovidhan-original explanations: could be authored later, only after a question passes the source gate.
- Third-party commentary/explanations: not copied.

Because source identity and reproduction rights remain unclear, even a technically corroborated pilot would default to internal-only. Here, the earlier transcription gate also failed.

## F. Exact trusted question count

**0.** No Question DNA record was accepted as trusted.

## G. Exact internal-only count

**0 accepted records.** Ten candidate identities were audited, but none was admitted to a pilot dataset. Audit notes are not Question DNA records.

## H. Answer-status distribution

- `OFFICIAL`: 0
- `VERIFIED`: 0
- `CORROBORATED`: 0
- `DISPUTED`: 0 accepted records
- `UNVERIFIED`: 0 accepted records
- Rejected before record creation: 10

Candidate conflicts must not be converted into formal `DISPUTED` records until the underlying question/set transcription itself is trustworthy.

## I. Dispute list

- **Q36:** Medha lists `mobile, sugar, sand, media` and concludes both sugar and sand; BCS Analysis lists `mobile, sugar, media, sand` and selects sand. This is both option-order and answer conflict.
- **Q37:** sources differ in option order, capitalization, hyphenation, and `climed` versus `climbed` transcription.
- **Q39:** Medha’s options include `verbal noun` and answer verbal noun; BCS Analysis presents `noun phrase`/`verbal phrase` and selects noun phrase. Wording also differs (`writing skill` versus `the writing skill`).
- **Q40:** Medha presents `Having been injured` and selects it; BCS Analysis presents `having injured` among materially different options and selects that form. Prothom Alo’s set-specific letter cannot reconcile the question without its matching option set.
- **Set mapping:** Prothom Alo labels set 2/Kapotakkho and gives answer letters whose option positions do not align with the inspected transcriptions. No authoritative set conversion table was found.

These are substantive provenance/transcription problems, not cosmetic editorial differences.

## J. Complete question inventory

- `bcs-46-prelim-english-q036` — word usable as a verb — **REJECT**
- `bcs-46-prelim-english-q037` — “like” as preposition — **REJECT**
- `bcs-46-prelim-english-q038` — “following” part of speech — **REJECT**
- `bcs-46-prelim-english-q039` — “Writing a diary” classification — **REJECT**
- `bcs-46-prelim-english-q040` — participial-form blank — **REJECT**
- `bcs-46-prelim-english-q041` — “by and large” — **REJECT**
- `bcs-46-prelim-english-q042` — “went back” alternative — **REJECT**
- `bcs-46-prelim-english-q043` — “let the cat out of the bag” — **REJECT**
- `bcs-46-prelim-english-q044` — “to depend on” phrase classification — **REJECT**
- `bcs-46-prelim-english-q045` — clause classification — **REJECT**

Q38 and Q41–45 were not rescued merely because inspected secondary text appeared more compatible: there is still no original/set-specific paper for required character-by-character verification and no official answer source.

## K. Provenance summary

The Level A result source confirms the exam, not content. The two inspectable full secondary transcriptions conflict and may themselves derive from unknown upstream material. The reputable answer list is set-specific but lacks matching question/options text. No source bytes were committed; no hash was represented as an original-paper hash. URL and retrieval evidence remain in this report only.

## L. Skill Graph mappings

No accepted mappings were created. Provisional review suggests the candidates would test parts-of-speech/phrase/clause classification, vocabulary/idioms, and participial structure. Several do not cleanly fit the current learner-mistake graph. Provisional taxonomy guesses were not persisted as reviewed mappings.

## M. Unmapped questions

All ten candidates remain unmapped because they were rejected before Question DNA creation. The audit reinforces Phase 4A’s coverage gaps for parts-of-speech identification, phrase/clause classification, idioms, and participles. No Phase 3G node was added.

## N. Distractor classification

No distractor DNA was persisted. Classification before trustworthy transcription would attach intelligence to potentially incorrect options.

## O. Legacy-question overlap

No exact historical identity overlap was established with the 18 legacy BCS-tagged repository records. The legacy bank contains authored items about agreement, tense, prepositions, voice, synonyms/antonyms, idioms, and phrasal verbs, but its `verified` flags have zero provenance fields and were not used as source evidence. The known duplicate legacy question and duplicate compiler scripts do not affect this blocked candidate and remain untouched.

## P. Learner-intelligence simulation

Not built. A simulation requires at least one accepted Question DNA record with a defensible answer and graph mapping. Fabricating a fixture from rejected historical text would bypass the source gate. Existing Phase 3 learner intelligence remains unchanged.

## Q. Gap Analyzer preparation

The Phase 4A schema can later support attempted question IDs, tested skills, observed strengths, needs-practice evidence, and insufficient evidence. No readiness percentage or analyzer was built. With zero accepted questions, all exam-specific readiness remains **INSUFFICIENT EVIDENCE**.

## R. Validator results

The existing Phase 4A architecture validator remains the applicable gate and reports zero trusted pilot records. A dataset-specific validator was not added because no dataset exists. Creating validation code around an empty/failed dataset would not improve trustworthiness.

## S. Human editorial gate

Item-by-item result: Q36–Q45 = **REJECT** at source/transcription gate. No item advanced to answer, explanation, Bangla explanation, mapping, distractor, difficulty, or publication approval. A future reviewer must compare a legible original/set-specific paper character-by-character before reopening any item.

## T. Frozen SEO verification

Before source investigation: treatment 72, control 72, unique frozen pages 144; aggregate SHA-256 `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`; changed/missing pages 0 and changed guards 0. No sitemap, robots, dictionary, manifest, baseline, question-bank, graph, or production-page changes were made. Final verification is required before committing this report.

## U. Regression tests

No runtime production code was touched. The Phase 4A schema/audit validator and frozen verifier are required for the final gate. Full product regressions are unnecessary for a report-only change, but protected-file diffs and `git diff --check` must pass.

## V. Exact files changed

- `reports/ovidhan-bcs-question-dna-pilot-4b.md` (new blocked source-gate report)

No pilot dataset, validator extension, learner simulation, runtime code, production HTML, question bank, Skill Graph, or SEO file was created/changed.

## W. Git diff --check

Pending final gate; authoritative result is recorded in the final handoff.

## X. Commit SHA

Assigned only if this report-only blocked outcome is committed; authoritative SHA is recorded in the final handoff.

## Y. Push status

Pending final gate and report-only branch push; authoritative status is recorded in the final handoff.

## Z. Recommended Phase 4C

Do not begin a content rollout. First obtain a legible original 46th-BCS preliminary paper with explicit set/code, document custody and reproduction review, acquire or derive a set-option mapping, and identify any BPSC answer key/correction. Then re-run independent transcription with two reviewers. If an original 46th paper remains unavailable, audit another single exam only when its primary paper is materially stronger; do not lower Level C rules. Phase 4C should not start until at least one record passes this source gate.
