# Ovidhan Phase 6F — IELTS Writing Coherence & Cohesion Foundation v1

## Result

Starting SHA: `a45e774e7c9d367ff9510e2114ea1d4d38004b2a`. Phase 6F adds one ACTIVE canonical skill, 40 reviewed deterministic objective items, a production-style Bangla-first lesson, Mistake Mirror loading, an IELTS/BCS/GENERAL_ENGLISH static destination, and governed Academic/GT criterion relations. It does not add band prediction, productive-writing evidence, Boundary evidence, learner-text persistence, AI or backend calls.

Derived final counts: 40 items; FOUNDATION 12 / INTERMEDIATE 18 / ADVANCED 10; graph 14 families / 66 ACTIVE skills / 280 mappings; IELTS coarse mappings 8; IELTS static destinations `formal_letter_writing` and `writing_coherence_cohesion`.

## Governance and evidence limit

The official IELTS Writing Coherence and Cohesion criterion maps directly to `writing_coherence_cohesion` through `ASSESSMENT_CRITERION_ALIGNMENT`. The Academic and GT relations are `EVIDENCE_GAP`: the canonical skill, reviewed objective practice and destination exist, but no productive Writing performance evidence is collected. `essay_outline_structure` remains a useful IELTS `SUPPORTING` relation. Objective selection results must not be interpreted as complete criterion mastery or IELTS band evidence.

## Editorial QA

| item_id | construct | final_key | editorial_status | note |
|---|---|---:|---|---|
| ielts-coherence-001 | logical sequence | A | REVIEWED | Rewritten with first/final markers and a forced analyser step. |
| ielts-coherence-002 | contrast relation | B | REVIEWED | One explicit contrast connector. |
| ielts-coherence-003 | cause/effect | A | REVIEWED | Flood-to-closure result is stated. |
| ielts-coherence-004 | addition | B | REVIEWED | Adds a parallel benefit. |
| ielts-coherence-005 | example | A | REVIEWED | Specific station example follows a general claim. |
| ielts-coherence-006 | topic/support | A | REVIEWED | Only fuel and maintenance directly support cost. |
| ielts-coherence-007 | paragraph unity | C | REVIEWED | Camera detail is uniquely unrelated. |
| ielts-coherence-008 | reference clarity | B | REVIEWED | Two-device ambiguity requires naming laptop. |
| ielts-coherence-009 | logical sequence | A | REVIEWED | Finding → action → evaluation. |
| ielts-coherence-010 | contrast relation | A | REVIEWED | Cost concession precedes possible saving. |
| ielts-coherence-011 | cohesion repair | A | REVIEWED | Preserves access benefit and laboratory limitation. |
| ielts-coherence-012 | topic/support | A | REVIEWED | Evidence matches policy, group and outcome. |
| ielts-coherence-013 | reference clarity | A | REVIEWED | Rewritten context fixes intended referents; direct speech removes both pronoun ambiguities. |
| ielts-coherence-014 | reference clarity | A | REVIEWED | Uses two plural groups; only naming nurses preserves the intended referent. |
| ielts-coherence-015 | repetition control | A | REVIEWED | Shared subject combines two outcomes. |
| ielts-coherence-016 | repetition control | A | REVIEWED | Replaced awkward health phrasing with one natural two-step revision. |
| ielts-coherence-017 | paragraph unity | C | REVIEWED | Manufacturer detail shifts environmental focus. |
| ielts-coherence-018 | cause/effect | A | REVIEWED | Tests reason position, not result. |
| ielts-coherence-019 | addition | A | REVIEWED | Adds a parallel access benefit. |
| ielts-coherence-020 | example | A | REVIEWED | Concrete council policy illustrates the claim. |
| ielts-coherence-021 | topic/support | A | REVIEWED | Evidence retains the claim's condition. |
| ielts-coherence-022 | logical sequence | A | REVIEWED | Explicit problem-to-response bridge. |
| ielts-coherence-023 | cohesion repair | A | REVIEWED | Rewritten to preserve tourist agency, resident harm and tourism income. |
| ielts-coherence-024 | reference clarity | A | REVIEWED | Names owners, workers and acceptance; removes competing clear pronoun reading. |
| ielts-coherence-025 | logical sequence | A | REVIEWED | Context now explicitly states cost saving → benefits → morale causality. |
| ielts-coherence-026 | connector overuse | A | REVIEWED | Tests three synonymous concessive devices stacked together. |
| ielts-coherence-027 | connector overuse | A | REVIEWED | Mechanical four-step numbering contrasts with three concise grammatical alternatives. |
| ielts-coherence-028 | logical sequence | A | REVIEWED | Replaced variable routine with a posted emergency procedure. |
| ielts-coherence-029 | reference clarity | A | REVIEWED | Decision explicitly refers to rejection. |
| ielts-coherence-030 | repetition control | B | REVIEWED | Unique non-redundant statement. |
| ielts-coherence-031 | paragraph unity | A | REVIEWED | Synthesises both established insulation benefits. |
| ielts-coherence-032 | contrast relation | A | REVIEWED | Compares different city strategies. |
| ielts-coherence-033 | cohesion repair | A | REVIEWED | Frames a specific case as an example. |
| ielts-coherence-034 | reference clarity | A | REVIEWED | Rewritten to name agency, report and delayed publication uniquely. |
| ielts-coherence-035 | repetition control | A | REVIEWED | Only A removes redundancy without a new grammar defect. |
| ielts-coherence-036 | cohesion repair | A | REVIEWED | Only A retains hours, visitors and staffing cost while marking trade-off. |
| ielts-coherence-037 | topic/support | C | REVIEWED | Uniform detail uniquely shifts the controlling focus. |
| ielts-coherence-038 | contrast relation | A | REVIEWED | Uses nevertheless for the surprising outcome despite a warning. |
| ielts-coherence-039 | connector overuse | A | REVIEWED | Groups parallel qualities without repeated furthermore. |
| ielts-coherence-040 | cohesion repair | A | REVIEWED | Only A preserves benefit, scope limitation and cautious next step. |

