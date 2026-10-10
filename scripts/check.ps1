# VeriGold - Codebase and Environment Health Auditor (PowerShell)
# Verifies configuration, linting, and connectivity prerequisites.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  VeriGold - Health and Pre-flight Checker  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Environment configuration
Write-Host "`n[1/4] Checking environment files..." -ForegroundColor Yellow
$BackendEnv = Test-Path "$RepoRoot\backend\.env"
$FrontendEnv = Test-Path "$RepoRoot\frontend\.env.local"

if ($BackendEnv) { Write-Host "  OK: backend/.env exists." -ForegroundColor Green }
else { Write-Host "  WARN: backend/.env missing. (Copy from .env.example)" -ForegroundColor Yellow }

if ($FrontendEnv) { Write-Host "  OK: frontend/.env.local exists." -ForegroundColor Green }
else { Write-Host "  WARN: frontend/.env.local missing. (Copy from .env.example)" -ForegroundColor Yellow }

# 2. Python syntax compilation
Write-Host "`n[2/4] Verifying Python bytecode compilation..." -ForegroundColor Yellow
Push-Location "$RepoRoot\backend"
try {
    python -m compileall app risk_engine -q
    if ($LASTEXITCODE -eq 0) { Write-Host "  OK: Python syntax compiled without errors." -ForegroundColor Green }
    else { Write-Host "  ERROR: Python compilation issues detected." -ForegroundColor Red }
} finally {
    Pop-Location
}

# 3. Frontend linting
Write-Host "`n[3/4] Running ESLint check..." -ForegroundColor Yellow
Push-Location "$RepoRoot\frontend"
try {
    npm run lint
    if ($LASTEXITCODE -eq 0) { Write-Host "  OK: ESLint passed with 0 errors." -ForegroundColor Green }
    else { Write-Host "  ERROR: ESLint reported issues." -ForegroundColor Red }
} finally {
    Pop-Location
}

# 4. Docker Compose config validation
Write-Host "`n[4/4] Validating Docker Compose configuration..." -ForegroundColor Yellow
Push-Location "$RepoRoot"
try {
    docker compose config -q
    if ($LASTEXITCODE -eq 0) { Write-Host "  OK: docker-compose.yml configuration is valid." -ForegroundColor Green }
    else { Write-Host "  WARN: docker compose validation requires running docker service or backend/.env" -ForegroundColor Yellow }
} catch {
    Write-Host "  Docker not installed or not in PATH." -ForegroundColor Gray
} finally {
    Pop-Location
}

Write-Host "`nAudit complete!" -ForegroundColor Cyan
