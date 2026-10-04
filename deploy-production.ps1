[CmdletBinding()]
param(
    [switch]$Deploy,
    [switch]$AllowDirty,
    [string]$OutputPath = 'C:\deploy\ovidhan-production'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = $PSScriptRoot
$workerDirectory = 'C:\deploy\ovidhan-worker'
$workerConfig = Join-Path $workerDirectory 'wrangler.jsonc'
$workerName = 'ovidhan'
$maximumAssetCount = 100000
$maximumAssetBytes = 25MB
$expectedWordCount = 49698
$expectedUnicodeWordCount = 114
$requiredDirectories = @(
    'audio', 'bcs', 'content', 'data', 'grammar', 'graph_data', 'listening',
    'listening-exams', 'mock-tests', 'real-life-english', 'speaking',
    'templates', 'tools', 'word'
)
$excludedDirectories = @(
    '.github', 'backups', 'git_backup', 'reports', 'scripts', 'seo_suite',
    'tests', 'question-bank-src'
)
$excludedDataFiles = @(
    'data\seo-word-pilot-7a1-source.json',
    'data\seo-word-pilot-7a1.json'
)
$runtimeRootExtensions = @('.html', '.htm', '.js', '.css', '.json', '.xml', '.gz')
$requiredSpecialFiles = @('robots.txt', 'sitemap.xml', '_headers', '_redirects')
$pilotTreatment = @(
    'businesses', 'casual', 'dancing', 'degrees', 'exercise', 'gene', 'model',
    'nation', 'pub', 'result', 'tests', 'dress', 'merchants', 'offers', 'popular',
    'rules', 'studies', 'cartridge', 'mass', 'notebooks', 'packaging'
)
$pilotControls = @(
    'textbooks', 'cheap', 'constitution', 'doctor', 'evil', 'increase', 'internet',
    'posters', 'request', 'terminal', 'buildings', 'comparison', 'forecast',
    'objects', 'process', 'psychology', 'sufficient', 'typical', 'interviews',
    'name', 'proposal'
)

function Write-Stage([string]$Name) {
    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
}

function Invoke-Checked {
    param([string]$FilePath, [string[]]$ArgumentList, [string]$FailureMessage)
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (exit code $LASTEXITCODE)"
    }
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-CollectionSize {
    param([AllowNull()][object]$Value)
    $size = 0
    foreach ($item in $Value) { $size += 1 }
    return $size
}

function Assert-SafeOutputPath([string]$Path) {
    $resolved = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
    $deployRoot = [System.IO.Path]::GetFullPath('C:\deploy').TrimEnd('\')
    if (-not $resolved.StartsWith("$deployRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "OutputPath must be a child of C:\deploy: $resolved"
    }
    if ([System.IO.Path]::GetFileName($resolved) -notlike 'ovidhan-production*') {
        throw "OutputPath leaf must begin with 'ovidhan-production': $resolved"
    }
    if ($resolved -eq $deployRoot -or $resolved -eq [System.IO.Path]::GetFullPath($sourceRoot).TrimEnd('\')) {
        throw "Unsafe OutputPath refused: $resolved"
    }
    return $resolved
}

function Copy-DirectoryWithRobocopy([string]$Source, [string]$Destination, [string[]]$ExcludedFiles = @()) {
    $arguments = @($Source, $Destination, '/E', '/COPY:DAT', '/DCOPY:DAT', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP')
    $excludedFileCount = Get-CollectionSize $ExcludedFiles
    if ($excludedFileCount -gt 0) {
        $arguments += '/XF'
        $arguments += @($ExcludedFiles)
    }
    & robocopy @arguments
    if ($LASTEXITCODE -gt 7) {
        throw "Robocopy failed for $Source (exit code $LASTEXITCODE)"
    }
}

function Get-RelativePath([string]$Base, [string]$Path) {
    return [System.IO.Path]::GetRelativePath($Base, $Path).Replace('\', '/')
}

function Invoke-OvidhanSmokeRequest {
    param(
        [Parameter(Mandatory)][string]$Url,
        [string]$ResolveAddress
    )
    $bodyFile = New-TemporaryFile
    try {
        $arguments = @('--silent', '--show-error', '--location', '--max-time', '30', '--output', $bodyFile.FullName, '--write-out', "%{http_code}`n%header{x-robots-tag}")
        if ($ResolveAddress) {
            $arguments += @('--resolve', "ovidhan.net:443:$ResolveAddress")
        }
        $arguments += $Url
        $result = @(& curl.exe @arguments)
        if ($LASTEXITCODE -ne 0) { throw "Live smoke request failed (curl exit $LASTEXITCODE): $Url" }
        $statusCode = [int]$result[0]
        $xRobotsTag = if ((Get-CollectionSize $result) -gt 1) { [string]$result[1] } else { '' }
        return [pscustomobject]@{
            Url = $Url
            StatusCode = $statusCode
            XRobotsTag = $xRobotsTag
            Body = Get-Content -LiteralPath $bodyFile.FullName -Raw
        }
    } finally {
        Remove-Item -LiteralPath $bodyFile.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Stage 'PREFLIGHT'
$outputFull = Assert-SafeOutputPath $OutputPath
Push-Location $sourceRoot
try {
    $branch = (& git branch --show-current).Trim()
    $gitSha = (& git rev-parse HEAD).Trim()
    $gitStatus = @(& git status --porcelain=v1 --untracked-files=all)
    if (-not $branch) { throw 'Detached HEAD is not allowed for production builds.' }
    if ($Deploy -and $AllowDirty) { throw '-AllowDirty is for local build/test work only and cannot be combined with -Deploy.' }
    if ($Deploy -and $branch -ne 'main') { throw "Production deployment requires local branch 'main'; current branch is '$branch'." }
    if ((Get-CollectionSize $gitStatus) -gt 0 -and -not $AllowDirty) {
        throw "Working tree is not clean. Commit/stash changes or use -AllowDirty for local development verification only."
    }
    foreach ($directory in $requiredDirectories) {
        if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $directory) -PathType Container)) {
            throw "Required source directory is missing: $directory"
        }
    }
    foreach ($file in @('enriched-dictionary.json', 'robots.txt', 'sitemap.xml', 'scripts\minify-production-dictionary.js')) {
        if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $file) -PathType Leaf)) {
            throw "Required source file is missing: $file"
        }
    }
    if (-not (Test-Path -LiteralPath $workerConfig -PathType Leaf)) {
        throw "Cloudflare Worker config is missing: $workerConfig"
    }
    $configText = Get-Content -LiteralPath $workerConfig -Raw
    if ($configText -notmatch '"name"\s*:\s*"ovidhan"') { throw "Worker config does not name '$workerName'." }
    if ($configText -notmatch '"html_handling"\s*:\s*"none"') { throw 'Worker config must keep html_handling set to none.' }
    if ($configText -notmatch '"not_found_handling"\s*:\s*"none"') { throw 'Worker config must keep not_found_handling set to none.' }
    $npx = Get-Command npx -ErrorAction Stop
    $node = Get-Command node -ErrorAction Stop
    if ($Deploy) { [void](Get-Command curl.exe -ErrorAction Stop) }
    Write-Host "BRANCH: $branch"
    Write-Host "GIT SHA: $gitSha"
    Write-Host "WORKTREE: $(if ((Get-CollectionSize $gitStatus) -eq 0) { 'CLEAN' } else { 'DIRTY (explicitly allowed)' })"
    Write-Host "WRANGLER LAUNCHER: $($npx.Source)"

    Write-Stage 'CLEAN PRODUCTION BUILD'
    if (Test-Path -LiteralPath $outputFull) {
        Remove-Item -LiteralPath $outputFull -Recurse -Force
    }
    New-Item -ItemType Directory -Path $outputFull | Out-Null

    foreach ($directory in $requiredDirectories) {
        $sourceDirectory = Join-Path $sourceRoot $directory
        $destinationDirectory = Join-Path $outputFull $directory
        $excludedNames = if ($directory -eq 'data') { @('seo-word-pilot-7a1-source.json', 'seo-word-pilot-7a1.json') } else { @() }
        Copy-DirectoryWithRobocopy $sourceDirectory $destinationDirectory $excludedNames
    }

    Get-ChildItem -LiteralPath $sourceRoot -File | Where-Object {
        $runtimeRootExtensions -contains $_.Extension.ToLowerInvariant()
    } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $outputFull $_.Name)
    }
    Copy-Item -LiteralPath (Join-Path $sourceRoot 'robots.txt') -Destination (Join-Path $outputFull 'robots.txt')

    # Cloudflare control files are versioned source inputs, so rebuilding does not
    # depend on a previously maintained production directory.
    foreach ($special in @('_headers', '_redirects')) {
        $specialSource = Join-Path $sourceRoot $special
        if (-not (Test-Path -LiteralPath $specialSource -PathType Leaf)) { throw "Required source file is missing: $special" }
        Copy-Item -LiteralPath $specialSource -Destination (Join-Path $outputFull $special)
    }

    Write-Stage 'EXTENSIONLESS REDIRECT VALIDATION'
    $redirectVerifier = Join-Path $sourceRoot 'scripts\verify-extensionless-word-redirects.js'
    Invoke-Checked $node.Source @($redirectVerifier, '--package', $outputFull) 'Extensionless redirect validation failed'

    Write-Stage 'MINIFY ENRICHED DICTIONARY'
    $sourceDictionary = Join-Path $sourceRoot 'enriched-dictionary.json'
    $outputDictionary = Join-Path $outputFull 'enriched-dictionary.json'
    $dictionaryTool = Join-Path $sourceRoot 'scripts\minify-production-dictionary.js'
    Invoke-Checked $node.Source @($dictionaryTool, $sourceDictionary, $outputDictionary) 'Dictionary minification or semantic verification failed'
    $dictionaryHash = Get-Sha256 $outputDictionary

    Write-Stage 'WORD AND SEO VALIDATION'
    $trackedWordFiles = @(& git -c core.quotepath=false ls-files -- 'word/*.html')
    $trackedWordCount = Get-CollectionSize $trackedWordFiles
    $outputWordFiles = @(Get-ChildItem -LiteralPath (Join-Path $outputFull 'word') -File -Filter '*.html')
    $wordCount = Get-CollectionSize $outputWordFiles
    $unicodeWordFiles = @($outputWordFiles | Where-Object { $_.BaseName -match '[^\x00-\x7F]' })
    $sourceNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    Get-ChildItem -LiteralPath (Join-Path $sourceRoot 'word') -File -Filter '*.html' | ForEach-Object { [void]$sourceNames.Add($_.Name) }
    $outputNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $outputWordFiles | ForEach-Object { [void]$outputNames.Add($_.Name) }
    $missingWords = @($sourceNames | Where-Object { -not $outputNames.Contains($_) })
    $extraWords = @($outputNames | Where-Object { -not $sourceNames.Contains($_) })
    if ($trackedWordCount -ne $expectedWordCount) { throw "Git-tracked word count is $trackedWordCount; expected $expectedWordCount." }
    if ($wordCount -ne $expectedWordCount) { throw "Production word count is $wordCount; expected $expectedWordCount." }
    $unicodeWordCount = Get-CollectionSize $unicodeWordFiles
    $missingWordCount = Get-CollectionSize $missingWords
    $extraWordCount = Get-CollectionSize $extraWords
    if ($unicodeWordCount -ne $expectedUnicodeWordCount) { throw "Unicode word count is $unicodeWordCount; expected $expectedUnicodeWordCount." }
    if ($missingWordCount -gt 0 -or $extraWordCount -gt 0) { throw "Production/source word mismatch: $missingWordCount missing, $extraWordCount extra." }

    foreach ($word in @($pilotTreatment + $pilotControls)) {
        if (-not (Test-Path -LiteralPath (Join-Path $outputFull "word\$word.html") -PathType Leaf)) {
            throw "Phase 7A1 page is missing: $word"
        }
    }
    $pilotManifest = Get-Content -LiteralPath (Join-Path $sourceRoot 'data\seo-word-pilot-7a1.json') -Raw | ConvertFrom-Json
    $manifestTreatment = @($pilotManifest.entries | Where-Object { $_.group -eq 'treatment' } | ForEach-Object { $_.word })
    $manifestControls = @($pilotManifest.entries | Where-Object { $_.group -eq 'control' } | ForEach-Object { $_.word })
    if (($manifestTreatment -join "`n") -ne ($pilotTreatment -join "`n")) { throw 'Phase 7A1 treatment membership/order changed.' }
    if (($manifestControls -join "`n") -ne ($pilotControls -join "`n")) { throw 'Phase 7A1 control membership/order changed.' }
    foreach ($word in $pilotControls) {
        $sourceControl = Join-Path $sourceRoot "word\$word.html"
        $outputControl = Join-Path $outputFull "word\$word.html"
        if ((Get-Sha256 $sourceControl) -ne (Get-Sha256 $outputControl)) {
            throw "Phase 7A1 control was not copied byte-for-byte: $word"
        }
    }

    Write-Stage 'CLOUDFLARE AND LEAK VALIDATION'
    foreach ($special in $requiredSpecialFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $outputFull $special) -PathType Leaf)) {
            throw "Required production special file is missing: $special"
        }
    }
    foreach ($directory in $excludedDirectories) {
        if (Test-Path -LiteralPath (Join-Path $outputFull $directory)) { throw "Internal directory leaked: $directory" }
    }
    foreach ($file in $excludedDataFiles) {
        if (Test-Path -LiteralPath (Join-Path $outputFull $file)) { throw "Internal audit file leaked: $file" }
    }
    $allAssets = @(Get-ChildItem -LiteralPath $outputFull -File -Recurse)
    $assetCount = Get-CollectionSize $allAssets
    if ($assetCount -gt $maximumAssetCount) { throw "Asset count $assetCount exceeds paid Workers limit $maximumAssetCount." }
    $oversized = @($allAssets | Where-Object { $_.Length -gt $maximumAssetBytes })
    if ((Get-CollectionSize $oversized) -gt 0) {
        throw "Asset exceeds Cloudflare's 25 MiB limit: $(Get-RelativePath $outputFull $oversized[0].FullName)"
    }
    $leakedRootDevelopment = @($allAssets | Where-Object {
        $_.DirectoryName -eq $outputFull -and $_.Extension.ToLowerInvariant() -in @('.py', '.csv', '.bat', '.md')
    })
    if ((Get-CollectionSize $leakedRootDevelopment) -gt 0) { throw "Root development file leaked: $($leakedRootDevelopment[0].Name)" }

    Write-Stage 'WRANGLER DRY RUN'
    $wranglerVersionText = (& $npx.Source wrangler --version 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Wrangler is unavailable through npx.' }
    $versionMatch = [regex]::Match($wranglerVersionText, '(\d+)\.(\d+)\.(\d+)')
    if (-not $versionMatch.Success) { throw "Unable to parse Wrangler version: $wranglerVersionText" }
    $wranglerVersion = [version]$versionMatch.Value
    if ($wranglerVersion -lt [version]'4.34.0') { throw "Wrangler $wranglerVersion is too old for the 100,000-asset limit." }
    $wranglerArgs = @('wrangler', 'deploy', '--config', $workerConfig, '--assets', $outputFull, '--dry-run')
    Invoke-Checked $npx.Source $wranglerArgs 'Wrangler dry run failed'

    $deploymentStatus = 'NOT RUN'
    if ($Deploy) {
        Write-Stage 'EXPLICIT PRODUCTION DEPLOYMENT'
        Write-Host "PRODUCTION PACKAGE COUNT: $assetCount"
        Write-Host "GIT SHA: $gitSha"
        Write-Host "WORD COUNT: $wordCount"
        Write-Host "DICTIONARY HASH: $dictionaryHash"
        Write-Host "WORKER: $workerName"
        $deployOutput = @(& $npx.Source wrangler deploy --config $workerConfig --assets $outputFull 2>&1)
        $deployOutput | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -ne 0) { throw "Cloudflare deployment failed (exit code $LASTEXITCODE)" }
        $versionIdMatch = [regex]::Match(($deployOutput -join "`n"), 'Version ID:\s*([a-f0-9-]+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        $versionId = if ($versionIdMatch.Success) { $versionIdMatch.Groups[1].Value } else { 'not reported by Wrangler' }

        Write-Stage 'POST-DEPLOY SMOKE TESTS'
        $localAddresses = @(Resolve-DnsName -Name 'ovidhan.net' -Type A -ErrorAction Stop | Where-Object IPAddress | ForEach-Object IPAddress | Sort-Object -Unique)
        $publicDns = Invoke-RestMethod -Uri 'https://cloudflare-dns.com/dns-query?name=ovidhan.net&type=A' -Headers @{ Accept = 'application/dns-json' } -TimeoutSec 30
        $answerProperty = $publicDns.PSObject.Properties['Answer']
        $dnsAnswers = if ($null -eq $answerProperty) { @() } else { @($answerProperty.Value) }
        $publicAddresses = @($dnsAnswers | Where-Object type -eq 1 | ForEach-Object data | Sort-Object -Unique)
        if ((Get-CollectionSize $publicAddresses) -eq 0) { throw 'Public Cloudflare DNS returned no A records for ovidhan.net.' }
        $dnsMismatch = ($localAddresses -join "`n") -ne ($publicAddresses -join "`n")
        $smokeResolveAddress = if ($dnsMismatch) { $publicAddresses[0] } else { $null }
        Write-Host "PUBLIC CLOUDFLARE DNS: $($publicAddresses -join ', ')"
        Write-Host "LOCAL RESOLVER DNS: $($localAddresses -join ', ')"
        Write-Host "DNS VIEW: $(if ($dnsMismatch) { 'MISMATCH — stale local resolver suspected' } else { 'MATCH' })"
        if ($smokeResolveAddress) {
            Write-Host "SMOKE ROUTE: curl.exe --resolve ovidhan.net:443:$smokeResolveAddress (Host and TLS/SNI remain ovidhan.net)"
        }
        $smokePaths = @(
            '/',
            '/word/businesses.html',
            '/word/textbooks.html',
            '/word/ability.html',
            '/robots.txt',
            '/sitemap.xml'
        )
        $smokeResponses = @{}
        foreach ($path in $smokePaths) {
            $url = "https://ovidhan.net$path"
            $response = Invoke-OvidhanSmokeRequest -Url $url -ResolveAddress $smokeResolveAddress
            if ($response.StatusCode -ne 200) { throw "Live smoke test failed ($($response.StatusCode)): $url" }
            if ($response.XRobotsTag -match '(?i)noindex') { throw "Production hostname must not receive X-Robots-Tag noindex: $url" }
            $smokeResponses[$path] = $response
        }
        if ($smokeResponses['/word/businesses.html'].Body -notmatch 'id=["'']staticWordContent["'']') { throw 'Treatment smoke test lacks staticWordContent: businesses' }
        if ($smokeResponses['/word/businesses.html'].Body -notmatch '(?i)<h1[^>]*>\s*businesses meaning in Bangla\s*</h1>') { throw 'Treatment smoke test lacks expected static H1: businesses' }
        if ($smokeResponses['/word/textbooks.html'].Body -match 'id=["'']staticWordContent["'']') { throw 'Control smoke test unexpectedly contains staticWordContent: textbooks' }
        $workersDev = Invoke-WebRequest -Uri 'https://ovidhan.yeasinarafat0.workers.dev/' -Method Get -TimeoutSec 30 -MaximumRedirection 5 -UseBasicParsing
        $xRobots = [string]$workersDev.Headers['X-Robots-Tag']
        if ($xRobots -notmatch 'noindex' -or $xRobots -notmatch 'nofollow' -or $xRobots -notmatch 'noarchive') {
            throw "workers.dev X-Robots-Tag is unsafe: '$xRobots'"
        }
        $deploymentStatus = 'PASS'
        Write-Host "VERSION ID: $versionId"
    }

    Write-Stage 'RESULT'
    Write-Host 'BUILD: PASS'
    Write-Host "ASSET COUNT: PASS ($assetCount / $maximumAssetCount)"
    Write-Host "WORD COUNT: PASS ($wordCount)"
    Write-Host "UNICODE RECONCILIATION: PASS ($unicodeWordCount; Git-tracked, generated 0, missing 0, extra 0)"
    Write-Host "DICTIONARY: PASS ($dictionaryHash)"
    Write-Host 'INTERNAL FILE LEAK: PASS'
    Write-Host 'FILE SIZE: PASS'
    Write-Host "WRANGLER DRY RUN: PASS ($wranglerVersion)"
    Write-Host "DEPLOYMENT: $deploymentStatus"
} finally {
    Pop-Location
}
