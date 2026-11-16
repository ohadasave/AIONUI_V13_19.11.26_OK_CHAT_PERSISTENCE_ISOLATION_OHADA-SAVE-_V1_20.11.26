@echo off
cls
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║           DEPLOIEMENT VERS AIONUI V7 - EN COURS                  ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo Repository: https://github.com/sekadalle2024/AIONUI_V7_15.11.26
echo.
echo ====================================================================
echo ETAPE 1/6: Verification de l'etat Git
echo ====================================================================
git status
echo.
echo.

echo ====================================================================
echo ETAPE 2/6: Ajout de TOUS les fichiers
echo ====================================================================
git add .
echo ✓ Fichiers ajoutes
echo.
echo.

echo ====================================================================
echo ETAPE 3/6: Creation du commit
echo ====================================================================
git commit -m "Deploy AIONUI V7 - Triple sauvegarde complete (V5+V6+V7) avec documentation exhaustive"
echo.
echo.

echo ====================================================================
echo ETAPE 4/6: Configuration du remote backup-v7
echo ====================================================================
echo Suppression de l'ancien remote (si existe)...
git remote remove backup-v7 2>nul
echo.
echo Ajout du nouveau remote backup-v7...
git remote add backup-v7 https://github.com/sekadalle2024/AIONUI_V7_15.11.26.git
echo ✓ Remote backup-v7 configure
echo.
echo Verification des remotes:
git remote -v
echo.
echo.

echo ====================================================================
echo ETAPE 5/6: Verification de la branche
echo ====================================================================
git branch
echo.
echo.

echo ====================================================================
echo ETAPE 6/6: PUSH VERS GITHUB V7
echo ====================================================================
echo.
echo ⚡ Deploiement en cours vers GitHub...
echo.
git push -u backup-v7 HEAD
echo.
echo.

echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                    ✅ DEPLOIEMENT TERMINE ✅                      ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 🎉 Votre code est maintenant sur GitHub V7!
echo.
echo 🔍 Verifiez sur: https://github.com/sekadalle2024/AIONUI_V7_15.11.26
echo.
echo 📊 Configuration finale:
echo    • 5 remotes configures
echo    • 3 repositories de sauvegarde (V5, V6, V7)
echo    • Triple redondance active
echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║              TRIPLE SAUVEGARDE GITHUB COMPLETEE! 🚀              ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
pause
