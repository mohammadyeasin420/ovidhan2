$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$root = Split-Path -Parent $PSScriptRoot
$pack = Get-Content -LiteralPath (Join-Path $root 'data\ielts-listening-practice-v1.json') -Raw | ConvertFrom-Json
$review = Get-Content -LiteralPath (Join-Path $root 'data\ielts-listening-review-v1.json') -Raw | ConvertFrom-Json
$target = Join-Path $root 'audio\ielts-listening-v1'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($recording in $pack.recordings) {
    $reviewRecording = $review.recordings | Where-Object recording_id -eq $recording.recording_id
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.Rate = -1
    $filename = Split-Path -Leaf $recording.audio_path
    $synth.SetOutputToWaveFile((Join-Path $target $filename))
    if ($recording.recording_type -eq 'CONVERSATION') {
        $voices = @('Microsoft Hazel Desktop', 'Microsoft Zira Desktop')
        $segments = [regex]::Matches($reviewRecording.transcript_en, '(?:^|\s)([A-Za-z ]+):\s*([^:]+?)(?=\s[A-Za-z ]+:|$)')
        for ($index = 0; $index -lt $segments.Count; $index++) {
            $synth.SelectVoice($voices[$index % 2])
            $spokenText = $segments[$index].Groups[2].Value.Trim()
            if ($spokenText) { $synth.Speak($spokenText) }
        }
    } else {
        $spokenText = $reviewRecording.transcript_en -replace '^[^:]+:\s*', ''
        $synth.Speak($spokenText)
    }
    $synth.Dispose()
}
Write-Output "Generated $($pack.recordings.Count) governed WAV resources in $target"
