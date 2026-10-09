$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

# Use the bundled runtime when Node.js or pnpm is not on the terminal PATH.
$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodeBin = Join-Path $runtimeRoot 'node\bin'
$pnpmBin = Join-Path $runtimeRoot 'bin\fallback'
if (-not (Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $nodeBin 'node.exe'))) {
    $env:PATH = "$nodeBin;$env:PATH"
}
if (-not (Get-Command pnpm.cmd -ErrorAction SilentlyContinue) -and (Test-Path (Join-Path $pnpmBin 'pnpm.cmd'))) {
    $env:PATH = "$pnpmBin;$env:PATH"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command pnpm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js and pnpm were not found. Install Node.js 22.13 or later and pnpm, then run this script again.'
}
if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules'))) {
    throw 'Dependencies are not installed. Run pnpm install in this directory before launching.'
}
& pnpm.cmd dev
exit $LASTEXITCODE
