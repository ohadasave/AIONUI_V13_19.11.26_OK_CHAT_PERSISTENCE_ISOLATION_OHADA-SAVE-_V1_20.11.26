@echo off
cls
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║           DEPLOIEMENT VERS AIONUI V9 - EN COURS                  ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo Repository: https://github.com/sekadalle2024/AIONUI_V9_18.11.26.git
echo Date: 18 Novembre 2026
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
git commit -m "Push AIONUI V9 (18/11/26) - Mise a jour complete avec 5 sauvegardes (V5-V9)"
echo.
echo.

echo ====================================================================
echo ETAPE 4/6: Configuration du remote backup-v9
echo ====================================================================
echo Suppression de l'ancien remote (si existe)...
git remote remove backup-v9 2>nul
echo.
echo Ajout du nouveau remote backup-v9...
git remote add backup-v9 https://github.com/sekadalle2024/AIONUI_V9_18.11.26.git
echo ✓ Remote backup-v9 configure
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
echo ETAPE 6/6: PUSH VERS GITHUB V9
echo ====================================================================
echo.
echo ⚡ Push en cours vers GitHub V9...
echo.
git push -u backup-v9 HEAD
echo.
echo.

echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                    ✅ DEPLOIEMENT V9 TERMINE ✅                   ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 🎉 Votre code est maintenant sur GitHub V9!
echo.
echo 🔍 Verifiez sur: https://github.com/sekadalle2024/AIONUI_V9_18.11.26
echo.
echo 📊 Configuration finale:
echo    • 7 remotes configures
echo    • 5 repositories de sauvegarde (V5, V6, V7, V8, V9)
echo    • QUINTUPLE REDONDANCE ACTIVE! 🚀
echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║          QUINTUPLE SAUVEGARDE GITHUB COMPLETEE! 🎉               ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.
echo 💡 Push rapide futur:
echo    V5: .\push_to_github.bat
echo    V6: .\push_to_v6.bat
echo    V7: .\push_to_v7.bat
echo    V8: .\push_to_v8.bat
echo    V9: .\push_to_v9.bat
echo.
pause
