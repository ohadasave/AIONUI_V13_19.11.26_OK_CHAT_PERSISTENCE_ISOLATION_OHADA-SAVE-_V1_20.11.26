#!/usr/bin/env pwsh
# Script pour créer un nouveau compte en nettoyant les credentials existants

param(
    [string]$Username = "nouveau_utilisateur"
)

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "          Creation Nouveau Compte - E-audit" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nouveau compte: $Username" -ForegroundColor Yellow
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Ouvrez la console DevTools dans l'application (F12)" -ForegroundColor White
Write-Host ""
Write-Host "2. Copiez et executez ces commandes:" -ForegroundColor White
Write-Host ""
Write-Host "   // Supprimer les credentials existants" -ForegroundColor DarkGray
Write-Host "   localStorage.removeItem('eaudit_credentials')" -ForegroundColor Yellow
Write-Host "   localStorage.removeItem('eaudit_user_id')" -ForegroundColor Yellow
Write-Host "   localStorage.removeItem('eaudit_logged_in')" -ForegroundColor Yellow
Write-Host "   localStorage.removeItem('eaudit_login_time')" -ForegroundColor Yellow
Write-Host "   localStorage.removeItem('eaudit_username')" -ForegroundColor Yellow
Write-Host ""
Write-Host "   // Verifier nettoyage (doit retourner null)" -ForegroundColor DarkGray
Write-Host "   localStorage.getItem('eaudit_credentials')" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Rechargez la page: Ctrl + R  ou  Cmd + R (Mac)" -ForegroundColor White
Write-Host ""
Write-Host "4. Connectez-vous avec vos nouveaux identifiants:" -ForegroundColor White
Write-Host "   Username: $Username" -ForegroundColor Cyan
Write-Host "   Password: (votre mot de passe)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Un nouveau userId sera genere automatiquement!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Alternative rapide (tout supprimer + base de donnees):" -ForegroundColor Yellow
Write-Host ".\scripts\Clean-UserData.ps1" -ForegroundColor White
Write-Host ""

$appDataPath = Join-Path $env:APPDATA "E-audit\Local Storage"
if (Test-Path $appDataPath) {
    Write-Host "Emplacement localStorage:" -ForegroundColor DarkGray
    Write-Host "$appDataPath" -ForegroundColor DarkGray
    Write-Host ""
}
