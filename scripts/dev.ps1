# VeriGold — Local Development Starter (PowerShell)
# Starts backend and frontend development servers.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VeriGold — Development Server Launcher  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting Backend on http://localhost:8000" -ForegroundColor Green
Write-Host "Starting Frontend on http://localhost:3000" -ForegroundColor Green

# Launch Backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\backend'; python -m uvicorn app.main:app --reload --port 8000"

# Launch Frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\frontend'; npm run dev"

Write-Host "`nDevelopment instances launched in separate windows." -ForegroundColor Cyan
Write-Host "Press Ctrl+C in either window to terminate." -ForegroundColor Gray
