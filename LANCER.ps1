# Script de lancement AionUi
# Compatible PowerShell - Utilise npx pour garantir le PATH

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   LANCEMENT AIONUI - Application SaaS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location G:\Aionui_client

Write-Host "[1/2] Vérification installation..." -ForegroundColor Yellow

if (-not (Test-Path "node_modules")) {
    Write-Host "ERREUR: node_modules manquant!" -ForegroundColor Red
    Write-Host "Exécutez d'abord: npm install" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

if (-not (Test-Path "node_modules\.bin\electron.cmd")) {
    Write-Host "ERREUR: electron.cmd manquant!" -ForegroundColor Red
    Write-Host "Exécutez: npm rebuild electron" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "OK - Installation vérifiée" -ForegroundColor Green
Write-Host ""

Write-Host "[2/2] Lancement de l'application..." -ForegroundColor Yellow
Write-Host ""
Write-Host "L'application Electron va s'ouvrir..." -ForegroundColor Cyan
Write-Host "Attendez quelques secondes..." -ForegroundColor Gray
Write-Host ""

# Lancer directement via node (contourne le problème PATH et binaires manquants)
node node_modules\electron-vite\bin\electron-vite.js dev
