# VeriGold - Automated Environment Setup Script (PowerShell)
# Sets up dependencies for backend, frontend, and smart contract toolchains.

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VeriGold - Local Setup and Initialization " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Repository root: $RepoRoot"

# 1. Environment files configuration
Write-Host "`n[1/4] Checking environment files..." -ForegroundColor Yellow
if (-not (Test-Path "$RepoRoot\backend\.env")) {
    if (Test-Path "$RepoRoot\backend\.env.example") {
        Copy-Item "$RepoRoot\backend\.env.example" "$RepoRoot\backend\.env"
        Write-Host "  -> Created backend/.env from backend/.env.example" -ForegroundColor Green
    }
} else {
    Write-Host "  -> backend/.env exists." -ForegroundColor Gray
}

if (-not (Test-Path "$RepoRoot\frontend\.env.local")) {
    if (Test-Path "$RepoRoot\frontend\.env.example") {
        Copy-Item "$RepoRoot\frontend\.env.example" "$RepoRoot\frontend\.env.local"
        Write-Host "  -> Created frontend/.env.local from frontend/.env.example" -ForegroundColor Green
    }
} else {
    Write-Host "  -> frontend/.env.local exists." -ForegroundColor Gray
}

# 2. Frontend dependencies
Write-Host "`n[2/4] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$RepoRoot\frontend"
try {
    npm install
    Write-Host "  -> Frontend dependencies installed." -ForegroundColor Green
} finally {
    Pop-Location
}

# 3. Backend dependencies
Write-Host "`n[3/4] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location "$RepoRoot\backend"
try {
    python -m pip install -r requirements.txt
    Write-Host "  -> Backend dependencies installed." -ForegroundColor Green
} finally {
    Pop-Location
}

# 4. Chaincode verification
Write-Host "`n[4/4] Checking chaincode vendor module..." -ForegroundColor Yellow
if (Test-Path "$RepoRoot\chaincode\verigold\vendor") {
    Write-Host "  -> Chaincode vendor directory is available." -ForegroundColor Green
} else {
    Write-Host "  -> Note: Run 'go mod vendor' inside chaincode/verigold if needed." -ForegroundColor Gray
}

Write-Host "`nSetup complete! Run '.\scripts\test.ps1' to verify tests." -ForegroundColor Cyan
