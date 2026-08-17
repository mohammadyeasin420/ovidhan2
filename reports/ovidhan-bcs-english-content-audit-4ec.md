# Ovidhan / Dakho Phase 4E-C — Existing BCS English Content Audit

## A. Starting SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/bcs-english-content-audit-4ec`
- Starting `origin/main`: `a1eeb156be3d8317e98b983db8b26652d710b19b`
- Phase 4D merge PR #23 and commit `2d43e7b68beaebed45bccedc279c32b9a0a08529` are present.

Scope note: the requirement taxonomy below is the audit scope supplied for 4E-C. This audit does not newly certify a BPSC syllabus. Phase 4A/4B source discipline still applies; existing BCS question/pattern claims require provenance review before being treated as official.

## B. Branch

Audit-only branch `codex/bcs-english-content-audit-4ec`. No production file, graph, learner state, sitemap, SEO cohort, or source data was changed.

## C. Exact assets audited

**BCS surfaces:** `bcs/index.html`, `bcs/candidate-center.js`, `bcs-english-diagnostic.html`, `bcs-english-grammar-bangla.html`, `bcs-vocabulary-guide.html`, `bcs-english-synonyms-antonyms.html`, `bcs-500-words.html`, `bcs-english-mock-test.html`, `mock-tests/bcs-test-1.html`, `mock-tests/bcs-test-2.html`, `learning-path-bcs.html`, and both `bcs-english-question-pattern-*.html` pages.

**Grammar/usage:** `parts-of-speech-bangla.html`, `tense-rules-bangla.html` plus tense lesson/quiz pages, `subject-verb-agreement-bangla.html`, `subject-verb-quiz.html`, `articles-rules-bangla.html`, `articles-quiz.html`, `preposition-rules-bangla.html`, `preposition-quiz.html`, `adjective-rules-bangla.html`, `voice-change-rules-bangla.html`, `voice-converter.html`, `narration-rules-bangla.html`, `narration-converter.html`, `common-grammar-mistakes-bangla.html`, `common-mistakes-bangladeshi-learners.html`, and sentence tools.

**Vocabulary/reading/writing/speaking:** synonym/antonym guides and tests, `english-idioms-dictionary-bangla.html`, `idiom-test.html`, `root-word-finder.html`, `word-family-finder.html`, dictionary/vocabulary assets, `reading-academy.html`, five `content/reading/**` lessons, `mock-tests/reading-test-1.html`, `writing.html`, `writing-coach.html`, `bangla-to-english-translation-hub.html`, `job-interview-english-bangla.html`, `self-introduction-english-bangla.html`, `speaking-practice.html`, and relevant speaking lessons.

**Intelligence connections:** `bcs-english-diagnostic.html`, `mistake-notebook.html`, `mistake-mirror.js`, `mistake-profile.js`, and `skill-mistake-graph.json` (10 families, 50 skills, 30 reviewed item mappings).

## D. Content inventory matrix

Legend: MM = Mistake Mirror/Profile. SG = Skill Graph. Public URLs follow the root-relative file path.

