# Cloudflare production deployment

Production is the Cloudflare Worker `ovidhan`; GitHub Pages is not part of the
deployment path. The source of truth is a clean Git checkout plus
`C:\deploy\ovidhan-worker\wrangler.jsonc`.

## Normal verification build

From `C:\dev\ovidhan2` on a clean branch:

```powershell
.\deploy-production.ps1
```

This recreates `C:\deploy\ovidhan-production`, validates the package, minifies
the runtime dictionary without changing its JSON meaning, and runs Wrangler in
dry-run mode. It does not publish anything.

For an isolated development test, use an output directory whose name begins
with `ovidhan-production` and explicitly allow the dirty worktree:

```powershell
.\deploy-production.ps1 -AllowDirty -OutputPath C:\deploy\ovidhan-production-test
```

## Real deployment

After reviewing the dry run, deploy only with the explicit flag:

```powershell
.\deploy-production.ps1 -Deploy
```

Real deployment requires a clean local `main` branch. `-AllowDirty` cannot be
combined with `-Deploy`; it is strictly for local build testing. The deployment
path does not fetch GitHub or otherwise require GitHub availability.

The script prints the Git SHA, asset and word counts, dictionary hash, and
Worker name before publishing, then checks ovidhan.net and workers.dev. If the
local resolver disagrees with public Cloudflare DNS, smoke tests use
`curl.exe --resolve` with a public Cloudflare IPv4 address while preserving the
ovidhan.net Host header and TLS/SNI. The script never changes system, router, or
Cloudflare DNS.

## Recovery and rollback

Recreate any production package by checking out the desired known-good commit
locally and running the normal command; GitHub availability is not required.
Rollback means checking out the previously approved commit, verifying the dry
run, then running with `-Deploy`. Cloudflare version rollback may also be used
from the Cloudflare dashboard when immediate recovery is required.

Never hand-edit the production package, the Worker configuration, generated
word pages, experiment cohorts, robots behavior, or sitemap membership. Make
source changes in Git, review them, and rebuild the whole package.
