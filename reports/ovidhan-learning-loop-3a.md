# Ovidhan Product Growth Phase 3A

## Dakho Learning Loop and Mistake Mirror architecture audit

Status: architecture only

Repository: `mohammadyeasin420/ovidhan2`

Audit date: 2026-08-16
Frozen SEO experiment: 72 treatment URLs and 72 control URLs; excluded from every recommendation in this report.

## Executive decision

Ovidhan already contains most of the visible ingredients for a useful learning loop, but not a reliable shared product system. The smallest useful V1 is one reviewed question shown after an existing useful answer, followed by immediate Bangla-supported feedback, one deterministic next action, and local progress. It should not begin as a feed, a rewrite of Learning Explorer, or a cross-site rollout.

Phase 3B should first introduce a small, consent-aware event and state foundation on non-dictionary pilot surfaces. Phase 3C can then launch a manually reviewed Mistake Mirror pilot. Existing quizzes, mistake content, speech synthesis, flashcard scheduling, and local progress can be adapted behind stable interfaces instead of copied again.

## Audit scope and evidence

The audit inspected the repository's interactive engines, major learner surfaces, local persistence, analytics snippets, and available content. Important evidence includes:

- `learning-explorer.js`: dictionary lookup, speech synthesis, a weak three-option quiz, daily sentence challenge, flashcard/save actions, localStorage fallbacks, and Learning Explorer-specific URL mutation.
- `quiz-engine.js` and `question-bank-src/`: reusable multiple-choice flow, immediate explanations, categories for grammar, vocabulary, tenses, BCS, and IELTS.
- `flashcards.js`: local spaced-review data with interval, ease, stage, next-review date, and correct/incorrect counts.
- `mistake-notebook.html`: a separate word-oriented SRS list exposed only from that page through `window.ovidhan.addToSRS`.
- `gamification.js`: XP, level, streak, achievement, and daily-challenge state in `ovidhan_gamification`.
- `dashboard.html`: a second progress model in `ovidhan_dashboard_data`, with its own XP, streak, quiz, vocabulary, grammar, study-time, and achievement logic.
- `recommendations.js` and `global.js`: local interest scoring from visited pages, searches, saved words, and quiz history.
- `common-mistakes-bangladeshi-learners.html`, `common-grammar-mistakes-bangla.html`, `grammar-checker.html`, and `practice.html`: existing corrected sentences, Bangla-focused explanations, diagnostics, and interactive questions.
- `lesson-engine.js`, `listening-engine.js`, `speaking-practice.html`, and speaking lesson pages: speech synthesis, browser speech recognition where supported, listening exercises, and saved completion state.
- Google Analytics snippets exist on many content pages, but product events are sparse, differently named, and not governed by a common schema.
- No repository-wide account identity, anonymous learner ID, event queue, consent/state versioning, or server-side learning record was found.

## A. Current reusable features

### Reusable immediately

1. **Reviewed question and feedback UI patterns.** `quiz-engine.js`, specialist quiz pages, and the BCS diagnostic already support choice selection, correct/incorrect states, explanations, progress, and next controls.
2. **Bangladesh-first mistake material.** The common-mistake pages already include examples such as “I am agree with you,” corrected forms, Bangla context, sentence correction, speaking mistakes, workplace mistakes, and short diagnostics.
3. **Speech synthesis.** The Web Speech synthesis implementations can power Hear and Repeat without an SDK or account.
4. **Conditional speech recognition.** `lesson-engine.js` demonstrates progressive enhancement through `SpeechRecognition`/`webkitSpeechRecognition`; it can remain optional.
5. **Local flashcard scheduling.** `flashcards.js` has a usable starting SRS model and review metadata.
6. **Quiz banks and intent categories.** Existing material covers grammar, vocabulary, BCS, IELTS, tenses, and several specialist quizzes.
7. **Progress UI concepts.** Dashboard, quiz progress, streaks, XP, completion counts, and local review state show useful display patterns, even though their data models need consolidation.
8. **Existing contextual learning destinations.** Grammar lessons, practice tools, BCS diagnostics, speaking lessons, job-interview pages, daily English, and vocabulary hubs provide safe next actions.
9. **Dakho/Ovidhan app destination.** Existing Play Store links can be reused with contextual copy and new first-party click events.

