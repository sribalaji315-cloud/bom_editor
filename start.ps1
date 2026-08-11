# Starts the BOM Editor backend (API) and frontend (Vite dev server).
# Usage:  ./start.ps1        from the repository root.
# Press Ctrl+C in each window to stop.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$backend = Join-Path $root 'src\backend\Haworth.BOMeditor.Api'
$frontend = Join-Path $root 'src\frontend'

Write-Host 'Starting BOM Editor...' -ForegroundColor Cyan
Write-Host "  API      -> http://localhost:5001" -ForegroundColor DarkGray
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor DarkGray

# Backend API (new window)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$backend'; `$env:ASPNETCORE_URLS='http://localhost:5001'; dotnet run --no-launch-profile"
)

# Frontend dev server (new window)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location '$frontend'; if (-not (Test-Path node_modules)) { npm install }; npm run dev"
)

Write-Host 'Both processes launched in separate windows.' -ForegroundColor Green
