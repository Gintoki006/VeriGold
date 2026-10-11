# VeriGold - Mobile Development Launcher (PowerShell)
# Launches the Flutter mobile client alongside the backend and web portal.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$MobileDir = Join-Path $RepoRoot "mobile"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VeriGold - Mobile App Launcher (Flutter) " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Target: $MobileDir" -ForegroundColor Green

Set-Location $MobileDir
flutter run
