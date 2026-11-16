# Installation NPM - Script Corrigé
# Date: 16 novembre 2026

Write-Host "=== INSTALLATION NPM ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# 1. Nettoyer cache npm
Write-Host "[1/5] Nettoyage cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "  ✓ Cache nettoyé" -ForegroundColor Green
Write-Host ""

# 2. Supprimer node_modules si existe
if (Test-Path "node_modules") {
    Write-Host "[2/5] Suppression node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ node_modules supprimé" -ForegroundColor Green
} else {
    Write-Host "[2/5] node_modules n'existe pas (OK)" -ForegroundColor Green
}
Write-Host ""

# 3. Supprimer package-lock.json
if (Test-Path "package-lock.json") {
    Write-Host "[3/5] Suppression package-lock.json..." -ForegroundColor Yellow
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ package-lock.json supprimé" -ForegroundColor Green
} else {
    Write-Host "[3/5] package-lock.json n'existe pas (OK)" -ForegroundColor Green
}
Write-Host ""

# 4. Vérifier package.json
Write-Host "[4/5] Vérification package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "  ✓ package.json existe" -ForegroundColor Green
} else {
    Write-Host "  ✗ package.json MANQUANT!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Installation npm
Write-Host "[5/5] Installation npm (20-30 minutes)..." -ForegroundColor Yellow
Write-Host "  Logs sauvegardés dans: npm-install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log" -ForegroundColor Cyan
Write-Host ""

$logFile = "npm-install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$startTime = Get-Date

Write-Host "Installation démarrée à: $($startTime.ToString('HH:mm:ss'))" -ForegroundColor Cyan
Write-Host ""

# Lancer npm install
npm install --legacy-peer-deps --loglevel=info *> $logFile

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "Installation terminée à: $($endTime.ToString('HH:mm:ss'))" -ForegroundColor Cyan
Write-Host "Durée: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Cyan
Write-Host ""

# Vérifications
Write-Host "=== VÉRIFICATIONS ===" -ForegroundColor Yellow
Write-Host ""

$nodeModulesExists = Test-Path "node_modules"
$binExists = Test-Path "node_modules\.bin"
$electronExists = Test-Path "node_modules\.bin\electron.cmd"
$packageCount = if ($nodeModulesExists) { (Get-ChildItem node_modules -Directory -ErrorAction SilentlyContinue).Count } else { 0 }

Write-Host "node_modules: $(if($nodeModulesExists){'✓ Existe'}else{'✗ Manquant'})" -ForegroundColor $(if($nodeModulesExists){'Green'}else{'Red'})
Write-Host ".bin: $(if($binExists){'✓ Existe'}else{'✗ Manquant'})" -ForegroundColor $(if($binExists){'Green'}else{'Red'})
Write-Host "electron.cmd: $(if($electronExists){'✓ Existe'}else{'✗ Manquant'})" -ForegroundColor $(if($electronExists){'Green'}else{'Red'})
Write-Host "Packages installés: $packageCount" -ForegroundColor $(if($packageCount -gt 2000){'Green'}elseif($packageCount -gt 1000){'Yellow'}else{'Red'})
Write-Host ""

if ($electronExists -and $packageCount -gt 2000) {
    Write-Host "=== SUCCÈS! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "L'application peut maintenant être lancée avec:" -ForegroundColor Green
    Write-Host "  npm run start" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Credentials admin:" -ForegroundColor Yellow
    Write-Host "  Email: ohada.save@gmail.com" -ForegroundColor White
    Write-Host "  Password: LEADER00" -ForegroundColor White
} else {
    Write-Host "=== PROBLÈME DÉTECTÉ ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "L'installation semble incomplète." -ForegroundColor Red
    Write-Host "Consultez le fichier: $logFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Solutions alternatives:" -ForegroundColor Cyan
    Write-Host "  1. Installer Node.js 20 LTS: nvm install 20 && nvm use 20" -ForegroundColor White
    Write-Host "  2. Essayer avec Yarn: yarn install" -ForegroundColor White
    Write-Host "  3. Consulter: SITUATION_ACTUELLE_ET_OPTIONS.md" -ForegroundColor White
}

Write-Host ""