### Features needing adaptation

- The Learning Explorer quick quiz always makes the first option correct and uses “Not sure” and “I don't know” as distractors. It is not a valid assessment component and must not seed V1 questions.
- Daily challenge validation only checks whether the typed sentence contains the target word. Treat it as a writing prompt, not correctness evidence.
- The mistake notebook stores words, not mistakes with wrong/correct/explanation/context fields.
- Quiz engines have useful interaction mechanics but inconsistent question shapes and no shared event contract.
- Speech recognition needs explicit capability checks, permission messaging, and a non-recording fallback.
- The recommendation engine scores broad content categories and browsing interest, not the next best learning action for the current misconception.
- XP and streaks should become optional feedback, not the primary success model. Learning progress must be based on completed reviewed actions.
- Analytics snippets need a common wrapper, stable names, schema versions, and validation before any experiment.

### Duplicated functionality

- XP, streak, challenge, quiz completion, and achievement logic exists in both `gamification.js` and `dashboard.html`.
- Saved words/flashcards appear under multiple localStorage keys and incompatible data shapes.
- `window.ovidhan` integrations are page-local; loading a different page does not guarantee the expected methods exist.
- Multiple pages implement their own quiz checking, feedback styling, progress, speech, and CTA tracking.
- Recommendation, dashboard, flashcard, mistake-notebook, test-history, writing, and speaking state are separate stores without migration or versioning.

### Obsolete or experimental behavior

- Phase-labelled Learning Explorer features are prototypes rather than a coherent learning flow.
- “Learn More (future)” placeholder content and synthetic daily sentence checking should not be part of the V1 measurement surface.
- Interest scoring that reduces an interest score after a poor quiz result is conceptually wrong: low performance can mean high learning need.
- A full dictionary JSON fetch for a small post-answer interaction is too heavy for the proposed non-dictionary pilot.
- Console-only XP messages and page-specific global hooks should not be treated as product telemetry.

## B. Current technical limitations

1. There is no canonical learner-state schema, version, migration path, or single storage API.
2. There is no stable anonymous learner or session identifier.
3. There is no unified event emitter, offline event queue, event deduplication, schema validation, or documented retention policy.
4. GA configuration is repeated in static pages and event naming is inconsistent.
5. State stored in localStorage can be cleared, corrupted, exceed limits, or be unavailable; current code often assumes it is usable.
6. Browser-only state cannot transfer to Dakho or another device.
7. Content identifiers, question identifiers, misconception tags, CEFR levels, and intent tags are not consistently modeled.
8. Question and mistake content is embedded across HTML and JavaScript, making editorial review and reuse difficult.
9. Some interactive HTML is created with string interpolation from dictionary data. Any future shared renderer needs safe DOM construction or escaping.
10. Speech recognition support and accuracy vary by browser, language, device, permissions, and connection.
11. There is no experiment-assignment layer or persistent exposure record for a Learning Loop A/B test.
12. No current system distinguishes a viewed module from a genuinely completed learning action.

## C. Learning Loop V1 architecture

### Product contract

Every eligible page keeps its complete useful answer or lesson in static HTML. A small module appears after that answer and offers exactly one reviewed action:

`answer → one question → immediate feedback → one related item → progress → next or leave`

The first interaction is independently useful. Completing it teaches or corrects one concept even if the learner exits immediately.

### V1 components

1. **Server/static page context**
   - `surface_id`, `content_id`, `content_type`, `intent`, `level`, and approved topic tags.
   - No query text or page body is sent as analytics.
2. **Reviewed activity bundle**
   - Small static JSON, page-local JSON, or build-time data containing stable IDs.
   - Question, options, correct option, English/Bangla feedback, misconception tag, related item, and editorial status.
3. **Learning Loop controller**
   - Framework-free ES module.
   - Renders one card, records a response, shows feedback, updates local state, and asks the rules engine for one next action.
4. **State adapter**
   - One versioned localStorage document with defensive parsing and storage-unavailable fallback.
   - Session-only behavior still works when persistence is unavailable.
