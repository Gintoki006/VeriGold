# VeriGold - Test Runner Script (PowerShell)
# Runs the complete test suite: backend pytest, chaincode go test, frontend build.

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VeriGold - Automated Test Suite Runner " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$FailedTests = 0

# 1. Backend tests (pytest)
Write-Host "`n[1/3] Running backend unit and integration tests..." -ForegroundColor Yellow
Push-Location "$RepoRoot\backend"
try {
    python -m pytest
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: Backend tests encountered errors." -ForegroundColor Red
        $FailedTests++
    } else {
        Write-Host "  PASSED: Backend tests completed successfully." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

# 2. Chaincode tests (go test)
Write-Host "`n[2/3] Running chaincode smart contract unit tests..." -ForegroundColor Yellow
Push-Location "$RepoRoot\chaincode\verigold"
try {
    if (Test-Path "$RepoRoot\chaincode\verigold\vendor") {
        go test -mod=vendor ./...
    } else {
        go test ./...
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: Chaincode tests encountered errors." -ForegroundColor Red
        $FailedTests++
    } else {
        Write-Host "  PASSED: Chaincode tests completed successfully." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

# 3. Frontend production build validation
Write-Host "`n[3/3] Running frontend production build check..." -ForegroundColor Yellow
Push-Location "$RepoRoot\frontend"
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: Frontend build failed." -ForegroundColor Red
        $FailedTests++
    } else {
        Write-Host "  PASSED: Frontend build succeeded." -ForegroundColor Green
    }
} finally {
    Pop-Location
}

Write-Host "`n==========================================" -ForegroundColor Cyan
if ($FailedTests -eq 0) {
    Write-Host "  ALL TEST SUITES PASSED! [100% OK]       " -ForegroundColor Green
} else {
    Write-Host "  TEST SUITE COMPLETED WITH $FailedTests FAILURES " -ForegroundColor Red
}
Write-Host "==========================================" -ForegroundColor Cyan
exit $FailedTests
