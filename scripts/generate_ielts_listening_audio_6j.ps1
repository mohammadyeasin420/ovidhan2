$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$root = Split-Path -Parent $PSScriptRoot
$pack = Get-Content -LiteralPath (Join-Path $root 'data\ielts-listening-practice-v1.json') -Raw | ConvertFrom-Json
$target = Join-Path $root 'audio\ielts-listening-v1'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($recording in $pack.recordings) {
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.Rate = -1
    $filename = Split-Path -Leaf $recording.audio_path
    $synth.SetOutputToWaveFile((Join-Path $target $filename))
    $synth.Speak($recording.transcript_en)
    $synth.Dispose()
}
Write-Output "Generated $($pack.recordings.Count) governed WAV resources in $target"
