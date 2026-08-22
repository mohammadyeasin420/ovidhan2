# Ovidhan IELTS Architecture & Gap Audit — Phase 6A

## A. Executive summary

Ovidhan already has more IELTS material than its current product architecture exposes: three broad overview/roadmap pages, a distinct vocabulary page, a 40-question diagnostic, an eight-question generic mock, four listening lessons, and a 15-question listening mock. The problem is not the absence of pages; it is fragmentation and lack of integration.

`ielts-guide.html` is the de facto acquisition hub because the shared navigation links to it from roughly 1,447 HTML files. It is self-canonical and broad, but it does not link learners into the diagnostic, learning path, vocabulary page, or listening practice. `ielts-preparation-bangla.html` covers substantially the same overview, test-format, band-target, study-plan and four-skills intent; it is self-canonical, is in the sitemap, but has no inbound HTML reference other than itself. This is the clearest cannibalisation/orphan risk. `learning-path-ielts.html` also uses “complete” roadmap language, but its step-by-step learning-path intent can remain defensible as a supporting page if the hub clearly assigns it that role.

The 40-question diagnostic is real and explicitly says it is a readiness check rather than an official band score. However, its six broad labels (`grammar`, `vocabulary`, `reading`, `writing`, `listening`, `speaking`) are not canonical Skill Graph IDs. It does not use Learning Foundation, Mistake Profile, or SmartPath and stores a separate summary under `ovidhan_ielts_diagnostic_v2` in localStorage. That is the most important architecture gap: the current journey stops at a standalone score and generated links rather than producing shared canonical evidence.

The canonical graph is already a strong base: 14 families, 65 ACTIVE skills, zero PLANNED skills, and 240 mappings. Five reading-comprehension skills, two essay-planning skills, 26 graph skills already tagged with IELTS relevance, the existing Mistake Mirror grammar practice, shared anonymous retention, Mistake Profile, and SmartPath can all be reused. New IELTS-specific duplicates should not be created. Listening has real page-level practice but no canonical listening skill family; speaking has generic pages and diagnostic strategy questions but no canonical IELTS-speaking evidence architecture.

The smallest high-value next phase is **IELTS hub consolidation and verified diagnostic entry architecture**, not a new content pack: make `ielts-guide.html` the explicit hub, decide the redirect/canonical fate of the duplicative preparation page, give the learning path/vocabulary/diagnostic/listening assets clear subordinate roles, replace or qualify unsupported official/outcome claims after official-source review, and link the hub to the existing diagnostic. A following focused phase should map defensible diagnostic questions to existing canonical skills and move bounded evidence into the shared Learning Foundation/Mistake Profile/SmartPath pipeline, retiring the IELTS-specific summary store rather than creating another engine.

## B. Repository, SHA, and branch

- Repository: `mohammadyeasin420/ovidhan2`
- Workspace: `C:\dev\ovidhan2`
- Starting `main`: `f7ab3faa7f17fb73195c723a16a33e549062e6bd`
- Audit branch: `codex/ielts-architecture-audit-6a`
- Mode: read-only diagnostic; only this report is intentionally created
- Graph baseline confirmed: 14 families, 65 skills, 65 ACTIVE, 0 PLANNED, 240 item mappings

## C. IELTS asset inventory

All pages below are indexable by default unless noted: no page contains `noindex`. Ten are in `sitemap.xml`; `ielts-diagnostic.html` is the exception. “Inbound” counts include self-canonical/share references where present, so the evidence column identifies meaningful sources separately.

