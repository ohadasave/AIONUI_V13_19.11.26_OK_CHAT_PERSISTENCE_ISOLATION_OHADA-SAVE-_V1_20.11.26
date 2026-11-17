# Script de sauvegarde AIONUI vers GitHub V8
# Repository: https://github.com/sekadalle2024/AIONUI_V8_17.11.26.git
# Date: 17 Novembre 2026

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Update AIONUI vers GitHub V8" -ForegroundColor Cyan
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
$commitMessage = "Update AIONUI V8 (17/11/26) - Quadruple sauvegarde complete avec V5, V6, V7 et V8"
Write-Host "Message de commit: $commitMessage" -ForegroundColor Yellow
git commit -m "$commitMessage"
Write-Host ""

# Étape 4: Configuration du remote backup-v8
Write-Host "====================================
Étape 4: Configuration du remote
====================================" -ForegroundColor Green
Write-Host "Remotes actuels:" -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "Ajout du remote 'backup-v8'..." -ForegroundColor Yellow
git remote remove backup-v8 2>$null
git remote add backup-v8 https://github.com/sekadalle2024/AIONUI_V8_17.11.26.git
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

# Étape 6: Push vers GitHub V8
Write-Host "====================================
Étape 6: Push vers GitHub V8
====================================" -ForegroundColor Green
Write-Host "Pushing vers le repository V8..." -ForegroundColor Yellow
git push -u backup-v8 HEAD
Write-Host ""

Write-Host "====================================
Terminé!
====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository V8: https://github.com/sekadalle2024/AIONUI_V8_17.11.26" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 QUADRUPLE SAUVEGARDE ACTIVE! (V5, V6, V7, V8)" -ForegroundColor Green
Write-Host ""
Read-Host "Appuyez sur Entrée pour fermer"
