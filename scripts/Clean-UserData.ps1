# Script de nettoyage complet des donnees utilisateur E-audit
# Usage: .\scripts\Clean-UserData.ps1

Write-Host ""
Write-Host "================================================================" -ForegroundColor Red
Write-Host "  NETTOYAGE COMPLET DES DONNEES E-AUDIT" -ForegroundColor Red
Write-Host "================================================================" -ForegroundColor Red
Write-Host ""
Write-Host "ATTENTION: Cette operation va supprimer :" -ForegroundColor Yellow
Write-Host "  - Toutes les sessions utilisateurs" -ForegroundColor Yellow
Write-Host "  - Toutes les conversations" -ForegroundColor Yellow
Write-Host "  - Tous les messages" -ForegroundColor Yellow
Write-Host "  - La base de donnees SQLite complete" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Voulez-vous continuer ? (O/N)"

if ($response -ne "O" -and $response -ne "o") {
    Write-Host ""
    Write-Host "Operation annulee." -ForegroundColor Gray
    Write-Host ""
    exit
}

Write-Host ""
Write-Host "Demarrage du nettoyage..." -ForegroundColor Cyan
Write-Host ""

# Etape 1: Arreter l'application
Write-Host "[1/4] Arret de l'application E-audit..." -ForegroundColor White
$process = Get-Process -Name "E-audit" -ErrorAction SilentlyContinue
if ($process) {
    Stop-Process -Name "E-audit" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "      Application arretee" -ForegroundColor Green
} else {
    Write-Host "      Application non demarree" -ForegroundColor Gray
}

# Etape 2: Supprimer localStorage
Write-Host ""
Write-Host "[2/4] Suppression du localStorage..." -ForegroundColor White
$localStoragePath = "$env:APPDATA\E-audit\Local Storage"
if (Test-Path $localStoragePath) {
    Remove-Item -Path "$localStoragePath\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "      localStorage supprime" -ForegroundColor Green
} else {
    Write-Host "      Aucun localStorage trouve" -ForegroundColor Gray
}

# Etape 3: Supprimer la database
Write-Host ""
Write-Host "[3/4] Suppression de la base de donnees..." -ForegroundColor White
$dbPath = "$env:APPDATA\E-audit\aionui\aionui.db"
if (Test-Path $dbPath) {
    # Backup avant suppression
    $backupPath = "$env:APPDATA\E-audit\aionui\aionui.db.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item -Path $dbPath -Destination $backupPath -ErrorAction SilentlyContinue
    Write-Host "      Backup cree: $backupPath" -ForegroundColor Cyan
    
    Remove-Item -Path $dbPath -Force -ErrorAction SilentlyContinue
    Write-Host "      Base de donnees supprimee" -ForegroundColor Green
} else {
    Write-Host "      Aucune base de donnees trouvee" -ForegroundColor Gray
}

# Etape 4: Supprimer les fichiers WAL et SHM
Write-Host ""
Write-Host "[4/4] Nettoyage des fichiers temporaires SQLite..." -ForegroundColor White
$walPath = "$env:APPDATA\E-audit\aionui\aionui.db-wal"
$shmPath = "$env:APPDATA\E-audit\aionui\aionui.db-shm"

if (Test-Path $walPath) {
    Remove-Item -Path $walPath -Force -ErrorAction SilentlyContinue
    Write-Host "      Fichier WAL supprime" -ForegroundColor Green
}

if (Test-Path $shmPath) {
    Remove-Item -Path $shmPath -Force -ErrorAction SilentlyContinue
    Write-Host "      Fichier SHM supprime" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  NETTOYAGE TERMINE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resume:" -ForegroundColor White
Write-Host "  - localStorage nettoye" -ForegroundColor Green
Write-Host "  - Base de donnees supprimee (backup cree)" -ForegroundColor Green
Write-Host "  - Fichiers temporaires supprimes" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "  1. Redemarrer l'application : npm run start:mem" -ForegroundColor Cyan
Write-Host "  2. La page de login va s'afficher" -ForegroundColor Cyan
Write-Host "  3. Creer un nouveau compte" -ForegroundColor Cyan
Write-Host "  4. Les donnees seront isolees par utilisateur" -ForegroundColor Cyan
Write-Host ""
Write-Host "Identifiants par defaut:" -ForegroundColor Yellow
Write-Host "  Email    : ohada.save@gmail.com" -ForegroundColor White
Write-Host "  Password : LEADER00" -ForegroundColor White
Write-Host ""