5. **Event adapter**
   - One first-party API that validates allowed events/properties before forwarding consented analytics.
   - Product continues to function if analytics is blocked.
6. **Deterministic next-action selector**
   - Scores a small approved candidate set and returns one result plus a human-readable reason code.
7. **Contextual Dakho CTA**
   - Hidden until a meaningful trigger; never blocks the next free web action.

### Activity state machine

- `available`: useful answer is visible; question can be started.
- `started`: the learner has intentionally interacted.
- `answered`: one option was submitted once.
- `feedback`: correct answer and explanation are visible.
- `completed`: feedback was viewed and progress was saved.
- `next_offered`: one approved next item is shown.
- `continued` or `exited`: no automatic feed advance.

Only `completed` increments learning actions. Repeated clicks, page refreshes, and CTA views do not.

### Suggested data shapes

An activity needs `activity_id`, `version`, `type`, `intent`, `topic`, `level`, `prompt`, `options`, `correct_option_id`, `feedback_correct_bn`, `feedback_incorrect_bn`, `misconception_tag`, `related_content_id`, `editorial_status`, and `reviewed_at`.

A completion needs `activity_id`, `activity_version`, `result`, `attempt_count`, `completed_at`, `source_surface_id`, and optional `misconception_tag`. Do not store the learner's free-form text in analytics.

## D. Mistake Mirror architecture

### V1 card

1. Wrong sentence, visibly marked: `I am agree with you.`
2. Correct sentence: `I agree with you.`
3. Short Bangla explanation: “Agree একটি verb; তাই agree-এর আগে am বসে না।”
4. Hear button for the correct sentence.
5. One recognition question: choose the correct sentence.
6. Optional repeat/speak action only when the browser supports it and the learner initiates permission.
7. Save mistake.
8. One next mistake from the same reviewed misconception family.

### Mistake record

Use stable editorial records rather than storing raw learner text:

- `mistake_id`, `version`, `wrong`, `correct`, `explanation_bn`, `explanation_en`
- `topic`, `misconception_tag`, `intent_tags`, `level`, `source_reference`
- `hear_text`, optional approved choices, `editorial_status`, `reviewed_at`

The learner store saves the mistake ID, status, attempt counts, last result, next review date, and source surface. It does not need the complete sentence duplicated in localStorage.

### Manually reviewed pilot set

Start with 12–20 records, selected and re-reviewed from existing repository material:

- subject–verb agreement: “She go…” / “She goes…”
- `agree` as a verb: “I am agree…” / “I agree…”
- past after `did`: “I didn't went…” / “I didn't go…”
- unnecessary preposition: “discuss about…” / “discuss…”
- articles: “a apple” / “an apple”
- modal plus base verb: “can speaks” / “can speak”
- double negatives
- `good at`, `senior to`, `depend on`, `interested in`
- common Bangla-to-English tense or expression transfer
- two or three reviewed workplace/spoken-English mistakes
- two or three BCS sentence-correction patterns

Every item requires human review for correctness, naturalness, Bangla clarity, level, and exam relevance. Existing pages are source candidates, not automatic approval.

### Safety and limitations

- Do not claim browser speech recognition proves pronunciation correctness in V1.
- Do not retain audio.
- Do not send spoken transcripts to analytics.
- Do not run a generic grammar checker over learner writing and treat heuristic results as an editorial Mistake Mirror item.

## E. Next Best Learning Action model

V1 uses an explicit candidate set and deterministic scoring. Every returned action includes a reason code for debugging and analytics.

### Candidate inputs

- Current surface intent and content type
- Current activity topic and misconception
- Correct/incorrect result
- Learner-selected goal and level
- Saved/weak mistake IDs
- Recent completed activity IDs
- Approved content relationships
- Capability flags such as speech support

### Eligibility gates

Reject a candidate when it is unreviewed, duplicates the current item, was just completed, conflicts with the learner's intent, requires an unsupported capability, belongs to a frozen SEO cohort, or lacks a valid destination.

### Initial score

