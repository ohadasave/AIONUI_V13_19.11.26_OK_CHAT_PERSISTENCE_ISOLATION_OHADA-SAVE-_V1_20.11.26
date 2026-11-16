@echo off
echo ============================================
echo    LANCEMENT AIONUI - Application SaaS
echo ============================================
echo.

cd /d G:\Aionui_client

echo [1/2] Verification installation...
if not exist "node_modules" (
    echo ERREUR: node_modules manquant!
    echo Executez d'abord: npm install
    pause
    exit /b 1
)

if not exist "node_modules\.bin\electron.cmd" (
    echo ERREUR: electron.cmd manquant!
    echo Executez: npm rebuild electron
    pause
    exit /b 1
)

echo OK - Installation verifiee
echo.

echo [2/2] Lancement de l'application...
echo.
echo L'application Electron va s'ouvrir...
echo Si rien ne se passe, appuyez sur Ctrl+C et
echo executez: npx electron-vite dev
echo.

REM Lancer directement via node (contourne le probleme PATH)
node node_modules\electron-vite\bin\electron-vite.js dev

pause
