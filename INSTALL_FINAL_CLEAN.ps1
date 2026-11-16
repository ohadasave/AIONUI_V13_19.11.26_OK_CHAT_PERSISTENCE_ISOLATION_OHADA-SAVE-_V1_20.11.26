# Installation NPM Finale - Clean Complete
# Résout le problème "Invalid Version" avec @asamuzakjp/dom-selector

Write-Host "=== INSTALLATION NPM FINALE - CLEAN ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# 1. Nettoyer cache npm COMPLETEMENT
Write-Host "[1/6] Nettoyage cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Remove-Item -Path "C:\temp\npm-cache-aionui" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  ✓ Cache nettoyé" -ForegroundColor Green

# 2. Supprimer node_modules si existe
if (Test-Path "node_modules") {
    Write-Host "[2/6] Suppression node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ node_modules supprimé" -ForegroundColor Green
} else {
    Write-Host "[2/6] node_modules n'existe pas (OK)" -ForegroundColor Green
}

# 3. Supprimer package-lock.json
if (Test-Path "package-lock.json") {
    Write-Host "[3/6] Suppression package-lock.json..." -ForegroundColor Yellow
    Remove-Item "package-lock.json" -Force
    Write-Host "  ✓ package-lock.json supprimé" -ForegroundColor Green
} else {
    Write-Host "[3/6] package-lock.json n'existe pas (OK)" -ForegroundColor Green
}

# 4. Vérifier package.json
Write-Host "[4/6] Vérification package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "  ✓ package.json existe" -ForegroundColor Green
} else {
    Write-Host "  ✗ package.json MANQUANT!" -ForegroundColor Red
    exit 1
}

# 5. Installation npm avec options strictes
Write-Host "[5/6] Installation npm (DURÉE: 20-30 min)..." -ForegroundColor Yellow
Write-Host "  Options: --no-audit --legacy-peer-deps --loglevel=verbose" -ForegroundColor Cyan
Write-Host "  Logs: npm-install-clean.log" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

# Lancer npm install avec toutes les bonnes options
& npm install --no-audit --legacy-peer-deps --loglevel=verbose --cache C:\temp\npm-cache-new *> npm-install-clean.log

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "Installation terminée en $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Cyan

# 6. Vérifications finales
Write-Host ""
Write-Host "[6/6] Vérifications finales..." -ForegroundColor Yellow

$nodeModulesExists = Test-Path "node_modules"
$binExists = Test-Path "node_modules\.bin"
$electronExists = Test-Path "node_modules\.bin\electron.cmd"
$packageCount = if ($nodeModulesExists) { (Get-ChildItem node_modules -Directory -ErrorAction SilentlyContinue).Count } else { 0 }

Write-Host "  node_modules: $(if($nodeModulesExists){'✓'}else{'✗'})" -ForegroundColor $(if($nodeModulesExists){'Green'}else{'Red'})
Write-Host "  .bin: $(if($binExists){'✓'}else{'✗'})" -ForegroundColor $(if($binExists){'Green'}else{'Red'})
Write-Host "  electron.cmd: $(if($electronExists){'✓'}else{'✗'})" -ForegroundColor $(if($electronExists){'Green'}else{'Red'})
Write-Host "  Packages: $packageCount $(if($packageCount -gt 2000){'✓'}else{'✗'})" -ForegroundColor $(if($packageCount -gt 2000){'Green'}else{'Red'})

Write-Host ""

if ($electronExists -and $packageCount -gt 2000) {
    Write-Host "=== SUCCÈS! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installation réussie! Vous pouvez maintenant:" -ForegroundColor Green
    Write-Host "  1. npm run start      # Lancer l'application Electron" -ForegroundColor Cyan
    Write-Host "  2. npm run webui      # Lancer le serveur WebUI" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Credentials admin:" -ForegroundColor Yellow
    Write-Host "  Email: ohada.save@gmail.com" -ForegroundColor White
    Write-Host "  Password: LEADER00" -ForegroundColor White
} else {
    Write-Host "=== ÉCHEC ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "L'installation a échoué. Consultez:" -ForegroundColor Red
    Write-Host "  - npm-install-clean.log" -ForegroundColor Yellow
    Write-Host "  - SOLUTION_FINALE_CORRUPTION.md" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options alternatives:" -ForegroundColor Cyan
    Write-Host "  1. Essayer avec Yarn: yarn install" -ForegroundColor White
    Write-Host "  2. Installer Node.js 20 LTS au lieu de 24" -ForegroundColor White
    Write-Host "  3. Consulter GUIDE_INSTALLATION_MANUELLE.md" -ForegroundColor White
}

Write-Host ""