- +40 exact misconception follow-up after an incorrect answer
- +30 exact intent match
- +20 approved direct relationship to current content
- +15 selected goal match
- +10 appropriate level match
- +10 due saved mistake
- +5 not completed recently
- −30 repeated within the last three actions
- −25 level mismatch
- −100 ineligible or frozen experiment destination

Ties use editorial priority and then a stable ID, not randomness. Log only the selected action ID, reason code, and aggregate score band.

### Intent-aware routes

- General vocabulary → usage choice → related word or collocation.
- Grammar → rule check → misconception-specific example → targeted practice.
- BCS → exam-style sentence correction → same syllabus category.
- Bank job → vocabulary/grammar item tagged for bank exams → short timed set later, not in V1.
- IELTS → academic usage or skill-specific item; do not route every learner to generic grammar.
- Job interview → model answer phrase → optional speaking/repeat prompt.
- Spoken English → natural phrase choice → hear/repeat when supported.

## F. First-party event and analytics schema

### Common envelope

Every allowed event carries only:

- `event_id`: random per event for deduplication
- `event_name`, `event_version`, `occurred_at`
- `anonymous_id`: random first-party ID when permitted
- `session_id`: short-lived random ID
- `surface_id`, `content_id`, `content_type`, `intent`
- `experiment_id`, `variant`, and `exposure_id` only for an eligible Phase 3 pilot
- coarse device class and capability flags, not fingerprinting attributes
- no full URL query string; use approved route/surface identifiers

### Day-1 events

1. `seo_landing`
   - Purpose: identify an eligible organic landing session.
   - Properties: landing surface ID, content type, intent, referrer class, experiment assignment.
   - Privacy: do not store search query, full referrer URL, or IP in product payloads.
2. `answer_viewed`
   - Purpose: confirm the useful primary content reached the viewport.
   - Properties: content ID, answer type, visibility threshold.
   - Privacy: never send answer text.
3. `learning_module_viewed`
   - Purpose: measure genuine opportunity to interact.
   - Properties: module/activity ID and version, position after answer.
4. `quiz_started`
   - Purpose: measure intentional first interaction.
   - Properties: activity ID/version, topic, intent.
5. `quiz_answered`
   - Purpose: record one submitted response.
   - Properties: activity ID/version, result, attempt number, misconception tag.
   - Privacy: send option ID, never free-form answer text.
6. `quiz_correct` and `quiz_incorrect`
   - Purpose: convenient outcome counters derived from a valid answer.
   - Properties: activity ID/version, misconception tag, attempt number.
   - Prefer deriving these from `quiz_answered` downstream if the analytics stack supports it.
7. `feedback_viewed`
   - Purpose: distinguish answering from receiving the teaching value.
   - Properties: activity ID, feedback type, result.
8. `learning_action_completed`
   - Purpose: canonical primary metric.
   - Properties: activity ID/version, action type, result, ordinal in session.
9. `hear_word` or `hear_sentence`
   - Purpose: measure learner-initiated listening support.
   - Properties: content/activity ID and audio source type.
   - Privacy: no microphone data.
10. `speak_started` and `speak_result`
    - Purpose: capability and completion measurement for optional speaking.
    - Properties: activity ID, supported, permission outcome, coarse match band.
    - Privacy: no audio or transcript in analytics.
11. `save_word` and `mistake_saved`
    - Purpose: measure explicit review intent.
    - Properties: stable word/content or mistake ID, source surface.
12. `next_learning_item_shown`
    - Purpose: recommendation opportunity.
    - Properties: action ID, destination content ID, reason code, score band.
13. `next_learning_item_selected`
    - Purpose: continuation rate.
    - Properties: same IDs/reason code and session action ordinal.
14. `session_3_actions` and `session_5_actions`
    - Purpose: milestone counters emitted once per session.
    - Properties: action mix and elapsed-time band.
15. `app_cta_view`
    - Purpose: contextual conversion opportunity.
    - Properties: trigger, completed-action count, context, copy variant.
16. `app_cta_click`
    - Purpose: outbound conversion intent.
    - Properties: trigger, destination, context, completed-action count.

### Governance

