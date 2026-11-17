# Plan d'Action Manuel - Consensus 3 LLMs

**Date** : 16 novembre 2026, 21:00  
**Source** : Synthèse Claude Opus + Sonnet + Gemini Hydrogen  
**À utiliser si** : Script `repair-env.ps1` échoue ou besoin comprendre chaque étape

---

## PHASE 0 : Terminal Propre + Node Direct (2 min)

### Étape 0.1 : Ouvrir Terminal Sain

```powershell
# Option A : Windows Terminal EN ADMIN (recommandé)
# Clic droit sur Windows Terminal → "Exécuter en tant qu'administrateur"

# Option B : PowerShell sans profil
powershell.exe -NoProfile

# Option C : CMD si PowerShell bloqué
cmd.exe
```

### Étape 0.2 : Désactiver Anaconda

```powershell
# PowerShell
conda deactivate

# CMD
call conda deactivate
```

### Étape 0.3 : Contourner nvm4w (Ajouter Node au PATH)

```powershell
# PowerShell - Node 22 (RECOMMANDÉ par Opus)
$env:Path = "C:\Users\LEADER\AppData\Local\nvm\v22.22.0;$env:Path"

# OU Node 24 si préférence
$env:Path = "C:\Users\LEADER\AppData\Local\nvm\v24.21.0;$env:Path"

# CMD - Node 22
set "PATH=C:\Users\LEADER\AppData\Local\nvm\v22.22.0;%PATH%"
```

### Étape 0.4 : Vérifier Node Actif

```powershell
# PowerShell et CMD
where.exe node
node -v
npm -v

# Attendu :
# C:\Users\LEADER\AppData\Local\nvm\v22.22.0\node.exe
# v22.22.0
# 10.x.x
```

**❌ Si échec ici** : Vérifier que `node.exe` existe dans le dossier nvm

---

## PHASE 1 : Diagnostic Racine (5 min)

### Test 1.1 : Type Lecteur G:\

```powershell
# PowerShell
Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='G:'" | Select-Object DeviceID,DriveType,FileSystem,VolumeName,ProviderName

# Interpréter DriveType :
# 3 = Disque local NTFS (OK)
# 4 = Réseau (KO - déplacer projet vers C:\)
# 2 = Amovible USB (KO - déplacer vers C:\)
```

**❌ Si DriveType ≠ 3** : 
```powershell
# Copier projet vers C:\
New-Item -ItemType Directory -Force C:\dev
robocopy G:\Aionui_client C:\dev\Aionui_client /E /XD node_modules /XF *.log
cd C:\dev\Aionui_client
```

### Test 1.2 : Audit Complet node_modules

```powershell
cd G:\Aionui_client

# Compter packages corrompus (sans package.json)
$broken = @()
Get-ChildItem .\node_modules -Directory -Force | ForEach-Object {
  if ($_.Name -eq '.bin' -or $_.Name -eq '.cache') { return }
  if ($_.Name.StartsWith('@')) {
    Get-ChildItem $_.FullName -Directory -Force | ForEach-Object {
      if (-not $_.Name.StartsWith('.') -and -not (Test-Path (Join-Path $_.FullName 'package.json'))) { 
        $broken += $_.FullName 
      }
    }
  } elseif (-not $_.Name.StartsWith('.') -and -not (Test-Path (Join-Path $_.FullName 'package.json'))) {
    $broken += $_.FullName
  }
}

Write-Host "Packages corrompus : $($broken.Count)"
Write-Host "Binaires .cmd : $((Get-ChildItem .\node_modules\.bin\*.cmd -ErrorAction SilentlyContinue).Count)"
Write-Host "electron.exe : $(Test-Path .\node_modules\electron\dist\electron.exe)"

# Interpréter :
# - Si broken.Count > 10 OU .cmd = 0 OU electron.exe = False → Réinstallation complète requise
# - Si broken.Count <= 5 → Réparation ciblée possible
```

