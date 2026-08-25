Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$deploymentScript = Join-Path $repositoryRoot 'deploy-production.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($deploymentScript, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors) { throw "Deployment script parse failure: $($parseErrors[0].Message)" }
foreach ($functionName in @('Get-CollectionSize', 'Copy-DirectoryWithRobocopy')) {
    $functionAst = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $functionName }, $true))[0]
    if ($null -eq $functionAst) { throw "$functionName was not found." }
    . ([scriptblock]::Create($functionAst.Extent.Text))
}

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ovidhan-ps51-compat-" + [guid]::NewGuid().ToString('N'))
$resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\')
$resolvedTest = [System.IO.Path]::GetFullPath($testRoot).TrimEnd('\')
if (-not $resolvedTest.StartsWith("$resolvedTemp\", [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe test path: $resolvedTest" }

try {
    $source = Join-Path $testRoot 'source'
    New-Item -ItemType Directory -Path $source | Out-Null
    [System.IO.File]::WriteAllText((Join-Path $source 'keep.txt'), 'keep')
    [System.IO.File]::WriteAllText((Join-Path $source 'exclude-one.txt'), 'one')
    [System.IO.File]::WriteAllText((Join-Path $source 'exclude-two.txt'), 'two')

    $cases = @(
        [pscustomobject]@{ Name = 'empty'; Excluded = $null; Expected = @('keep.txt', 'exclude-one.txt', 'exclude-two.txt') },
        [pscustomobject]@{ Name = 'one'; Excluded = @('exclude-one.txt'); Expected = @('keep.txt', 'exclude-two.txt') },
        [pscustomobject]@{ Name = 'two'; Excluded = @('exclude-one.txt', 'exclude-two.txt'); Expected = @('keep.txt') }
    )
    foreach ($case in $cases) {
        $destination = Join-Path $testRoot $case.Name
        Copy-DirectoryWithRobocopy $source $destination $case.Excluded
        $actual = @(Get-ChildItem -LiteralPath $destination -File | ForEach-Object Name | Sort-Object)
        $expected = @($case.Expected | Sort-Object)
        if (($actual -join "`n") -ne ($expected -join "`n")) { throw "Exclusion case '$($case.Name)' failed: $($actual -join ', ')" }
        Write-Output "EXCLUDED FILES $($case.Name.ToUpperInvariant()): PASS"
    }
    Write-Output "POWERSHELL $($PSVersionTable.PSVersion) STRICTMODE COMPATIBILITY: PASS"
} finally {
    if (Test-Path -LiteralPath $resolvedTest) { Remove-Item -LiteralPath $resolvedTest -Recurse -Force }
}