- Maintain an allowlist of event names and properties.
- Version schemas and reject unexpected properties in development.
- Apply consent and applicable privacy requirements before non-essential analytics.
- Keep learning state local by default; analytics contains stable content IDs and outcomes, not learner-entered text.
- Provide a clear “Reset learning progress” control.
- Establish retention, deletion, and documentation before adding account sync.

## G. Session-first personalization

### Anonymous V1 state

Use one versioned key such as `ovidhan_learning_v1`:

- schema version and random anonymous ID
- selected goal and optional self-selected level
- completed activity IDs with compact result metadata
- weak misconception tags
- saved word IDs and mistake IDs
- recent action queue capped to a small number
- due-review dates
- experiment assignments and exposure timestamps
- aggregate session/action counts

Create a new `session_id` after 30 minutes of inactivity. The product must still work with in-memory state if localStorage is blocked. Cap arrays, validate parsed data, and migrate deliberately rather than merging all legacy keys silently.

Do not infer sensitive identity, school, employer, religion, or exact location. Bangladesh-first content is a product context, not a reason to fingerprint learners.

### When a Dakho account becomes useful

Offer account/app value only when the learner has something worth preserving:

- progress across devices
- scheduled mistake review and reminders
- saved speaking or exam pathway preferences
- offline lesson access
- longer history than the browser keeps

Account creation is optional on the web. Explain what will sync before consent. A later migration should import explicitly selected local progress, not upload every legacy key automatically.

## H. Ovidhan to Dakho conversion logic

Contextual CTA rules:

- After five completed actions: “You learned 5 items. Save your progress in Dakho.”
- After saving two or more mistakes: “Review these mistakes tomorrow in Dakho.”
- After an optional speaking action: “Continue speaking practice in Dakho.”
- On a BCS pathway milestone: “Continue this BCS practice set in Dakho.”

Rules:

1. Never show a progress claim unless backed by local completed-action records.
2. Show at most one contextual CTA per session and frequency-cap dismissals.
3. Keep a free web Next action visible alongside the CTA.
4. Do not use countdowns, false scarcity, fake popularity, or blocked answers.
5. Track view and click with the triggering context; do not treat a click as an install.
6. Deep-link only when a stable Dakho route exists; otherwise use the verified store destination.

## I. SEO safeguards

- Never modify the frozen Phase 2F treatment or control URLs, including their Learning Explorer behavior and internal links.
- Preserve the primary answer/lesson in static HTML and place the optional module after it.
- Keep core content available when JavaScript fails or analytics is blocked.
- No hidden keyword text, query-generated pages, cloaking, auto-advance, or doorway pages.
- Do not add activity content to structured data unless it is visible, reviewed, and schema-appropriate.
- Do not let client state rewrite titles, canonicals, primary headings, or indexability.
- Use approved internal destinations; do not generate combinatorial URL parameters for activities.
- Add Phase 3 pilot surfaces and controls to a separate frozen manifest before implementation.
- Monitor organic impressions, clicks, indexability, crawl behavior, and page speed as guardrails, not success objectives.

## J. Recommended pilot surfaces

### 1. Common mistakes for Bangladeshi learners — recommended Mistake Mirror treatment

- Surface: `common-mistakes-bangladeshi-learners.html`
- Learner intent: very high
- Traffic opportunity: high enough to measure if current analytics confirms it
- Implementation simplicity: high; corrected examples and diagnostics already exist
- Measurement clarity: high; one mistake card maps directly to one action
- SEO experiment risk: very low; not a frozen dictionary URL

### 2. Subject–verb agreement lesson and quiz pair

- Candidate lesson: `subject-verb-agreement-bangla.html`
- Candidate activity: `subject-verb-quiz.html`
- Learner intent: high
- Implementation simplicity: high
- Measurement clarity: high
- Risk: very low

### 3. BCS English diagnostic

- Surface: `bcs-english-diagnostic.html`
- Learner intent: high and explicit
- Implementation simplicity: medium; existing diagnostic can provide misconception tags
- Measurement clarity: high, but avoid changing the full diagnostic in the first release
- Risk: very low

### 4. Job interview English