Material editorial repair IDs: `001`, `013`, `014`, `016`, `023`, `024`, `025`, `026`, `027`, `028`, `034`, `035`, `036`, `038`, `040`.

## Runtime and privacy

Mistake Mirror adds `normalizeCoherencePack` and `addCoherencePack`, fetches the same-origin static JSON in `loadReviewedPack`, and renders bounded English/Bangla context for multiple-choice items. Existing BCS normalizers and loaders remain intact. Items are IELTS-only for goal filtering. No new storage key or free-text input exists; generic objective loop outcomes are not exposed as productive Writing evidence.

## Learner page QA

The page follows the current production writing-page conventions: shared header/navigation and `styles.css`, responsive typography, horizontally scrollable tables, breadcrumb, canonical and social metadata, structured Article/Breadcrumb data, visible disclaimer, keyboard focus styling, FAQ and footer. The in-app browser could not reach the workspace-local HTTP server because of browser local-network isolation, so 390×844 and 1440×900 rendered viewport approval is not claimed. Static HTML, metadata, CTA target, responsive CSS and runtime checks pass. **HUMAN BROWSER QA REQUIRED. HUMAN PHONE QA REQUIRED.**

## Stability

Phase 6E/6D/6C and graph/SmartPath verifiers are updated only where Phase 6F deliberately changes the governed baseline to 66 ACTIVE skills, 280 mappings, eight IELTS coarse mappings and two IELTS static destinations. BCS content, BCS-only leakage protections, diagnostic scoring, Boundary probes, Learning Foundation, Mistake Profile and frozen SEO pages are unchanged. Frozen aggregate remains `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0` and every protected file is rehashed.

## Limitations

Automated structural checks cannot prove semantic answer uniqueness; the table records the human editorial rationale for every item. Objective recognition and repair practice is narrower than producing a coherent essay. A future phase should add governed productive-writing evaluation only with an explicit privacy and evidence contract.
