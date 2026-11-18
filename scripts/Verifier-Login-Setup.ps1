# Script de vérification de l'installation de la page de login
# Usage: .\scripts\Verifier-Login-Setup.ps1

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VÉRIFICATION DU SYSTÈME DE LOGIN E-AUDIT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$totalFiles = 0
$missingFiles = 0
$existingFiles = 0

function Test-FileExists {
    param(
        [string]$Path,
        [string]$Description,
        [bool]$Critical = $false
    )
    
    $script:totalFiles++
    
    $fullPath = Join-Path $PSScriptRoot "..\$Path"
    
    if (Test-Path $fullPath) {
        Write-Host "  ✅ " -ForegroundColor Green -NoNewline
        Write-Host "$Description" -ForegroundColor White
        Write-Host "     $Path" -ForegroundColor DarkGray
        $script:existingFiles++
        return $true
    } else {
        $script:missingFiles++
        if ($Critical) {
            Write-Host "  ❌ " -ForegroundColor Red -NoNewline
            Write-Host "$Description [CRITIQUE]" -ForegroundColor Red
        } else {
            Write-Host "  ⚠️  " -ForegroundColor Yellow -NoNewline
            Write-Host "$Description" -ForegroundColor Yellow
        }
        Write-Host "     $Path" -ForegroundColor DarkGray
        return $false
    }
}

# Vérifier les fichiers de documentation
Write-Host "📚 DOCUMENTATION" -ForegroundColor Yellow
Write-Host ""
Test-FileExists "README_REACTIVATION_LOGIN.md" "Guide ultra-rapide de réactivation" $false
Test-FileExists "ACTIVER_LOGIN.md" "Guide complet de réactivation" $false
Test-FileExists "NOTE_LOGIN_PAGE.md" "Note explicative du système" $false
Test-FileExists "INSTRUCTIONS_REACTIVATION.txt" "Instructions texte" $false
Test-FileExists "Doc_login_page\INDEX.md" "Index de la documentation" $false
Test-FileExists "Doc_login_page\GUIDE_REACTIVATION.md" "Guide détaillé" $false
Test-FileExists "Doc_login_page\ARCHITECTURE.md" "Documentation d'architecture" $false
Test-FileExists "Doc_login_page\LOGIN_FIX_FINAL.md" "Documentation du fix final" $false

Write-Host ""
Write-Host "🔧 SCRIPTS" -ForegroundColor Yellow
Write-Host ""
Test-FileExists "scripts\Activer-Login.ps1" "Script PowerShell d'activation" $false
Test-FileExists "public\scripts\activate-login.js" "Script JavaScript d'activation" $false
Test-FileExists "public\scripts\cleanup.js" "Script de nettoyage" $false

Write-Host ""
Write-Host "🌐 INTERFACE GRAPHIQUE" -ForegroundColor Yellow
Write-Host ""
Test-FileExists "public\enable-login.html" "Interface de gestion" $false

Write-Host ""
Write-Host "💻 COMPOSANTS REACT" -ForegroundColor Yellow
Write-Host ""
Test-FileExists "src\renderer\context\AuthContext.tsx" "Contexte d'authentification" $true
Test-FileExists "src\renderer\pages\login\LoginPage.tsx" "Page de connexion" $true
Test-FileExists "src\renderer\pages\settings\SecuritySettings.tsx" "Paramètres de sécurité" $true
Test-FileExists "src\renderer\router.tsx" "Router avec protection" $true

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# Résumé
Write-Host ""
Write-Host "📊 RÉSUMÉ" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Total de fichiers vérifiés : " -NoNewline
Write-Host "$totalFiles" -ForegroundColor Cyan
Write-Host "  Fichiers présents          : " -NoNewline
Write-Host "$existingFiles" -ForegroundColor Green
Write-Host "  Fichiers manquants         : " -NoNewline

if ($missingFiles -eq 0) {
    Write-Host "$missingFiles" -ForegroundColor Green
} else {
    Write-Host "$missingFiles" -ForegroundColor Yellow
}

Write-Host ""

# Vérifier les composants critiques
$criticalComponents = @(
    "src\renderer\context\AuthContext.tsx",
    "src\renderer\pages\login\LoginPage.tsx",
    "src\renderer\router.tsx"
)

$allCriticalPresent = $true
foreach ($component in $criticalComponents) {
    if (-not (Test-Path (Join-Path $PSScriptRoot "..\$component"))) {
        $allCriticalPresent = $false
        break
    }
}

if ($allCriticalPresent) {
    Write-Host "✅ " -ForegroundColor Green -NoNewline
    Write-Host "Tous les composants critiques sont présents" -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 PROCHAINES ÉTAPES" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Pour activer la page de login :" -ForegroundColor White
    Write-Host ""
    Write-Host "  Option 1 : " -NoNewline
    Write-Host ".\scripts\Activer-Login.ps1" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Option 2 : " -NoNewline
    Write-Host "Lire README_REACTIVATION_LOGIN.md" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Option 3 : " -NoNewline
    Write-Host "Ouvrir public\enable-login.html" -ForegroundColor Green
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
} else {
    Write-Host "❌ " -ForegroundColor Red -NoNewline
    Write-Host "Certains composants critiques sont manquants !" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Le système de login ne fonctionnera pas correctement." -ForegroundColor Yellow
    Write-Host "   Veuillez vérifier les fichiers manquants ci-dessus." -ForegroundColor Yellow
}

Write-Host ""

# Vérifier si l'application est en cours d'exécution
$electronProcess = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcess) {
    Write-Host "ℹ️  " -ForegroundColor Cyan -NoNewline
    Write-Host "L application semble etre en cours d execution" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Pour reactiver le login maintenant :" -ForegroundColor White
    Write-Host "   1. Appuyer sur F12 (DevTools)" -ForegroundColor Gray
    Write-Host "   2. Aller dans l onglet Console" -ForegroundColor Gray
    Write-Host "   3. Executer le script d activation" -ForegroundColor Gray
    Write-Host "      (Voir README_REACTIVATION_LOGIN.md)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✨ Vérification terminée !" -ForegroundColor Green
Write-Host ""
