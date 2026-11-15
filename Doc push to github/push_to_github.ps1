# Script de sauvegarde AIONUI vers GitHub
# Exécution: .\push_to_github.ps1

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Sauvegarde AIONUI vers GitHub" -ForegroundColor Cyan
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
$commitMessage = Read-Host "Entrez le message de commit (ou appuyez sur Entrée pour 'Sauvegarde AIONUI - Version actuelle')"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Sauvegarde AIONUI - Version actuelle"
}
git commit -m "$commitMessage"
Write-Host ""

# Étape 4: Configuration du remote
Write-Host "====================================
Étape 4: Configuration du remote
====================================" -ForegroundColor Green
Write-Host "Remote actuel:" -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "Ajout/Mise à jour du remote 'backup'..." -ForegroundColor Yellow
git remote remove backup 2>$null
git remote add backup https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
Write-Host ""

Write-Host "Remote mis à jour:" -ForegroundColor Yellow
git remote -v
Write-Host ""

# Étape 5: Vérification de la branche
Write-Host "====================================
Étape 5: Vérification de la branche
====================================" -ForegroundColor Green
git branch
Write-Host ""

# Étape 6: Push vers GitHub
Write-Host "====================================
Étape 6: Push vers GitHub
====================================" -ForegroundColor Green
Write-Host "Pushing vers le repository de sauvegarde..." -ForegroundColor Yellow
git push -u backup HEAD
Write-Host ""

Write-Host "====================================
Terminé!
====================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Appuyez sur Entrée pour fermer"
