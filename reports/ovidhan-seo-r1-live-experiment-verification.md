# OVIDHAN.NET — SEO-R1 live experiment outcome and production verification

Audit date: 2026-09-24. Repository: `C:\dev\ovidhan2`.
Required and observed HEAD: `3ccc0d8a62bc089cb26f054a6ce364842590b2e6`. Branch: `main`.
Live observation window: **2026-09-24T20:06:49.940Z to 2026-09-24T20:06:52.480Z UTC**.

**All 144 live experiment pages match their repository files byte-for-byte. The intended static-answer treatment difference is present in production. Current Google outcome evidence is unavailable.**

**GSC OUTCOME DATA REQUIRED**

Only this report and `reports/ovidhan-seo-r1-experiment-cohorts.csv` were created in the repository. No product files, frozen experiment artifacts, dictionary, sitemap, robots, hosting settings or deployment were changed. No commit was created. Source workbook reads were read-only. Temporary audit observations and helper scripts were kept outside the repository.

## FACT

### Repository and freeze verification

The working tree was clean at the start. The required SHA is present and checked out on main; no checkout or reset was performed. The R0 report is present at `reports/ovidhan-seo-r0-forensic-audit.md`. HEAD is the merge of the R0 documentation change; R1 uses the manifests and current file bytes as authoritative rather than relying on R0's conclusions alone.

Executed without a write option:

`node scripts/verify_learning_foundation_3b.js --compare reports/ovidhan-learning-foundation-3b-frozen-hashes.json`

Result: 72 treatment, 72 control, 144 unique frozen pages; zero changed pages, zero missing pages, zero changed guards, aggregate equal.

