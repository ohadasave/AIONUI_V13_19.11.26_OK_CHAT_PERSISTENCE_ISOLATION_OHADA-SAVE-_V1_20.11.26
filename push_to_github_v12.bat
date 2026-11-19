@echo off
chcp 65001 >nul
echo ======================================================================
echo Sauvegarde AIONUI V12 vers GitHub
echo OK CHAT PERSISTENCE ISOLATION
echo ======================================================================
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
set /p commit_message="Entrez le message de commit (ou Entrée pour 'Sauvegarde AIONUI V12 - Chat Persistence Isolation - 19.11.26'): "
if "%commit_message%"=="" set commit_message=Sauvegarde AIONUI V12 - Chat Persistence Isolation - 19.11.26
git commit -m "%commit_message%"

echo.
echo ====================================
echo Étape 4: Configuration du remote
echo ====================================
echo Vérification des remotes actuels:
git remote -v

echo.
echo Ajout du remote backup-v12...
git remote remove backup-v12 2>nul
git remote add backup-v12 https://github.com/sekadalle2024/AIONUI_V12_19.11.26_OK_CHAT_PERSISTENCE_ISOLATION.git

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
echo Étape 6: Push vers GitHub (backup-v12)
echo ====================================
echo Envoi en cours vers https://github.com/sekadalle2024/AIONUI_V12_19.11.26_OK_CHAT_PERSISTENCE_ISOLATION.git...
git push -u backup-v12 HEAD

echo.
echo ====================================
echo Terminé avec succès!
echo ====================================
pause