### Test 1.3 : Réseau npm et GitHub

```powershell
# Test IPv4 vs IPv6
curl.exe -4 -s -o NUL -w "IPv4 npm: %{http_code} en %{time_total}s`n" --max-time 10 https://registry.npmjs.org/@babel/core
curl.exe -6 -s -o NUL -w "IPv6 npm: %{http_code} en %{time_total}s`n" --max-time 5 https://registry.npmjs.org/@babel/core

# Test GitHub (pour Electron)
curl.exe -4 -I --max-time 10 https://github.com/electron/electron/releases | Select-String -Pattern "HTTP"

# Interpréter :
# - IPv4 OK (200 en < 2s) mais IPv6 timeout → Forcer IPv4
# - IPv4 lent (> 5s) → Utiliser miroir
# - GitHub timeout → Utiliser ELECTRON_MIRROR
```

**🔧 Actions selon résultats :**

```powershell
# Si IPv6 problématique
$env:NODE_OPTIONS = "--dns-result-order=ipv4first"

# Si registry npm lent
$env:npm_config_registry = "https://registry.npmmirror.com"

# Si GitHub lent
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
```

### Test 1.4 : Test npm Isolé (Hors Projet)

```powershell
# Créer dossier test propre
New-Item -ItemType Directory -Force C:\Temp\npm-diag | Out-Null
cd C:\Temp\npm-diag

# Test installation simple
npm init -y
npm install @babel/core --loglevel=verbose --fetch-timeout=30000 --fetch-retries=1 --no-audit --no-fund

# Mesurer durée
Measure-Command { npm install lodash --no-save }

# Interpréter :
# - Succès en < 30 sec → npm fonctionne, problème = état G:\Aionui_client\node_modules
# - Timeout aussi → Problème réseau/cache/npm global
```

**❌ Si timeout dans C:\Temp** :
```powershell
# Cache corrompu
npm cache clean --force
npm cache verify

# Ou utiliser cache frais
npm install @babel/core --cache C:\Temp\npm-cache-fresh
```

---

## PHASE 2 : Exclusions Windows Defender (1 min)

**Requis terminal ADMIN**

```powershell
# Exclure projet + cache npm
Add-MpPreference -ExclusionPath "G:\Aionui_client","$env:LOCALAPPDATA\npm-cache","C:\Users\LEADER\AppData\Local\nvm"

# Vérifier exclusions ajoutées
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath | Select-String "Aionui"
```

**⚠️ Si non-admin** : Script fonctionne quand même mais 5-10x plus lent

---

## PHASE 3 : Suppression node_modules (2 min)

### Méthode Rapide (CMD - 5x plus rapide)

```powershell
# PowerShell
cd G:\Aionui_client
Rename-Item .\node_modules node_modules_old -ErrorAction SilentlyContinue
Start-Process cmd -ArgumentList '/c rmdir /s /q node_modules_old' -WindowStyle Hidden -Wait

# Vérifier suppression
if (Test-Path node_modules) { Write-Host "ERREUR : node_modules pas supprimé" }
```

### Méthode Alternative (PowerShell natif)

```powershell
# Si cmd échoue
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue

# Forcer avec robocopy (très rapide)
New-Item -ItemType Directory -Force $env:TEMP\empty
robocopy $env:TEMP\empty node_modules /MIR /NFL /NDL /NJH /NJS
Remove-Item -Recurse -Force node_modules
```

**⚠️ NE PAS SUPPRIMER `package-lock.json`** (garde versions exactes)

---

## PHASE 4 : Installation Propre (10-20 min)

### Option A : npm ci (RECOMMANDÉ si package-lock.json existe)

```powershell
cd G:\Aionui_client

