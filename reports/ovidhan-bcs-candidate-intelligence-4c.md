# Ovidhan Phase 4C — BCS Candidate Intelligence Foundation V1

## 1. Starting SHA

- Repository: `mohammadyeasin420/ovidhan2`
- Branch: `codex/bcs-candidate-intelligence-4c`
- Starting `origin/main`: `9ae49c8c3535c087fd83736933de37fd785ebfc7`
- PR #21 merge and Phase 4B source-gate report were present. The branch started clean from merged main, not the Phase 4B topic branch.

## 2. Branch

Work is isolated on `codex/bcs-candidate-intelligence-4c`. No merge or deployment was performed.

## 3. Repository audit

Existing public BCS surfaces include the diagnostic, mock tests, vocabulary/grammar resources, question-pattern pages, learning path, assessment links, and exam-preparation navigation. The compiled question bank contains 18 BCS-tagged legacy questions, none with provenance; Phase 4A therefore keeps them outside the trusted Question DNA contract. Phase 4B created no trusted pilot records after conflicting secondary sources failed the absolute source gate.

Reusable foundations are `learning-foundation.js` (anonymous state and analytics allowlists), `mistake-profile.js`, `skill-mistake-graph.json`, Phase 3F–3H validators/tests, and the frozen 144-page SEO hash record. Existing public BCS pages contain preparation content, not an authoritative candidate-status system. Sitemap and structured data were audited but not changed.

## 4. Files changed

- `bcs-candidate-intelligence-v1.schema.json`
- `data/bcs-candidate-intelligence-v1.json`
- `scripts/verify_bcs_candidate_intelligence_4c.js`
- `reports/ovidhan-bcs-candidate-intelligence-4c.md`

## 5. BCS journey model

The model defines 11 stable stages: circular/application, preliminary preparation, preliminary examination, preliminary result, written preparation, written examination, written result, viva preparation, viva, final result/recommendation, and post-result next steps. English and Bangla labels, descriptions, actions, previous/next stages, preparation types, optional learning CTAs, and provenance requirements are explicit.

Twenty allowed transitions include loops and branches. A candidate can return to preparation or move to post-result actions; the model does not assert one universal chronology. Result stages do not infer why a candidate received a status.

## 6. BCS exam/batch schema

The schema supports stable exam ID/number, display name, BCS type, status, nullable dates, provenance sources, last verification time, revision metadata, confidence, and notes. Unknown dates remain `null`; unknown status is explicit. The 4C dataset intentionally contains zero exam records because no factual batch record was needed to validate the architecture.

## 7. Provenance model

Source classes are `OFFICIAL_BPSC`, `OFFICIAL_GOVERNMENT`, `TRUSTED_SECONDARY`, `UNVERIFIED_SECONDARY`, and `UNKNOWN`, in descending priority. Only the first two are candidate-facing publishable in V1. Each factual record supports source ID/type/URL/title, nullable publication date, verification time, confidence, and superseded state. A secondary report can guide investigation but cannot be relabeled as BPSC confirmation.

## 8. Revision model

Every exam record carries a revision with stable version ID, nullable published timestamp, `supersedes`, current flag, change summary, and source reference. Corrections create a new version and preserve the predecessor; historically important claims are never silently overwritten.

## 9. Candidate-state model

The optional, account-free, local-only contract permits followed exam ID, selected stage, coarse preliminary/written/viva status, and English goal. It forbids name, NID, phone, address, email, registration number, roll number, gender, and cadre. User-selected state is not represented as an official result and can be cleared without deleting learner history.

## 10. Information → learning mappings

- Preliminary preparation → optional BCS English diagnostic → existing Mistake Profile/Mistake Mirror and Skill Graph.
- Written preparation → optional general writing practice; no claim of official BCS written coverage.
- Viva preparation → optional interview-English practice; no prediction of selection.
- Post-result next steps → optional Mistake Mirror; no attribution of result status to English ability.

The presentation principle is: status → meaning → next official step → optional preparation. Qualified states may lead to the next preparation stage. Not-found/not-qualified states remain neutral, offer an official verification route in a future UI, and never use shame-based conversion. Withheld/special status must retain official wording.