| Requirement / skill | Existing asset (type; URL) | Quality | Diagnostic | Practice | MM | SG | BCS context | Gap | Action |
|---|---|---|---|---|---|---|---|---|---|
| Parts of Speech | `parts-of-speech-bangla.html` (guide/tool; `/parts-of-speech-bangla.html`), `parts-of-speech-identifier.html` | STRONG | PARTIAL | PARTIAL | PARTIAL | PARTIAL | YES | PARTIAL | REUSE |
| Tense | `tense-rules-bangla.html`, tense lesson pages, `tense-quiz.html`, `tense-identifier.html` | STRONG | YES | YES | YES | YES | YES | No | REUSE |
| Subject–Verb Agreement | `subject-verb-agreement-bangla.html`, `subject-verb-quiz.html` | STRONG | PARTIAL | YES | YES | YES | YES | No | REUSE |
| Articles | `articles-rules-bangla.html`, `articles-quiz.html` | STRONG | PARTIAL | YES | YES | YES | YES | No | REUSE |
| Prepositions | `preposition-rules-bangla.html`, `preposition-quiz.html` | STRONG | PARTIAL | YES | YES | YES | YES | No | REUSE |
| Clauses / conjunctions | `bcs-english-grammar-bangla.html`, `grammar.html`; no dedicated full clause lesson found | USABLE | PARTIAL | PARTIAL | YES | YES | YES | PARTIAL | IMPROVE |
| Voice | `voice-change-rules-bangla.html`, `voice-converter.html` | STRONG | PARTIAL | YES | NO | NO | YES | Intelligence gap | REUSE content; DEFER graph |
| Narration | `narration-rules-bangla.html`, `narration-converter.html` | STRONG | PARTIAL | YES | NO | NO | YES | Intelligence gap | REUSE content; DEFER graph |
| Sentence structure / transformation | `bcs-english-grammar-bangla.html`, `sentence-analyzer.html`, `sentence-maker.html`, transformation material inside grammar guides | USABLE | PARTIAL | PARTIAL | YES | YES | YES | PARTIAL | IMPROVE |
| Degrees of comparison | `adjective-rules-bangla.html` (guide with degree section) | STRONG | PARTIAL | PARTIAL | PARTIAL | PARTIAL | YES | Practice gap | IMPROVE |
| Error correction | `common-grammar-mistakes-bangla.html`, `common-mistakes-bangladeshi-learners.html`, `mistake-notebook.html`, BCS diagnostic | STRONG | YES | YES | YES | YES | YES | No | REUSE |
| Synonyms | `bcs-english-synonyms-antonyms.html`, `synonym-test.html`, `question-bank-src/vocabulary/synonyms.json` | STRONG | YES | YES | NO | PARTIAL | YES | Intelligence gap | REUSE |
| Antonyms | `bcs-english-synonyms-antonyms.html`, `antonym-test.html` | STRONG | YES | YES | NO | PARTIAL | YES | Intelligence gap | REUSE |
| Idioms & phrases | `english-idioms-dictionary-bangla.html`, `idiom-test.html`, BCS diagnostic | STRONG | YES | YES | PARTIAL | PARTIAL (`fixed_expression`) | YES | No content gap | REUSE |
| Spelling | Scattered vocabulary/mock items; no dedicated reviewed spelling pathway found | THIN | PARTIAL | PARTIAL | NO | NO | PARTIAL | Real gap | BUILD |
| Word formation | `root-word-finder.html`, `word-family-finder.html` (learner tools) | USABLE | NO | PARTIAL | NO | NO | NO | BCS pathway gap | IMPROVE |
| Dictionary / BCS vocabulary | `dictionary.html`, `enriched-dictionary.json`, `bcs-vocabulary-guide.html`, `bcs-500-words.html` | STRONG | YES | YES | PARTIAL | PARTIAL | YES | Overlap | MERGE/CONSOLIDATE navigation |
| Reading comprehension | BCS diagnostic has 8 Reading items; `reading-academy.html`, five graded lessons, `mock-tests/reading-test-1.html` | USABLE | YES | YES | NO | NO | PARTIAL | BCS-style gap | IMPROVE |
| Essay writing | `writing.html`, `writing-coach.html`; no BCS essay task/rubric set found | USABLE | NO | PARTIAL | NO | NO | PARTIAL | Real BCS gap | BUILD |
| Summary / précis | Generic writing surfaces mention summarising; no dedicated précis lesson/task/rubric found | THIN | NO | NO | NO | NO | NO | Real gap | BUILD |
| Formal letter / Letter to Editor | `business-email-writing-bangla.html` is adjacent, not a BCS formal-letter/Letter-to-Editor pathway | THIN | NO | NO | NO | NO | NO | Real gap | BUILD |
| Bangla → English translation | `bangla-to-english-translation-hub.html` and scenario pages | STRONG for scenarios | NO | YES | NO | NO | PARTIAL | Written-exam gap | IMPROVE |
| English → Bangla translation | Dictionary/examples exist; no structured translation practice pathway found | THIN | NO | NO | NO | NO | NO | Real gap | BUILD |
| English literature: authors/works/ages | References occur in question-pattern/mock content; no reviewed literature learning library found | NOT_REVIEWED | PARTIAL | PARTIAL | NO | NO | PARTIAL | Real gap | BUILD after editorial source gate |
| Shakespeare / poetry / drama | Isolated questions/references only; no systematic reviewed lesson/practice set | NOT_REVIEWED | PARTIAL | PARTIAL | NO | NO | PARTIAL | Real gap | BUILD after editorial source gate |
| Self-introduction | `self-introduction-english-bangla.html`, speaking introduction lessons | USABLE | NO | YES | NO | NO | PARTIAL | Context gap | REUSE |
| Interview / viva English | `job-interview-english-bangla.html`, `speaking/office/attending-a-job-interview.html`, `speaking-practice.html` | STRONG general interview | NO | YES | NO | NO | PARTIAL | BCS viva gap | IMPROVE |
| BCS diagnostic | `bcs-english-diagnostic.html` — 40 items: Grammar, Vocabulary, Idioms, Reading, Sentence Correction | USABLE | YES | YES | NO direct canonical mapping | PARTIAL | YES | Mapping/editorial gap | IMPROVE |
| BCS grammar | `bcs-english-grammar-bangla.html` plus strong topic guides | STRONG | PARTIAL | YES | PARTIAL | PARTIAL | YES | Overlap | REUSE; consolidate links |
| BCS vocabulary | `bcs-vocabulary-guide.html`, `bcs-500-words.html`, `bcs-english-synonyms-antonyms.html` | STRONG | YES | YES | PARTIAL | PARTIAL | YES | Overlap | REUSE; consolidate links |
| BCS mocks / practice | `bcs-english-mock-test.html`, `mock-tests/bcs-test-1.html`, `bcs-test-2.html` | REVIEW_REQUIRED | YES | YES | NO | NO | YES | Provenance/editorial risk | IMPROVE before expansion |
| BCS learning path | `learning-path-bcs.html` | USABLE | PARTIAL | YES | PARTIAL | PARTIAL | YES | Hub overlap | REUSE |
| Candidate Center | `bcs/index.html`, `bcs/candidate-center.js` (`/bcs/`) | STRONG MVP | Routes to diagnostic | Routes to practice | YES link | Canonical stage data, not skill graph | YES | Some strong assets unlinked | IMPROVE navigation only |

