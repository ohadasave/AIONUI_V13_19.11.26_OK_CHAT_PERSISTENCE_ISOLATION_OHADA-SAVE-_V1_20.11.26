# Script de sauvegarde AIONUI vers GitHub V9
# Repository: https://github.com/sekadalle2024/AIONUI_V9_18.11.26.git
# Date: 18 Novembre 2026

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Push AIONUI vers GitHub V9" -ForegroundColor Cyan
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
$commitMessage = "Push AIONUI V9 (18/11/26) - Quintuple sauvegarde complete (V5, V6, V7, V8, V9)"
Write-Host "Message de commit: $commitMessage" -ForegroundColor Yellow
git commit -m "$commitMessage"
Write-Host ""

# Étape 4: Configuration du remote backup-v9
Write-Host "====================================
Étape 4: Configuration du remote
====================================" -ForegroundColor Green
Write-Host "Remotes actuels:" -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "Ajout du remote 'backup-v9'..." -ForegroundColor Yellow
git remote remove backup-v9 2>$null
git remote add backup-v9 https://github.com/sekadalle2024/AIONUI_V9_18.11.26.git
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

# Étape 6: Push vers GitHub V9
Write-Host "====================================
Étape 6: Push vers GitHub V9
====================================" -ForegroundColor Green
Write-Host "Pushing vers le repository V9..." -ForegroundColor Yellow
git push -u backup-v9 HEAD
Write-Host ""

Write-Host "====================================
Terminé!
====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository V9: https://github.com/sekadalle2024/AIONUI_V9_18.11.26" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 QUINTUPLE SAUVEGARDE ACTIVE! (V5, V6, V7, V8, V9)" -ForegroundColor Green
Write-Host ""
Read-Host "Appuyez sur Entrée pour fermer"
