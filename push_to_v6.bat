@echo off
echo ====================================
echo Sauvegarde AIONUI vers GitHub V6
echo ====================================
echo.

echo Repository: https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git
echo.

REM Étape 1: État Git
echo ====================================
echo Etape 1: Verification de l'etat Git
echo ====================================
git status
echo.

REM Étape 2: Ajout des fichiers
echo ====================================
echo Etape 2: Ajout de tous les fichiers
echo ====================================
git add .
echo Fichiers ajoutes
echo.

REM Étape 3: Commit
echo ====================================
echo Etape 3: Creation du commit
echo ====================================
git commit -m "Sauvegarde AIONUI V6 - Documentation Push GitHub complete"
echo.

REM Étape 4: Configuration remote
echo ====================================
echo Etape 4: Configuration du remote
echo ====================================
echo Remotes actuels:
git remote -v
echo.

echo Ajout du remote 'backup-v6'...
git remote remove backup-v6 2>nul
git remote add backup-v6 https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git
echo.

echo Remotes mis a jour:
git remote -v
echo.

REM Étape 5: Branche
echo ====================================
echo Etape 5: Verification de la branche
echo ====================================
git branch
echo.

REM Étape 6: Push
echo ====================================
echo Etape 6: Push vers GitHub V6
echo ====================================
echo Pushing vers le repository V6...
git push -u backup-v6 HEAD
echo.

echo ====================================
echo Termine!
echo ====================================
echo.
echo Repository V6: https://github.com/sekadalle2024/AIONUI_V6_15.11.26
echo.
pause
