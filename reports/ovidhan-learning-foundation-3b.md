# Ovidhan Product Growth Phase 3B

## Unified analytics and learner-state foundation

Status: implementation and local QA complete

Repository: `mohammadyeasin420/ovidhan2`

Branch: `codex/learning-foundation-3b`

Base commit: `7a74e954306a176b9838c35e774e980e3f9fd416`

Audit date: 2026-08-16

## Scope decision

Phase 3B implements infrastructure only. It adds a small versioned anonymous learner-state layer, a privacy-constrained event adapter, meaningful-session action counting, debug helpers, non-destructive reads from selected legacy stores, and narrow instrumentation on one non-dictionary verification surface.

It does not build Mistake Mirror, Learning Loop UI, a recommendation engine, an infinite feed, generative AI, an analytics backend, or an install tracker. No frozen dictionary page or Phase 2 experiment input was modified.

## A. Existing state and analytics audit

### Existing systems and disposition

#### KEEP

- Existing Google Analytics (`gtag`) configuration: retained as the currently legitimate transport. The foundation calls it only through an adapter and does not load another vendor.
- `ovidhan_flashcards`: existing flashcard/SRS data remains owned by `flashcards.js`.
- `ovidhan_srs`: existing mistake-notebook review data remains owned by `mistake-notebook.html`.
- `ovidhan_dashboard_data`: existing dashboard display and progress remain operational.
- `ovidhan_gamification`: existing XP/streak behavior remains operational.
- Existing quiz, diagnostic, speaking, listening, and lesson functionality remains page-owned.

#### ADAPT

- `ovidhan_user_profile`: read once for saved-word identifiers; never changed by the new layer.
- `ovidhan_learned_words`: read once into canonical known-word identifiers.
- `ovidhan_saved_words`: read once into canonical saved-word identifiers.
- `ovidhan_flashcards`: array or `{cards: [...]}` shapes are read for word identifiers only.
- `ovidhan_srs`: word identifiers are read as legacy review/mistake identifiers.
- Existing `gtag`: receives allowlisted event properties through `track(eventName, properties)`; anonymous and session IDs are deliberately not forwarded to the third party.

#### DEPRECATE LATER

- Duplicate XP/streak/progress logic split across `dashboard.html` and `gamification.js`.
- Broad interest scoring in `recommendations.js`, after a future Next Best Learning Action engine is proven.
- Page-specific analytics event names after a compatibility and reporting migration plan exists.
- Multiple saved-word and completion stores after explicit, tested migrations exist.

No legacy store is deleted or rewritten in Phase 3B.

#### DO NOT TOUCH

- `ovidhan_daily_challenges`, `ovidhan_daily_completed`, `ovidhan_visit_days`
- `ovidhan_speaking_completed`, `ovidhan_completed_conversations`
- `ovidhan_test_history`, `ovidhan_writing_stats`, `ovidhan_my_saved_sentences`
- `ovidhan_vocab5000_progress_v1`, `ovidhan_popular_searches`
- Page-local quiz histories and any unknown legacy key
- All Phase 2F/2G word pages, manifests, source data, sitemap, and robots file

### Identity, cookie, and session findings

- No reliable existing anonymous learner ID was found.
- No account-backed learner profile or cross-device progress API was found.
- Existing product state is predominantly localStorage-based.
- No existing unified learning-session model was found.
- Phase 3B introduces sessionStorage only for the new lightweight session record.
- No new cookie is created.

## B. Architecture chosen

`learning-foundation.js` is a framework-free browser script with a CommonJS-compatible factory for deterministic tests.

It contains four isolated responsibilities:

1. Safe storage adapters with memory fallback.
2. A versioned learner-state document.
3. A versioned session record and meaningful-action deduplication.
4. An allowlisted event adapter that can forward sanitized properties to the existing `gtag` function.

Product functionality does not depend on storage or analytics succeeding. Initialization is deferred on the pilot page and does not alter static primary content.