| Page / public URL | Purpose and primary intent | Title / H1 | Canonical and discovery | Functionality / integration | IELTS outbound links | Risk |
|---|---|---|---|---|---|---|
| `ielts-guide.html` · `/ielts-guide.html` | Broad acquisition guide; “how to get 7+”; current de facto hub | `How to Get 7+ in IELTS – Complete Guide for Bangladeshi Students \| Ovidhan` / near-identical H1 | Self-canonical; sitemap; shared navigation produces ~1,447 file references | Static article only; no canonical skill metadata, diagnostic, Learning Foundation, Profile, or SmartPath integration | Only self/share IELTS URLs; broad links to Exam Prep and Listening hubs | **HIGH overlap** with preparation page; unsupported “7+” framing and official-format claims; weak IELTS cluster links |
| `ielts-preparation-bangla.html` · `/ielts-preparation-bangla.html` | Broad IELTS overview, format, band targets, study roadmap and resources | `IELTS Preparation for Bangladeshi Learners \| Ovidhan` / same | Self-canonical; sitemap; exact basename appears only in this file | Static article/checklist; Article, FAQ and Breadcrumb structured data; no shared learner integration | Global-nav link to guide only | **VERY HIGH cannibalisation/orphan risk**: overlaps guide and learning path, yet has no external repository inbound page |
| `learning-path-ielts.html` · `/learning-path-ielts.html` | Step-by-step preparation roadmap | `IELTS Learning Path – Complete Band Score Roadmap \| Ovidhan` / `IELTS Learning Path` | Self-canonical; sitemap; about 20 repository references, mostly learning/vocabulary pages | Static course-style roadmap; links to diagnostic; no skill metadata or shared evidence | Guide plus relative diagnostic link | **MEDIUM overlap** with both broad guides; distinct roadmap intent is defensible if subordinated to hub |
| `ielts-vocabulary-2026-bangla-meaning.html` · `/ielts-vocabulary-2026-bangla-meaning.html` | IELTS vocabulary acquisition with Bangla meanings/examples | `IELTS Vocabulary 2026 with Bangla Meaning & Example Sentences \| Ovidhan` / same | Self-canonical; sitemap; about 10 repository references including Vocabulary, Practice, Exam Prep and diagnostic | Static tables/advice; no quiz on-page, skill metadata, Foundation, Profile or SmartPath | Guide only | **LOW intent overlap**, but **HIGH claim/thinness risk**: page says “800+” while rendered lexical tables contain about 23 data rows; year token will age |
| `ielts-diagnostic.html` · `/ielts-diagnostic.html` | 40-question readiness diagnostic across six broad domains | `Free IELTS Diagnostic Test… \| 40-Question Readiness Check` / `IELTS Diagnostic Test for Bangladeshi Learners` | Self-canonical; explicit `index,follow`; absent from sitemap; basename appears in learning path, Tools, planner and itself | Objective 40-question engine with answer feedback, Bangla explanations, percentages and generated plan; explicitly “not an official band score”; separate `ovidhan_ielts_diagnostic_v2` localStorage summary; no canonical IDs, Foundation/Profile/SmartPath | Guide, vocabulary and generic mock links | **Strong product asset but architecturally isolated**; “personalised skill profile” is only broad category percentages |
| `mock-tests/ielts-test-1.html` · `/mock-tests/ielts-test-1.html` | Generic IELTS-labelled English MCQ mock | `Ielts Test 1 – Free English Practice \| Ovidhan` / unrelated `Ovidhan` H1 | No canonical link (only self hreflang alternates); sitemap; about six basename references | Eight embedded objective questions using the generic test player; not mapped to canonical graph/shared Profile/SmartPath | Guide only | **WEAK identity/SEO**: generic title, mismatched H1, very small set, unclear IELTS representativeness |
| `question-bank-src/mixed/ielts-full.json` | Source question asset | n/a | Not a public page | Five `verified: true` editorial MCQs with broad `skill`/`subskill`; references nonexistent `/ielts-reading-tips-bangla.html`; not the same count as the eight embedded mock questions; no graph mapping | JSON learning links | **PARTIAL/stale pipeline risk**: source/output counts diverge and “verified” has no official-source provenance |
| `listening-exams/ielts-listening-mock-test-01.html` · `/listening-exams/ielts-listening-mock-test-01.html` | Four-section listening-labelled mock | `IELTS Listening Mock Test 01 - Ovidhan IELTS Practice` / same | No canonical link (self hreflang only); sitemap; linked from Listening hub | Four browser-speech-synthesis transcripts, Bangla reveals, 15 MCQs, generic `listening-exam-engine.js`; not canonical evidence | Guide only | **PARTIAL**: substantive practice but transcript is visible, audio is synthetic TTS, duration says 15 minutes, and IELTS-format equivalence is unsupported |
| `listening/ielts-listening-section-1-social.html` · corresponding URL | Short Section 1-labelled lesson | `IELTS Listening Section 1 (Social) - Ovidhan Listening Practice` / same | No canonical; sitemap; Listening hub + prior/related page references | Browser TTS, visible transcript, Bangla reveal, vocabulary, grammar, two MCQs, shadowing; “Check Answers” only alerts manual checking | Guide, next section | **PARTIAL/WEAK** as IELTS practice; useful general listening but no grading/evidence and broken related `/listening/ielts-section-1.html` link target is not present |
| `listening/ielts-listening-section-2-travel.html` · corresponding URL | Short Section 2-labelled lesson | matching Section 2 title/H1 | No canonical; sitemap; Listening hub + section chain | Same template: browser TTS, visible transcript, two MCQs/manual alert, Bangla support | Guide, next section | Same practice and unsupported-format risks; related `/listening/ielts-section-2.html` is absent |
| `listening/ielts-listening-section-3-academic.html` · corresponding URL | Short Section 3-labelled lesson | matching Section 3 title/H1 | No canonical; sitemap; Listening hub + section chain | Same template | Guide, next section | Same risks; related `/listening/ielts-section-3.html` is absent |
| `listening/ielts-listening-section-4-lecture.html` · corresponding URL | Short Section 4-labelled lesson | matching Section 4 title/H1 | No canonical; sitemap; Listening hub + section chain | Same template | Guide, Listening hub | Same risks; related `/listening/ielts-section-4.html` is absent |