### Canonical skill extension candidates (report only)

No new nodes are created. Evidence supports later editorial consideration of canonical, non-BCS-prefixed skills for: `spelling_accuracy`, `word_formation`, `reading_comprehension`, `essay_writing`, `summary_precis_writing`, `formal_letter_writing`, `bangla_to_english_translation`, `english_to_bangla_translation`, `literary_knowledge`, and `interview_speaking`. Voice/narration also lack direct graph nodes. These are **CANONICAL_SKILL_EXTENSION_CANDIDATE**, not approved graph changes.

## E. Duplication / cannibalization findings

- **SEO_DUPLICATION_RISK — BCS grammar:** `bcs-english-grammar-bangla.html` overlaps many strong standalone grammar guides. Keep it as a curated BCS route; do not create another BCS grammar URL.
- **SEO_DUPLICATION_RISK — vocabulary:** `bcs-vocabulary-guide.html`, `bcs-500-words.html`, and `bcs-english-synonyms-antonyms.html` overlap at the broad intent level but serve list/scope differences. Improve cross-linking and intent labels; do not create “BCS English Vocabulary” again.
- **SEO_DUPLICATION_RISK — preparation hubs:** `/bcs/` and `learning-path-bcs.html` overlap as entry points. `/bcs/` is the candidate-stage utility; the learning path is the study roadmap. Preserve that distinction.
- **SEO_DUPLICATION_RISK — practice:** three BCS mock pages plus the diagnostic already cover practice/test intent. Do not add another generic BCS English Practice URL.
- Question-pattern 2025/2026 pages overlap and contain claims needing editorial/provenance review. Consolidation/canonical decisions require SEO review; no URL change is recommended in this audit.
- No dedicated BCS Written English, BCS Viva English, or BCS Literature page currently satisfies those intents strongly enough to create cannibalization risk.

## F. DeepSeek gap verification