- Surface: `job-interview-english-bangla.html` or a selected reviewed lesson under `real-life-english/`
- Learner intent: high
- Implementation simplicity: medium because speaking capability needs progressive enhancement
- Measurement clarity: medium
- Risk: very low

### 5. Daily English or vocabulary hub

- Surface: `daily-english.html` or `vocabulary.html`
- Learner intent: broad
- Implementation simplicity: high
- Measurement clarity: lower because intent is mixed
- Risk: low

Do not use any dictionary page in the first Learning Loop pilot. Before choosing final surfaces, confirm traffic, existing analytics coverage, indexability, and no overlap with other active experiments.

## K. Mobile-first UX model

- One card, one prompt, and two to four large options.
- Minimum 44×44 CSS-pixel targets with comfortable vertical spacing.
- Answer remains above the module; no full-screen takeover.
- Correct/incorrect feedback combines color, icon, text, and Bangla explanation.
- No keyboard is required for the core V1 path.
- Hear and Save are secondary actions; Next is the primary post-feedback action.
- Progress uses meaningful text such as “1 of 5 reviewed,” not an endless feed.
- Never auto-play audio, auto-open the microphone, or auto-advance.
- A visible stop/finish state lets the learner leave with a sense of completion.
- Maintain focus order, keyboard operation, accessible labels, reduced motion, and screen-reader status announcements.

## L. Performance constraints

Initial V1 budgets:

- Learning Loop JavaScript: target ≤15 KB gzip; hard stop at 25 KB gzip before review.
- Pilot activity data: target ≤10 KB gzip per surface; load only the current and next small bundle.
- CSS additions: target ≤5 KB gzip and reuse existing design tokens.
- No framework, AI SDK, client database, animation library, or full dictionary fetch.
- Defer the controller until after the static answer is parsed; initialize on idle or near-viewport without delaying interaction excessively.
- Lazy-load optional speech-recognition logic after user intent.
- Keep analytics non-blocking and failure-isolated.
- Cache versioned static activity bundles; provide an inline or cached fallback for the first action when practical.
- Performance guardrails: no material regression in LCP, INP, CLS, HTML size, or total blocking time on pilot pages.

## M. Success metrics

### Primary

`learning actions per eligible landing` = unique valid `learning_action_completed` events / eligible landing sessions.

Report the distribution as well as the mean so a small number of long sessions cannot hide low utility.

### Secondary

- First-interaction rate: quiz starts / module views
- Question completion: answered / started
- Feedback consumption: feedback viewed / answered
- Three-action and five-action completion rates
- Correct and incorrect distribution by reviewed activity and misconception
- Next-item continuation: selected / shown
- Save-word and mistake-save rates
- Seven-day return rate for anonymous IDs where consent and storage permit
- Contextual app CTA view-to-click rate

### Guardrails

- LCP, INP, CLS, JavaScript errors, and asset failures
- Organic impressions/clicks and indexability for pilot and control pages
- Exit/bounce interpretation paired with successful single actions; leaving after useful feedback is not automatically failure
- No increase in duplicate events or corrupted local state
- No unexpected changes to frozen dictionary cohorts
- No significant rise in CTA dismissals or blocked free-next actions

Do not optimize time-on-site, raw page views, XP, or streak length as primary outcomes.

## N. Pilot experiment design

### Recommended first experiment

Run Mistake Mirror on a small set of non-dictionary mistake/grammar surfaces after Phase 3B instrumentation is validated.

Treatment:

- Existing static lesson unchanged
- One reviewed Mistake Mirror card after the relevant answer/section
- Immediate Bangla feedback
- One deterministic related action
- Local completion progress

Control:

- Existing page with unchanged answer/content and existing navigation
- Shared event foundation may measure eligible landing and answer/module opportunity only if doing so does not add the treatment UI

### Cohort construction

- Prefer page-level matched pairs to avoid a learner seeing both variants of the same indexed URL through unstable client assignment.
- Match by intent, topic, traffic band, device mix, and baseline interaction opportunity.
- Freeze treatment/control manifests and HTML baselines before launch.
- Exclude every Phase 2F treatment and control URL.
- Avoid simultaneously changing content, title/meta, navigation, or app CTA on experiment surfaces.

### Baseline and window

