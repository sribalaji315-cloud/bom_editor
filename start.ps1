# Starts the BOM Editor backend (API) and frontend (Vite dev server).
# Usage:  ./start.ps1        from the repository root.
# Press Ctrl+C in each window to stop.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$backend = Join-Path $root 'src\backend\Haworth.BOMeditor.Api'
$frontend = Join-Path $root 'src\frontend'

function Test-PortFree {
    param([int]$Port)
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try { $listener.Start(); $listener.Stop(); return $true } catch { return $false }
}

# A stale API instance may still hold the preferred port; fall back to the next free one.
$apiPort = 5001..5010 | Where-Object { Test-PortFree $_ } | Select-Object -First 1
if (-not $apiPort) { throw 'No free API port available in the range 5001-5010.' }

$apiUrl = "http://localhost:$apiPort"

Write-Host 'Starting BOM Editor...' -ForegroundColor Cyan
if ($apiPort -ne 5001) {
    Write-Host "  Port 5001 is in use - falling back to $apiPort" -ForegroundColor Yellow
}
Write-Host "  API      -> $apiUrl" -ForegroundColor DarkGray
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor DarkGray

# Backend API (new window)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$backend'; `$env:ASPNETCORE_URLS='$apiUrl'; dotnet run --no-launch-profile"
)

# Frontend dev server (new window); VITE_API_TARGET keeps the /api proxy pointed at the chosen port.
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$frontend'; `$env:VITE_API_TARGET='$apiUrl'; if (-not (Test-Path node_modules)) { npm install }; npm run dev"
)

Write-Host 'Both processes launched in separate windows.' -ForegroundColor Green
