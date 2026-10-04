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
- The full distribution is **not** committed. Only the lock (28 synsets) is. The lock is verifiable: `build-oewn-lock.js --archive <zip>` first checks the archive SHA-256 and size and every member's SHA-256 and size against `oewn-2025-provenance.json`, aborting on any mismatch, and only then derives the lock. `--check` makes no writes and fails if the committed lock differs.
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

## Future enrichment process (not part of this phase)

1. Pin first: new synset ids enter via `build-oewn-lock.js`, so every sourced claim is verifiable offline.
2. Candidate pool is deterministic (OEWN senses for the lemma). Which senses to add is an editorial decision recorded by synset id and rationale (see the R5C sense policy: V1 stays primary, default cap 3 senses, no technical/slang senses unless sourced).
3. Editors write Bangla meaning/explanation and original bilingual examples per sense (`OVIDHAN_EDITORIAL`).
4. Synonyms/antonyms are added only when vetted for learner usefulness, never for completeness. Extending the lock to more pointer types is a prerequisite for pointer-sourced relations beyond same-synset and lexical antonym.
5. Records move to `EDITORIAL_ENRICHED`; validator and parity must pass; only then does a renderer (separate phase) generate HTML from records.
6. Once a renderer exists, `word/*.html` for migrated words is regenerated from records and parity is replaced by a rendering-determinism test.
