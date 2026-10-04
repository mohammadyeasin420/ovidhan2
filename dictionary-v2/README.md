# Dictionary V2 data foundation (SEO-R6A)

Status: foundation only. This directory holds structured, validated lexical records. It does **not** render pages, is **not** deployed (it is not in `deploy-production.ps1`'s `$requiredDirectories`, and a test enforces that), and changes no public output.

## Rule that governs everything

> Generated HTML must become **output**, not authoritative lexical storage.

Today the approved lexical content (Bangla meaning, explanation, examples, chosen sense) exists only inside `word/*.html`. The goal of this layer is to move that truth into tracked, validated data, so that pages can later be generated from it and regenerated identically.

## Source-of-truth hierarchy

1. **Live V1 page `word/<slug>.html`** is authoritative for what learners currently see. Migration copies it verbatim.
2. **OEWN 2025** (pinned) is authoritative for definition text and sense identity (synset id).
3. **`dictionary-v2/records/*.json`** become authoritative for the migrated words after review. Parity (`check-v1-parity.js`) proves they still equal V1 until the day V2 output replaces V1.
4. Research artifacts under `research/` (untracked) are evidence only. They are compared and reported, never trusted. Example: for `testimonial`, `tough`, `repeat` and `crush` the artifact synset differs from the page; the page wins (see `migration-report.json`).
5. `enriched-dictionary.json` is not a V2 source (not sense-aware, noisy).

## Contents

| Path | Purpose |
|---|---|
| `dictionary-v2.schema.json` | Machine-readable record schema (JSON Schema 2020-12 subset) |
| `oewn-2025-provenance.json` | OEWN release, license, archive SHA-256, per-file hashes, procedure, attribution |
| `oewn-2025-synset-lock.json` | Compact, hash-pinned extract of only the synsets the records reference |
| `prototype-cohort.json` | The 28 SEO-R5C prototype words (the exact set of records) |
| `records/<slug>.json` | One canonical record per word |
| `migration-report.json` | Per-word synset, definition alignment, contamination, artifact disagreements |
| `../scripts/dictionary-v2/` | `lib.js`, `migrate-v1.js`, `build-oewn-lock.js`, `validate.js`, `check-v1-parity.js` |
| `../tests/dictionary-v2-foundation.test.js` | Focused tests |

## OEWN provenance

- Open English WordNet **2025**, WNDB format, `english-wordnet-2025.zip`, license **CC BY 4.0**, from the OEWN downloads page.
- Archive SHA-256 `38b16326159f51853626b7d24a44c453fa88ab33f06fce5ec8fc5996d1c2be93` (recorded first in `research/SEO_R3B_OEWN_2025_PILOT_PROVENANCE.json`, re-verified in R6A against the actual archive; none of it is invented).
- The full distribution is **not** committed. Only the lock (47 synsets after SEO-R6C) is. The lock is verifiable: `build-oewn-lock.js --archive <zip>` first checks the archive SHA-256 and size and every member's SHA-256 and size against `oewn-2025-provenance.json`, aborting on any mismatch, and only then derives the lock. `--check` makes no writes and fails if the committed lock differs.
- Attribution on every page that uses OEWN definitions: name Open English WordNet 2025, link <https://en-word.net/>, state CC BY 4.0 with link to <https://creativecommons.org/licenses/by/4.0/>. Records carry this in `attribution` and the validator enforces it.
- Known OEWN limits: no pronunciation data; sense frequency counts are all zero, so choosing which senses matter to learners is an editorial decision.

## Editorial provenance

Every text field carries an `origin`. OEWN-derived: `OEWN_GLOSS`, `OEWN_SYNSET`, `OEWN_LEXICAL_POINTER`, `OEWN_POINTER`, `OEWN_EXCEPTION_LIST`. Everything Ovidhan wrote (Bangla meaning, Bangla explanation, bilingual examples, notes, phrases, collocations) is `OVIDHAN_EDITORIAL`. Nothing is unlabeled.

## Schema in brief

A record has `slug`, `headword`, `attribution`, `provenance`, and `senses[]` (display order; `senses[0]` is the V1 primary sense, ids `s1, s2, ...` strictly increasing). Each sense has `pos` (multiple POS = several senses), `source` (`OEWN_2025` + `synset_id` like `07382354-n`, or `OVIDHAN_EDITORIAL` + `rationale`), `definition` (`text` as shown, `oewn_definition` clean, optional `contamination`), `bangla_meaning`, `bangla_explanation`, `examples[]` (Ovidhan-written `en`/`bn`), and optional `synonyms`/`antonyms` by sense. Optional record-level blocks: `forms`, `phrases`, `collocations`, `usage_notes`, `related_words`. Optional means *absent when empty*: no `null`, `""`, `[]` or placeholder is ever valid. IPA/pronunciation is not part of v1.0.0; adding it later will be an optional block under a schema minor version.

Determinism: files are canonical JSON (recursively sorted keys, 2-space indent, LF, trailing newline, UTF-8); sense order is the display order; synonyms, antonyms, forms, phrases, collocations and related words are sorted ascending without duplicates.

## Validation

```
node scripts/dictionary-v2/validate.js                    # offline against the committed lock
node scripts/dictionary-v2/validate.js --archive <zip>    # also re-derives the lock from the verified archive
node scripts/dictionary-v2/check-v1-parity.js             # records vs live V1 pages (read-only)
node tests/dictionary-v2-foundation.test.js
```

The validator fails closed (any error or exception exits 1). It checks: schema; unique slug and file name; approved-registry membership; frozen-word exclusion (186 words derived from tracked manifests); synset exists in the lock, has the headword as a lemma and the sense POS; definition/source alignment; declared contamination equals computed contamination; non-empty required fields; no placeholders, nulls or empty containers; provenance and attribution; duplicate senses and examples; sorted/deterministic ordering and canonical bytes; related words only to approved words; synonyms only from the sense's synset; antonyms only from OEWN lexical antonym pointers; the lock itself; records match the cohort exactly. `V1_MIGRATION` records must stay lossless: one sense and no optional blocks.

## Migration (V1 -> record)

`node scripts/dictionary-v2/migrate-v1.js [--archive <zip> | --oewn-dir <dir>] [--research-dir research] [--check]`

The synset is the unique OEWN synset for (headword, POS) whose definition, or raw gloss, equals the text on the page. Ambiguity or no match aborts; nothing is guessed. Migration copies, it does not clean the pages: where the page definition includes OEWN quoted examples (9 of the 28 words), the record carries the clean OEWN definition and keeps the page text in `definition.v1_original` (see the R6B section); the page cleanup itself is a separate, later phase.

## V1 definition cleanup proof (SEO-R6B; proposal only, nothing applied)

`dictionary-v2/definition-cleanup-manifest.json` proves, for every approved page whose definition carries OEWN contamination, BEFORE (live page) -> OEWN source definition -> AFTER (exactly the OEWN definition). It is not deployed and no page has been edited.

```
node scripts/dictionary-v2/definition-cleanup.js audit --archive <zip> [--write]   # independent re-audit of all approved pages
node scripts/dictionary-v2/definition-cleanup.js validate                          # fail-closed manifest validation against current pages (offline)
node scripts/dictionary-v2/definition-cleanup.js dry-run [--archive <zip>] [--list] # what WOULD change; never writes
node tests/dictionary-v2-definition-cleanup.test.js
```

- `RAW_OEWN_EXAMPLE_CONTAMINATION`: the page shows OEWN definition + `; "quoted example"...` copied from the gloss.
- `CITATION_RESIDUE`: the page shows OEWN definition + `; - <attribution>` fragments, each of which follows a quoted example in the gloss.
- AFTER is never written by hand: it is the text before the first `; "` of the gloss. Only the visible `.definition` span and the JSON-LD description change; the tool proves every other byte (POS, Bangla fields, examples, canonical, title, structure) is unchanged.
- Frozen experiment pages are documented but never applicable. Anything unprovable goes to `manual_review`; it is never edited automatically.
- Records with a cleaned definition use `schema_version` `1.1.0`: `definition.text` is the clean OEWN definition and `definition.v1_original` keeps the auditable contamination record (text, contamination, removed material). Parity reports them as `PASS_PENDING_CLEANUP` until the page is cleaned, then `PASS_CLEANED`.

### Guarded apply engine (SEO-R6B.1; implemented and tested, NOT yet authorised)

`definition-cleanup.js` also contains the mechanical apply path: `--validate`, `--dry-run` and `apply` (`--apply` alias).

```
node scripts/dictionary-v2/definition-cleanup.js --dry-run --archive <zip>     # full guarded preflight + report, writes nothing
node scripts/dictionary-v2/definition-cleanup.js apply --archive <zip> --confirm APPLY_275_DEFINITION_CLEANUPS   # NOT authorised
node tests/dictionary-v2-definition-apply.test.js                               # never writes to the real pages
```

- Per page it locks slug, path, full-page BEFORE and AFTER SHA-256 (LF-normalised), old/new visible definition, old/new JSON-LD description, source synset, contamination type and the clean OEWN definition. No fuzzy matching and no recovery: any deviation refuses the page.
- Exactly two locations may change (the visible `.definition` span and the DefinedTerm `description`). The result is proven by a byte-range comparison (zero unrelated bytes) plus named structure checks (title, meta description, canonical, breadcrumbs, H1, Bangla meaning, POS, Bangla explanation, examples, attribution, Learning Explorer, links, scripts, styles, classes, surrounding HTML).
- Preflight is all-or-nothing across all 275 pages (hash, frozen, registry, synset against the verified OEWN archive, old definition, JSON-LD, mutation counts, after-state). Only then are outputs staged, verified, committed by atomic rename, re-verified, and rolled back on any failure (non-zero exit, affected files listed).
- Frozen and non-approved pages are rejected; a second run refuses because pages are no longer at the BEFORE hash.

### Applied state (SEO-R6B.2 / R6B.3)

The 275 cleanups were applied with the guarded engine and the manifest is now `APPLIED`. All BEFORE evidence (hashes, definitions, synset ids, classifications) is preserved; each entry carries `application_state` (`APPLIED`, or `NOT_APPLIED_FROZEN` for the five frozen pages) and `applied.before_state_commit` names the commit that holds the BEFORE pages.

```
node scripts/dictionary-v2/definition-cleanup.js --validate              # APPLIED mode: pages must be at AFTER, frozen at BEFORE
node scripts/dictionary-v2/definition-cleanup.js verify --archive <zip>  # + reverse proof, git proof, synsets vs the OEWN archive
```

- Any drift from an AFTER hash fails closed; a changed frozen page fails as `FROZEN_CHANGED`.
- `apply` refuses an APPLIED manifest (`ALREADY_APPLIED`); the pre-application view cannot be replayed because the BEFORE-hash protection is unchanged. `audit --write` refuses to overwrite an APPLIED manifest.
- Tests never depend on the live pages being contaminated: `tests/dictionary-v2-cleanup-fixture.js` rebuilds the BEFORE pages by swapping the two replacements back (accepted only if the hash equals the audited BEFORE hash).

## Editorial enrichment prototype (SEO-R6C; data only, 12 words)

R6C enriches exactly 12 existing records (`swarm good chaos designation introvert tough savage repeat crush guess potential waist`) with editor-selected learner senses. It changes **data only**: no `word/*.html`, registry, sitemap, `robots.txt`, dictionary page or deploy file is touched, and nothing is rendered.

| Path | Purpose |
|---|---|
| `r6c-editorial-source.json` | Authored decisions: which OEWN senses to teach, in which order, why each other candidate was rejected, and the Ovidhan-written Bangla/English learner layer. Definitions are never written here. |
| `r6c-editorial-report.json` | Generated audit: every OEWN candidate synset of every lemma (all POS) with SELECTED/REJECTED, reasons, V1 source, final order, V1 learner gap, editorial risk and totals. |
| `../scripts/dictionary-v2/r6c-enrich.js` | Pure source-to-record enrichment (used by `migrate-v1.js`, so records stay reproducible). |
| `../scripts/dictionary-v2/r6c-candidates.js` | Lists every OEWN candidate synset of a lemma from the verified archive. |
| `../scripts/dictionary-v2/r6c.js` | `report` (build/check), `validate`, `guard`. |
| `../tests/dictionary-v2-r6c.test.js` | Tests, including fail-closed tampering scenarios. |

Rules enforced by the validator and tests:

- A learner definition is always the exact OEWN 2025 definition of the selected synset (`definition.origin: OEWN_GLOSS`, `oewn_definition`, `source.synset_id`); Bangla meaning, explanation and the English/Bangla example are `OVIDHAN_EDITORIAL`. No OEWN example is reused; examples are unique across the dictionary.
- The V1 sense is kept verbatim and marked `v1_primary` even when it is no longer first. Schema 1.2.0 adds the record-level `editorial_enrichment` block (`v1_sense_id`, `v1_synset_id`, `order_changed`, `order_rationale`) so V1 parity and provenance stay traceable (`check-v1-parity.js` checks the `v1_primary` sense against the live page). Only `crush` and `guess` change the order.
- When the V1 learner text is deliberately improved, the sense carries `v1_revision` (`reason`, `v1_original`): V2 teaches the improved text, the exact V1 text is kept as the parity/traceability record and `check-v1-parity.js` compares the live page against it. Only `good` (the unnatural V1 Bangla example translation) uses this.
- A word whose only learner sense is the V1 sense (`chaos introvert waist`) stays a byte-identical `V1_MIGRATION` record; the report records the review.
- Selection is by learner value, not by filling a number: 1-3 senses, 4 only with an explicit `more_than_three_justification` (`good`, `tough`). The three-sense target is not a limit. Dated or derogatory OEWN senses (savage: "uncivilized people") are deliberately rejected. No synonyms, antonyms, IPA or pronunciation were added.

```
node scripts/dictionary-v2/migrate-v1.js --archive <zip>           # regenerate records (migration + enrichment)
node scripts/dictionary-v2/build-oewn-lock.js --archive <zip>      # regenerate the lock (47 synsets)
node scripts/dictionary-v2/r6c.js report --archive <zip> [--check] # build / byte-check the audit report
node scripts/dictionary-v2/r6c.js validate [--archive <zip>]       # source + report + records + OEWN + V1 traceability
node scripts/dictionary-v2/r6c.js guard [--base <sha>]             # only dictionary-v2 data/tools/tests changed
```

## V2 renderer and local visual pilot (SEO-R6D; local only, not deployed)

`scripts/dictionary-v2/render.js` is the first deterministic V2 HTML renderer. It turns a validated V2 record into a word page inside the existing Ovidhan shell and generates a **local-only** pilot for the 12 R6C words into `dictionary-v2/previews/<word>.html`. Nothing here replaces `word/*.html`.

```
node scripts/dictionary-v2/render.js build          # write the 12 previews
node scripts/dictionary-v2/render.js check          # fail unless disk == freshly rendered (also fails on missing/extra files)
node scripts/dictionary-v2/render.js guard          # only previews, renderer, tests and README changed since the R6C checkpoint
node scripts/dictionary-v2/render.js list           # cohort, preview paths, sense counts
node tests/dictionary-v2-r6d.test.js
```

View locally from the repository root with any static server (the Learning Explorer fetches `/enriched-dictionary.json`), e.g. `python -m http.server 8080` then `http://localhost:8080/dictionary-v2/previews/good.html`. Opening the file directly works for the static answer, but the Explorer reports "Failed to load dictionary" because `file://` cannot fetch.

- **Previews are not pages.** `noindex,nofollow`, no canonical, a development comment, a visible banner and a `[V2 preview]` title. They are not in any sitemap, the approved registry or `robots.txt`, are linked from nothing, and `dictionary-v2/` is not in the deploy whitelist.
- **Content only from records.** The renderer contains no lexical text; it reads `dictionary-v2/records/<word>.json` (validated first, refused if invalid), keeps `record.senses` order (R6C learner-first; V1 order is never restored), and never shows provenance (no synset ids, `v1_original`, record status or hashes). A `v1_revision` text is a traceability record and never learner-facing.
- **Design reuse.** The header/mega-menu, mobile menu script, footer, `styles.css` tokens and the Learning Explorer block come from the production shell (`word/lunch.html` is the shell source; its header/footer SHA-256 are pinned in `render.js`, so a production shell change fails the build until reviewed). The V2 result area adds one scoped `<style id="dictionary-v2-entry-styles">` that uses only existing tokens; nothing in `styles.css` changes.
- **Page structure.** breadcrumb, one H1 `<word> meaning in Bangla`, a quick-answer panel (primary Bangla meaning + POS, and a jump list when there are several senses), numbered sense cards (POS + concise Bangla meaning, English definition, Bangla explanation, bilingual example, optional usage note), a compact source line, then the Learning Explorer. Single-sense words (`chaos introvert waist`) render one definition card, with no numbering, jump list or empty framework.
- **Structured data (decision).** One `BreadcrumbList` plus one JSON-LD `@graph`: a schema.org `DefinedTermSet` for the entry and **one `DefinedTerm` per rendered sense**, in visible order (`name` = headword, `description` = the sense's English definition, `alternateName` = its concise Bangla meaning, `termCode` = the visible sense number, `@id`/`url` = page URL + `#sense-N`, `inLanguage` en/bn). Every value is on the page; no ratings, FAQ, pronunciation, synonyms or POS invention (schema.org has no POS property on `DefinedTerm`). Single-sense words use the same shape with one term. URLs use the intended production address; previews carry no canonical.
- **Production mode.** `renderPage(record, { mode: 'production' })` produces the eventual contract (canonical, indexable, `../` asset paths) with a byte-identical answer body and identical structured data. It is tested but not used to write any production page in this phase.

## Controlled V2 production pilot (SEO-R6E; 12 existing pages, local only until reviewed)

`scripts/dictionary-v2/r6e.js` replaces exactly 12 existing `word/<word>.html` pages (`swarm good chaos designation introvert tough savage repeat crush guess potential waist`) with the production-mode output of the R6D renderer. It is **not** a migration framework: the allowlist is the literal list `PRODUCTION_COHORT` in `render.js`; there is no globbing, fuzzy matching or fallback word, and `render.productionPath()` refuses every other slug.

```
node scripts/dictionary-v2/r6e.js manifest [--check]     # BEFORE/AFTER proof file: dictionary-v2/r6e-production-manifest.json
node scripts/dictionary-v2/r6e.js plan                   # full preflight, in memory, writes nothing
node scripts/dictionary-v2/r6e.js apply --confirm APPLY_R6E_12_V2_PILOT
node scripts/dictionary-v2/r6e.js verify                 # post-application proof
node tests/dictionary-v2-r6e.test.js
```

- **Guarded apply.** Preflight checks: the allowlist is exactly the 12 words and equals the R6C/R6D cohort; none is frozen and all are in the approved registry; the records validate; the pages render deterministically and satisfy `render.productionContractProblems()` (self canonical, title, meta description, one H1, static answer, all senses in order, explorer below the answer, JSON-LD equal to the structured-data builder, no preview markers or hidden hooks); every live page is byte-for-byte its audited V1 baseline (SHA-256 of the LF-normalised page, recorded in the manifest, with the shared shell, one canonical, two JSON-LD blocks, one H1 and one explorer verified); protected files are unmodified. Writing needs the exact token, stages all 12 files, verifies the staged bytes, commits, re-reads and verifies, and rolls everything back on any failure. The page's existing line endings (CRLF in the working tree) are preserved; hashes are LF-normalised. Once the pages equal their expected output a second apply is refused.
- **Preview/production separation.** Previews stay `noindex,nofollow`, canonical-less and under `dictionary-v2/previews/`; production pages are indexable with exactly one self canonical. `render.js build` refuses to write into `word/`, and a preview-mode page fails the production contract.
- **V1 view.** After the pilot the 12 pages are V2 pages, so the V1-based tools (`migrate-v1.js`, `check-v1-parity.js`, the R6B cleanup evidence and the R6C traceability checks) read the V1 page from git at the pinned baseline commit (`lib.readV1Page`). R6D/R6C `guard` runs use closed committed ranges (`--base ... --head ...`).
- **Not touched.** The approved registry, all sitemaps, `robots.txt`, `dictionary.html`/A-Z pages, `learning-explorer.js`, `deploy-production.ps1`, every other word page (the five frozen pages included) and every R6C record.

## Future enrichment process (not part of this phase)

1. Pin first: new synset ids enter via `build-oewn-lock.js`, so every sourced claim is verifiable offline.
2. Candidate pool is deterministic (OEWN senses for the lemma). Which senses to add is an editorial decision recorded by synset id and rationale (see the R5C sense policy: V1 stays primary, default cap 3 senses, no technical/slang senses unless sourced).
3. Editors write Bangla meaning/explanation and original bilingual examples per sense (`OVIDHAN_EDITORIAL`).
4. Synonyms/antonyms are added only when vetted for learner usefulness, never for completeness. Extending the lock to more pointer types is a prerequisite for pointer-sourced relations beyond same-synset and lexical antonym.
5. Records move to `EDITORIAL_ENRICHED`; validator and parity must pass; only then does a renderer (separate phase) generate HTML from records.
6. Once a renderer exists, `word/*.html` for migrated words is regenerated from records and parity is replaced by a rendering-determinism test.