## 11. Result Intelligence boundaries

The schema establishes provenance, revisions, nullable values, candidate state, and next-action boundaries. It does not implement roll/registration lookup, typo recovery, OCR, candidate records, name/gender/cadre inference, aggregate statistics, notifications, or a live result checker. Those require separately approved authoritative data, privacy review, and human-gated ingestion.

## 12. BPSC Watcher architecture

The deterministic future pipeline is discover → fetch → classify → validate → compare/version → human/source gate → publish. It may watch notices, dates, results, and revisions. Autonomous publication is forbidden; high-stakes data requires publishable provenance and human approval.

## 13. Analytics

The allowlist contains `bcs_center_view`, `bcs_exam_selected`, `bcs_stage_selected`, `bcs_official_source_open`, `bcs_learning_cta_view`, and `bcs_learning_cta_click`. Allowed properties are bounded exam/stage/source/action/surface/session IDs. Names, identifiers, raw answers, and result text are forbidden; high-cardinality properties are disabled. A future runtime implementation must emit through the existing privacy-safe adapter.

## 14. Privacy analysis

No accounts or PII are needed for this foundation. No candidate record, result identifier, raw answer, or personal result text was introduced. Optional local preferences are clearly separate from authoritative results. Any future identifier lookup needs purpose limitation, retention rules, threat review, and explicit approval before implementation.

## 15. SEO impact

No page, sitemap, robots directive, structured data, navigation, or canonical changed. No `/bcs/` page was created because 4C is architecture-only. Future safe information routes may include `/bcs/`, exam-level pages, and stage guides only when each has verified, useful content. Candidate-specific indexable pages remain prohibited. All 144 frozen experiment pages and guard files match their recorded hashes.

## 16. Performance impact

Production runtime impact is exactly zero bytes raw/gzip and zero requests: the change adds schema/data/validator/report files only. No framework, dependency, SDK, database, or network call was added.

## 17. Validation results

- Phase 4C validator: PASS — schema V1, 11 unique stages, 20 valid transitions, zero factual exam records, official-only publication classes, privacy restrictions, six analytics events, human watcher gate, 50 Skill Graph nodes, and 144 frozen pages.
- Frozen aggregate SHA-256: `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.
- Phase 4A Question DNA verifier: PASS; 18 legacy BCS questions still have zero provenance and trusted pilot count remains zero.

## 18. Regressions

- Phase 3F learner profile: 6/6 PASS.
- Phase 3G Skill Graph: validator PASS and 8/8 tests PASS.
- Phase 3H retention: 7/7 PASS.
- Learning foundation: 23/23 PASS.
- Mistake Profile: 9/9 PASS.
- Mistake Mirror: 6/6 PASS and static surface PASS.
- Frozen SEO verifier: 72 treatment + 72 control = 144 unchanged; all guard hashes unchanged.

## 19. Unresolved risks

- No authoritative, normalized exam/batch record has yet passed human review.
- No BPSC watcher fetch/parser exists, and source-page format or availability may vary.
- Status semantics and revision relationships require notice-specific editorial review.
- Current public BCS preparation claims are outside this foundation's provenance model and should not be migrated automatically.
- A future result lookup materially increases privacy, correctness, abuse, availability, and support risk.
- Analytics are contract-only; no production BCS funnel baseline exists.

## 20. Exact recommendation for Phase 4D

Build a human-reviewed **official BCS exam-information pilot**, not a result checker. Select exactly one current/recent BCS batch for which authoritative BPSC circular/status/timeline sources are accessible. Create one versioned exam record with nullable unknowns, archive source hashes/references, exercise a correction fixture, and validate official-source priority and human approval. Optionally render one `noindex` internal preview of the Candidate Center timeline and stage selector using fixture data. Do not accept roll/registration numbers, publish a public page, automate publication, ingest legacy questions, or change the SEO cohort until the record and emotional/status wording pass human review.

## Human-review verdict

The foundation is trustworthy within 4C scope: it models the candidate journey without forcing linearity, requires official provenance for candidate-facing claims, preserves revisions, stores no PII, bridges to existing deterministic learner intelligence without causal claims, and leaves production/SEO untouched.