## C. Learner-state schema

Storage key: `ovidhan_learning_v1`

Schema version: `1`

Stored fields:

- `version`
- `anonymousLearnerId`
- `createdAt`, `updatedAt`
- `goal`, `level`
- identifier-only arrays: `knownWords`, `weakWords`, `savedWords`, `mistakes`
- capped `recentActions`: action ID, type, categorical result, timestamp
- `progress`: learning action count, correct/incorrect counts, last action time
- `migrations`: completed migration identifiers

Limits:

- Identifier arrays are deduplicated, normalized, and capped at 250.
- Recent actions are capped at 50.
- Identifier strings are capped and no content objects are copied.
- Free-text learner input is not part of the schema.

Defensive parsing normalizes missing, malformed, partial, and version-0 state. Corrupt JSON creates a new safe state without breaking the page.

## D. Migration and backward compatibility

Migration ID: `legacy-identifiers-v1`

The migration reads selected legacy keys and copies identifiers only:

- learned words → `knownWords`
- saved-word stores and flashcard word IDs → `savedWords`
- word-oriented SRS IDs → `mistakes`

The migration is idempotent and recorded in the new state. It does not delete, rewrite, or claim ownership of a legacy key. Existing pages continue to use their original stores and globals.

Large card objects, examples, arbitrary sentences, XP histories, quiz histories, and page content are not duplicated.

## E. Anonymous learner ID implementation

- First-party random UUID from `crypto.randomUUID()` when available.
- Random bytes from `crypto.getRandomValues()` are the secondary browser path.
- No IP address, user agent, screen dimensions, fonts, device attributes, or fingerprint inputs are used.
- The ID persists only in the first-party learner-state document when storage is available.
- If storage is unavailable, the ID and progress are page-memory only.
- `reset()` removes only the Phase 3B state/session keys, creates a new random ID, and leaves all legacy stores untouched.
- The identifier is visible through the guarded local debug helper but is not forwarded to `gtag` by this implementation.

## F. Event taxonomy

The interface recognizes the future-compatible names required by Phase 3B:

- `seo_landing`
- `answer_viewed`
- `learning_action_started`
- `quiz_started`
- `quiz_answered`
- `quiz_correct`
- `quiz_incorrect`
- `hear_word`
- `save_word`
- `mistake_saved`
- `next_learning_item`
- `learning_session_3_actions`
- `learning_session_5_actions`
- `app_cta_view`
- `app_cta_click`

Unknown events are rejected. Each known event has an explicit property allowlist. Common properties are limited to stable page ID, content type, intent, and known goal. Values are primitive and length-capped.

The internal debug envelope contains event/version/time and the anonymous/session IDs. The existing analytics transport receives sanitized properties only.

## G. Events actually instrumented

Only legitimate existing actions on `common-mistakes-bangladeshi-learners.html` are instrumented:

- `seo_landing`: only when the safe referrer category is search or social; no query or full referrer is sent.
- `answer_viewed`: once when the existing hero/primary guide reaches the viewport.
- `quiz_started`: first interaction with the existing five-item diagnostic.
- `quiz_answered`: one submission per diagnostic item per session.
- `quiz_correct` or `quiz_incorrect`: categorical result only.
- `learning_session_3_actions` and `learning_session_5_actions`: emitted when unique meaningful diagnostic actions reach those exact milestones.
- `app_cta_view`: one per existing CTA context when sufficiently visible.
- `app_cta_click`: one per existing CTA context per session.

No `mistake_saved`, `hear_word`, `save_word`, `next_learning_item`, or future feature event is emitted by this pilot instrumentation because those actions were not added in Phase 3B.

## H. Session model

Storage key: `ovidhan_learning_session_v1`

The session contains:

- random session ID
- start and last-activity time
- meaningful action count
- capped unique action IDs
- emitted 3/5 milestones
- capped event dedupe keys

