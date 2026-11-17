@echo off
REM Script de réparation environnement Node.js - AionUi
REM Double-cliquer pour lancer (demande automatiquement admin)

echo.
echo ========================================
echo  REPARATION ENVIRONNEMENT NODE.JS
echo  AionUi - Electron 37 + Vite 5
echo ========================================
echo.

REM Vérifier si admin
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Droits administrateur detectes
    goto :run_script
) else (
    echo [!!] Droits administrateur requis pour Windows Defender exclusions
    echo.
    echo Demande des droits admin...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:run_script
echo.
echo Passage au dossier projet...
cd /d "%~dp0"
echo Dossier actuel : %CD%
echo.

echo ========================================
echo PHASE 1 : DIAGNOSTIC (5 min)
echo ========================================
echo.
echo Test de l'environnement SANS modification...
echo Appuyez sur Entree pour continuer...
pause > nul

powershell -NoProfile -ExecutionPolicy Bypass -File ".\Doc_Probleme_Lancement\repair-env.ps1" -DiagOnly

if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo [OK] DIAGNOSTIC TERMINE
    echo ========================================
    echo.
    echo Resultats du diagnostic :
    echo - Node.js version detectee
    echo - Reseau npm/GitHub teste
    echo - Type lecteur G:\ verifie
    echo.
    echo Si tout est OK, passer a la Phase 2
    echo.
    echo ========================================
    echo PHASE 2 : REPARATION (10-20 min)
    echo ========================================
    echo.
    echo ATTENTION : Cette etape va :
    echo  1. Supprimer node_modules (rapide avec cmd^)
    echo  2. Reinstaller ~2,100 packages
    echo  3. Telecharger Electron (~110 Mo^)
    echo  4. Verifier integrite finale
    echo.
    echo Duree estimee : 10-20 minutes
    echo Le script s'arretera automatiquement si blocage ^> 5 min
    echo.
    echo Appuyez sur Entree pour continuer ou Ctrl+C pour annuler...
    pause > nul
    
    echo.
    echo Lancement de la reparation...
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\Doc_Probleme_Lancement\repair-env.ps1"
    
    if %errorLevel% == 0 (
        echo.
        echo ========================================
        echo [OK] ENVIRONNEMENT REPARE !
        echo ========================================
        echo.
        echo L'application devrait avoir demarre automatiquement.
        echo.
        echo Credentials admin :
        echo   Email    : ohada.save@gmail.com
        echo   Password : LEADER00
        echo.
        echo Si l'application n'a pas demarre :
        echo   npm run start
        echo.
    ) else (
        echo.
        echo ========================================
        echo [KO] REPARATION ECHOUEE
        echo ========================================
        echo.
        echo Logs generes :
        echo   - npm-install.err.log
        echo   - npm-install.out.log
        echo.
        echo Consulter :
        echo   - Doc_Probleme_Lancement\PLAN_ACTION_MANUEL.md
        echo   - Doc_Probleme_Lancement\SYNTHESE_CONSULTATION_3_LLM.md
        echo.
        echo Alternative : Essayer yarn
        echo   winget install Yarn.Yarn
        echo   yarn install --ignore-engines
        echo.
    )
) else (
    echo.
    echo ========================================
    echo [KO] DIAGNOSTIC ECHOUE
    echo ========================================
    echo.
    echo Problemes possibles :
    echo  1. Lecteur G:\ est reseau/USB (deplacer vers C:\^)
    echo  2. Node.js non installe ou corrompu
    echo  3. Reseau npm/GitHub inaccessible
    echo.
    echo Consulter :
    echo   - Doc_Probleme_Lancement\EXECUTER_MAINTENANT.md
    echo   - Doc_Probleme_Lancement\PLAN_ACTION_MANUEL.md
    echo.
    echo Alternative : Lancer manuellement
    echo   Ouvrir Windows Terminal (Admin^)
    echo   cd G:\Aionui_client
    echo   .\Doc_Probleme_Lancement\repair-env.ps1 -DiagOnly
    echo.
)

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