| Proposed gap | Verdict | Repository evidence |
|---|---|---|
| Literature | **CONFIRMED_GAP** | Only scattered/question-pattern references; no reviewed authors/works/ages pathway. |
| Précis / Summary | **CONFIRMED_GAP** | No dedicated lesson, task set, rubric, diagnostic, or practice page found. |
| Letter to Editor | **CONFIRMED_GAP** | Business email content is not an equivalent formal BCS letter pathway. |
| BCS-style comprehension practice | **PARTIAL_GAP** | 8 diagnostic Reading items and generic reading test/academy exist; no reviewed BCS-style passage pathway. |
| Essay practice | **PARTIAL_GAP** | General writing guide/coach exist; no BCS task bank or rubric. |
| Translation practice | **PARTIAL_GAP** | Strong Bangla→English scenario content; written-exam practice and English→Bangla pathway missing. |
| Idioms & Phrases | **NOT_A_GAP** | 200+ idiom guide, 40-item idiom test, and diagnostic category exist. |
| Viva English | **PARTIAL_GAP** | Strong general interview/self-introduction/speaking assets; not BCS-viva contextualised or diagnosed. |

## G. Candidate Center connection audit

Current `/bcs/` links are valid and resolve to: BCS English Diagnostic, BCS Grammar, BCS Vocabulary, Mistake Mirror, BCS English Mock Test, and BCS Learning Path. It also links the BPSC official homepage. No broken destination was found by the existing Phase 4D validator.

The strongest relevant existing assets not directly linked are `bcs-english-synonyms-antonyms.html`, `idiom-test.html`, `reading-academy.html`/`mock-tests/reading-test-1.html`, `writing.html`, and `job-interview-english-bangla.html`. Some are reachable through the Learning Path or stage CTA, so this is navigational depth rather than missing content. Candidate Center can already route preliminary learners into the strongest core grammar/vocabulary/diagnostic resources and Mistake Mirror; written/viva depth remains partial.

## H. REUSE NOW

1. Core grammar guides and quizzes: tense, SVA, articles, prepositions, parts of speech, voice, narration.
2. Error-correction stack: common mistakes, Mistake Mirror/Profile, and mapped core grammar graph.
3. BCS grammar, vocabulary, synonyms/antonyms, idioms guide/test, diagnostic, and Learning Path.
4. Dictionary/vocabulary foundation and existing general reading/speaking/interview resources.
5. `/bcs/` as the sole Candidate Center utility hub.

## I. IMPROVE

1. Map reviewed diagnostic/mocks to canonical skills and enforce provenance/editorial gates.
2. Strengthen clause/transformation and degrees practice without creating duplicate BCS pages.
3. Turn existing reading assets into a reviewed BCS-style passage pathway.
4. Contextualise existing writing/translation/interview assets for written/viva needs.
5. Clarify navigation among overlapping BCS vocabulary and preparation hubs; link highest-value existing assets from Candidate Center where appropriate.

## J. BUILD

- **P0:** Reviewed BCS English literature foundation (authors, works, literary ages, Shakespeare/poetry/drama) with authoritative editorial sourcing; dedicated précis/summary lesson + task/rubric; formal letter/Letter-to-Editor lesson + tasks.
- **P1:** BCS-style comprehension passage set; BCS essay task/rubric practice; structured written translation practice in both directions.
- **P2:** Dedicated spelling pathway; canonical word-formation practice; BCS-viva contextual layer using existing interview/speaking assets.
- **DEFER:** New Skill Graph nodes until taxonomy/editorial review; new generic BCS grammar/vocabulary/practice hubs; any historical-question expansion without Phase 4A/4B source compliance.

## K. P0/P1/P2 priorities

P0 addresses the clearest absent written/literature capabilities. P1 converts strong adjacent foundations into BCS-relevant practice. P2 fills narrower capability and contextual gaps. All new content must use canonical English skill names and avoid BCS-prefixed graph duplication.

## L. Exact recommended Phase 4E-D

Run a narrow **editorial/source design phase for the three P0 capabilities only**: literature, précis/summary, and formal letter/Letter to Editor. For each, define authoritative sources, canonical skill boundaries, learner outcome, diagnostic/practice rubric, reuse points, proposed single URL intent, and human review gate. Do not write production pages, add graph nodes, ingest historical questions, or expand Candidate Center until those three briefs pass source/editorial review.
