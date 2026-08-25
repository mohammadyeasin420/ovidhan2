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

The script prints the Git SHA, asset and word counts, dictionary hash, and
Worker name before publishing, then checks ovidhan.net and workers.dev. It does
not change DNS. A stale local DNS answer must be investigated separately using
authoritative/public DNS; never work around it by changing system or router DNS
from this script.

## Recovery and rollback

Recreate any production package by checking out the desired known-good commit
locally and running the normal command; GitHub availability is not required.
Rollback means checking out the previously approved commit, verifying the dry
run, then running with `-Deploy`. Cloudflare version rollback may also be used
from the Cloudflare dashboard when immediate recovery is required.

Never hand-edit the production package, the Worker configuration, generated
word pages, experiment cohorts, robots behavior, or sitemap membership. Make
source changes in Git, review them, and rebuild the whole package.
