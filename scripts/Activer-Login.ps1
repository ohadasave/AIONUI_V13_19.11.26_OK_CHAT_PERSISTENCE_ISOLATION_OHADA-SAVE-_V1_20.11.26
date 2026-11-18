# Script PowerShell pour activer la page de connexion E-audit
# Usage: .\scripts\Activer-Login.ps1

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ACTIVATION DE LA PAGE DE CONNEXION E-AUDIT            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Fonction pour afficher un message avec couleur
function Write-Step {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "  $Message" -ForegroundColor $Color
}

# Fonction pour afficher un titre d'étape
function Write-StepTitle {
    param([string]$Title)
    Write-Host ""
    Write-Host "▶ $Title" -ForegroundColor Yellow
}

# Vérifier si l'application est en cours d'exécution
Write-StepTitle "Vérification de l'application..."

$processes = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Step "⚠️  L'application semble être en cours d'exécution." "Yellow"
    Write-Step "   Veuillez la fermer avant de continuer." "Yellow"
    Write-Host ""
    
    $response = Read-Host "Voulez-vous fermer l'application maintenant ? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        Write-Step "Fermeture de l'application..." "Cyan"
        $processes | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Step "✅ Application fermée" "Green"
    } else {
        Write-Step "❌ Opération annulée. Fermez l'application manuellement." "Red"
        exit
    }
}

# Afficher les instructions
Write-StepTitle "Instructions"
Write-Step "Pour activer la page de login, vous devez :" "White"
Write-Step "" "White"
Write-Step "1️⃣  Démarrer l'application" "Cyan"
Write-Step "2️⃣  Ouvrir DevTools (F12)" "Cyan"
Write-Step "3️⃣  Exécuter un script dans la Console" "Cyan"
Write-Host ""

# Demander si l'utilisateur veut démarrer l'application
Write-Host "┌────────────────────────────────────────────────────────┐" -ForegroundColor Gray
Write-Host "│  Voulez-vous démarrer l'application maintenant ?       │" -ForegroundColor Gray
Write-Host "└────────────────────────────────────────────────────────┘" -ForegroundColor Gray
Write-Host ""
Write-Host "  [1] Oui, démarrer avec npm run start" -ForegroundColor Green
Write-Host "  [2] Oui, démarrer avec bun run start" -ForegroundColor Green
Write-Host "  [3] Non, afficher seulement les instructions" -ForegroundColor Yellow
Write-Host ""
$choice = Read-Host "Votre choix (1/2/3)"

Write-Host ""

if ($choice -eq "1" -or $choice -eq "2") {
    Write-StepTitle "Préparation du script d'activation..."
    
    # Créer le script JavaScript à copier
    $jsScript = @"
// Activer la page de login
const config = JSON.parse(localStorage.getItem('app_config') || '{}');
config['security.loginEnabled'] = true;
localStorage.setItem('app_config', JSON.stringify(config));

// Nettoyer la session
localStorage.removeItem('eaudit_logged_in');
localStorage.removeItem('eaudit_login_time');
localStorage.removeItem('eaudit_username');

// Recharger
location.reload();
"@

    # Copier le script dans le presse-papiers
    $jsScript | Set-Clipboard
    Write-Step "✅ Script copié dans le presse-papiers !" "Green"
    Write-Host ""
    
    Write-StepTitle "Démarrage de l'application..."
    Write-Host ""
    
    if ($choice -eq "1") {
        Write-Step "Exécution de : npm run start" "Cyan"
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
        Write-Host ""
        
        # Démarrer l'application avec npm
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; npm run start"
    } else {
        Write-Step "Exécution de : bun run start" "Cyan"
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
        Write-Host ""
        
        # Démarrer l'application avec bun
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; bun run start"
    }
    
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    Write-StepTitle "Prochaines étapes :"
    Write-Host ""
    Write-Step "1. Attendez que l'application démarre complètement" "White"
    Write-Step "2. Appuyez sur F12 pour ouvrir DevTools" "White"
    Write-Step "3. Allez dans l'onglet 'Console'" "White"
    Write-Step "4. Faites CTRL+V pour coller le script" "White"
    Write-Step "5. Appuyez sur ENTRÉE" "White"
    Write-Host ""
    Write-Step "✅ La page de login devrait s'afficher !" "Green"
    Write-Host ""
}

# Afficher les instructions complètes
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║          📋 INSTRUCTIONS COMPLÈTES                       ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

Write-Host "📝 IDENTIFIANTS DE CONNEXION :" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Email    : " -NoNewline -ForegroundColor White
Write-Host "ohada.save@gmail.com" -ForegroundColor Green
Write-Host "   Password : " -NoNewline -ForegroundColor White
Write-Host "LEADER00" -ForegroundColor Green
Write-Host ""

Write-Host "💡 MÉTHODES ALTERNATIVES :" -ForegroundColor Yellow
Write-Host ""
Write-Host "   • Interface graphique :" -ForegroundColor White
Write-Host "     Ouvrir : public\enable-login.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "   • Via les paramètres :" -ForegroundColor White
Write-Host "     Paramètres → Sécurité → Activer l'écran de connexion" -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 DOCUMENTATION :" -ForegroundColor Yellow
Write-Host ""
Write-Host "   • Guide rapide    : ACTIVER_LOGIN.md" -ForegroundColor Cyan
Write-Host "   • Guide complet   : Doc_login_page\GUIDE_REACTIVATION.md" -ForegroundColor Cyan
Write-Host "   • Index           : Doc_login_page\INDEX.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "✅ Script terminé !" -ForegroundColor Green
Write-Host ""
