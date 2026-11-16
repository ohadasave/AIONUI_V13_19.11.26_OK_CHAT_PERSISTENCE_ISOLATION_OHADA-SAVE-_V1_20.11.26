# Script de Reparation de l'Environnement de Developpement AionUi
# Usage: .\scripts\repair-dev-environment.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  AionUi Dev Environment Repair    " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verifier qu'on est dans le bon dossier
if (-not (Test-Path "package.json")) {
    Write-Host "Erreur: package.json introuvable" -ForegroundColor Red
    Write-Host "Veuillez executer ce script depuis la racine du projet" -ForegroundColor Yellow
    exit 1
}

Write-Host "Repertoire projet detecte" -ForegroundColor Green
Write-Host ""

# Verifier Node.js
Write-Host "Verification de Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Node.js n'est pas installe ou pas dans le PATH" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Verifier npm
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm n'est pas installe" -ForegroundColor Red
    exit 1
}
Write-Host "npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Demander confirmation
Write-Host "Ce script va:" -ForegroundColor Yellow
Write-Host "  1. Supprimer node_modules/" -ForegroundColor White
Write-Host "  2. Supprimer package-lock.json" -ForegroundColor White
Write-Host "  3. Vider le cache npm" -ForegroundColor White
Write-Host "  4. Reinstaller toutes les dependances" -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "Continuer? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "Operation annulee" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Etape 1: Nettoyer node_modules
Write-Host "Etape 1/4: Suppression de node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    try {
        Remove-Item "node_modules" -Recurse -Force
        Write-Host "node_modules supprime" -ForegroundColor Green
    } catch {
        Write-Host "Erreur lors de la suppression de node_modules: $_" -ForegroundColor Red
        Write-Host "Tentative de continuer..." -ForegroundColor Yellow
    }
} else {
    Write-Host "node_modules n'existe pas (OK)" -ForegroundColor Green
}
Write-Host ""

# Etape 2: Nettoyer package-lock.json
Write-Host "Etape 2/4: Suppression de package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "package-lock.json supprime" -ForegroundColor Green
} else {
    Write-Host "package-lock.json n'existe pas (OK)" -ForegroundColor Green
}
Write-Host ""

# Etape 3: Vider le cache npm
Write-Host "Etape 3/4: Vidage du cache npm..." -ForegroundColor Yellow
npm cache clean --force | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Cache npm vide" -ForegroundColor Green
} else {
    Write-Host "Erreur lors du vidage du cache" -ForegroundColor Red
}
Write-Host ""

# Etape 4: Reinstaller les dependances
Write-Host "Etape 4/4: Reinstallation des dependances..." -ForegroundColor Yellow
Write-Host "Cela peut prendre plusieurs minutes..." -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
npm install
$endTime = Get-Date
$duration = $endTime - $startTime

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Dependances installees avec succes" -ForegroundColor Green
    Write-Host "Duree: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Erreur lors de l'installation des dependances" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Verifier les binaires critiques
Write-Host "Verification des binaires critiques..." -ForegroundColor Yellow

$binaries = @(
    "node_modules/.bin/electron.cmd",
    "node_modules/.bin/electron-vite.cmd"
)

$allBinariesOk = $true
foreach ($binary in $binaries) {
    $binaryName = Split-Path $binary -Leaf
    if (Test-Path $binary) {
        Write-Host "$binaryName trouve" -ForegroundColor Green
    } else {
        Write-Host "$binaryName MANQUANT" -ForegroundColor Red
        $allBinariesOk = $false
    }
}
Write-Host ""

# Resume final
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "          RESUME FINAL              " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

if ($allBinariesOk) {
    Write-Host "Environnement repare avec succes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez maintenant lancer l'application avec:" -ForegroundColor White
    Write-Host "  npm run start       " -ForegroundColor Cyan -NoNewline
    Write-Host "  # Application Electron desktop" -ForegroundColor Gray
    Write-Host "  npm run webui       " -ForegroundColor Cyan -NoNewline
    Write-Host "  # Serveur WebUI (http://localhost:25808)" -ForegroundColor Gray
} else {
    Write-Host "Environnement partiellement repare" -ForegroundColor Yellow
    Write-Host "Certains binaires manquent. Essayez:" -ForegroundColor White
    Write-Host "  npm rebuild" -ForegroundColor Cyan
}
Write-Host ""