# Installation SANS scripts postinstall (évite blocage Electron)
npm ci `
  --legacy-peer-deps `
  --ignore-scripts `
  --loglevel=verbose `
  --foreground-scripts `
  --no-audit `
  --no-fund `
  --fetch-timeout=120000 `
  --fetch-retries=3 `
  --cache C:\Temp\npm-cache-fresh

# Observer logs en temps réel
# Si figé > 2 min sur une ligne → Ctrl+C et noter quelle URL/package
```

**Interpréter logs :**
```
http fetch GET 200 https://registry.npmjs.org/@babel/core [durée]
→ OK si durée < 5 sec

http fetch GET ... (bloqué sans output)
→ KO : noter URL et utiliser miroir ou forcer IPv4
```

### Option B : npm install (Si package-lock.json corrompu)

```powershell
# Sauvegarder lock
Copy-Item package-lock.json package-lock.json.bak

# Supprimer si corrompu
Remove-Item package-lock.json

# Install
npm install `
  --legacy-peer-deps `
  --ignore-scripts `
  --loglevel=verbose `
  --foreground-scripts `
  --no-audit `
  --no-fund `
  --fetch-timeout=120000 `
  --fetch-retries=3
```

**❌ Si timeout persiste :**

```powershell
# Arrêter Ctrl+C et diagnostiquer dernière ligne
Get-Content .\npm-debug.log -Tail 20

# Ou logs npm cache
Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_logs" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 30
```

---

## PHASE 5 : Scripts Postinstall (5 min)

### Étape 5.1 : Electron Binaire

```powershell
cd G:\Aionui_client

# Télécharger Electron séparément
node node_modules\electron\install.js

# Vérifier présence
if (-not (Test-Path node_modules\electron\dist\electron.exe)) {
  Write-Host "ERREUR : Electron non téléchargé"
  Write-Host "Vérifier ELECTRON_MIRROR ou réseau GitHub"
}
```

### Étape 5.2 : Postinstall Projet

```powershell
# Vérifier si postinstall existe
Get-Content package.json | Select-String "postinstall"

# Si existe, exécuter
npm run postinstall

# ⚠️ Si erreur compilation (modules natifs)
# → Installer Visual Studio Build Tools
# → Ou ignorer si modules natifs pas critiques
```

### Étape 5.3 : Rebuild Modules Natifs (Si nécessaire)

```powershell
# Recompiler modules natifs avec Node actif
npm rebuild

# Ou cibler packages spécifiques
npm rebuild electron esbuild
```

---

## PHASE 6 : Vérification Intégrité (2 min)

### Check 6.1 : Packages @babel

```powershell
cd G:\Aionui_client

# Test présence package.json des 5 packages critiques
$critical = @(
  "node_modules\@babel\core\package.json",
  "node_modules\@babel\parser\package.json",
  "node_modules\@babel\types\package.json",
  "node_modules\@babel\helpers\package.json",
  "node_modules\@babel\runtime\package.json"
)

$missing = $critical | Where-Object { -not (Test-Path $_) }
if ($missing.Count -gt 0) {
  Write-Host "ERREUR : Packages encore corrompus"
  $missing | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

Write-Host "OK : 5 packages @babel présents"
```

### Check 6.2 : Binaires .cmd

```powershell
# Compter binaires
$cmdCount = (Get-ChildItem .\node_modules\.bin\*.cmd -ErrorAction SilentlyContinue).Count
Write-Host "Binaires .cmd : $cmdCount"

# Attendu : ~150-200 binaires
# Si 0 → Installation incomplète

# Test binaires critiques
$criticalBin = @(
  "node_modules\.bin\electron-vite.cmd",
  "node_modules\.bin\electron.cmd",
  "node_modules\electron-vite\bin\electron-vite.js"
)

$missingBin = $criticalBin | Where-Object { -not (Test-Path $_) }
if ($missingBin.Count -gt 0) {
  Write-Host "ERREUR : Binaires critiques manquants"
  $missingBin | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

Write-Host "OK : Binaires critiques présents"
```