A session expires after 30 minutes of inactivity. Navigation and page views do not increment action count. A diagnostic item increments once, even if clicked repeatedly or reloaded in the same session. Event dedupe keys also survive a same-session reload.

## I. Analytics transport

The product API is `track(eventName, properties, settings)`.

- It validates the event and strips unapproved properties.
- It stores a capped in-memory debug event list.
- It calls the existing `gtag('event', ...)` only when `gtag` is present.
- It can accept an injected transport in tests.
- Transport exceptions are swallowed so analytics cannot break learning.
- No new vendor, SDK, endpoint, or backend was added.
- Server-side collection beyond the site's existing Google Analytics setup is not enabled.

## J. Privacy safeguards

- No arbitrary typed text, sentences, messages, passwords, or quiz free text is accepted by the event allowlist.
- No keystroke logging, screen scraping, audio recording, IP-derived identity, fingerprinting, cross-site tracking, or other-app access exists.
- Search/social attribution is a coarse referrer category only.
- Word/mistake state APIs accept stable identifiers, not full content objects.
- App installation is always recorded as `unknown`; a CTA click is not treated as an install.
- Debugging is enabled only on localhost/127.0.0.1 or with explicit `?ovidhanDebug=1`.

## K. Dakho attribution

Existing app links on the verification surface now have stable contexts:

- `navigation`
- `mistakes-section`
- `footer`
- `floating`

The adapter can relate eligible landing, session learning actions, CTA view, and CTA click within the internal anonymous/session context. The GA transport receives event context but no new learner identifier. Install remains unknown because no verified install callback exists.

No new CTA, blocking prompt, progress claim, or scarcity language was added.

## L. Failure handling

- Missing storage: safe default state.
- Corrupt JSON: safe state normalization.
- Storage getter/setter blocked: memory fallback.
- Partial/old state: version-1 normalization.
- Corrupt legacy key: ignored without deleting it.
- Duplicate click/event: rejected by action/event keys.
- Same-session reload: event/action dedupe retained in sessionStorage.
- Analytics absent or throws: product action continues.
- IntersectionObserver absent: no view event; page remains functional.
- Existing diagnostic remains independently operational.

Private/incognito persistence varies by browser. The tested failure contract is graceful in-memory operation when browser storage is unavailable.

## M. Performance impact

- One deferred framework-free script on one non-dictionary page.
- Raw script size: approximately 26 KB.
- Gzip size: approximately 6 KB.
- No CSS, framework, analytics SDK, AI SDK, network endpoint, dictionary fetch, or render-blocking initialization added.
- State and session records are capped.
- Analytics transport is synchronous only to the already-present `gtag` queue and is failure-isolated.
- Static answer/content works without the script.

## N. Pilot verification surface

Surface: `common-mistakes-bangladeshi-learners.html`

Reason:

- Phase 3A ranked it first for the future Mistake Mirror pilot.
- It is not a dictionary page and is outside both frozen cohorts.
- It already has useful reviewed content, a five-item diagnostic, and existing app CTAs.
- It allows real action and attribution verification without adding Mistake Mirror or redesigning the page.

Changes to the page are limited to one deferred script, four CTA context attributes, and body context attributes.

## O. Frozen experiment verification

Before implementation:

- Treatment pages hashed: 72
- Control pages hashed: 72
- Unique frozen pages: 144
- Individual SHA-256 values were captured before edits.

After implementation:

- All 144 files were recalculated.
- Changed frozen pages: 0
- Page-set aggregate SHA-256: `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`
- Detailed 144-path record: `reports/ovidhan-learning-foundation-3b-frozen-hashes.json`

Guard hashes before and after:

