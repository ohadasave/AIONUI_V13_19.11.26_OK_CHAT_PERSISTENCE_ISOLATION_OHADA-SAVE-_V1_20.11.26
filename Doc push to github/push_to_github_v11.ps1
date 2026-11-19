# Script de sauvegarde AIONUI vers GitHub (Version V11)
# Exécution dans PowerShell: .\push_to_github_v11.ps1 ou .\"Doc push to github\push_to_github_v11.ps1"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Sauvegarde AIONUI V11 vers GitHub" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Changement de répertoire vers la racine du projet
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
Write-Host "Fichiers indexés (staged)" -ForegroundColor Yellow
Write-Host ""

# Étape 3: Création du commit
Write-Host "====================================
Étape 3: Création du commit
====================================" -ForegroundColor Green
$defaultMessage = "Sauvegarde AIONUI V11 - 19.11.26"
$commitMessage = Read-Host "Entrez le message de commit (ou Entrée pour '$defaultMessage')"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = $defaultMessage
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

Write-Host "Configuration du remote 'backup-v11'..." -ForegroundColor Yellow
git remote remove backup-v11 2>$null
git remote add backup-v11 https://github.com/sekadalle2024/AIONUI_V11_19.11.26.git
Write-Host ""

Write-Host "Remotes après ajout:" -ForegroundColor Yellow
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
Étape 6: Push vers GitHub (backup-v11)
====================================" -ForegroundColor Green
Write-Host "Pushing vers https://github.com/sekadalle2024/AIONUI_V11_19.11.26.git..." -ForegroundColor Yellow
git push -u backup-v11 HEAD
Write-Host ""

Write-Host "====================================
Terminé avec succès!
====================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Appuyez sur Entrée pour fermer"