### Check 6.3 : Audit Final

```powershell
# Vérifier AUCUN package sans package.json
$bad = Get-ChildItem node_modules -Directory -Force |
  Where-Object { $_.Name -notlike '.*' -and $_.Name -ne '.bin' } |
  ForEach-Object { 
    if ($_.Name -like '@*') { 
      Get-ChildItem $_.FullName -Directory -Force | Where-Object { $_.Name -notlike '.*' }
    } else { 
      $_ 
    } 
  } |
  Where-Object { -not (Test-Path (Join-Path $_.FullName "package.json")) }

if ($bad) {
  Write-Host "ATTENTION : Packages corrompus détectés :"
  $bad | ForEach-Object { Write-Host "  - $($_.FullName)" }
} else {
  Write-Host "OK : Aucun package corrompu"
}

# Compter total packages
$total = (Get-ChildItem node_modules -Directory -Force | Where-Object { $_.Name -notlike '.*' }).Count
Write-Host "Total packages : $total (attendu ~2,100)"
```

---

## PHASE 7 : Lancement Application (30 sec)

### Méthode 1 : npm run start

```powershell
cd G:\Aionui_client
npm run start

# Ou équivalent
npm run dev
```

### Méthode 2 : Appel Direct

```powershell
# Si npm run ne fonctionne pas
node node_modules\electron-vite\bin\electron-vite.js dev

# Ou avec .cmd
.\node_modules\.bin\electron-vite.cmd dev
```

### Méthode 3 : npx

```powershell
npx electron-vite dev
```

**✅ Succès si** : Application Electron démarre sans erreur `ERR_MODULE_NOT_FOUND`

---

## 🔄 ALTERNATIVES SI ÉCHEC

### Alternative 1 : yarn (Remplacer npm)

```powershell
# Installer yarn via winget
winget install Yarn.Yarn

# Nouveau terminal, remettre PATH Node
powershell -NoProfile
$env:Path = "C:\Users\LEADER\AppData\Local\nvm\v22.22.0;$env:Path"

# Aller projet
cd G:\Aionui_client

# Supprimer node_modules
Remove-Item -Recurse -Force node_modules

# Installer avec yarn
yarn install --ignore-engines --network-timeout 60000

# Lancer
yarn start
```

### Alternative 2 : pnpm (Plus robuste)

```powershell
# Installer pnpm
npm install -g pnpm

# Configurer mode compatible Electron
echo "node-linker=hoisted" > .npmrc

# Installer
pnpm install --ignore-scripts
pnpm rebuild electron

# Lancer
pnpm start
```

### Alternative 3 : Copier node_modules Sain

```powershell
# Si vous avez accès à une autre machine avec projet fonctionnel

# Sur machine source
cd G:\Aionui_client
Compress-Archive -Path node_modules -DestinationPath node_modules.zip

# Transférer node_modules.zip vers machine problématique

# Sur machine problématique
cd G:\Aionui_client
Remove-Item -Recurse -Force node_modules
Expand-Archive -Path node_modules.zip -DestinationPath .

# Lancer
npm run start
```

---

## 🛡️ PRÉVENTION FUTURE

### 1. Remplacer nvm4w

```powershell
# Option A : fnm (Fast Node Manager - pas de symlink admin)
winget install Schniz.fnm

# Option B : Node.js standalone (sans gestionnaire version)
# Télécharger depuis https://nodejs.org
# Installer Node 22 LTS directement
```

### 2. Configuration .npmrc Projet

Créer `.npmrc` dans `G:\Aionui_client\` :

```ini
# Résilience réseau
fetch-retries=5
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
fetch-timeout=300000

# Performance
prefer-offline=true
progress=true
loglevel=http

# Sécurité versions
engine-strict=true