- Baseline: at least 14 full days, or longer if traffic is sparse, using the new event foundation in observation mode.
- QA: staging/local plus live production smoke tests before the experiment clock starts.
- Primary window: 28 days minimum; extend to 56 days when sample size is insufficient.
- Analyze by eligible landing session and report mobile separately.

### Proposed thresholds

Finalize minimum detectable effect after baseline volumes are known. A provisional scale decision requires:

- at least a 15% relative lift in learning actions per eligible landing,
- no meaningful regression in answer visibility, page speed, organic traffic, or errors,
- at least 90% of started questions reaching feedback,
- no evidence that a tiny group of repeat users creates the lift.

These are planning thresholds, not statistical claims. Pre-register the exact analysis and sample requirement after Phase 3B baseline data.

### Stop conditions

- Primary answer becomes unavailable, delayed, obscured, or indexability changes.
- Material LCP/INP/CLS regression or elevated JavaScript errors.
- Event duplication, missing exposure IDs, or variant leakage prevents trustworthy analysis.
- Frozen dictionary cohort files or behavior change.
- Incorrect, misleading, or unreviewed learning content is published.
- Privacy or consent failure, microphone activation without clear intent, or learner text appears in analytics.
- App CTA blocks free learning or uses an unverified progress claim.

## O. Implementation roadmap

### Phase 3B — analytics and state foundation

- Define event schema, consent behavior, anonymous/session IDs, validation, and debug mode.
- Implement one tiny event adapter and one versioned local state adapter.
- Inventory legacy storage and document migration/non-migration decisions.
- Instrument a small non-dictionary observation set without adding Learning Loop treatment UI.
- Build a QA harness for event order, deduplication, blocked analytics, storage failure, and experiment exclusion.

### Phase 3C — Mistake Mirror pilot

- Editorially review 12–20 existing candidate mistakes.
- Extract them into a versioned content bundle.
- Build one accessible card and optional Hear action.
- Pilot on the common-mistakes/grammar surfaces only.

### Phase 3D — Learning Loop V1

- Generalize the single-card controller and progress state.
- Add one reviewed vocabulary or grammar activity type.
- Preserve explicit completion and no infinite feed.

### Phase 3E — Next Best Learning Action rules

- Add candidate eligibility, deterministic scoring, reason codes, and debug output.
- Validate routes separately for general, BCS, bank, IELTS, interview, and spoken-English intent.

### Phase 3F — Ovidhan to Dakho conversion test

- Add contextual CTA triggers after verified learning value.
- Keep free continuation and measure CTA views/clicks independently.

### Phase 3G — personalized review and retention

- Add due mistake review, capped recent history, return measurement, and optional account/app sync proposal.
- Do not add notifications or account requirements without separate consent and product review.

## P. Files changed in Phase 3A

- `reports/ovidhan-learning-loop-3a.md` — this architecture audit only.

No production HTML, JavaScript, CSS, dictionary data, sitemap, robots file, treatment manifest, control manifest, or frozen experiment URL was modified.

## Q. Recommended Phase 3B

Build and validate the measurement foundation before any new learning UI:

1. Freeze a small non-dictionary observation manifest.
2. Specify `ovidhan-learning-events-v1` and `ovidhan_learning_v1` schemas.
3. Implement framework-free event/state adapters with zero functional dependency on analytics.
4. Add anonymous/session IDs, experiment exclusion guards, deduplication, consent handling, and a debug inspector.
5. Instrument eligible landing, answer view, module opportunity, existing quiz start/answer/feedback, and app CTA view/click on the observation surfaces.
6. Run at least a 14-day baseline before finalizing pilot sample size and thresholds.
7. Do not instrument or alter the frozen 72/72 dictionary cohorts during the active SEO experiment.

## Final verdict

The repository has enough reviewed content and interaction mechanics for a small, useful Learning Loop. The main risk is not missing features; it is fragmented state, duplicated logic, inconsistent content models, and incomplete measurement. Consolidating those foundations first is the lowest-risk path to a trustworthy Mistake Mirror pilot.

3A ARCHITECTURE PASS — READY FOR ANALYTICS FOUNDATION
