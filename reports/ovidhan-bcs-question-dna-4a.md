# Ovidhan Phase 4A — BCS Question DNA + Official Source Audit

Audit date: 2026-08-16. This is an architecture/source-gate record, not a published historical question bank.

## A. Repository / start SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/bcs-question-dna-4a`
- Starting `origin/main` SHA: `0d284288fe166bfaa85af61ad4c686347c5dff77`
- Phase 3H merge verified on `origin/main`; working tree was clean when this branch was created.

## B. Existing BCS inventory

### Production-facing/indexable surfaces

The sitemap already lists eight dedicated root BCS pages: `bcs-500-words.html`, `bcs-english-diagnostic.html`, `bcs-english-grammar-bangla.html`, `bcs-english-mock-test.html`, the 2025/2026 question-pattern pages, synonyms/antonyms, and the vocabulary guide. It also lists `learning-path-bcs.html`, `exam-prep.html`, and two BCS mock-test pages. Home and Learn link prominently to this cluster. These are existing public preparation, practice, and SEO assets—not verified historical-question pages.

### Question-bank/data assets

- `question-bank.json`: compiled V2 master with 40 records.
- Nine JSON source files under `question-bank-src/`.
- 18 records are BCS-tagged or originate in BCS source files.
- `question-bank-src/mixed/bcs-full.json`: 10 authored practice records (SVA, present perfect, time prepositions, passive voice, synonyms, antonyms, idioms, and phrasal verbs).
- `question-bank-src/mixed/bcs-mixed.json`: one draft record.
- Seven additional BCS-tagged records live in general tense/past-simple/synonym files.
- Seventeen of 18 carry `verified: true`, but zero carry a source URL/reference/type. Therefore “verified” is an editorial flag, not evidence of BPSC provenance.
- One exact question-text duplicate exists: `bcs_grammar_001` and draft `bcs_error_004`.

### Code and duplication

`compile_question_bank.py` and `scripts/compile_question_bank.py` are byte-identical. They recursively concatenate JSON, add `_source_file`, and write a generated timestamp; they do not validate stable IDs, provenance, duplicates, options, answer disputes, or Skill Graph references. No production HTML was found loading `question-bank.json`, so it currently appears to be a compiled/experimental data asset rather than the runtime source for the indexed BCS pages.

### Incomplete or risky inventory findings

- Existing BCS records have no exam number, year, stage, question number, primary source, answer source, dispute state, or canonical graph mapping.
- `bcs-english-question-pattern-2025.html` uses a canonical URL without `.html`, unlike its filename.
- `index.html` links to `/blog/bcs-english-preparation-guide.html`, but that file is absent.
- Mock pages are indexable but are authored practice, not labeled historical official papers in the audited data.
- “BCS” tags are reused across authored general-English questions; exam relevance must not be confused with historical occurrence.

### Reuse / do-not-touch decision

Reuse the stable question-bank IDs only through an explicit migration map, the bilingual explanations where re-reviewed, the existing public BCS routing, Phase 3G graph IDs, and the Phase 3 learner evidence envelope. Do not migrate `verified` into `OFFICIAL`, publish legacy questions as previous-year questions, deduplicate destructively, alter indexed BCS pages, rewrite the compiler, or fix unrelated canonical/broken-link issues in Phase 4A.

## C. Authoritative-source findings

