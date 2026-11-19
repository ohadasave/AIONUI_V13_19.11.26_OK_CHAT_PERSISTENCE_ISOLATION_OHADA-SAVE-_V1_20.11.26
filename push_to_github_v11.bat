@echo off
chcp 65001 >nul
echo ====================================
echo Sauvegarde AIONUI V11 vers GitHub
echo ====================================
echo.

cd /d "g:\Aionui_client"
echo Répertoire actuel:
cd

echo.
echo ====================================
echo Étape 1: Vérification de l'état Git
echo ====================================
git status

echo.
echo ====================================
echo Étape 2: Ajout de tous les fichiers
echo ====================================
git add .

echo.
echo ====================================
echo Étape 3: Création du commit
echo ====================================
set /p commit_message="Entrez le message de commit (ou Entrée pour 'Sauvegarde AIONUI V11 - 19.11.26'): "
if "%commit_message%"=="" set commit_message=Sauvegarde AIONUI V11 - 19.11.26
git commit -m "%commit_message%"

echo.
echo ====================================
echo Étape 4: Configuration du remote
echo ====================================
echo Vérification des remotes:
git remote -v

echo.
echo Ajout du remote backup-v11...
git remote remove backup-v11 2>nul
git remote add backup-v11 https://github.com/sekadalle2024/AIONUI_V11_19.11.26.git

echo.
echo Remotes configurés:
git remote -v

echo.
echo ====================================
echo Étape 5: Vérification de la branche
echo ====================================
git branch

echo.
echo ====================================
echo Étape 6: Push vers GitHub (backup-v11)
echo ====================================
echo Envoi en cours vers https://github.com/sekadalle2024/AIONUI_V11_19.11.26.git...
git push -u backup-v11 HEAD

echo.
echo ====================================
echo Terminé avec succès!
echo ====================================
pause