Frozen aggregate SHA-256: `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.
The same aggregate calculated from the **144 live HTTP response bodies** also equals `202cc8c85317ff57756c7167b1bfb1c99f784497525f3fb633d2c81757148ce0`.

The aggregate hashes the lexically sorted concatenation of `path + NUL + SHA256(raw page bytes) + LF`. Guard files are independently checked and not included in that aggregate.

| Frozen guard | Verified repository SHA-256 |
| --- | --- |
| sitemap.xml | 736378b6bc69a5dc88228545f7e9e695fe1bc3b99595b32b4517ab15ddfb3ea7 |
| robots.txt | 84a4f09405bb9539c723636dce666a3640ee3f3d7cfc4512540bf78e74435e61 |
| enriched-dictionary.json | 3f3c0323dfc04c6d2130fd05eed5af0bc7e711470fa9df4647739e1cccf3bbd7 |
| reports/dictionary-seo-treatment-manifest-2e.csv | 48649a0157e2d6b206ba8275d5fe774c0d0609cf478aeee59bf8dd2cd3fabc7f |
| reports/dictionary-seo-control-manifest-2e.csv | 6561f2f1e9ca4f24c0496e8f7d0a92a88c53a4cae0ad0bd3d0fe2913e2dab0c0 |
| reports/dictionary-seo-experiment-baseline-2e.csv | e4259cf0bfb44a9d9a8a3123a8588dce393ea377661e1c028a5c824876ccbd7c |


### Authoritative cohorts and exact URL export

- Treatment: `reports/dictionary-seo-treatment-manifest-2e.csv`, 72 allowlisted entries.
- Control: `reports/dictionary-seo-control-manifest-2e.csv`, 72 frozen entries.
- Definition: `reports/dictionary-seo-experiment-plan-2e.md`.
- Baseline: `reports/dictionary-seo-experiment-baseline-2e.csv`.
- Implementation: `860634a542e622a516e4a37e88e46568f9da31f9`, 2026-08-16, documented in `reports/dictionary-seo-experiment-implementation-record-2f.json`.

The delivered CSV contains exactly `cohort,url,word`, followed by 144 rows: treatment first, control second, preserving each manifest's row order. There are 144 distinct URLs and no cohort overlap. URLs are copied exactly, including HTTPS, hostname and the `.html` suffix; no canonicalization, extension removal or fuzzy matching is applied. The live inventories below also enumerate every exact URL.

## LIVE EVIDENCE

### Method and measured results

Performed public, unauthenticated HTTPS GET requests, four at a time, using `Ovidhan-SEO-R1-read-only-audit/1.0` as User-Agent. Each request had a 25-second timeout. Redirect handling recorded each status/location and would follow up to five same-site redirects; none occurred. No cookies, authentication, Googlebot impersonation or search-result inference was used. The audit does not use a search-engine cache.

HTTP transfer decompression was handled by the client. SHA-256 comparisons use the resulting response-body bytes against local raw file bytes, with **no** whitespace, line-ending or HTML normalization. HTML was inspected for title, canonical links, static answer articles, lexical text, JSON-LD DefinedTerm descriptions, meta robots, refresh directives, external script references, complete document markers and challenge/error indicators.

| Measure | Treatment | Control |
| --- | ---: | ---: |
| Requested URLs | 72 | 72 |
| HTTP 200 | 72 | 72 |
| Redirects | 0 | 0 |
| Final URL equals requested URL | 72 | 72 |
| One canonical, equal to requested URL | 72 | 72 |
| Title equals repository title | 72 | 72 |
| Response body exactly equals repository bytes | 72 | 72 |
| Static dictionary-answer article | 72 | 0 |
| Source-visible lexical answer without JS interaction | 72 | 0 |
| One DefinedTerm with nonempty description | 72 | 0 |
| One DefinedTerm with empty description | 0 | 72 |
| Detected response/body anomalies | 0 | 0 |

All 144 responses had Content-Type `text/html`; 143 reported Cloudflare cache HIT and one MISS. All documents were complete and their inspected JSON-LD parsed. None had an X-Robots-Tag header, meta robots directive, meta refresh, detected challenge page, missing canonical, canonical mismatch or unexpected status. Absence of these signals is not an indexing outcome. Treatment response bodies ranged from 14,405 to 14,982 bytes; controls from 1,546 to 1,872 bytes, after decompression.

“Source-visible lexical answer” means a normal body article contains an explicit Bangla meaning and/or definition outside scripts, inputs and metadata, with no hiding attribute/style on the article. The full extracted treatment answer text is recorded below. This is an HTTP/source inspection, not a screenshot, computed-style audit or Google-renderer result. Controls contain word-specific titles, input values and schema names, but no actual initial lexical explanation; their generic H1 does not count as a dictionary answer.

### Shared live resources

| Resource | HTTP | Live SHA-256 | Repository match |
| --- | --- | --- | --- |
| learning-explorer.js | 200 | 2a819ea720ddf0b192a37c8f3f6ba5fe053b08ead1a1c254925076b435fef364 | exact |
| styles.css | 200 | a7d921d4ec3dfbcd5cf9e10ef8f65878baeff07a68b7a2af8b3ae9603b5a0eb8 | exact |
| robots.txt | 200 | 84a4f09405bb9539c723636dce666a3640ee3f3d7cfc4512540bf78e74435e61 | exact |


The live explorer has the same behavior identified in R0: without embedded data it fetches the dictionary, then automatically searches only when a `?word=` query parameter is present. The original 144 pages have no newer embedded word payload. The controls' prefilled input does not trigger automatic lookup on a plain URL. The live matching stylesheet and robots file provide additional dependency evidence; neither the live full dictionary payload nor every site resource was downloaded. This does not verify the entire deployed commit or historical deployment continuity.

### Complete treatment response inventory — 72 URLs

All columns below describe the fetched response. “Yes” in Lexical refers to the source-visible definition above. Anomalies “none” means none of the enumerated checks found an anomaly.

| Word / requested URL | HTTP | Final URL | Canonical | Title | Static answer | DefinedTerm description | Lexical | Anomalies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [hosted](https://ovidhan.net/word/hosted.html) | 200 | https://ovidhan.net/word/hosted.html | https://ovidhan.net/word/hosted.html | hosted Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [integration](https://ovidhan.net/word/integration.html) | 200 | https://ovidhan.net/word/integration.html | https://ovidhan.net/word/integration.html | integration Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [outright](https://ovidhan.net/word/outright.html) | 200 | https://ovidhan.net/word/outright.html | https://ovidhan.net/word/outright.html | outright Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [street](https://ovidhan.net/word/street.html) | 200 | https://ovidhan.net/word/street.html | https://ovidhan.net/word/street.html | street Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [net-worth](https://ovidhan.net/word/net-worth.html) | 200 | https://ovidhan.net/word/net-worth.html | https://ovidhan.net/word/net-worth.html | net-worth Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [tension](https://ovidhan.net/word/tension.html) | 200 | https://ovidhan.net/word/tension.html | https://ovidhan.net/word/tension.html | tension Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [provision](https://ovidhan.net/word/provision.html) | 200 | https://ovidhan.net/word/provision.html | https://ovidhan.net/word/provision.html | provision Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [ugly](https://ovidhan.net/word/ugly.html) | 200 | https://ovidhan.net/word/ugly.html | https://ovidhan.net/word/ugly.html | ugly Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [wide](https://ovidhan.net/word/wide.html) | 200 | https://ovidhan.net/word/wide.html | https://ovidhan.net/word/wide.html | wide Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [saturday](https://ovidhan.net/word/saturday.html) | 200 | https://ovidhan.net/word/saturday.html | https://ovidhan.net/word/saturday.html | saturday Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [stroll](https://ovidhan.net/word/stroll.html) | 200 | https://ovidhan.net/word/stroll.html | https://ovidhan.net/word/stroll.html | stroll Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [quirky](https://ovidhan.net/word/quirky.html) | 200 | https://ovidhan.net/word/quirky.html | https://ovidhan.net/word/quirky.html | quirky Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [mercantile](https://ovidhan.net/word/mercantile.html) | 200 | https://ovidhan.net/word/mercantile.html | https://ovidhan.net/word/mercantile.html | mercantile Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [february](https://ovidhan.net/word/february.html) | 200 | https://ovidhan.net/word/february.html | https://ovidhan.net/word/february.html | february Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [oversee](https://ovidhan.net/word/oversee.html) | 200 | https://ovidhan.net/word/oversee.html | https://ovidhan.net/word/oversee.html | oversee Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [pose](https://ovidhan.net/word/pose.html) | 200 | https://ovidhan.net/word/pose.html | https://ovidhan.net/word/pose.html | pose Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [procure](https://ovidhan.net/word/procure.html) | 200 | https://ovidhan.net/word/procure.html | https://ovidhan.net/word/procure.html | procure Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [weird](https://ovidhan.net/word/weird.html) | 200 | https://ovidhan.net/word/weird.html | https://ovidhan.net/word/weird.html | weird Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [rod](https://ovidhan.net/word/rod.html) | 200 | https://ovidhan.net/word/rod.html | https://ovidhan.net/word/rod.html | rod Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [legible](https://ovidhan.net/word/legible.html) | 200 | https://ovidhan.net/word/legible.html | https://ovidhan.net/word/legible.html | legible Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [tram](https://ovidhan.net/word/tram.html) | 200 | https://ovidhan.net/word/tram.html | https://ovidhan.net/word/tram.html | tram Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [labour](https://ovidhan.net/word/labour.html) | 200 | https://ovidhan.net/word/labour.html | https://ovidhan.net/word/labour.html | labour Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [loophole](https://ovidhan.net/word/loophole.html) | 200 | https://ovidhan.net/word/loophole.html | https://ovidhan.net/word/loophole.html | loophole Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [magenta](https://ovidhan.net/word/magenta.html) | 200 | https://ovidhan.net/word/magenta.html | https://ovidhan.net/word/magenta.html | magenta Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [terrible](https://ovidhan.net/word/terrible.html) | 200 | https://ovidhan.net/word/terrible.html | https://ovidhan.net/word/terrible.html | terrible Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [lean](https://ovidhan.net/word/lean.html) | 200 | https://ovidhan.net/word/lean.html | https://ovidhan.net/word/lean.html | lean Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [sack](https://ovidhan.net/word/sack.html) | 200 | https://ovidhan.net/word/sack.html | https://ovidhan.net/word/sack.html | sack Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [sink](https://ovidhan.net/word/sink.html) | 200 | https://ovidhan.net/word/sink.html | https://ovidhan.net/word/sink.html | sink Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [mirth](https://ovidhan.net/word/mirth.html) | 200 | https://ovidhan.net/word/mirth.html | https://ovidhan.net/word/mirth.html | mirth Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [mutiny](https://ovidhan.net/word/mutiny.html) | 200 | https://ovidhan.net/word/mutiny.html | https://ovidhan.net/word/mutiny.html | mutiny Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [purge](https://ovidhan.net/word/purge.html) | 200 | https://ovidhan.net/word/purge.html | https://ovidhan.net/word/purge.html | purge Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [sturdy](https://ovidhan.net/word/sturdy.html) | 200 | https://ovidhan.net/word/sturdy.html | https://ovidhan.net/word/sturdy.html | sturdy Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [musk](https://ovidhan.net/word/musk.html) | 200 | https://ovidhan.net/word/musk.html | https://ovidhan.net/word/musk.html | musk Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [rudimentary](https://ovidhan.net/word/rudimentary.html) | 200 | https://ovidhan.net/word/rudimentary.html | https://ovidhan.net/word/rudimentary.html | rudimentary Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [tunnel](https://ovidhan.net/word/tunnel.html) | 200 | https://ovidhan.net/word/tunnel.html | https://ovidhan.net/word/tunnel.html | tunnel Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [constellation](https://ovidhan.net/word/constellation.html) | 200 | https://ovidhan.net/word/constellation.html | https://ovidhan.net/word/constellation.html | constellation Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [prologue](https://ovidhan.net/word/prologue.html) | 200 | https://ovidhan.net/word/prologue.html | https://ovidhan.net/word/prologue.html | prologue Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [quake](https://ovidhan.net/word/quake.html) | 200 | https://ovidhan.net/word/quake.html | https://ovidhan.net/word/quake.html | quake Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [spectacular](https://ovidhan.net/word/spectacular.html) | 200 | https://ovidhan.net/word/spectacular.html | https://ovidhan.net/word/spectacular.html | spectacular Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [wallet](https://ovidhan.net/word/wallet.html) | 200 | https://ovidhan.net/word/wallet.html | https://ovidhan.net/word/wallet.html | wallet Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [integrity](https://ovidhan.net/word/integrity.html) | 200 | https://ovidhan.net/word/integrity.html | https://ovidhan.net/word/integrity.html | integrity Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [pedestrian](https://ovidhan.net/word/pedestrian.html) | 200 | https://ovidhan.net/word/pedestrian.html | https://ovidhan.net/word/pedestrian.html | pedestrian Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [shout](https://ovidhan.net/word/shout.html) | 200 | https://ovidhan.net/word/shout.html | https://ovidhan.net/word/shout.html | shout Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [sympathy](https://ovidhan.net/word/sympathy.html) | 200 | https://ovidhan.net/word/sympathy.html | https://ovidhan.net/word/sympathy.html | sympathy Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [torch](https://ovidhan.net/word/torch.html) | 200 | https://ovidhan.net/word/torch.html | https://ovidhan.net/word/torch.html | torch Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [wagon](https://ovidhan.net/word/wagon.html) | 200 | https://ovidhan.net/word/wagon.html | https://ovidhan.net/word/wagon.html | wagon Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [vocabulary](https://ovidhan.net/word/vocabulary.html) | 200 | https://ovidhan.net/word/vocabulary.html | https://ovidhan.net/word/vocabulary.html | vocabulary Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [nevertheless](https://ovidhan.net/word/nevertheless.html) | 200 | https://ovidhan.net/word/nevertheless.html | https://ovidhan.net/word/nevertheless.html | nevertheless Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [spine](https://ovidhan.net/word/spine.html) | 200 | https://ovidhan.net/word/spine.html | https://ovidhan.net/word/spine.html | spine Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [stab](https://ovidhan.net/word/stab.html) | 200 | https://ovidhan.net/word/stab.html | https://ovidhan.net/word/stab.html | stab Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [ultimatum](https://ovidhan.net/word/ultimatum.html) | 200 | https://ovidhan.net/word/ultimatum.html | https://ovidhan.net/word/ultimatum.html | ultimatum Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [quantum](https://ovidhan.net/word/quantum.html) | 200 | https://ovidhan.net/word/quantum.html | https://ovidhan.net/word/quantum.html | quantum Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [moss](https://ovidhan.net/word/moss.html) | 200 | https://ovidhan.net/word/moss.html | https://ovidhan.net/word/moss.html | moss Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [sneeze](https://ovidhan.net/word/sneeze.html) | 200 | https://ovidhan.net/word/sneeze.html | https://ovidhan.net/word/sneeze.html | sneeze Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [sad](https://ovidhan.net/word/sad.html) | 200 | https://ovidhan.net/word/sad.html | https://ovidhan.net/word/sad.html | sad Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [slant](https://ovidhan.net/word/slant.html) | 200 | https://ovidhan.net/word/slant.html | https://ovidhan.net/word/slant.html | slant Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [suppose](https://ovidhan.net/word/suppose.html) | 200 | https://ovidhan.net/word/suppose.html | https://ovidhan.net/word/suppose.html | suppose Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [deficit](https://ovidhan.net/word/deficit.html) | 200 | https://ovidhan.net/word/deficit.html | https://ovidhan.net/word/deficit.html | deficit Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [telescope](https://ovidhan.net/word/telescope.html) | 200 | https://ovidhan.net/word/telescope.html | https://ovidhan.net/word/telescope.html | telescope Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [shy](https://ovidhan.net/word/shy.html) | 200 | https://ovidhan.net/word/shy.html | https://ovidhan.net/word/shy.html | shy Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [friction](https://ovidhan.net/word/friction.html) | 200 | https://ovidhan.net/word/friction.html | https://ovidhan.net/word/friction.html | friction Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [reckon](https://ovidhan.net/word/reckon.html) | 200 | https://ovidhan.net/word/reckon.html | https://ovidhan.net/word/reckon.html | reckon Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [velocity](https://ovidhan.net/word/velocity.html) | 200 | https://ovidhan.net/word/velocity.html | https://ovidhan.net/word/velocity.html | velocity Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [lash](https://ovidhan.net/word/lash.html) | 200 | https://ovidhan.net/word/lash.html | https://ovidhan.net/word/lash.html | lash Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [nest](https://ovidhan.net/word/nest.html) | 200 | https://ovidhan.net/word/nest.html | https://ovidhan.net/word/nest.html | nest Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [opportune](https://ovidhan.net/word/opportune.html) | 200 | https://ovidhan.net/word/opportune.html | https://ovidhan.net/word/opportune.html | opportune Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [phenomenon](https://ovidhan.net/word/phenomenon.html) | 200 | https://ovidhan.net/word/phenomenon.html | https://ovidhan.net/word/phenomenon.html | phenomenon Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [reassure](https://ovidhan.net/word/reassure.html) | 200 | https://ovidhan.net/word/reassure.html | https://ovidhan.net/word/reassure.html | reassure Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [recital](https://ovidhan.net/word/recital.html) | 200 | https://ovidhan.net/word/recital.html | https://ovidhan.net/word/recital.html | recital Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [wash](https://ovidhan.net/word/wash.html) | 200 | https://ovidhan.net/word/wash.html | https://ovidhan.net/word/wash.html | wash Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [wipe](https://ovidhan.net/word/wipe.html) | 200 | https://ovidhan.net/word/wipe.html | https://ovidhan.net/word/wipe.html | wipe Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |
| [withdrawal](https://ovidhan.net/word/withdrawal.html) | 200 | https://ovidhan.net/word/withdrawal.html | https://ovidhan.net/word/withdrawal.html | withdrawal Meaning in Bangla &#124; Ovidhan | Yes | nonempty | Yes | none |

### Complete control response inventory — 72 URLs

| Word / requested URL | HTTP | Final URL | Canonical | Title | Static answer | DefinedTerm description | Lexical | Anomalies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [skewed](https://ovidhan.net/word/skewed.html) | 200 | https://ovidhan.net/word/skewed.html | https://ovidhan.net/word/skewed.html | skewed – Ovidhan Learning Explorer | No | empty | No | none |
| [outlast](https://ovidhan.net/word/outlast.html) | 200 | https://ovidhan.net/word/outlast.html | https://ovidhan.net/word/outlast.html | outlast – Ovidhan Learning Explorer | No | empty | No | none |
| [tire](https://ovidhan.net/word/tire.html) | 200 | https://ovidhan.net/word/tire.html | https://ovidhan.net/word/tire.html | tire – Ovidhan Learning Explorer | No | empty | No | none |
| [economical](https://ovidhan.net/word/economical.html) | 200 | https://ovidhan.net/word/economical.html | https://ovidhan.net/word/economical.html | economical – Ovidhan Learning Explorer | No | empty | No | none |
| [militant](https://ovidhan.net/word/militant.html) | 200 | https://ovidhan.net/word/militant.html | https://ovidhan.net/word/militant.html | militant – Ovidhan Learning Explorer | No | empty | No | none |
| [monumental](https://ovidhan.net/word/monumental.html) | 200 | https://ovidhan.net/word/monumental.html | https://ovidhan.net/word/monumental.html | monumental – Ovidhan Learning Explorer | No | empty | No | none |
| [quilt](https://ovidhan.net/word/quilt.html) | 200 | https://ovidhan.net/word/quilt.html | https://ovidhan.net/word/quilt.html | quilt – Ovidhan Learning Explorer | No | empty | No | none |
| [on](https://ovidhan.net/word/on.html) | 200 | https://ovidhan.net/word/on.html | https://ovidhan.net/word/on.html | on – Ovidhan Learning Explorer | No | empty | No | none |
| [nun](https://ovidhan.net/word/nun.html) | 200 | https://ovidhan.net/word/nun.html | https://ovidhan.net/word/nun.html | nun – Ovidhan Learning Explorer | No | empty | No | none |
| [vanish](https://ovidhan.net/word/vanish.html) | 200 | https://ovidhan.net/word/vanish.html | https://ovidhan.net/word/vanish.html | vanish – Ovidhan Learning Explorer | No | empty | No | none |
| [swing](https://ovidhan.net/word/swing.html) | 200 | https://ovidhan.net/word/swing.html | https://ovidhan.net/word/swing.html | swing – Ovidhan Learning Explorer | No | empty | No | none |
| [terrific](https://ovidhan.net/word/terrific.html) | 200 | https://ovidhan.net/word/terrific.html | https://ovidhan.net/word/terrific.html | terrific – Ovidhan Learning Explorer | No | empty | No | none |
| [equable](https://ovidhan.net/word/equable.html) | 200 | https://ovidhan.net/word/equable.html | https://ovidhan.net/word/equable.html | equable – Ovidhan Learning Explorer | No | empty | No | none |
| [hallmark](https://ovidhan.net/word/hallmark.html) | 200 | https://ovidhan.net/word/hallmark.html | https://ovidhan.net/word/hallmark.html | hallmark – Ovidhan Learning Explorer | No | empty | No | none |
| [quarry](https://ovidhan.net/word/quarry.html) | 200 | https://ovidhan.net/word/quarry.html | https://ovidhan.net/word/quarry.html | quarry – Ovidhan Learning Explorer | No | empty | No | none |
| [slobber](https://ovidhan.net/word/slobber.html) | 200 | https://ovidhan.net/word/slobber.html | https://ovidhan.net/word/slobber.html | slobber – Ovidhan Learning Explorer | No | empty | No | none |
| [sanguine](https://ovidhan.net/word/sanguine.html) | 200 | https://ovidhan.net/word/sanguine.html | https://ovidhan.net/word/sanguine.html | sanguine – Ovidhan Learning Explorer | No | empty | No | none |
| [crunch](https://ovidhan.net/word/crunch.html) | 200 | https://ovidhan.net/word/crunch.html | https://ovidhan.net/word/crunch.html | crunch – Ovidhan Learning Explorer | No | empty | No | none |
| [manipulate](https://ovidhan.net/word/manipulate.html) | 200 | https://ovidhan.net/word/manipulate.html | https://ovidhan.net/word/manipulate.html | manipulate – Ovidhan Learning Explorer | No | empty | No | none |
| [mess](https://ovidhan.net/word/mess.html) | 200 | https://ovidhan.net/word/mess.html | https://ovidhan.net/word/mess.html | mess – Ovidhan Learning Explorer | No | empty | No | none |
| [sinuous](https://ovidhan.net/word/sinuous.html) | 200 | https://ovidhan.net/word/sinuous.html | https://ovidhan.net/word/sinuous.html | sinuous – Ovidhan Learning Explorer | No | empty | No | none |
| [stroke](https://ovidhan.net/word/stroke.html) | 200 | https://ovidhan.net/word/stroke.html | https://ovidhan.net/word/stroke.html | stroke – Ovidhan Learning Explorer | No | empty | No | none |
| [stalk](https://ovidhan.net/word/stalk.html) | 200 | https://ovidhan.net/word/stalk.html | https://ovidhan.net/word/stalk.html | stalk – Ovidhan Learning Explorer | No | empty | No | none |
| [mayhem](https://ovidhan.net/word/mayhem.html) | 200 | https://ovidhan.net/word/mayhem.html | https://ovidhan.net/word/mayhem.html | mayhem – Ovidhan Learning Explorer | No | empty | No | none |
| [offset](https://ovidhan.net/word/offset.html) | 200 | https://ovidhan.net/word/offset.html | https://ovidhan.net/word/offset.html | offset – Ovidhan Learning Explorer | No | empty | No | none |
| [proprietary](https://ovidhan.net/word/proprietary.html) | 200 | https://ovidhan.net/word/proprietary.html | https://ovidhan.net/word/proprietary.html | proprietary – Ovidhan Learning Explorer | No | empty | No | none |
| [rant](https://ovidhan.net/word/rant.html) | 200 | https://ovidhan.net/word/rant.html | https://ovidhan.net/word/rant.html | rant – Ovidhan Learning Explorer | No | empty | No | none |
| [squash](https://ovidhan.net/word/squash.html) | 200 | https://ovidhan.net/word/squash.html | https://ovidhan.net/word/squash.html | squash – Ovidhan Learning Explorer | No | empty | No | none |
| [subside](https://ovidhan.net/word/subside.html) | 200 | https://ovidhan.net/word/subside.html | https://ovidhan.net/word/subside.html | subside – Ovidhan Learning Explorer | No | empty | No | none |
| [tear](https://ovidhan.net/word/tear.html) | 200 | https://ovidhan.net/word/tear.html | https://ovidhan.net/word/tear.html | tear – Ovidhan Learning Explorer | No | empty | No | none |
| [amt](https://ovidhan.net/word/amt.html) | 200 | https://ovidhan.net/word/amt.html | https://ovidhan.net/word/amt.html | amt – Ovidhan Learning Explorer | No | empty | No | none |
| [chargers](https://ovidhan.net/word/chargers.html) | 200 | https://ovidhan.net/word/chargers.html | https://ovidhan.net/word/chargers.html | chargers – Ovidhan Learning Explorer | No | empty | No | none |
| [convicted](https://ovidhan.net/word/convicted.html) | 200 | https://ovidhan.net/word/convicted.html | https://ovidhan.net/word/convicted.html | convicted – Ovidhan Learning Explorer | No | empty | No | none |
| [defeated](https://ovidhan.net/word/defeated.html) | 200 | https://ovidhan.net/word/defeated.html | https://ovidhan.net/word/defeated.html | defeated – Ovidhan Learning Explorer | No | empty | No | none |
| [dundee](https://ovidhan.net/word/dundee.html) | 200 | https://ovidhan.net/word/dundee.html | https://ovidhan.net/word/dundee.html | dundee – Ovidhan Learning Explorer | No | empty | No | none |
| [insurrection](https://ovidhan.net/word/insurrection.html) | 200 | https://ovidhan.net/word/insurrection.html | https://ovidhan.net/word/insurrection.html | insurrection – Ovidhan Learning Explorer | No | empty | No | none |
| [latex](https://ovidhan.net/word/latex.html) | 200 | https://ovidhan.net/word/latex.html | https://ovidhan.net/word/latex.html | latex – Ovidhan Learning Explorer | No | empty | No | none |
| [ll](https://ovidhan.net/word/ll.html) | 200 | https://ovidhan.net/word/ll.html | https://ovidhan.net/word/ll.html | ll – Ovidhan Learning Explorer | No | empty | No | none |
| [lucifer](https://ovidhan.net/word/lucifer.html) | 200 | https://ovidhan.net/word/lucifer.html | https://ovidhan.net/word/lucifer.html | lucifer – Ovidhan Learning Explorer | No | empty | No | none |
| [manhood](https://ovidhan.net/word/manhood.html) | 200 | https://ovidhan.net/word/manhood.html | https://ovidhan.net/word/manhood.html | manhood – Ovidhan Learning Explorer | No | empty | No | none |
| [meddling](https://ovidhan.net/word/meddling.html) | 200 | https://ovidhan.net/word/meddling.html | https://ovidhan.net/word/meddling.html | meddling – Ovidhan Learning Explorer | No | empty | No | none |
| [mic](https://ovidhan.net/word/mic.html) | 200 | https://ovidhan.net/word/mic.html | https://ovidhan.net/word/mic.html | mic – Ovidhan Learning Explorer | No | empty | No | none |
| [mitochondria](https://ovidhan.net/word/mitochondria.html) | 200 | https://ovidhan.net/word/mitochondria.html | https://ovidhan.net/word/mitochondria.html | mitochondria – Ovidhan Learning Explorer | No | empty | No | none |
| [ninety](https://ovidhan.net/word/ninety.html) | 200 | https://ovidhan.net/word/ninety.html | https://ovidhan.net/word/ninety.html | ninety – Ovidhan Learning Explorer | No | empty | No | none |
| [nutshell](https://ovidhan.net/word/nutshell.html) | 200 | https://ovidhan.net/word/nutshell.html | https://ovidhan.net/word/nutshell.html | nutshell – Ovidhan Learning Explorer | No | empty | No | none |
| [offended](https://ovidhan.net/word/offended.html) | 200 | https://ovidhan.net/word/offended.html | https://ovidhan.net/word/offended.html | offended – Ovidhan Learning Explorer | No | empty | No | none |
| [opal](https://ovidhan.net/word/opal.html) | 200 | https://ovidhan.net/word/opal.html | https://ovidhan.net/word/opal.html | opal – Ovidhan Learning Explorer | No | empty | No | none |
| [oratory](https://ovidhan.net/word/oratory.html) | 200 | https://ovidhan.net/word/oratory.html | https://ovidhan.net/word/oratory.html | oratory – Ovidhan Learning Explorer | No | empty | No | none |
| [otp](https://ovidhan.net/word/otp.html) | 200 | https://ovidhan.net/word/otp.html | https://ovidhan.net/word/otp.html | otp – Ovidhan Learning Explorer | No | empty | No | none |
| [climber](https://ovidhan.net/word/climber.html) | 200 | https://ovidhan.net/word/climber.html | https://ovidhan.net/word/climber.html | climber – Ovidhan Learning Explorer | No | empty | No | none |
| [trite](https://ovidhan.net/word/trite.html) | 200 | https://ovidhan.net/word/trite.html | https://ovidhan.net/word/trite.html | trite – Ovidhan Learning Explorer | No | empty | No | none |
| [amc](https://ovidhan.net/word/amc.html) | 200 | https://ovidhan.net/word/amc.html | https://ovidhan.net/word/amc.html | amc – Ovidhan Learning Explorer | No | empty | No | none |
| [aust](https://ovidhan.net/word/aust.html) | 200 | https://ovidhan.net/word/aust.html | https://ovidhan.net/word/aust.html | aust – Ovidhan Learning Explorer | No | empty | No | none |
| [bailout](https://ovidhan.net/word/bailout.html) | 200 | https://ovidhan.net/word/bailout.html | https://ovidhan.net/word/bailout.html | bailout – Ovidhan Learning Explorer | No | empty | No | none |
| [bidet](https://ovidhan.net/word/bidet.html) | 200 | https://ovidhan.net/word/bidet.html | https://ovidhan.net/word/bidet.html | bidet – Ovidhan Learning Explorer | No | empty | No | none |
| [bridesmaid](https://ovidhan.net/word/bridesmaid.html) | 200 | https://ovidhan.net/word/bridesmaid.html | https://ovidhan.net/word/bridesmaid.html | bridesmaid – Ovidhan Learning Explorer | No | empty | No | none |
| [carries](https://ovidhan.net/word/carries.html) | 200 | https://ovidhan.net/word/carries.html | https://ovidhan.net/word/carries.html | carries – Ovidhan Learning Explorer | No | empty | No | none |
| [excellency](https://ovidhan.net/word/excellency.html) | 200 | https://ovidhan.net/word/excellency.html | https://ovidhan.net/word/excellency.html | excellency – Ovidhan Learning Explorer | No | empty | No | none |
| [parked](https://ovidhan.net/word/parked.html) | 200 | https://ovidhan.net/word/parked.html | https://ovidhan.net/word/parked.html | parked – Ovidhan Learning Explorer | No | empty | No | none |
| [snug](https://ovidhan.net/word/snug.html) | 200 | https://ovidhan.net/word/snug.html | https://ovidhan.net/word/snug.html | snug – Ovidhan Learning Explorer | No | empty | No | none |
| [activated](https://ovidhan.net/word/activated.html) | 200 | https://ovidhan.net/word/activated.html | https://ovidhan.net/word/activated.html | activated – Ovidhan Learning Explorer | No | empty | No | none |
| [aladdin](https://ovidhan.net/word/aladdin.html) | 200 | https://ovidhan.net/word/aladdin.html | https://ovidhan.net/word/aladdin.html | aladdin – Ovidhan Learning Explorer | No | empty | No | none |
| [calms](https://ovidhan.net/word/calms.html) | 200 | https://ovidhan.net/word/calms.html | https://ovidhan.net/word/calms.html | calms – Ovidhan Learning Explorer | No | empty | No | none |
| [demarcation](https://ovidhan.net/word/demarcation.html) | 200 | https://ovidhan.net/word/demarcation.html | https://ovidhan.net/word/demarcation.html | demarcation – Ovidhan Learning Explorer | No | empty | No | none |
| [demonstrably](https://ovidhan.net/word/demonstrably.html) | 200 | https://ovidhan.net/word/demonstrably.html | https://ovidhan.net/word/demonstrably.html | demonstrably – Ovidhan Learning Explorer | No | empty | No | none |
| [dropout](https://ovidhan.net/word/dropout.html) | 200 | https://ovidhan.net/word/dropout.html | https://ovidhan.net/word/dropout.html | dropout – Ovidhan Learning Explorer | No | empty | No | none |
| [electron](https://ovidhan.net/word/electron.html) | 200 | https://ovidhan.net/word/electron.html | https://ovidhan.net/word/electron.html | electron – Ovidhan Learning Explorer | No | empty | No | none |
| [expats](https://ovidhan.net/word/expats.html) | 200 | https://ovidhan.net/word/expats.html | https://ovidhan.net/word/expats.html | expats – Ovidhan Learning Explorer | No | empty | No | none |
| [ful](https://ovidhan.net/word/ful.html) | 200 | https://ovidhan.net/word/ful.html | https://ovidhan.net/word/ful.html | ful – Ovidhan Learning Explorer | No | empty | No | none |
| [gusting](https://ovidhan.net/word/gusting.html) | 200 | https://ovidhan.net/word/gusting.html | https://ovidhan.net/word/gusting.html | gusting – Ovidhan Learning Explorer | No | empty | No | none |
| [landowner](https://ovidhan.net/word/landowner.html) | 200 | https://ovidhan.net/word/landowner.html | https://ovidhan.net/word/landowner.html | landowner – Ovidhan Learning Explorer | No | empty | No | none |
| [layers](https://ovidhan.net/word/layers.html) | 200 | https://ovidhan.net/word/layers.html | https://ovidhan.net/word/layers.html | layers – Ovidhan Learning Explorer | No | empty | No | none |

### Initial treatment lexical content — exact extracted text

Tag structure is removed and whitespace collapsed for this display only. Body hash comparisons above use unmodified bytes. All 72 controls have no corresponding static lexical article. Nonempty schema/answers should not be interpreted as complete dictionary coverage: the frozen publication flags permit Bangla on 71 treatments, English definition and POS on seven, and no examples or pronunciation.

| Treatment word | Initial lexical answer |
| --- | --- |
| hosted | hosted meaning in Bangla Bangla meaning: হোস্ট করা Part of speech: verb Definition: be the host of or for Word family: host |
| integration | integration meaning in Bangla Part of speech: noun Definition: the action of incorporating a racial or religious group into a community Antonyms: segregation |
| outright | outright meaning in Bangla Bangla meaning: সরাসরি |
| street | street meaning in Bangla Bangla meaning: রাস্তা Part of speech: noun Definition: a thoroughfare (usually including sidewalks) that is lined with buildings |
| net-worth | net-worth meaning in Bangla Bangla meaning: মোট মূল্য |
| tension | tension meaning in Bangla Bangla meaning: উত্তেজনা |
| provision | provision meaning in Bangla Bangla meaning: বিধান Part of speech: noun Definition: a stipulated condition Synonyms: proviso |
| ugly | ugly meaning in Bangla Bangla meaning: কুৎসিত |
| wide | wide meaning in Bangla Bangla meaning: প্রশস্ত Part of speech: adjective Definition: having great (or a certain) extent from one side to the other Synonyms: broad Antonyms: narrow |
| saturday | saturday meaning in Bangla Bangla meaning: শনিবার Part of speech: noun Definition: the seventh and last day of the week; observed as the Sabbath by Jews and some Christians |
| stroll | stroll meaning in Bangla Bangla meaning: হাঁটা |
| quirky | quirky meaning in Bangla Bangla meaning: অদ্ভুত |
| mercantile | mercantile meaning in Bangla Bangla meaning: ব্যবসায়িক |
| february | february meaning in Bangla Bangla meaning: ফেব্রুয়ারী Part of speech: noun Definition: the month following January and preceding March |
| oversee | oversee meaning in Bangla Bangla meaning: তদারকি |
| pose | pose meaning in Bangla Bangla meaning: ভঙ্গি |
| procure | procure meaning in Bangla Bangla meaning: সংগ্রহ |
| weird | weird meaning in Bangla Bangla meaning: অদ্ভুত |
| rod | rod meaning in Bangla Bangla meaning: রড |
| legible | legible meaning in Bangla Bangla meaning: পাঠযোগ্য |
| tram | tram meaning in Bangla Bangla meaning: ট্রাম |
| labour | labour meaning in Bangla Bangla meaning: শ্রম |
| loophole | loophole meaning in Bangla Bangla meaning: ফাঁকি |
| magenta | magenta meaning in Bangla Bangla meaning: ম্যাজেন্টা |
| terrible | terrible meaning in Bangla Bangla meaning: ভয়ানক |
| lean | lean meaning in Bangla Bangla meaning: চর্বিহীন |
| sack | sack meaning in Bangla Bangla meaning: বস্তা |
| sink | sink meaning in Bangla Bangla meaning: ডুব |
| mirth | mirth meaning in Bangla Bangla meaning: আনন্দ |
| mutiny | mutiny meaning in Bangla Bangla meaning: বিদ্রোহ |
| purge | purge meaning in Bangla Bangla meaning: শুদ্ধ করা |
| sturdy | sturdy meaning in Bangla Bangla meaning: বলিষ্ঠ |
| musk | musk meaning in Bangla Bangla meaning: কস্তুরী |
| rudimentary | rudimentary meaning in Bangla Bangla meaning: প্রাথমিক |
| tunnel | tunnel meaning in Bangla Bangla meaning: টানেল |
| constellation | constellation meaning in Bangla Bangla meaning: নক্ষত্রপুঞ্জ |
| prologue | prologue meaning in Bangla Bangla meaning: প্রস্তাবনা |
| quake | quake meaning in Bangla Bangla meaning: ভূমিকম্প |
| spectacular | spectacular meaning in Bangla Bangla meaning: দর্শনীয় |
| wallet | wallet meaning in Bangla Bangla meaning: মানিব্যাগ |
| integrity | integrity meaning in Bangla Bangla meaning: সততা |
| pedestrian | pedestrian meaning in Bangla Bangla meaning: পথচারী |
| shout | shout meaning in Bangla Bangla meaning: চিৎকার |
| sympathy | sympathy meaning in Bangla Bangla meaning: সহানুভূতি |
| torch | torch meaning in Bangla Bangla meaning: টর্চ |
| wagon | wagon meaning in Bangla Bangla meaning: ওয়াগন |
| vocabulary | vocabulary meaning in Bangla Bangla meaning: শব্দভান্ডার |
| nevertheless | nevertheless meaning in Bangla Bangla meaning: তবুও |
| spine | spine meaning in Bangla Bangla meaning: মেরুদণ্ড |
| stab | stab meaning in Bangla Bangla meaning: ছুরিকাঘাত |
| ultimatum | ultimatum meaning in Bangla Bangla meaning: আল্টিমেটাম |
| quantum | quantum meaning in Bangla Bangla meaning: কোয়ান্টাম |
| moss | moss meaning in Bangla Bangla meaning: শ্যাওলা |
| sneeze | sneeze meaning in Bangla Bangla meaning: হাঁচি |
| sad | sad meaning in Bangla Bangla meaning: দুঃখজনক |
| slant | slant meaning in Bangla Bangla meaning: তির্যক |
| suppose | suppose meaning in Bangla Bangla meaning: ধরুন |
| deficit | deficit meaning in Bangla Bangla meaning: ঘাটতি |
| telescope | telescope meaning in Bangla Bangla meaning: টেলিস্কোপ |
| shy | shy meaning in Bangla Bangla meaning: লাজুক |
| friction | friction meaning in Bangla Bangla meaning: ঘর্ষণ |
| reckon | reckon meaning in Bangla Bangla meaning: গণনা |
| velocity | velocity meaning in Bangla Bangla meaning: বেগ |
| lash | lash meaning in Bangla Bangla meaning: চাবুক |
| nest | nest meaning in Bangla Bangla meaning: নীড় |
| opportune | opportune meaning in Bangla Bangla meaning: সুবিধাজনক |
| phenomenon | phenomenon meaning in Bangla Bangla meaning: ঘটনা |
| reassure | reassure meaning in Bangla Bangla meaning: আশ্বস্ত করা |
| recital | recital meaning in Bangla Bangla meaning: আবৃত্তি |
| wash | wash meaning in Bangla Bangla meaning: ধোয়া |
| wipe | wipe meaning in Bangla Bangla meaning: মুছা |
| withdrawal | withdrawal meaning in Bangla Bangla meaning: প্রত্যাহার |


### Per-response timestamps and integrity evidence

URL keys are the exact word/cohort rows in the two inventories above and the CSV. SHA-256 below is both the live response hash and the matching repository hash. “Time” is the UTC request-start time; all entries are dated 2026-09-24. This preserves a verifiable per-page record without exporting 144 duplicate HTML files into the repository.

| Cohort | Word | Time UTC | Bytes | Live/repository SHA-256 |
| --- | --- | --- | --- | --- |
| treatment | hosted | 20:06:49.947Z | 14812 | d43347afb7d4e803903a70175618e27c30f24c52f4fb4c557f4ecf17111604aa |
| treatment | integration | 20:06:50.041Z | 14785 | 27351d92508ba86ad722244d2a759631f93fdd12e157f96376d616d1cb24f478 |
| treatment | outright | 20:06:50.043Z | 14498 | 9467834fc61157ca6ed490191062a9e26a7f1510d440a06b03615e31306f03f3 |
| treatment | street | 20:06:50.045Z | 14863 | 42cfe84792798bafb9ce15f5fb163c5be2d0da6dfdfb616b7d1c2645473e0e2a |
| treatment | net-worth | 20:06:50.164Z | 14535 | a023adb69801c4a8a57aef3466ceb5e524003163a56c7bc625f7b3434a6df470 |
| treatment | tension | 20:06:50.176Z | 14513 | 9c31438ef5ca5c4d8e0bfb55b01bd55c2eb560c1dfa8594500b2c871d700cf80 |
| treatment | provision | 20:06:50.185Z | 14809 | 8ef37f57d9400f834b81be0931d0659a9a1346d8a54dc492364b10a64219918a |
| treatment | ugly | 20:06:50.198Z | 14462 | 624ee40fc0af60217eb5dbdeb122f100e26d1a3da3fc9501c787dcb3d459e5ac |
| treatment | wide | 20:06:50.235Z | 14982 | 8ad4a446be5ee574d15dd6b28f1d5a2ab345b8a27e474eb39f09ae6d779f1b02 |
| treatment | saturday | 20:06:50.240Z | 14929 | 37a10a6b6df1c93c2163e8aa09be001c8367410b0f56207cf2ad455ca9b28e68 |
| treatment | stroll | 20:06:50.243Z | 14468 | 194c8d797afe465f2cd962bc567ca0b42e0cde330ceed6507e94886c22d3310d |
| treatment | quirky | 20:06:50.260Z | 14480 | 7203fd8d112fa149466b31263b48cbd0b83c740817c59b8ada9afbd1ff7cc320 |
| treatment | mercantile | 20:06:50.296Z | 14564 | 5d9e4faa2761225f9484cb2b75f98822769774ccc379677b367fb138f844a55f |
| treatment | february | 20:06:50.299Z | 14848 | 00a7cb7fe33332817bba867ae95bb31c6c34430908aa323f4cfa876e1d56a7bc |
| treatment | oversee | 20:06:50.303Z | 14489 | 259f916a8e3aecf3faf0c1bd6603d33c9b45fbc4b022b7458b7d487bb095876b |
| treatment | pose | 20:06:50.323Z | 14450 | e0ca9d697e099b1e47f44db38287800a6da24d5938cfd3ff16b6d2b1c7ec97db |
| treatment | procure | 20:06:50.353Z | 14489 | 9db9b777323067b14cad02e9224e8f02191806153963911b26556013a2a58a90 |
| treatment | weird | 20:06:50.363Z | 14471 | 0b307cebc243c3e7be3198094ab4c59d34289deede743e1fce5e41884dda2134 |
| treatment | rod | 20:06:50.377Z | 14405 | 01b9932a605004166395b305f17b82bdbc8ce9a5c227babc6af848f42960ad4c |
| treatment | legible | 20:06:50.393Z | 14513 | 5fa2d317554083d5f4e700b4e62698d87c47fa93b064968de92e7be47a095ea4 |
| treatment | tram | 20:06:50.413Z | 14450 | 5b8ad820f0a16ec507ba30672af6146479f031b602a6c13f97ee24ab7209681d |
| treatment | labour | 20:06:50.417Z | 14456 | 585153b632b07447c872c4208fb5fdd0ea5744860b3163e1e8146f19dc175e81 |
| treatment | loophole | 20:06:50.438Z | 14486 | 77eeb0ca5d538ead4294b35ae85c4665c90f732b7b747a03521a044e3f7fbd5e |
| treatment | magenta | 20:06:50.446Z | 14537 | c666d39e795bfc4ef31e058c419899b433fae9bcc2f583a933ae0ba866d5fef8 |
| treatment | terrible | 20:06:50.466Z | 14498 | 8e63f22ba311a31172e03f386d05e63fea39af22fcacde8837470500a9000224 |
| treatment | lean | 20:06:50.496Z | 14486 | 17095a8b07b48a7ec99b5514c83fc569731fefb6d394c76210c9291e4871f783 |
| treatment | sack | 20:06:50.498Z | 14450 | 0e41b1497b1c07e50f386a9a1c1625ecdd217091979d00b97ad10fb3f9a736b4 |
| treatment | sink | 20:06:50.513Z | 14426 | 5c287e1322b9bcf71825ae934cb364bb6088dd2695b7ab188a2467a2a649ed3f |
| treatment | mirth | 20:06:50.534Z | 14459 | f3f5f51742b4278552ba58f8148f54c7da54113c7740e03a28f353fa7646f5ab |
| treatment | mutiny | 20:06:50.557Z | 14492 | 1c43599342227e47326b15917e3f6fc31b5f6c6b0ba88faf12e2141dd78052ef |
| treatment | purge | 20:06:50.584Z | 14499 | 36a211a0756d510db5be93e49c312f05a28d6a59db32c7cb4f2bf57fb9aa31b3 |
| treatment | sturdy | 20:06:50.591Z | 14480 | 8a076c156b990bc830dc57527343a95678a54c9f4d822108615430e02aec720f |
| treatment | musk | 20:06:50.599Z | 14474 | 4be7a71c61273a5e2eb9666becebbe3fa0ba962119bf71199231014fb63c2e43 |
| treatment | rudimentary | 20:06:50.633Z | 14549 | cac349f216e084fb43f8e7692d21be16ba2bd5ef93d220d79503c5769d2ebd39 |
| treatment | tunnel | 20:06:50.637Z | 14468 | d6a2afe377ace19c99a360a47de355d503d9dc84c05cf60c3e94790a0aa14246 |
| treatment | constellation | 20:06:50.651Z | 14615 | b9939c72378d6f9f66907ef601d39f19ccd2dbde07673b353f48d1afc47b2842 |
| treatment | prologue | 20:06:50.657Z | 14546 | 9365e0fe7be7b2fa4e0572104b0d1147f164347db402395b43d8746dee04302b |
| treatment | quake | 20:06:50.688Z | 14495 | 1ca1e088c41aa2e280616af64ab947c2e0b06bd54e2770e2c2d59e8e76b6ac58 |
| treatment | spectacular | 20:06:50.707Z | 14549 | 62235d8fb642a9fcf1b357359aca16f180d648ece6d55c4e38b24ade6a3e2adc |
| treatment | wallet | 20:06:50.708Z | 14516 | 4d3c656ec1dcafbbcc21b001634f37878cac5f88d1ead59d9e8a27bbe8657bdd |
| treatment | integrity | 20:06:50.710Z | 14483 | a5d023ae0860c35609de0c4256b2c0746694695c0dbbbd11e48e96740c8f75fb |
| treatment | pedestrian | 20:06:50.743Z | 14516 | d5f428cecc7ad121f93720b8983376d3ca4d8f09bc83e48d2012e8b3a46cf938 |
| treatment | shout | 20:06:50.756Z | 14471 | f0b886de0cef8c4b8c6df02cc0efcd1e8d4f6d9a3b1705f7b15b75a3b6404dbc |
| treatment | sympathy | 20:06:50.757Z | 14534 | 66405e3bc30ca1e7932648456d0b0cb80d8f147013b7586a5b3a338498a06a99 |
| treatment | torch | 20:06:50.774Z | 14447 | 511aa11e88a284eb0b2c81fbdfc729a9be744fd9b68550e694640e6debda5a91 |
| treatment | wagon | 20:06:50.805Z | 14471 | e0978f343718386bd83ab3a22605b2f8165f2607266718ff80721d0607cc1f11 |
| treatment | vocabulary | 20:06:50.809Z | 14576 | 572f06868dbd3d2b33a9641c53fae260f1e94ee3161ee67b87e36cabc956b8e5 |
| treatment | nevertheless | 20:06:50.814Z | 14510 | 9e07b7d35509bf868e57f0f0ef8940cd5d8dd2e48080d02a7871a97392c97ccd |
| treatment | spine | 20:06:50.842Z | 14495 | 09ff33120662281cc7fbaa5322fe96fac7ce030b6e3eecdbaa3b1dfe455afc73 |
| treatment | stab | 20:06:50.864Z | 14498 | e8a78fe104f7c318f58dc115b267dad9ed0c6780d5affe01a0bf330e5eab94fc |
| treatment | ultimatum | 20:06:50.866Z | 14555 | ccd6a808714f56054b6d9f1e21448ed3cc87837b20de2c05191b8da4d01111d2 |
| treatment | quantum | 20:06:50.902Z | 14537 | 1cf4ce9d96597d48ce455d20488c41e493206abd8466bc2ba17fd4dbf1baa599 |
| treatment | moss | 20:06:50.928Z | 14474 | 4ef48f99efe7e0e3705bae2cb21c9deeadc144c9e43e113b23c7659c8df7962d |
| treatment | sneeze | 20:06:50.930Z | 14468 | 00dd2df611f4859044e46d5616261e104499a34f6af820b312f6ab6b33989080 |
| treatment | sad | 20:06:50.933Z | 14465 | 62a718d9043746c51a1dda074bc5b069cf6185247fc33ef2e18fd75519f81cc0 |
| treatment | slant | 20:06:50.968Z | 14471 | 6125102e8aeb8d00c2b8893b354f06a9d42843eabb314c67c57adc45016d2706 |
| treatment | suppose | 20:06:50.980Z | 14465 | 6933509c696f1d4653d734a3fb1d7dadaa2681b4f9d0221d08d14c91e4b942dc |
| treatment | deficit | 20:06:50.990Z | 14477 | 6b32fff62738731ab03d8d7a4f4997bf3df720823988b76f93e18c268a16c334 |
| treatment | telescope | 20:06:51.001Z | 14543 | 79ce870cc981bfce4900e76da5cf9095067db214c602063a9b75bf09de721208 |
| treatment | shy | 20:06:51.036Z | 14441 | 4a1fc4c69bace479ef4d5680dbba91c5def91f2d8f90b6fc8a968c2f4d666a91 |
| treatment | friction | 20:06:51.038Z | 14486 | c32fd7ae9708c450687b000e028a67b4a0eb8746eb64a5476296c97223a1f3aa |
| treatment | reckon | 20:06:51.048Z | 14456 | 5ba0567210a72af2b77b5a4273e8e3dbaa517abbaeee550e04d265b9820ee752 |
| treatment | velocity | 20:06:51.052Z | 14462 | 62b0ac452f545e9ac84c73f0d7ef777e93079792549be1866c843d5f6406aac9 |
| treatment | lash | 20:06:51.089Z | 14450 | 5d1356861b3bed1df4848024edbe17c9facf51b8321b0afaf574834a6200cdfd |
| treatment | nest | 20:06:51.092Z | 14438 | 255a3e43f80be566a75685e3da44f49aede8a4e7c65ce523cf1afafc46edbe5a |
| treatment | opportune | 20:06:51.106Z | 14543 | ef5527087e2d2c3dc9e2d2fba0a02fc6d69a1a8f79685ed329c7d555ac832f36 |
| treatment | phenomenon | 20:06:51.123Z | 14492 | 60f0df168433455835613150fc5b6e486944cccd47459b6a14212b6bcd49e7e5 |
| treatment | reassure | 20:06:51.145Z | 14550 | dda15e2eac281aa39cb9357299a95fcd5a6fed8f41b45d563042439be81db4df |
| treatment | recital | 20:06:51.155Z | 14501 | 2f17b39b4b1289f336fe84fb00f6a1f0a23cd33b66db6da6c16a4ca7530bc119 |
| treatment | wash | 20:06:51.172Z | 14450 | b46ae5811075fc4fcd3f68740a9a01ad3dc0d9a45ea03a3445edb625e124ef1b |
| treatment | wipe | 20:06:51.182Z | 14438 | 0daaad742774d38214e7be979631519b712d51d8315151794d4c5e4ce6f6401e |
| treatment | withdrawal | 20:06:51.199Z | 14564 | 3809e40ac90317cfd390a730ff2f21d0c2656d0111a8e8285f8533bb506f609f |
| control | skewed | 20:06:51.222Z | 1578 | 2552073e762f4011f261285eb6f9351182c3cc08af5ec7fd4564f9c81c3ec4fb |
| control | outlast | 20:06:51.231Z | 1586 | 28080ef8519817e261fcd3cd38602ea52c6ca5acb30ca948994602296fb9a9b7 |
| control | tire | 20:06:51.247Z | 1562 | 95ec7e90d7d076eacb71c1662268b8c0095bd759506cdfea3b43984252a62ac8 |
| control | economical | 20:06:51.249Z | 1610 | fc1622e398297dcb8c76ba9bdbadcb2dbe2e1522f6ea186d11f179cac1c0df3a |
| control | militant | 20:06:51.281Z | 1594 | 02c6d737124febc367d8a62badc6ac5c849db8b9bbb6ec611fc24ce21f6f73b1 |
| control | monumental | 20:06:51.284Z | 1610 | 53305cdb239e6b204e3abf2522d03da2172cac6f642804d1af74e3d0e5d3b40d |
| control | quilt | 20:06:51.304Z | 1570 | f005a1c59e98ce0fdb887ccc506292d634d1b12a784558b77e5d9245a9cc05ce |
| control | on | 20:06:51.307Z | 1546 | 4772081477bce7896d9338ad7e3b15b06e2ae902c7d925c9a00f3e841006f3e5 |
| control | nun | 20:06:51.344Z | 1554 | 0f7c7749789f37f7e8d60bf748d6f9a849001df8ac94d16ebcdc6a999a52d53e |
| control | vanish | 20:06:51.345Z | 1578 | 380cdc15aa1fbfd57233c030baa44c309a4fe6971fb92a9f38aeb3bb35b2df03 |
| control | swing | 20:06:51.353Z | 1570 | 01f2579ce3afa8fa7b47fcbb6d775e91cf135ca5c01d65bd04fa729ad392c11d |
| control | terrific | 20:06:51.360Z | 1594 | 2fc694ef757ad93bb7b263df4dfc9fec0a0173f17b14ae20ee9d77c9699fbf1f |
| control | equable | 20:06:51.402Z | 1586 | d94124acfe59307161c92d177f4c71fed40efe3bad1072c694c3fe7c2db349dc |
| control | hallmark | 20:06:51.411Z | 1594 | 9fbba8bb5c01dd34c9bf8c44c7bd3b8faa449dffa708fd7f15dd88bb7f5a5978 |
| control | quarry | 20:06:51.417Z | 1578 | dc0770e540db898c6ad9842d35cae3c83dfedcbe22cea17efa220cb905e6321f |
| control | slobber | 20:06:51.438Z | 1586 | b1dd7e41181a2d3c149173af00cc22722bae69a390156c1c605a02fb5914fbbc |
| control | sanguine | 20:06:51.465Z | 1594 | 216c4d65c0ac083e2ee813f8e270991d3881fe0b0f63bfdfff96c43fd4a89940 |
| control | crunch | 20:06:51.476Z | 1578 | 9430c0a6e402ba4cfd619e94f671f2984d32f45b23e4e6ac9ad83ade3bd882da |
| control | manipulate | 20:06:51.479Z | 1610 | 603cf33b41bb64521cd976cf9309fe8599228583e06cdfa72076671e6bd8760e |
| control | mess | 20:06:51.521Z | 1562 | 06f1deece5830443135c71b1f1876e2bf73e072d628bdbd0302087d99c487a4a |
| control | sinuous | 20:06:51.523Z | 1586 | 088b8d8686f23c449bd5c6d78dd4cbc3b45fd20cba83af012ac7e06cbd40debc |
| control | stroke | 20:06:51.547Z | 1578 | 55a01994f2504e86b0ce430d755f435a08aeefb2865b25ecfb20fa58c9f1c422 |
| control | stalk | 20:06:51.554Z | 1570 | e9ddc7f1c0758b38811e5192985001e17276eabe539e1cfa4891a2becacb5e76 |
| control | mayhem | 20:06:51.572Z | 1578 | c4623bb6676af4bf8daf54afc1800842ea3b42f1ef5c95d5cec9fe2b7d415bca |
| control | offset | 20:06:51.577Z | 1578 | c95ec2ef8d62abf679e57fd8822a1b824ba1b9400b7b689d14ec8510b3fd307d |
| control | proprietary | 20:06:51.613Z | 1618 | 92219e3f110b400c544512544d5da989ecf5ac5340d21f98b4fbd2cbcabede3c |
| control | rant | 20:06:51.615Z | 1562 | 3b54221578397d14ffed1d327237f527035f808c10d722312528e0bef307fee0 |
| control | squash | 20:06:51.640Z | 1578 | 4153b6b1b2193732717ffa9d4e5f0559faf66fc1c89f42c7d24dc2e758e8bc31 |
| control | subside | 20:06:51.676Z | 1586 | fde674d02cb31cc5c2f7b8708d5dd71a689132f24f6cf9b2e6560236030f1734 |
| control | tear | 20:06:51.687Z | 1562 | f0d95910290a0daf14d084c4bfa3d80c58c59e0ffa0d30d77e5695f6311c339a |
| control | amt | 20:06:51.695Z | 1795 | 3887cdc53fe78f0e810b65c9f7c223b6c576dcacdd0ce063a7957a7c3775db2c |
| control | chargers | 20:06:51.733Z | 1594 | 205f467cce12491f2573dfeb790a69b746e056c8211502e3ceb2ece068870949 |
| control | convicted | 20:06:51.741Z | 1602 | 58f2ac9434eaa729ef0023759f2a0ba8bfb7a5b49d8c8f6468b18b2b0cf96c49 |
| control | defeated | 20:06:51.742Z | 1594 | c90d0fced6b73ae9d15092db979d292e078377ecc83b47756c4a2c792cf36a80 |
| control | dundee | 20:06:51.743Z | 1578 | a2d2d3fd406ec017da4c08c0e882865c7f1f26e3ed0b94a9a793755f06de6b5b |
| control | insurrection | 20:06:51.782Z | 1626 | 8d71a78b5fc62ee0ce665a47141dae8cf7d9acbbd245cd61f5e75be42b492a89 |
| control | latex | 20:06:51.791Z | 1570 | fa6587d0e959169b2b0b2738afb04f7b6497f6b946b574b660dc7eaae745d085 |
| control | ll | 20:06:51.809Z | 1546 | a7074b8e199e6913ff22e08892a822181f26bf78097096817562bbcfd2687bd6 |
| control | lucifer | 20:06:51.810Z | 1586 | a6718739c6b244d7a4cd2ee529a48b350f324caebe729db4485a72c261560f05 |
| control | manhood | 20:06:51.832Z | 1586 | f88f0914260c55bd14b8294a83cfa184452a7098f7a76bcd5d35b9eb8388ea1e |
| control | meddling | 20:06:51.839Z | 1594 | 1fab7d18d0ea57a964bb7ad1d72c851b1c0663c7de23396b1542e7ff34399ba8 |
| control | mic | 20:06:51.863Z | 1554 | e0498af1793abde9c1fd1ce599a2fc1cd7a7c84f63e908a3fd4ed94afe464208 |
| control | mitochondria | 20:06:51.879Z | 1626 | 0777c8c6abc1031bf8d2050c48b150e897528db8ff5cd6805cddb5d75717ef12 |
| control | ninety | 20:06:51.890Z | 1578 | 4a2cc6068111c972aaaca34c19aa519ebf3d2954ff3a611dc8a65ccc58dda55f |
| control | nutshell | 20:06:51.897Z | 1594 | b737fbcfd2e15f42cb045fd2236693382e41024ee2a7c258159e73e8615c05c0 |
| control | offended | 20:06:51.920Z | 1594 | 241c6abb57d425a6ddb9d8b53eca4c0cf1ebb1bf71429bdca7b02208da5e2ea7 |
| control | opal | 20:06:51.938Z | 1562 | c62e71154c2336642e0dc065b90bebdfd4a72c2d22590c49a8acce4145434e02 |
| control | oratory | 20:06:51.944Z | 1586 | 6adaa06d43469287cc98359800e4885c44c8aea1edf2281f02c02838cf70c4b4 |
| control | otp | 20:06:51.959Z | 1554 | f2089155f58850ebac57dfd4ff6d15aae3e110a1f865d7d916a10998736381fa |
| control | climber | 20:06:51.979Z | 1586 | cb7291b443ba8ac4a43406226fa29ed6bd52803863a38383b3ea1dca0559005b |
| control | trite | 20:06:51.994Z | 1570 | a1668e12397dadee9905a3e961af0c274b1399390d2f7edf7e2a51788fbbea90 |
| control | amc | 20:06:52.005Z | 1795 | 8bf76dd67c93e7975195b31b86b6d1dbd4a53b60a2bbe1ddaafd1c227ccf460e |
| control | aust | 20:06:52.014Z | 1806 | 4ab783a7b1100f58f796f7fcb8fd255a0a0fcf65c51d0754fa1602ec72a29d9b |
| control | bailout | 20:06:52.039Z | 1839 | bf38bd747b49742bf40cae30a16d56edcc59585fcaafca929006713946dfdd00 |
| control | bidet | 20:06:52.049Z | 1817 | c2a07a2bb4fdc2adfa4e3c7f4476950ae97f6b90058903998360ed69e9648c87 |
| control | bridesmaid | 20:06:52.055Z | 1872 | 05c54b214df4a794b4c926911bf2611f4c051465e9c1e67009438828ea4ef2cc |
| control | carries | 20:06:52.071Z | 1839 | 9271be04451835622af28344b9f7516de308b0ed64318a95bfd7c001e7494ff0 |
| control | excellency | 20:06:52.094Z | 1610 | ffbdfb8f5e99c5b2cb9ecc30c9570d47d783e18880af5045c2e66109689939ae |
| control | parked | 20:06:52.095Z | 1578 | db176717d3f13b67cb3f5bd080e36f992279e4c182ce6c494fa017f8956fa257 |
| control | snug | 20:06:52.122Z | 1562 | 98608923419e02cb3a36a10a4d4814927ae0a8ec24a9e32ae8f0ad3fa0b70d72 |
| control | activated | 20:06:52.127Z | 1602 | fa77593a96f4c185f7db2b63b17b0580a6af47094a98abf973fd3b353684478c |
| control | aladdin | 20:06:52.152Z | 1839 | fca654162c397f4aa73b69ff585d248b61ec154df342b32300e22aa9c7bc7c45 |
| control | calms | 20:06:52.176Z | 1817 | 83b3c96de3e36c91c142e9aaac7200c9790553d2916f6cec5b9dd8b259e2f19e |
| control | demarcation | 20:06:52.179Z | 1618 | cdaa3a0dbf189123cab6849b634ed057fe01f2380999c715f26777a9ac809ce7 |
| control | demonstrably | 20:06:52.200Z | 1626 | a14d3f7b1789aa8fdfe5d900ac64b47d24b6a2f2a2f3ffaac13ec7ee56179470 |
| control | dropout | 20:06:52.201Z | 1586 | d390d49c73780a05f320e7a103afb17fcade1510a5dac375a3153ea1690af2f4 |
| control | electron | 20:06:52.229Z | 1594 | 2ec9baedb017f456efde539c8ede48f66315fe929c7d4fb96a35557ddf1f6f8e |
| control | expats | 20:06:52.236Z | 1578 | 4d3756bfdbe27d6add3c6a6c0b0b88b04c304e2a759cb6985572a1bdf3b2f294 |
| control | ful | 20:06:52.245Z | 1554 | 7e5eb0c793deec1e2c9d4e7210735d819907f464e1582880558ee2928b39d803 |
| control | gusting | 20:06:52.267Z | 1586 | e5faeb6155731ffc4061c361306b49de2d997bd3d1ce90cd1d572f3de117fa8f |
| control | landowner | 20:06:52.295Z | 1602 | ed8edbe470e75edf6c111e54d0329eb4e3e8d00dff15ac0b7696315106733302 |
| control | layers | 20:06:52.296Z | 1578 | 3783666ac9ab7179312acf5a80e7faf3a66cace55e4bcf617ebc54c3685c6bb5 |


## GSC EVIDENCE

**GSC OUTCOME DATA REQUIRED**

No authenticated current GSC report or URL Inspection result for the 144 URLs was available. Existing repository reports were examined, and the two external workbooks explicitly referenced by those reports were found and read without modification. Their SHA-256 hashes match the recorded provenance. All joins below use exact URL strings; an absent row remains UNKNOWN.

### Frozen baseline — not an outcome measurement

`reports/dictionary-seo-experiment-baseline-2e.csv` contains all 144 URLs with baseline date 2026-08-16, country Bangladesh, and period “Last 3 months”; the experiment plan specifies Web search.

| Cohort | Rows | Impressions | Clicks | CTR from totals | Impression-weighted position |
| --- | ---: | ---: | ---: | ---: | ---: |
| Treatment | 72 | 109 | 0 | 0% | 41.10 |
| Control | 72 | 87 | 0 | 0% | 45.57 |

These totals were recomputed from the CSV. All 144 baseline rows contain positive impressions. The matching record is 14 strong, 8 acceptable and 50 weak controls; the implementation report explicitly limits causal interpretation. Performance impressions are not a current index-coverage census.

### Historical performance workbook — before implementation

Source: `C:\data\ovidhan-gsc\ovidhan-gsc-performance-2026-08-16.xlsx`.
SHA-256: `c8eeb38ee815615cccb91d8513be9e78be87e1f382e43eef94627f0325fa227a`.

The Filters sheet says Search type = Web and Date = Last 3 months. No Bangladesh country filter is recorded; a Countries sheet includes multiple countries. The Chart sheet's actual dates run **2026-06-29 through 2026-08-14**, preceding the August 16 implementation. Consequently this file cannot measure a post-implementation response, despite later reports being generated from it on August 26.

The Pages sheet contains 1,000 exported page rows. Exact joins find:

| Cohort | Observed exact URL rows | URLs absent from this limited export | Observed impressions | Observed clicks | Weighted position of observed subset |
| --- | ---: | ---: | ---: | ---: | ---: |
| Treatment | 43 | 29 UNKNOWN | 172 | 0 | 37.19 |
| Control | 31 | 41 UNKNOWN | 121 | 0 | 46.75 |

The 172/121 values must not be compared with the 109/87 baseline as growth: populations, filters and completeness differ, and the workbook predates treatment. The missing 70 URLs are not assigned zero impressions or any indexing status. Weighting uses SUM(impressions × row position) / SUM(impressions) over the observed subset.

### Historical coverage workbook — no cohort membership evidence

Source: `C:\data\ovidhan-gsc\ovidhan-gsc-coverage-2026-08-25.xlsx`.
SHA-256: `9ee447fcb3e53d07256f35723afc3a5b0d21799040f9e1860e24e9358f4eb426`.

The workbook has 1,000 URL rows; the issue metadata identifies Discovered – currently not indexed (with a replacement character in the dash), and Sitemap = All known pages. There are **zero exact matches** to either frozen cohort. All 144 therefore have **UNKNOWN** coverage status from this file. This sample's absence of a cohort URL does not mean indexed, crawled, rejected or recovered. The workbook filename supplies its export date; no current coverage snapshot is present.

### Existing repository overlays — exact cohort matches

| Artifact | Rows in artifact | Unique exact cohort URLs | Treatment hits | Control hits |
| --- | --- | --- | --- | --- |
| reports/dictionary-seo-experiment-baseline-2e.csv | 144 | 144 | 72 | 72 |
| reports/dictionary-opportunity-7a3b-candidates.csv | 500 | 47 | 27 | 20 |
| reports/dictionary-opportunity-7a3c-protect.csv | 204 | 1 | 1 | 0 |
| reports/dictionary-opportunity-7a3c-review-queue.csv | 100 | 24 | 15 | 9 |
| gsc_opportunities.csv | 10 | 1 | 0 | 1 |


The 7A3B candidates file is a bounded 500-row diagnostic subset derived from the same historical workbooks. The 7A3C protection and review queue are derivative decisions, not new GSC measurements. The one protected exact treatment entry is hosted: 3 impressions, 0 clicks, position 9.67 in that historical source. Its derivative architecture label says OTHER_JS_SHELL; the current live body conclusively contains the frozen static answer, so this stale/diagnostic label is not deployment-drift evidence.

`gsc_opportunities.csv` matches only control mayhem, query “mayhem meaning in bengali”: 10 impressions, 0 clicks, position 11.7. Its latest Git change is July 31, before implementation; the file itself lacks a reporting window and complete filter provenance. It cannot establish experiment outcome.

The 7A3B summary's `experiment_7a1` counts (21 treatment and 21 control coverage-backlog entries) belong to the separate later 21/21 experiment. They are not the frozen 72/72 experiment and are excluded from its outcome assessment. The user-supplied sitewide counts in R0 also cannot substitute for URL-level cohort evidence.

### Exact per-URL historical evidence join

Baseline columns are Bangladesh impressions/position from the frozen CSV. Workbook columns are impressions/position from the historical, unfiltered-country Pages export ending August 14. Clicks are zero in every baseline row and every observed workbook row. UNKNOWN means absent from the bounded historical workbook, not zero. Historical coverage status is UNKNOWN for every row and current GSC outcome is UNKNOWN for every row.

| Cohort | Word / exact URL | Baseline impressions | Baseline position | Historical workbook impressions | Historical workbook position | Current GSC outcome |
| --- | --- | --- | --- | --- | --- | --- |
| treatment | [hosted](https://ovidhan.net/word/hosted.html) | 1 | 8.0 | 3 | 9.67 | UNKNOWN |
| treatment | [integration](https://ovidhan.net/word/integration.html) | 2 | 11.5 | 5 | 12.6 | UNKNOWN |
| treatment | [outright](https://ovidhan.net/word/outright.html) | 5 | 19.2 | 5 | 19.2 | UNKNOWN |
| treatment | [street](https://ovidhan.net/word/street.html) | 2 | 25.0 | 4 | 32.75 | UNKNOWN |
| treatment | [net-worth](https://ovidhan.net/word/net-worth.html) | 4 | 12.0 | 14 | 13.36 | UNKNOWN |
| treatment | [tension](https://ovidhan.net/word/tension.html) | 9 | 54.22 | 16 | 55.81 | UNKNOWN |
| treatment | [provision](https://ovidhan.net/word/provision.html) | 2 | 68.0 | 3 | 74.67 | UNKNOWN |
| treatment | [ugly](https://ovidhan.net/word/ugly.html) | 4 | 29.75 | 7 | 39.86 | UNKNOWN |
| treatment | [wide](https://ovidhan.net/word/wide.html) | 1 | 69.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [saturday](https://ovidhan.net/word/saturday.html) | 1 | 83.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [stroll](https://ovidhan.net/word/stroll.html) | 3 | 24.67 | 4 | 29.75 | UNKNOWN |
| treatment | [quirky](https://ovidhan.net/word/quirky.html) | 3 | 21.33 | 3 | 21.33 | UNKNOWN |
| treatment | [mercantile](https://ovidhan.net/word/mercantile.html) | 1 | 11.0 | 4 | 10.5 | UNKNOWN |
| treatment | [february](https://ovidhan.net/word/february.html) | 1 | 55.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [oversee](https://ovidhan.net/word/oversee.html) | 1 | 12.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [pose](https://ovidhan.net/word/pose.html) | 1 | 19.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [procure](https://ovidhan.net/word/procure.html) | 1 | 19.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [weird](https://ovidhan.net/word/weird.html) | 1 | 16.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [rod](https://ovidhan.net/word/rod.html) | 1 | 16.0 | 2 | 38.5 | UNKNOWN |
| treatment | [legible](https://ovidhan.net/word/legible.html) | 2 | 24.0 | 7 | 28.14 | UNKNOWN |
| treatment | [tram](https://ovidhan.net/word/tram.html) | 2 | 42.5 | 4 | 48.75 | UNKNOWN |
| treatment | [labour](https://ovidhan.net/word/labour.html) | 1 | 19.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [loophole](https://ovidhan.net/word/loophole.html) | 1 | 11.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [magenta](https://ovidhan.net/word/magenta.html) | 2 | 42.5 | 2 | 42.5 | UNKNOWN |
| treatment | [terrible](https://ovidhan.net/word/terrible.html) | 2 | 50.0 | 3 | 52 | UNKNOWN |
| treatment | [lean](https://ovidhan.net/word/lean.html) | 3 | 51.0 | 4 | 50.5 | UNKNOWN |
| treatment | [sack](https://ovidhan.net/word/sack.html) | 2 | 37.5 | 2 | 37.5 | UNKNOWN |
| treatment | [sink](https://ovidhan.net/word/sink.html) | 2 | 47.5 | 2 | 47.5 | UNKNOWN |
| treatment | [mirth](https://ovidhan.net/word/mirth.html) | 1 | 24.0 | 9 | 22.44 | UNKNOWN |
| treatment | [mutiny](https://ovidhan.net/word/mutiny.html) | 1 | 38.0 | 5 | 37.8 | UNKNOWN |
| treatment | [purge](https://ovidhan.net/word/purge.html) | 1 | 42.0 | 4 | 27.25 | UNKNOWN |
| treatment | [sturdy](https://ovidhan.net/word/sturdy.html) | 1 | 31.0 | 4 | 32.5 | UNKNOWN |
| treatment | [musk](https://ovidhan.net/word/musk.html) | 1 | 34.0 | 3 | 35 | UNKNOWN |
| treatment | [rudimentary](https://ovidhan.net/word/rudimentary.html) | 1 | 32.0 | 3 | 34 | UNKNOWN |
| treatment | [tunnel](https://ovidhan.net/word/tunnel.html) | 1 | 39.0 | 3 | 37.33 | UNKNOWN |
| treatment | [constellation](https://ovidhan.net/word/constellation.html) | 1 | 27.0 | 2 | 32.5 | UNKNOWN |
| treatment | [prologue](https://ovidhan.net/word/prologue.html) | 1 | 31.0 | 2 | 32.5 | UNKNOWN |
| treatment | [quake](https://ovidhan.net/word/quake.html) | 1 | 37.0 | 2 | 33 | UNKNOWN |
| treatment | [spectacular](https://ovidhan.net/word/spectacular.html) | 1 | 30.0 | 2 | 34 | UNKNOWN |
| treatment | [wallet](https://ovidhan.net/word/wallet.html) | 2 | 53.0 | 4 | 46.5 | UNKNOWN |
| treatment | [integrity](https://ovidhan.net/word/integrity.html) | 1 | 48.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [pedestrian](https://ovidhan.net/word/pedestrian.html) | 1 | 25.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [shout](https://ovidhan.net/word/shout.html) | 1 | 49.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [sympathy](https://ovidhan.net/word/sympathy.html) | 1 | 38.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [torch](https://ovidhan.net/word/torch.html) | 1 | 34.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [wagon](https://ovidhan.net/word/wagon.html) | 1 | 36.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [vocabulary](https://ovidhan.net/word/vocabulary.html) | 1 | 52.0 | 2 | 57.5 | UNKNOWN |
| treatment | [nevertheless](https://ovidhan.net/word/nevertheless.html) | 1 | 47.0 | 2 | 54 | UNKNOWN |
| treatment | [spine](https://ovidhan.net/word/spine.html) | 1 | 32.0 | 2 | 34.5 | UNKNOWN |
| treatment | [stab](https://ovidhan.net/word/stab.html) | 1 | 46.0 | 2 | 41 | UNKNOWN |
| treatment | [ultimatum](https://ovidhan.net/word/ultimatum.html) | 1 | 50.0 | 2 | 49 | UNKNOWN |
| treatment | [quantum](https://ovidhan.net/word/quantum.html) | 2 | 68.0 | 6 | 48.17 | UNKNOWN |
| treatment | [moss](https://ovidhan.net/word/moss.html) | 2 | 57.0 | 5 | 48.2 | UNKNOWN |
| treatment | [sneeze](https://ovidhan.net/word/sneeze.html) | 2 | 56.5 | 4 | 52.25 | UNKNOWN |
| treatment | [sad](https://ovidhan.net/word/sad.html) | 1 | 45.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [slant](https://ovidhan.net/word/slant.html) | 1 | 39.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [suppose](https://ovidhan.net/word/suppose.html) | 1 | 36.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [deficit](https://ovidhan.net/word/deficit.html) | 1 | 69.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [telescope](https://ovidhan.net/word/telescope.html) | 1 | 58.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [shy](https://ovidhan.net/word/shy.html) | 1 | 87.0 | 4 | 62.75 | UNKNOWN |
| treatment | [friction](https://ovidhan.net/word/friction.html) | 1 | 51.0 | 2 | 57.5 | UNKNOWN |
| treatment | [reckon](https://ovidhan.net/word/reckon.html) | 1 | 76.0 | 2 | 61.5 | UNKNOWN |
| treatment | [velocity](https://ovidhan.net/word/velocity.html) | 1 | 70.0 | 2 | 44.5 | UNKNOWN |
| treatment | [lash](https://ovidhan.net/word/lash.html) | 1 | 83.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [nest](https://ovidhan.net/word/nest.html) | 1 | 74.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [opportune](https://ovidhan.net/word/opportune.html) | 1 | 57.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [phenomenon](https://ovidhan.net/word/phenomenon.html) | 1 | 55.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [reassure](https://ovidhan.net/word/reassure.html) | 1 | 54.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [recital](https://ovidhan.net/word/recital.html) | 1 | 72.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [wash](https://ovidhan.net/word/wash.html) | 1 | 51.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [wipe](https://ovidhan.net/word/wipe.html) | 1 | 53.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| treatment | [withdrawal](https://ovidhan.net/word/withdrawal.html) | 1 | 82.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [skewed](https://ovidhan.net/word/skewed.html) | 7 | 58.43 | 7 | 58.43 | UNKNOWN |
| control | [outlast](https://ovidhan.net/word/outlast.html) | 5 | 11.0 | 6 | 11.5 | UNKNOWN |
| control | [tire](https://ovidhan.net/word/tire.html) | 1 | 19.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [economical](https://ovidhan.net/word/economical.html) | 1 | 30.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [militant](https://ovidhan.net/word/militant.html) | 1 | 27.0 | 3 | 24.33 | UNKNOWN |
| control | [monumental](https://ovidhan.net/word/monumental.html) | 1 | 26.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [quilt](https://ovidhan.net/word/quilt.html) | 2 | 58.0 | 3 | 53.33 | UNKNOWN |
| control | [on](https://ovidhan.net/word/on.html) | 1 | 74.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [nun](https://ovidhan.net/word/nun.html) | 1 | 33.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [vanish](https://ovidhan.net/word/vanish.html) | 2 | 70.0 | 4 | 66.75 | UNKNOWN |
| control | [swing](https://ovidhan.net/word/swing.html) | 1 | 45.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [terrific](https://ovidhan.net/word/terrific.html) | 1 | 26.0 | 3 | 29.33 | UNKNOWN |
| control | [equable](https://ovidhan.net/word/equable.html) | 1 | 39.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [hallmark](https://ovidhan.net/word/hallmark.html) | 1 | 42.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [quarry](https://ovidhan.net/word/quarry.html) | 1 | 37.0 | 3 | 40.67 | UNKNOWN |
| control | [slobber](https://ovidhan.net/word/slobber.html) | 1 | 23.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [sanguine](https://ovidhan.net/word/sanguine.html) | 2 | 81.5 | 3 | 82.33 | UNKNOWN |
| control | [crunch](https://ovidhan.net/word/crunch.html) | 1 | 78.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [manipulate](https://ovidhan.net/word/manipulate.html) | 1 | 53.0 | 3 | 51 | UNKNOWN |
| control | [mess](https://ovidhan.net/word/mess.html) | 1 | 62.0 | 2 | 50.5 | UNKNOWN |
| control | [sinuous](https://ovidhan.net/word/sinuous.html) | 1 | 9.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [stroke](https://ovidhan.net/word/stroke.html) | 1 | 54.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [stalk](https://ovidhan.net/word/stalk.html) | 2 | 53.0 | 3 | 51 | UNKNOWN |
| control | [mayhem](https://ovidhan.net/word/mayhem.html) | 1 | 11.0 | 15 | 11.6 | UNKNOWN |
| control | [offset](https://ovidhan.net/word/offset.html) | 1 | 92.0 | 2 | 72.5 | UNKNOWN |
| control | [proprietary](https://ovidhan.net/word/proprietary.html) | 1 | 11.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [rant](https://ovidhan.net/word/rant.html) | 1 | 58.0 | 2 | 61.5 | UNKNOWN |
| control | [squash](https://ovidhan.net/word/squash.html) | 1 | 69.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [subside](https://ovidhan.net/word/subside.html) | 1 | 42.0 | 6 | 49.33 | UNKNOWN |
| control | [tear](https://ovidhan.net/word/tear.html) | 1 | 46.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [amt](https://ovidhan.net/word/amt.html) | 1 | 20.0 | 3 | 41 | UNKNOWN |
| control | [chargers](https://ovidhan.net/word/chargers.html) | 1 | 14.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [convicted](https://ovidhan.net/word/convicted.html) | 1 | 31.0 | 2 | 38.5 | UNKNOWN |
| control | [defeated](https://ovidhan.net/word/defeated.html) | 1 | 33.0 | 2 | 33.5 | UNKNOWN |
| control | [dundee](https://ovidhan.net/word/dundee.html) | 1 | 27.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [insurrection](https://ovidhan.net/word/insurrection.html) | 1 | 34.0 | 2 | 39.5 | UNKNOWN |
| control | [latex](https://ovidhan.net/word/latex.html) | 1 | 33.0 | 2 | 35 | UNKNOWN |
| control | [ll](https://ovidhan.net/word/ll.html) | 1 | 36.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [lucifer](https://ovidhan.net/word/lucifer.html) | 1 | 28.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [manhood](https://ovidhan.net/word/manhood.html) | 1 | 35.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [meddling](https://ovidhan.net/word/meddling.html) | 1 | 21.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [mic](https://ovidhan.net/word/mic.html) | 1 | 32.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [mitochondria](https://ovidhan.net/word/mitochondria.html) | 1 | 45.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [ninety](https://ovidhan.net/word/ninety.html) | 1 | 40.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [nutshell](https://ovidhan.net/word/nutshell.html) | 1 | 21.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [offended](https://ovidhan.net/word/offended.html) | 1 | 39.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [opal](https://ovidhan.net/word/opal.html) | 1 | 38.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [oratory](https://ovidhan.net/word/oratory.html) | 1 | 35.0 | 4 | 39.75 | UNKNOWN |
| control | [otp](https://ovidhan.net/word/otp.html) | 1 | 37.0 | 4 | 34.5 | UNKNOWN |
| control | [climber](https://ovidhan.net/word/climber.html) | 1 | 71.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [trite](https://ovidhan.net/word/trite.html) | 2 | 43.0 | 2 | 43 | UNKNOWN |
| control | [amc](https://ovidhan.net/word/amc.html) | 1 | 41.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [aust](https://ovidhan.net/word/aust.html) | 1 | 44.0 | 6 | 57.33 | UNKNOWN |
| control | [bailout](https://ovidhan.net/word/bailout.html) | 1 | 31.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [bidet](https://ovidhan.net/word/bidet.html) | 1 | 50.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [bridesmaid](https://ovidhan.net/word/bridesmaid.html) | 1 | 33.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [carries](https://ovidhan.net/word/carries.html) | 1 | 29.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [excellency](https://ovidhan.net/word/excellency.html) | 1 | 56.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [parked](https://ovidhan.net/word/parked.html) | 1 | 87.0 | 2 | 65.5 | UNKNOWN |
| control | [snug](https://ovidhan.net/word/snug.html) | 1 | 54.0 | 2 | 58.5 | UNKNOWN |
| control | [activated](https://ovidhan.net/word/activated.html) | 1 | 55.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [aladdin](https://ovidhan.net/word/aladdin.html) | 1 | 66.0 | 4 | 39.5 | UNKNOWN |
| control | [calms](https://ovidhan.net/word/calms.html) | 1 | 62.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [demarcation](https://ovidhan.net/word/demarcation.html) | 1 | 71.0 | 5 | 90.6 | UNKNOWN |
| control | [demonstrably](https://ovidhan.net/word/demonstrably.html) | 1 | 60.0 | 10 | 70.4 | UNKNOWN |
| control | [dropout](https://ovidhan.net/word/dropout.html) | 1 | 61.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [electron](https://ovidhan.net/word/electron.html) | 1 | 65.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [expats](https://ovidhan.net/word/expats.html) | 1 | 94.0 | 4 | 65 | UNKNOWN |
| control | [ful](https://ovidhan.net/word/ful.html) | 1 | 54.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [gusting](https://ovidhan.net/word/gusting.html) | 1 | 52.0 | UNKNOWN | UNKNOWN | UNKNOWN |
| control | [landowner](https://ovidhan.net/word/landowner.html) | 1 | 64.0 | 2 | 55.5 | UNKNOWN |
| control | [layers](https://ovidhan.net/word/layers.html) | 1 | 85.0 | UNKNOWN | UNKNOWN | UNKNOWN |

## INFERENCE

The intervention is demonstrably exposed in the returned production HTML: 72 treatments provide an answer and 72 controls do not. No deployment drift was detected on these 144 responses or the three checked shared resources. The live aggregate matching the frozen aggregate is stronger evidence than matching titles alone.

This supports using the preserved cohorts for a later outcome comparison. It does not show that treatment improved Google visibility, and the pre-treatment performance difference cannot be attributed to the intervention. A technically present treatment is not evidence of an SEO win. Nor does missing outcome data establish “no meaningful treatment difference”: the live content difference is real and its Google effect remains unmeasured.

The original design is a bundled static-content/metadata/schema/navigation intervention with weak control matches, not an isolated randomized rendering test. Any eventual positive comparison should be reported as directional and examined for timing, source completeness and sitewide changes.

## UNKNOWN

- Current Google indexing status, indexed/last-crawled dates, indexing reason and Google-selected canonical for each of the 144 URLs.
- Current Bangladesh/Web impressions, clicks, CTR and position, and post-implementation movement relative to the original baseline and controls.
- The actual first production deployment date and uninterrupted treatment exposure since then. The implementation record says NOT DEPLOYED at its historical creation; current live matches establish presence now, not the historical start date.
- Googlebot's actual fetched/rendered HTML, geographically different responses, other CDN cache states and intermittent origin/resource errors. These requests are a single public HTTP observation, not Google URL Inspection or continuous monitoring.
- Whether controls render lexical content after interaction in every browser; browser execution was not part of this HTTP audit. The inspected live script's conditional initialization is known, but no computed-style or user-interaction test is claimed.
- Exact coverage outcomes for URLs missing from the historical sample, and any fresher exports beyond the repository and referenced GSC directory inspected here.

## NEXT DECISION

**GSC OUTCOME DATA REQUIRED**

Keep the frozen 72/72 experiment unchanged. Do not scale, regenerate or implement recovery changes based on this audit. The next decision is data collection and outcome analysis, not production repair: the tested production pages show no drift requiring repair.

Use `reports/ovidhan-seo-r1-experiment-cohorts.csv` as the exact URL join key for:

1. A current URL Inspection/index-coverage export for all 144 URLs: observation timestamp, verdict/indexing state, exclusion reason, last crawl, user canonical and Google-selected canonical. Keep missing/failed inspections explicitly UNKNOWN.
2. Search performance by exact URL and date with **Country = Bangladesh, Search type = Web**, exact start/end dates, clicks, impressions, CTR and average position. Include all pages through a complete export/API pagination; distinguish absent rows from measured zero. Retain separate extensionless aliases if encountered instead of silently combining them.
3. Deployment evidence establishing the treatment's first live date and continuity, then matched pre/post windows and the planned 28/56-day checks. Report per-cohort counts receiving impressions/clicks, totals, CTR from totals, and impression-weighted position with the weak-match limitation. Do not interpret a later export timestamp as a later measurement period.

The CSV was checked against both authoritative manifests and the live inventory: exactly three columns, 144 rows, 72/72 split, 144 unique URLs, no additions or omissions. Frozen verification is required again after report creation; no write-capable generator or deployment command is used.

C. EXPERIMENT INCONCLUSIVE — MORE GSC DATA REQUIRED