# IPv4 prioritaire (si IPv6 problématique)
# Décommenter si nécessaire
# ipv4=true
```

### 3. Script Pre-Install Check

Créer `scripts\check-env.ps1` :

```powershell
# Vérifier environnement avant npm install
Write-Host "=== Vérification Environnement ===" -ForegroundColor Cyan

# 1. Lecteur local NTFS
$drive = (Get-Location).Drive
$info = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($drive.Name):'"
if ($info.DriveType -ne 3) {
  Write-Host "ATTENTION : Lecteur $($drive.Name): n'est pas disque local NTFS" -ForegroundColor Red
  exit 1
}

# 2. Processus Node/Electron actifs
$procs = Get-Process node,electron -ErrorAction SilentlyContinue
if ($procs) {
  Write-Host "ATTENTION : Processus Node/Electron actifs (fermez VS Code/app)" -ForegroundColor Yellow
  $procs | Select-Object Id,ProcessName | Format-Table
}

# 3. Node version correcte
$nodeVer = (node -v).Trim()
if ($nodeVer -notmatch "v(22|23|24)\.") {
  Write-Host "ATTENTION : Node $nodeVer non supporté (besoin >=22 <25)" -ForegroundColor Red
  exit 1
}

Write-Host "OK : Environnement prêt pour npm install" -ForegroundColor Green
```

Usage :
```powershell
.\scripts\check-env.ps1 && npm ci
```

### 4. .gitignore Logs

Ajouter à `.gitignore` :

```gitignore
# npm logs
npm-*.log
npm-debug.log*
npm-error.log*

# Cache npm local
.npm/
```

### 5. Règles d'Or

**✅ À FAIRE :**
- Toujours travailler sur disque NTFS local (C:\)
- Fermer VS Code avant `npm install`
- Utiliser `npm ci` au lieu de `npm install`
- Lancer installation avec `--loglevel=verbose`
- Attendre fin complète (ne jamais Ctrl+C)
- Exclusions Windows Defender sur projet

**❌ NE JAMAIS :**
- `nvm use` pendant `npm install` en cours
- Supprimer `package-lock.json` (sauf corruption)
- Travailler sur lecteur réseau/USB/cloud sync
- Interrompre installation (Ctrl+C brutal)
- Mélanger npm/yarn/pnpm (choisir 1 seul)

---

## 📞 ESCALADE SI TOUT ÉCHOUE

### 1. Logs à Collecter

```powershell
# Sauvegarder tous logs
New-Item -ItemType Directory -Force .\logs-debug
Copy-Item npm-*.log .\logs-debug\
Copy-Item "$env:LOCALAPPDATA\npm-cache\_logs\*.log" .\logs-debug\

# Environnement complet
node -v > .\logs-debug\env.txt
npm -v >> .\logs-debug\env.txt
npm config list >> .\logs-debug\env.txt
Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,DriveType,FileSystem >> .\logs-debug\env.txt

# Compresser
Compress-Archive -Path .\logs-debug -DestinationPath logs-debug.zip
```

### 2. Communautés Support

- **npm Discord** : https://discord.gg/npm
- **Node.js Discord** : https://discord.gg/nodejs
- **StackOverflow** : Tag `npm`, `node.js`, `windows`, `electron`
- **GitHub Issues** :
  - npm : https://github.com/npm/cli/issues
  - nvm-windows : https://github.com/coreybutler/nvm-windows/issues
  - Electron : https://github.com/electron/electron/issues

### 3. Informations à Fournir

```
Système : Windows 11 build 26200
Node : v22.22.0 (ou v24.21.0)
npm : 10.x.x (ou 11.19.0)
Projet : Electron 37 + electron-vite 5
Lecteur : G:\ [type]
Erreur : npm install timeout après X minutes sur [package]
Logs : npm-install.err.log joint
```

---

**Dernière Mise à Jour** : 16 novembre 2026, 21:00  
**Source** : Consensus Claude Opus + Sonnet + Gemini  
**Durée Totale Estimée** : 20-30 minutes