Additional relevant generic assets are `listening-exam-engine.js`, `test-player.js`, `listening.html`, `speaking.html`, `speaking-practice.html`, `writing.html`, `grammar.html`, `vocabulary.html`, `vocabulary-quiz.html`, `assessment.html`, the shared Learning Foundation/Mistake Profile/SmartPath files, and the canonical graph/goal JSON. They are reusable platform assets, not dedicated IELTS architecture. No IELTS-specific report existed before this audit. The repository’s `gsc_opportunities.csv` exists but contains no IELTS row, so it supplies no traffic/ranking evidence; no traffic conclusion is drawn.

## D. Hub and cannibalisation analysis

### Recommended canonical hub

`ielts-guide.html` should remain the single canonical IELTS hub because repository navigation already makes it the authoritative node, it is self-canonical, it has the strongest inbound internal-link footprint, and its broad four-section overview matches hub intent. This is an architectural recommendation, not an instruction to preserve every current claim or “7+” framing.

### `ielts-preparation-bangla.html`

This page most clearly duplicates the hub. Both pages target broad Bangladeshi IELTS preparation, introduce the test, describe skills/format, promise band improvement, provide study schedules, and funnel to generic resources. The preparation page self-canonicalises instead of consolidating, is included in the sitemap, and has no meaningful repository inbound link. A future phase should compare unique useful sections, migrate only defensible material to the hub or learning path, and then choose a redirect/canonical/noindex strategy. No consolidation is implemented here.

### `learning-path-ielts.html`

This can hold a distinct “roadmap after onboarding” role, but the current title/meta/H1 and “complete” wording compete with both overview pages. The hub should link to it explicitly as a roadmap, and it should link back to the hub and forward to the diagnostic/practice in a controlled journey. Its claim that the diagnostic estimates a band score conflicts with the diagnostic’s safer “not an official band score” language.

### Vocabulary intent

The vocabulary URL has a distinct, defensible query intent and a separate self-canonical. It should remain a supporting acquisition/learning page rather than become the hub. Its visible inventory does not substantiate “800+”, “every word is used in IELTS”, or easy “7+” outcome claims. The `2026` slug/title creates recurring freshness debt without evidence that the content is year-specific.

### Existing redirect/canonical strategy

There are no IELTS redirects in repository evidence. Guide, preparation, vocabulary, diagnostic, and learning path each self-canonicalise. The mock/listening pages have self-referential hreflang alternates but no `rel="canonical"`. Therefore no consolidation strategy currently exists.

## E. Canonical skill reuse map

The classifications below concern skill concepts. Existing BCS Written/Literature item eligibility must remain unchanged: BCS Written practice is goal-restricted to BCS even where a concept could later support IELTS.

### DIRECTLY_RELEVANT

