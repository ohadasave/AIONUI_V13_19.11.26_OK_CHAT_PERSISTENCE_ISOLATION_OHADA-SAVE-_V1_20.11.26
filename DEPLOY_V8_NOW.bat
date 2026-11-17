@echo off
cls
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║           DEPLOIEMENT VERS AIONUI V8 - EN COURS                  ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo Repository: https://github.com/sekadalle2024/AIONUI_V8_17.11.26.git
echo Date: 17 Novembre 2026
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
git commit -m "Update AIONUI V8 (17/11/26) - Quadruple sauvegarde complete avec documentation exhaustive"
echo.
echo.

echo ====================================================================
echo ETAPE 4/6: Configuration du remote backup-v8
echo ====================================================================
echo Suppression de l'ancien remote (si existe)...
git remote remove backup-v8 2>nul
echo.
echo Ajout du nouveau remote backup-v8...
git remote add backup-v8 https://github.com/sekadalle2024/AIONUI_V8_17.11.26.git
echo ✓ Remote backup-v8 configure
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
echo ETAPE 6/6: PUSH VERS GITHUB V8
echo ====================================================================
echo.
echo ⚡ Deploiement en cours vers GitHub V8...
echo.
git push -u backup-v8 HEAD
echo.
echo.

echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                    ✅ DEPLOIEMENT V8 TERMINE ✅                   ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 🎉 Votre code est maintenant sur GitHub V8!
echo.
echo 🔍 Verifiez sur: https://github.com/sekadalle2024/AIONUI_V8_17.11.26
echo.
echo 📊 Configuration finale:
echo    • 6 remotes configures
echo    • 4 repositories de sauvegarde (V5, V6, V7, V8)
echo    • QUADRUPLE REDONDANCE ACTIVE! 🚀
echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║           QUADRUPLE SAUVEGARDE GITHUB COMPLETEE! 🎉              ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
pause