- `sitemap.xml`: `736378b6bc69a5dc88228545f7e9e695fe1bc3b99595b32b4517ab15ddfb3ea7`
- `robots.txt`: `84a4f09405bb9539c723636dce666a3640ee3f3d7cfc4512540bf78e74435e61`
- `enriched-dictionary.json`: `3f3c0323dfc04c6d2130fd05eed5af0bc7e711470fa9df4647739e1cccf3bbd7`
- Treatment manifest: `48649a0157e2d6b206ba8275d5fe774c0d0609cf478aeee59bf8dd2cd3fabc7f`
- Control manifest: `6561f2f1e9ca4f24c0496e8f7d0a92a88c53a4cae0ad0bd3d0fe2913e2dab0c0`
- Frozen baseline: `e4259cf0bfb44a9d9a8a3123a8588dce393ea377661e1c028a5c824876ccbd7c`

No `word/` file, experiment manifest, sitemap, robots file, or dictionary source is in the Git diff.

## P. Automated tests

`tests/learning-foundation.test.js` covers:

1. New anonymous learner and versioned state.
2. Returning learner ID and saved state.
3. Corrupted state recovery.
4. Version-0/old state normalization.
5. Storage unavailable with in-memory continuation.
6. Non-destructive legacy identifier migration.
7. Meaningful action increment and repeat-action rejection.
8. Three- and five-action milestone emission once.
9. Event property allowlisting and arbitrary-text rejection.
10. Event dedupe across same-session reload.
11. Unsupported future event rejection.
12. CTA view/click distinction with install unknown.
13. Reset lifecycle without legacy deletion.

Result: all tests pass.

`scripts/verify_learning_foundation_3b.js` parses both frozen manifests, hashes every cohort page and guard file, validates 72/72/144 counts, calculates an aggregate hash, and writes the detailed JSON record.

## Q. Manual QA

Local browser verification on the pilot surface confirmed:

- foundation-ready marker present;
- 10 existing diagnostic buttons and four attributed app CTAs present;
- existing “I am agree” diagnostic feedback still renders correctly;
- first diagnostic answer increments session actions to 1;
- repeated click leaves the action count at 1;
- quiz started/answered/incorrect debug events emitted;
- CTA view and CTA click debug events emitted separately;
- mobile viewport has no horizontal overflow;
- title, H1, existing content, and navigation remain present;
- no console warning/error after the final mobile load.

No microphone, account, form submission, production deployment, or private/incognito browser profile was used.

## R. Exact files changed

- `learning-foundation.js`
- `common-mistakes-bangladeshi-learners.html`
- `tests/learning-foundation.test.js`
- `scripts/verify_learning_foundation_3b.js`
- `reports/ovidhan-learning-loop-3a.md`
- `reports/ovidhan-learning-foundation-3b-frozen-hashes.json`
- `reports/ovidhan-learning-foundation-3b.md`

The Phase 3A report was preserved from the preceding uncommitted architecture task and is included as the implementation specification.

## S. Git status

Final branch, status, commit SHA, and push result are recorded in the task handoff after final validation and commit.

No merge to main and no deployment are authorized or performed.

## T. Recommended Phase 3C

Proceed with a manually reviewed Mistake Mirror pilot only after reviewing this foundation and its analytics semantics:

1. Select 12–20 candidate mistakes from existing Bangladesh-focused content.
2. Editorially verify wrong/correct sentences, Bangla explanations, tags, and source references.
3. Define stable `mistake_id` and content versioning.
4. Build one accessible card on non-dictionary pilot surfaces.
5. Use the Phase 3B `mistake_saved`, action, session, and CTA interfaces without expanding their privacy payloads.
6. Freeze matched pilot/control surfaces and baseline events before treatment UI launches.
7. Continue excluding every active Phase 2F/2G dictionary experiment page.

## Final verdict

The foundation is small, anonymous-first, backward compatible, failure-isolated, and limited to one safe non-dictionary verification surface. It is ready for review and a controlled Mistake Mirror pilot after the final Git and freeze checks pass.

3B FOUNDATION PASS — READY FOR MISTAKE MIRROR PILOT
