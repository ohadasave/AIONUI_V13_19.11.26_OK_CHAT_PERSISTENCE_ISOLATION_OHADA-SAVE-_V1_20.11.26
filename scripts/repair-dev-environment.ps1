# Script de Réparation de l'Environnement de Développement AionUi
# Usage: .\scripts\repair-dev-environment.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  AionUi Dev Environment Repair    " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon dossier
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: package.json introuvable" -ForegroundColor Red
    Write-Host "Veuillez exécuter ce script depuis la racine du projet" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Répertoire projet détecté" -ForegroundColor Green
Write-Host ""

# Vérifier Node.js
Write-Host "🔍 Vérification de Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green

# Vérifier npm
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm n'est pas installé" -ForegroundColor Red
    exit 1
}
Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Demander confirmation
Write-Host "⚠️  Ce script va:" -ForegroundColor Yellow
Write-Host "  1. Supprimer node_modules/" -ForegroundColor White
Write-Host "  2. Supprimer package-lock.json" -ForegroundColor White
Write-Host "  3. Vider le cache npm" -ForegroundColor White
Write-Host "  4. Réinstaller toutes les dépendances" -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "Continuer? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Host "Opération annulée" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Étape 1: Nettoyer node_modules
Write-Host "🗑️  Étape 1/4: Suppression de node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    try {
        Remove-Item "node_modules" -Recurse -Force
        Write-Host "✓ node_modules supprimé" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Erreur lors de la suppression de node_modules: $_" -ForegroundColor Red
        Write-Host "Tentative de continuer..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ node_modules n'existe pas (OK)" -ForegroundColor Green
}
Write-Host ""

# Étape 2: Nettoyer package-lock.json
Write-Host "🗑️  Étape 2/4: Suppression de package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force
    Write-Host "✓ package-lock.json supprimé" -ForegroundColor Green
} else {
    Write-Host "✓ package-lock.json n'existe pas (OK)" -ForegroundColor Green
}
Write-Host ""

# Étape 3: Vider le cache npm
Write-Host "🧹 Étape 3/4: Vidage du cache npm..." -ForegroundColor Yellow
npm cache clean --force | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Cache npm vidé" -ForegroundColor Green
} else {
    Write-Host "⚠️  Erreur lors du vidage du cache" -ForegroundColor Red
}
Write-Host ""

# Étape 4: Réinstaller les dépendances
Write-Host "📦 Étape 4/4: Réinstallation des dépendances..." -ForegroundColor Yellow
Write-Host "⏳ Cela peut prendre plusieurs minutes..." -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
npm install
$endTime = Get-Date
$duration = $endTime - $startTime

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Dépendances installées avec succès" -ForegroundColor Green
    Write-Host "⏱️  Durée: $($duration.Minutes)m $($duration.Seconds)s" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Vérifier les binaires critiques
Write-Host "🔍 Vérification des binaires critiques..." -ForegroundColor Yellow

$binaries = @(
    "node_modules/.bin/electron.cmd",
    "node_modules/.bin/electron-vite.cmd"
)

$allBinariesOk = $true
foreach ($binary in $binaries) {
    if (Test-Path $binary) {
        Write-Host "✓ $($binary.Split('/')[-1]) trouvé" -ForegroundColor Green
    } else {
        Write-Host "❌ $($binary.Split('/')[-1]) MANQUANT" -ForegroundColor Red
        $allBinariesOk = $false
    }
}
Write-Host ""

# Résumé final
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "          RÉSUMÉ FINAL              " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

if ($allBinariesOk) {
    Write-Host "✅ Environnement réparé avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez maintenant lancer l'application avec:" -ForegroundColor White
    Write-Host "  npm run start       " -ForegroundColor Cyan -NoNewline
    Write-Host "  # Application Electron desktop" -ForegroundColor Gray
    Write-Host "  npm run webui       " -ForegroundColor Cyan -NoNewline
    Write-Host "  # Serveur WebUI (http://localhost:25808)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Environnement partiellement réparé" -ForegroundColor Yellow
    Write-Host "Certains binaires manquent. Essayez:" -ForegroundColor White
    Write-Host "  npm rebuild" -ForegroundColor Cyan
}
Write-Host ""