BPSC’s official site demonstrably publishes exam notices, schedules, instructions, syllabi, attached files, and results. The [official 50th BCS preliminary syllabus page](https://bpsc.gov.bd/pages/psc-exams/%E0%A7%AB%E0%A7%A6%E0%A6%A4%E0%A6%AE-%E0%A6%AC%E0%A6%BF-%E0%A6%B8%E0%A6%BF-%E0%A6%8F%E0%A6%B8-%E0%A6%AA%E0%A6%B0%E0%A7%80%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%BE-%E0%A7%A8%E0%A7%A6%E0%A7%A8%E0%A7%AB-%E0%A6%8F%E0%A6%B0-%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%BF%E0%A6%B2%E0%A6%BF%E0%A6%AE%E0%A6%BF%E0%A6%A8%E0%A6%BE%E0%A6%B0%E0%A6%BF-%E0%A6%9F%E0%A7%87%E0%A6%B8%E0%A7%8D%E0%A6%9F%E0%A7%87%E0%A6%B0-mcq-type-%E0%A6%B8%E0%A6%BF%E0%A6%B2%E0%A7%87%E0%A6%AC%E0%A6%BE%E0%A6%B8-299ca4-69568a5d35ce18e1c05ad0af) records a publication date and links an attachment. The [official preliminary syllabus PDF](https://bpsc.gov.bd/sites/default/files/files/bpsc.portal.gov.bd/psc_exam/b01b59d2_e6b3_43c7_8051_51e5f72bf1f8/PDF_008%20%281%29.pdf) is a 12-page PDF with English Language/Literature coverage, but extraction quality is mixed/garbled on parts of the document. BPSC also exposes a [written-exam syllabus page](https://bpsc.gov.bd/pages/psc-exams/%E0%A6%AC%E0%A6%BF-%E0%A6%B8%E0%A6%BF-%E0%A6%8F%E0%A6%B8-%E0%A6%B2%E0%A6%BF%E0%A6%96%E0%A6%BF%E0%A6%A4-%E0%A6%AA%E0%A6%B0%E0%A7%80%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%BE%E0%A6%B0-%E0%A6%B8%E0%A6%BF%E0%A6%B2%E0%A7%87%E0%A6%AC%E0%A6%BE%E0%A6%B8-08e202-6919974adbfbab28ceff0121) and downloadable written syllabus files.

The audit did **not** locate a stable BPSC archive of historical preliminary question papers or official BCS preliminary answer keys. This is an evidence limit, not proof that no such file has ever existed. BPSC recruitment material also describes preliminary answer sheets as confidential and not shown to candidates; that does not by itself establish whether a separate answer key is ever published. Official result PDFs, such as the [46th preliminary result](https://bpsc.portal.gov.bd/sites/default/files/files/bpsc.portal.gov.bd/psc_exam/3105f8ef_3d8e_495f_9270_b3465a288e9c/bcs46_prelli_result.pdf), prove exam identity/result publication, not question wording or correct answers.

Official page attachments may resolve to object-storage or legacy `/sites/default/files/` paths. Pages carry publication/update dates, but attachment URLs and portal paths can move. Acquisition must therefore record the landing-page URL, final file URL, retrieval date, MIME/format, and SHA-256. Revised results/corrections appear as separate notices/files; never overwrite prior source history.

Secondary sites provide 46th-BCS transcriptions/solutions, sometimes as images. One [secondary 46th-BCS solution](https://biddabari.com/bcs-question-bank/46th-bcs-question-solution) explicitly presents English questions and even notes ambiguity (“Both b & C”) for an item, while another [secondary copy](https://lekhaporabd.net/archives/44597) publishes English sections as images. They are discovery/corroboration leads, not BPSC answer keys.

## D. Source hierarchy

- **Level A — BPSC official:** BPSC page/file with captured landing page, attachment, date, and hash. Official question wording may be called official only when the actual paper is present. An answer may be `OFFICIAL` only when a BPSC answer key or correction notice explicitly supports it.
- **Level B — other authoritative government:** gazette, ministry, national archive, or other competent government source. Publish with the actual agency named; never relabel as BPSC.
- **Level C — independently corroborated reputable secondary:** matching transcription/scan across at least two independent sources plus human option-by-option review. May support `CORROBORATED` question text or answer; never `OFFICIAL`.
- **Level D — unverified secondary:** coaching/blog/social/user upload or single uncatalogued scan. Discovery only; keep `HOLD`/internal and do not present an answer as settled.

Source level and answer status are separate. An official question paper does not make a coaching answer official. Publication also requires rights/quotation review appropriate to the acquired material.

## E. Recommended first pilot

Recommend a **conditional internal provenance pilot: 46th BCS Preliminary, English questions 1–10 only**.

Why: the exam is completed and identifiable through BPSC result material; multiple secondary question transcriptions/scans are discoverable; ten English items are small enough for character-by-character comparison; reported ambiguity makes it a useful test of dispute handling; and the sample spans grammar/vocabulary classification that exposes real graph-coverage boundaries.

This is **not yet a trustworthy public question pilot**. Entry requires (1) a legible candidate/original-paper scan with documented custody and publication-rights review, (2) two independent transcriptions, and (3) answer-by-answer references. Because no official BPSC question paper or official answer key was located, all records begin `HOLD`; answers can reach at most `CORROBORATED`/`VERIFIED`, never `OFFICIAL`, absent Level A answer evidence. If those inputs cannot be acquired, Phase 4B must stop rather than substitute invented or coaching-labeled-as-official content.

## F. Question DNA V1 schema

`question-dna-v1.schema.json` is a Draft 2020-12 JSON Schema. The smallest canonical record contains:

- stable schema/question ID;
- exam family/number/year/stage;
- subject, optional section, and question number;
- canonical question text and bounded options;
- answer option, status, dispute state, bilingual explanations, and answer version;
- taxonomy `topic_id`, one Phase 3G `skill_id` (the micro-skill), `family_id`, mapping status, and optional transfer IDs;
- one or more provenance records with source level/publisher/type/reference/date/format/hash;
- verification source references, editorial status/reviewer/date;
- publication status.

There is intentionally no duplicate `micro_skill_id`: Phase 3G calls each micro-skill a skill and its stable `skill_id` is canonical. Difficulty is optional/unset until reviewed. Question text belongs in the canonical content record; learner state stores only `question_id` and bounded outcomes.

## G. Provenance rules

Acquire immutable bytes when permitted; hash before parsing; retain landing and final URLs; distinguish question source from answer source; store retrieval/publication dates; record text/scanned/image/print format; preserve every correction as a new source and increment `answer_version`. A source disappearing does not erase its audit record. `PUBLISHABLE` requires approved review, non-disputed status, and at least verified/corroborated evidence. The schema forbids `OFFICIAL` answer status without a Level A `ANSWER_KEY` or `CORRECTION_NOTICE`.

## H. Answer-dispute model

Answer states: `OFFICIAL`, `VERIFIED`, `CORROBORATED`, `DISPUTED`, `UNVERIFIED`. Dispute state is `NONE`, `OPEN`, or `RESOLVED`.

1. Ingest each source’s asserted answer separately; do not overwrite.
2. If reputable sources disagree, set answer `DISPUTED`, clear canonical `correct_option_id`, and hold publication as settled fact.
3. A reviewer records the exact conflict and supporting references.
4. Resolution requires a stronger source or a documented editorial rationale; increment `answer_version`, retain old provenance, and mark the dispute resolved.
5. BPSC correction notices outrank earlier keys; they do not erase history.
6. Coaching consensus may produce `CORROBORATED`/`VERIFIED` after review, never `OFFICIAL`.

## I. Editorial workflow

Automate JSON/schema validity, stable/unique identity, option/reference integrity, hashes, duplicate detection, source-level completeness, graph-reference existence, answer/publication gates, and change diffs. Human approval is mandatory for transcription, option order, answer reasoning, English/Bangla explanation quality, source interpretation, rights/publication decision, skill mapping, L1 hypothesis, and dispute resolution. Two-person review is recommended for disputed or non-Level-A answers. Reviewer identity is a bounded editorial ID/name, not learner identity.

## J. Skill Graph mapping strategy

Use `topic_id` for exam/content organization and Phase 3G `skill_id` for the reusable learner micro-skill. Map one primary skill/family after human review; optional graph-related or L1 relationships stay separate. Examples from the authored repository can potentially reuse `present_perfect_time_reference`, `preposition_time_at_in_on`, and existing agreement nodes. Existing labels such as `SVA`, `Present Perfect`, and `Prepositions of Time` should become import aliases, not new graph IDs. Question outcome then joins `question_id → skill_id → family_id → bounded learner evidence`.

## K. Missing graph coverage

The current 50-node graph covers common learner errors, not the complete BCS syllabus. Audited BCS material exposes likely gaps: parts-of-speech identification, phrase classification, passive/active voice, transformation, morphology/word formation, phrasal verbs, idioms, synonym/antonym/spelling, and English literature. These are coverage gaps, not automatic new nodes. Phase 4B should propose nodes only when reviewed pilot questions require a reusable learner competency; literature may need a separate controlled topic graph rather than forcing factual recall into the mistake graph.

## L. Bengali L1 mapping approach

Question records may reference the existing optional `ARTICLE_ABSENCE_TRANSFER`, `POSTPOSITION_PREPOSITION_TRANSFER`, `WORD_ORDER_TRANSFER`, or `LITERAL_TRANSLATION_TRANSFER` only after editorial review. L1 mapping is explanatory and versioned, never assumed from nationality and never used as a frequency claim. Many BCS recall/classification questions have no defensible L1 relationship and should have an empty transfer list.

## M. Privacy-safe future learning evidence

Store stable `question_id`, canonical skill/family, coarse result, bounded attempt number, optional FAST/NORMAL/SLOW response-time band only if product need is approved, session/return context, previous bounded skill status, repair/retest outcomes, and next-action reason. Do not repeat full question text in learner state and do not store names, registration numbers, candidate identities, arbitrary text, precise location, fingerprinting, or sensitive data.

## N. Pipeline architecture

`SOURCE DISCOVERY → ACQUISITION + HASH → FORMAT CLASSIFICATION → deterministic text parse (text PDF first) / OCR fallback → NORMALIZE without answer inference → SCHEMA VALIDATE → SOURCE COMPARISON → QUESTION DNA + graph proposal → HUMAN REVIEW → PUBLICATION GATE → VERSION/CORRECTION`

OCR output always remains a draft aligned to page/region and requires visual human comparison. No paid AI, LLM, vector database, or generative answer system is needed. Phase 4B should preserve raw-source hashes outside learner state and produce deterministic audit logs.

## O. Competitive moat analysis

- **Easy to copy:** public questions, a generic MCQ renderer, exam tags, static explanations.
- **Moderate:** bilingual reviewed explanations, transparent provenance/dispute states, stable Question DNA, controlled graph integration, repair/retest routing.
- **Harder with sufficient real data:** longitudinal question→skill evidence, trustworthy correction history, observed repair/retention outcomes, and deterministic path effectiveness for Bangla-speaking learners. The architecture enables this; Phase 4A does not claim the data moat exists.

## P. BCS Result Intelligence boundary

No result monitoring, registration lookup, candidate data, revised-result history, anomaly analysis, or result funnel was implemented. Future BCS Candidate Center integration should join through `exam.family/number/year/stage` and separate source records. Result documents/candidate identifiers require a different privacy, legal, retention, and access-control model and must never be inserted into Question DNA learner state.

## Q. Free vs future paid opportunities

Free value may include provenance-labeled practice, source/dispute visibility, a small diagnostic, weakness map, explanations, and repair/retest. Potential later paid value may include a reviewed gap analyzer, deterministic repair plan, weak-topic packs, written-English review products, or adaptive mocks after real outcome/retention evidence. No price, premium entitlement, payment, or willingness-to-pay claim belongs in 4A.

## R. SEO / frozen-experiment verification

Before implementation: treatment 72, control 72, unique frozen pages 144; aggregate SHA-256 `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`; changed/missing pages 0; changed guards 0. Phase 4A adds only non-public architecture/report/validator files. Sitemap, robots, enriched dictionary, manifests, baseline, dictionary pages/schema/linking, indexed BCS pages, and question bank are untouched. The same verifier is required after the final changes.

## S. Tests / validation

`scripts/verify_question_dna_4a.js` confirms valid schema JSON, schema/graph version, required provenance/dispute/publication gates, 50 canonical graph skills, 18 current BCS-tagged records, zero legacy provenance records, one duplicate text, and zero trusted pilot records created. Full Phase 3, Skill Graph, Mistake Mirror/Profile, retention, static-surface, frozen cohort, and `git diff --check` gates are required before commit.

## T. Files changed

- `question-dna-v1.schema.json` (new architecture prototype)
- `scripts/verify_question_dna_4a.js` (new dependency-free audit validator)
- `reports/ovidhan-bcs-question-dna-4a.md` (this audit)

No runtime, production page, question dataset, sitemap, robot rule, dictionary file, or graph node was changed.

## U. Risks / open questions

1. Can BPSC or a documented archive provide an original 46th preliminary paper and any official key/correction?
2. What publication/reproduction rights apply to candidate scans and official papers?
3. Which two independent sources are sufficiently independent for Level C?
4. Who are the named English/Bangla editorial reviewers and dispute approver?
5. Should English literature become a separate topic/knowledge graph rather than expand the mistake graph?
6. How should legacy `verified` records be relabeled in a later migration without breaking existing practice IDs?
7. Should the duplicate compilers be consolidated in a separate maintenance change?

## V. Exact Phase 4B recommendation

Phase 4B should be a **10-record, internal-only 46th BCS Preliminary English provenance pilot**, conditional on the source gate in section E. Acquire and hash sources; dual-transcribe questions/options; capture every answer assertion separately; validate against Question DNA V1 and Phase 3G IDs; propose only evidence-required graph additions; run two-person editorial/dispute review; keep every record `HOLD` until approved; publish nothing if provenance or rights remain insufficient. Do not start Result Intelligence, bulk imports, SEO generation, payment, or AI.
