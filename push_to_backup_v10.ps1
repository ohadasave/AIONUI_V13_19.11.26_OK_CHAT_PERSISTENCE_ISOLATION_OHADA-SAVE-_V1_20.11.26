# Script de sauvegarde AIONUI vers GitHub V10
# Repository: https://github.com/sekadalle2024/AIONUI_V10_18.11.26.git
# Date: 18 Novembre 2026

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Push AIONUI vers GitHub V10" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Changement de répertoire
Set-Location "g:\Aionui_client"
Write-Host "Répertoire: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Étape 1: Vérification de l'état Git
Write-Host "====================================
Étape 1: Vérification de l'état Git
====================================" -ForegroundColor Green
git status
Write-Host ""

# Étape 2: Ajout de tous les fichiers
Write-Host "====================================
Étape 2: Ajout de tous les fichiers
====================================" -ForegroundColor Green
git add .
Write-Host "Fichiers ajoutés" -ForegroundColor Yellow
Write-Host ""

# Étape 3: Création du commit
Write-Host "====================================
Étape 3: Création du commit
====================================" -ForegroundColor Green
$commitMessage = "Push AIONUI V10 (18/11/26) - Sextuple sauvegarde complete (V5-V10)"
Write-Host "Message de commit: $commitMessage" -ForegroundColor Yellow
git commit -m "$commitMessage"
Write-Host ""

# Étape 4: Configuration du remote backup-v10
Write-Host "====================================
Étape 4: Configuration du remote
====================================" -ForegroundColor Green
Write-Host "Remotes actuels:" -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "Ajout du remote 'backup-v10'..." -ForegroundColor Yellow
git remote remove backup-v10 2>$null
git remote add backup-v10 https://github.com/sekadalle2024/AIONUI_V10_18.11.26.git
Write-Host ""

Write-Host "Remotes mis à jour:" -ForegroundColor Yellow
git remote -v
Write-Host ""

# Étape 5: Vérification de la branche
Write-Host "====================================
Étape 5: Vérification de la branche
====================================" -ForegroundColor Green
git branch
Write-Host ""

# Étape 6: Push vers GitHub V10
Write-Host "====================================
Étape 6: Push vers GitHub V10
====================================" -ForegroundColor Green
Write-Host "Pushing vers le repository V10..." -ForegroundColor Yellow
git push -u backup-v10 HEAD
Write-Host ""

Write-Host "====================================
Terminé!
====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository V10: https://github.com/sekadalle2024/AIONUI_V10_18.11.26" -ForegroundColor Green
Write-Host ""
Write-Host "⭐⭐⭐ SEXTUPLE SAUVEGARDE ACTIVE! (V5-V10) ⭐⭐⭐" -ForegroundColor Green
Write-Host ""
Read-Host "Appuyez sur Entrée pour fermer"