| Domain | Existing canonical skills | Evidence and reuse decision |
|---|---|---|
| Reading | `reading_main_idea`, `reading_supporting_detail`, `reading_inference`, `reading_tone_purpose`, `reading_reference` | Exact skills already exist in `READING_COMPREHENSION`. They match diagnostic reading constructs and should be reused, not duplicated. They are currently BCS-relevant only in graph/pack eligibility and need a reviewed IELTS mapping/practice decision later. |
| Writing Task 2 foundation | `essay_thesis_focus`, `essay_outline_structure` | Exact thesis/organization foundations already exist. Reuse the skills; do not route the BCS-only essay items to IELTS automatically. |
| Academic language | `word_choice_register`, `parallel_structure`, `sentence_fragment`, `run_on_sentence`, `subordinate_clause_connection`, `coordinating_conjunctions` | Directly supports formal tone, sentence control and coherence constructs already present in the diagnostic. `word_choice_register` is already IELTS CORE; the others need explicit reviewed mapping rationale. |
| Vocabulary/context | `word_choice_register`, `commonly_confused_words`, `fixed_expression` | Reusable lexical precision/collocation foundation. The graph lacks a dedicated academic-vocabulary/context skill; do not invent one until diagnostic/content evidence is governed. |

### SUPPORTING

The following existing skills are legitimate general-language foundations and many are already tagged IELTS in `exam_relevance`: all article skills; time/place/governed prepositions; simple present/past, present perfect, modals, used-to and stative aspect; all subject–verb agreement skills; countability/quantifier skills; transitive/gerund/infinitive/ditransitive patterns; standard negation and unnecessary auxiliaries; clause pairing; SVO/adverb/adjective order. These should enter IELTS only through defensible goal mappings and shared practice—not through duplicate IELTS-prefixed nodes.

Twenty-six current skills explicitly include `IELTS` in `exam_relevance`: `definite_article_the`, `zero_article`, `article_with_countability`, `adjective_preposition`, `verb_preposition`, `duration_since_for`, `present_perfect_time_reference`, `used_to_base_form`, `stative_verb_aspect`, `collective_subject_agreement`, `countable_uncountable_nouns`, `fewer_less_register`, `quantifier_agreement`, `gerund_after_preposition`, `infinitive_complement`, `ditransitive_verb_pattern`, `sentence_fragment`, `run_on_sentence`, `parallel_structure`, `coordinating_conjunctions`, `subordinate_clause_connection`, `adverb_position`, `adjective_order`, `word_choice_register`, `commonly_confused_words`, and `formal_letter_writing`.

### NOT_CURRENTLY_JUSTIFIED

- `literary_period_identification`, `author_work_attribution`, `quotation_attribution`, `genre_form_identification`: BCS Literature knowledge, not IELTS evidence.
- `translation_bn_to_en`, `translation_en_to_bn`: useful language practice but not a demonstrated IELTS test construct.
- `writing_precis`: concise writing may support general ability, but there is no reviewed IELTS mapping or task-equivalence evidence.
- `formal_letter_writing`: the current OPTIONAL mapping is cautiously described as general practice. Any direct General Training Task 1 claim requires official verification; it should not be elevated based on the current page alone.
- Speaking: generic speaking/career pages exist, but there are no canonical speaking skills in the graph. Do not infer IELTS speaking mappings from generic fluency pages.
- Listening: the repository has exercises but no canonical listening family/skills or item mappings. A small extension may eventually be justified, but only after governing the practice/evidence model.

## F. Current IELTS goal mappings

`goal-skill-requirements.json` contains exactly three IELTS mappings:

| Skill | Importance | Stored rationale | Audit judgment |
|---|---|---|---|
| `present_perfect_time_reference` | SUPPORTING | “Existing canonical skill is tagged IELTS.” | Defensible as a language foundation, but rationale is circular/sparse and should later cite a governed product/construct reason. |
| `word_choice_register` | CORE | Tagged IELTS and supports reviewed writing/register practice | Defensible and the strongest mapping; still too broad to represent IELTS writing/vocabulary coverage alone. |
| `formal_letter_writing` | OPTIONAL | General formal-writing practice, not a universal IELTS format | Appropriately cautious. Keep optional unless official General Training scope and page fit are verified; consider removal if users misread it as universal IELTS preparation. |

The set is materially too sparse for the available canonical reading and essay foundations. Expansion should be evidence-led, not a bulk copy of every skill tagged `IELTS`. In particular, goal relevance and page/item eligibility are separate controls: adding a mapping must not leak BCS-only practice into IELTS.

