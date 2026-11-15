@echo off
echo ====================================
echo Sauvegarde AIONUI vers GitHub
echo ====================================
echo.

REM Afficher le répertoire actuel
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
set /p commit_message="Entrez le message de commit (ou appuyez sur Entrée pour 'Sauvegarde AIONUI - Version actuelle'): "
if "%commit_message%"=="" set commit_message=Sauvegarde AIONUI - Version actuelle
git commit -m "%commit_message%"

echo.
echo ====================================
echo Étape 4: Configuration du remote
echo ====================================
echo Vérification du remote actuel:
git remote -v

echo.
echo Ajout/Mise à jour du remote 'backup':
git remote remove backup 2>nul
git remote add backup https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git

echo.
echo Vérification du remote mis à jour:
git remote -v

echo.
echo ====================================
echo Étape 5: Vérification de la branche
echo ====================================
git branch

echo.
echo ====================================
echo Étape 6: Push vers GitHub
echo ====================================
echo Pushing vers le repository de sauvegarde...
git push -u backup HEAD

echo.
echo ====================================
echo Terminé!
echo ====================================
pause
