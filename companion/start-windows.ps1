# Keep Ubuntu alive while the companion runs; WSL can stop background containers when idle.
param([string]$Distribution = 'Ubuntu')
$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot 'config.local.json'
if (!(Test-Path -LiteralPath $configPath)) { throw 'Run node setup.js YOUR_EXTENSION_ID first.' }
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$env:EXPERTSEAL_CONFIG = $configPath
$keepAlive = $null
try {
    if ($config.searxng -eq 'http://127.0.0.1:8080/') {
        $keepAlive = Start-Process -FilePath 'wsl.exe' -ArgumentList @('--distribution', $Distribution, '--user', 'root', '--exec', 'sleep', 'infinity') -WindowStyle Hidden -PassThru
        & wsl.exe --distribution $Distribution --user root -- sh -c 'service docker start >/dev/null && docker start expertseal-searxng >/dev/null'
        if ($LASTEXITCODE -ne 0) { throw 'SearXNG startup failed. Complete searxng/setup-wsl.sh first.' }
    }
    & node (Join-Path $PSScriptRoot 'server.js')
    if ($LASTEXITCODE -ne 0) { throw 'Companion stopped with an error. Check configuration and port 3210.' }
} finally {
    if ($keepAlive -and !$keepAlive.HasExited) { Stop-Process -Id $keepAlive.Id -ErrorAction SilentlyContinue }
}