## G. Current SmartPath and practice behavior

- `smartpath-destinations.json` has only two generic destinations: Précis and Formal Letter. There is no dedicated IELTS destination.
- IELTS can receive the unrestricted original/grammar Mistake Mirror items because those items have no BCS-only `goal_ids`. This is legitimate general grammar practice through the shared engine.
- The two generic writing destinations are globally eligible. Formal Letter receives an OPTIONAL IELTS goal score; Précis has no IELTS mapping but can still appear as new/reinforcement content because destination eligibility is not mapping-only.
- Literature and BCS Written records are normalized with `goal_ids: ['BCS']`; `smartpath-router.js` filters destinations by goal. Unseen Literature, comprehension, translation, and essay items therefore do not leak into IELTS.
- The current 40-question diagnostic could support the shared engine without a second engine: many questions can map to existing grammar, reading, writing-structure and register skills. However, current broad category labels are insufficient; each item needs governed canonical mapping and review.
- Current dedicated practice consists of: 40 diagnostic MCQs; eight generic mock MCQs; five source-bank MCQs (not aligned in count with the rendered mock); four short listening pages with two questions each and manual-only completion; one four-section listening mock with 15 MCQs.
- No IELTS practice contributes to Mistake Profile or SmartPath evidence today.
- An IELTS-specific learner state **does exist**: `ielts-diagnostic.html` persists `correct`, weakest category/label, and date under `ovidhan_ielts_diagnostic_v2`. It is separate from `ovidhan_learning_v1`. Future work should migrate bounded, canonical evidence into Learning Foundation and retire this parallel summary—not add another IELTS store/profile/router.

## H. IELTS product gap matrix

| Area | State | Repository evidence |
|---|---|---|
| IELTS overview / onboarding | DUPLICATED | Guide, preparation and learning-path pages all claim broad/complete preparation roles; no explicit parent/child architecture |
| Reading | PARTIAL | 8 diagnostic reading MCQs and five canonical reading skills exist; no IELTS-governed pack, long-form timed practice, or shared evidence |
| Writing Task 1 | MISSING | Generic writing page and formal-letter destination exist, but no governed Academic/General Task 1 foundation or official distinction |
| Writing Task 2 | PARTIAL | 6 diagnostic language questions plus canonical thesis/outline skills; no IELTS-specific productive practice, feedback or shared evidence |
| Listening | PARTIAL | Four TTS lessons and a 15-question TTS mock exist; no canonical skills/profile integration and exam equivalence is unsupported |
| Speaking | WEAK | 5 diagnostic language/strategy MCQs and generic speaking pages; no productive task flow, canonical speaking skills or evidence |
| Vocabulary | PARTIAL | Distinct vocabulary page, diagnostic MCQs and generic vocabulary tools; page’s “800+” claim is not supported by visible rows; no canonical academic-vocabulary practice |
| Grammar | GOOD | Strong canonical grammar graph plus 100 unrestricted original/BCS-grammar-style objective items in shared Mirror; only sparse IELTS goal mappings |
| Diagnostic | PARTIAL | Real 40-question readiness tool with safe band disclaimer and Bangla feedback; isolated category model and separate localStorage |
| Practice | WEAK | Several standalone quizzes/mocks, inconsistent source/output counts, limited question types and no shared evidence |
| Mistake feedback | PARTIAL | Shared Mistake Mirror/Profile are mature for grammar, but IELTS diagnostic/listening/mock evidence bypasses them |
| SmartPath routing | WEAK | Shared router works and goal isolation is correct, but no IELTS destinations and only three IELTS goal mappings |
| Retention / review | PARTIAL | Shared anonymous retention exists for integrated actions; IELTS diagnostic saves only last score/weakest/date in a parallel key |
| Bangla-first explanation | GOOD | Diagnostic has Bangla explanations; vocabulary and listening pages include Bangla support/translations; broad articles target Bangladeshi learners |
| Search / SEO acquisition | PARTIAL | Globally linked hub and multiple indexed assets exist, but cluster links are weak, three overview intents overlap, canonical gaps exist, and claims need verification |

## I. SEO and content risks

