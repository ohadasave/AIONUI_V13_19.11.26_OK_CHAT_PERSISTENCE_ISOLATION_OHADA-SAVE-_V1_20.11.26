@echo off
echo ============================================
echo    LANCEMENT AIONUI avec Node.js 24
echo ============================================
echo.

REM Activer Node.js 24
call nvm use 24.21.0

REM Verifier
echo Verification Node.js:
node -v

echo.
echo Verification npm:
npm -v

echo.
echo ============================================

REM Aller dans le projet
cd /d G:\Aionui_client

echo Lancement de l'application...
echo.

REM Lancer avec le chemin complet
node node_modules\electron-vite\bin\electron-vite.js dev

pause