1. **Cannibalisation:** Guide and preparation page target nearly the same broad query intent; learning path adds another “complete roadmap” variant. All three are self-canonical.
2. **Orphaning:** Preparation page has no meaningful inbound HTML reference. Diagnostic is absent from the sitemap and only lightly linked. The global hub does not link to either.
3. **Weak cluster:** Most IELTS pages link only to the guide through global navigation, while the guide itself does not expose the diagnostic, vocabulary, roadmap or listening sequence.
4. **Missing canonicals:** The generic mock, listening mock and four listening-section pages have hreflang alternates but no canonical link.
5. **Title/H1 mismatch:** `mock-tests/ielts-test-1.html` uses an IELTS title but an `Ovidhan` H1; its meta description is generic BCS/IELTS/Bank preparation language.
6. **Thin/misleading scale:** Vocabulary copy says “800+” and that every word is used in IELTS, but the visible lexical tables contain roughly 23 data rows. The generic mock has only eight questions.
7. **Year-dependent wording:** `2026` in the vocabulary slug/title creates freshness obligations although the content is not demonstrably year-specific.
8. **Keyword/claim inflation:** “Complete,” “Band 7+,” “personalised,” “full mock,” “all words,” and score-improvement language often exceed the demonstrated functionality or provenance.
9. **Broken/absent related targets:** The four listening lessons link to `/listening/ielts-section-{1..4}.html`, which are not repository files.
10. **No ranking inference:** `gsc_opportunities.csv` contains no IELTS row. This audit does not infer traffic, rankings or performance.

## J. Official-fact verification needs

No inspected IELTS page cites IELTS.org, British Council, IDP or Cambridge as an official source. Repository repetition, self-authored structured data and `verified: true` editorial flags do not verify official exam facts.

### VERIFIED_IN_REPOSITORY (internal product facts only)

- The diagnostic contains exactly 40 questions across six broad categories.
- It explicitly states that it is a readiness diagnostic and not an official IELTS band score.
- The rendered generic mock contains eight questions; the JSON source contains five; the listening mock contains four transcripts and 15 MCQs.
- These facts describe Ovidhan assets, not IELTS rules.

### NEEDS_OFFICIAL_SOURCE

- Current Listening/Reading/Writing/Speaking timing and question counts.
- Whether audio is heard once and the current test-delivery variations.
- Speaking duration, number/structure of parts, examiner format and scoring.
- Academic versus General Training Reading/Writing differences.
- Writing Task 1 task types and minimum length; Writing Task 2 task types and minimum length.
- Test duration, transfer/checking time and computer/paper differences.
- Band descriptors, component weighting, raw-score conversion and overall-band calculation.
- Claims about what Band 7 means in each skill.
- Accepted institutions/immigration uses and any country/program-specific required bands.
- Any assertion that certain topics, vocabulary or question types “often” appear.

### UNSUPPORTED OR CONTRADICTED

- “Thousands of Bangladeshi students achieve Band 6.5–7.5 every year” and generalized statements about the biggest challenge.
- Claims that most learners can move from 5.5–6.0 to 7+ or need 2–4 months/60–90 minutes daily.
- The preparation page’s CEFR-to-band estimate table unless supported by a validated concordance and careful caveats.
- Vocabulary claims that learners can “easily” reach 7+, that the page contains 800+ words, and that every listed word is used in IELTS. The visible table count contradicts the 800+ claim.
- The learning path’s statement that the current diagnostic estimates a band score; the diagnostic itself explicitly disclaims this.
- Calling the 15-minute synthetic-TTS activity a “complete/full IELTS listening mock” without qualification.

Future implementation should verify live official facts from official IELTS, British Council, IDP and/or Cambridge pages at implementation time and record source URL, review date and claim scope.

## K. Recommended target architecture

```text
ONE IELTS hub: /ielts-guide.html
  ├─ verified onboarding and Academic/General choice
  ├─ readiness diagnostic
  │    └─ governed item → canonical skill mappings
  ├─ skill gaps in shared Mistake Profile
  ├─ shared canonical grammar / reading / writing foundations
  ├─ IELTS-specific practice only for genuine test constructs
  ├─ shared SmartPath recommendation
  └─ shared anonymous retention / review

Supporting acquisition pages
  ├─ learning path (roadmap intent)
  ├─ vocabulary (distinct vocabulary intent)
  └─ listening/practice pages (only after provenance and evidence review)
```

The hub should explain scope and route one learner action at a time. The diagnostic should not claim a band. Each objective item should map to an existing canonical skill where possible. Shared Learning Foundation remains the only learner state, Mistake Profile the only evidence summary, and SmartPath the only router. IELTS-specific content is justified only for constructs that canonical grammar/reading/writing practice cannot represent, particularly real listening and productive speaking/writing workflows.

## L. Reuse versus build matrix

| Decision | What belongs here |
|---|---|
| **A. CAN REUSE NOW** | `ielts-guide.html` URL/navigation authority; 40-question diagnostic content after item review; canonical grammar graph/practice; five reading skills; thesis/outline skills; register/sentence-control skills; shared Foundation/Profile/SmartPath/retention; Bangla explanations; general Grammar/Writing/Listening/Speaking/Vocabulary hubs |
| **B. NEEDS SMALL EXTENSION** | Hub-to-diagnostic/roadmap/vocabulary/listening cluster links; per-diagnostic-item canonical mappings; carefully expanded IELTS goal mappings; a shared diagnostic completion/evidence adapter; retirement/migration of `ovidhan_ielts_diagnostic_v2`; canonical metadata for listening/mock pages; official-source provenance fields |
| **C. NEEDS NEW CONTENT** | Governed IELTS Reading practice with authentic-length task design; verified Task 1 Academic/General foundations; guided Task 2 practice; genuine listening assets/evidence; productive speaking practice. Build these separately and incrementally only after architecture/fact gates. |
| **D. SHOULD NOT BUILD** | A second IELTS router, learner store, profile, skill graph, dashboard or retention engine; IELTS-prefixed duplicates of reading/thesis/grammar skills; AI band scoring; automatic essay/speaking grading; fake readiness percentages; a giant “everything IELTS” content batch; unverified official-format replicas |

## M. Recommended next implementation phase

### Phase 6B: IELTS Hub Consolidation & Verified Diagnostic Entry

Keep the scope small:

1. Confirm current official facts and remove/qualify unsupported outcome claims.
2. Make `ielts-guide.html` the explicit hub and add a clear diagnostic CTA plus subordinate links to roadmap, vocabulary and existing listening practice.
3. Decide `ielts-preparation-bangla.html` consolidation based on unique defensible sections, then implement one redirect/canonical strategy rather than maintaining two broad hubs.
4. Reframe `learning-path-ielts.html` as the post-onboarding roadmap and correct its band-estimate language.
5. Add the diagnostic to the intended discovery architecture (including sitemap only if it remains indexable and fact-safe).
6. Do **not** add new practice or graph nodes in 6B.

Acceptance should require one hub, no competing broad canonical intent, verified learner-facing exam facts, coherent hub→diagnostic navigation, no frozen SEO changes, and no new learner state. A subsequent 6C can map reviewed diagnostic items to canonical skills and the shared evidence pipeline; separating that work keeps the next phase testable and avoids mixing SEO consolidation with evidence migration.

## N. Files intentionally not changed

No HTML, CSS, JavaScript, JSON, Skill Graph, goal mapping, SmartPath destination, content pack, sitemap, robots, dictionary file, navigation, runtime code, test or frozen experiment file was changed. Only `reports/ovidhan-ielts-architecture-audit-6a.md` is created.

## O. Frozen SEO verification

`scripts/verify_bcs_candidate_intelligence_4c.js` passed on the audit branch; together with its frozen manifest inspection it confirmed:

- Treatment pages: 72
- Control pages: 72
- Total frozen pages: 144
- Aggregate SHA-256: `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`

No frozen experiment file is in the diff.

## P. Git status

Before report creation the working tree was clean. At report completion the intended diff is exactly this new report. `git diff --check` and a final clean status after commit are release gates.

## Q. Final commit and compare link

- Required commit message: `docs: audit IELTS architecture and gaps`
- Final commit SHA: reported in the final handoff after Git creates the commit (a commit cannot contain its own object ID).
- Compare/PR: `https://github.com/mohammadyeasin420/ovidhan2/compare/main...codex/ielts-architecture-audit-6a?expand=1`
- Merge is explicitly outside this phase.
