# Procédures de Démarrage - E-audit WebUI

## 🚀 Guide de Démarrage Rapide

### Démarrage Standard (Mode WebUI Development)

```powershell
# 1. Définir l'option mémoire Node.js (IMPORTANT)
$env:NODE_OPTIONS="--max-old-space-size=8192"

# 2. Démarrer le serveur WebUI
npx electron-vite dev -- --webui

# 3. Attendre le message de confirmation
# ✓ WebUI started: http://localhost:25808

# 4. Ouvrir le navigateur
# http://localhost:25808
```

**Temps de démarrage** : ~30-45 secondes

**URL d'accès** : http://localhost:25808

## 📋 Scripts Disponibles

### Scripts de Développement

```json
{
  "start": "electron-vite dev",                    // Mode desktop
  "start:mem": "cross-env NODE_OPTIONS=--max-old-space-size=8192 electron-vite dev",
  "webui": "bun run cli -- --webui",              // Mode WebUI (nécessite bun)
  "webui:remote": "bun run cli -- --webui --remote"
}
```

### Scripts de Build

```json
{
  "package": "electron-vite build",               // Build dev
  "dist": "node scripts/build-with-builder.js",  // Build production
  "dist:win": "node scripts/build-with-builder.js auto --win"
}
```

### Scripts de Test

```json
{
  "test": "vitest run",                          // Tests unitaires
  "test:watch": "vitest",                        // Mode watch
  "test:e2e": "playwright test",                 // Tests E2E
  "lint": "eslint --quiet --ext .ts,.tsx .",
  "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\""
}
```

## 🔧 Modes de Démarrage Détaillés

### Mode 1 : WebUI Development (Recommandé)

**Usage** : Développement avec hot reload

```powershell
# PowerShell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

**Caractéristiques** :
- ✅ Hot Module Replacement (HMR)
- ✅ Vite dev server (port 5173)
- ✅ Chrome DevTools (port 9230)
- ✅ WebSocket temps réel
- ⚡ Rechargement rapide (<1s)

**Ports utilisés** :
- `25808` : WebUI Server
- `5173` : Vite Dev Server
- `9230` : Chrome DevTools Protocol

**Logs attendus** :
```
✓ built in 7s
electron main process built successfully
dev server running for the electron renderer process at:
  ➜  Local:   http://localhost:5173/
   ƒÜÇ WebUI started: http://localhost:25808
[ACP] Detection completed in 17s, found 10 agents
```

### Mode 2 : Desktop Development

**Usage** : Test mode Electron natif

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run start
```

**Caractéristiques** :
- ✅ Fenêtre Electron native
- ✅ IPC bridges actifs
- ✅ Accès système complet
- ❌ Pas d'accès navigateur

### Mode 3 : WebUI Production

**Usage** : Simulation production

```powershell
# 1. Build
npm run package

# 2. Démarrage
node start-webui.js
```

**Caractéristiques** :
- ✅ Assets pré-compilés
- ✅ Performance optimale
- ❌ Pas de HMR
- ⏱️ Build ~2-3 minutes

### Mode 4 : WebUI avec Bun (Alternatif)

**Prérequis** : Bun installé

```powershell
bun run cli -- --webui
```

**Avantages** :
- ⚡ Démarrage plus rapide
- 🔄 Meilleure gestion mémoire

**Inconvénients** :
- ⚠️ Nécessite installation de Bun
- ⚠️ Pas sur tous les systèmes

## 🛠️ Procédure de Build Complète

### Build Development

```powershell
# 1. Nettoyer les anciens builds
Remove-Item -Recurse -Force out, node_modules\.vite -ErrorAction SilentlyContinue

# 2. Build
npm run package

# 3. Vérifier le build
Get-ChildItem out -Recurse | Measure-Object -Property Length -Sum
```

**Output attendu** :
```
out/
├── main/          # Main process
├── renderer/      # Frontend static files
└── preload/       # Preload scripts
```

### Build Production

```powershell
# Windows x64
npm run dist:win

# Résultat: dist/E-audit-Setup-1.8.25.exe
```

**Temps** : ~5-10 minutes  
**Taille** : ~200-300 MB

## ⚙️ Configuration Système

### Variables d'Environnement Requises

```powershell
# Mémoire Node.js (OBLIGATOIRE)
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Mode production (optionnel)
$env:NODE_ENV="production"

# Debug (optionnel)
$env:DEBUG="electron*"
```

### Vérification Prérequis

```powershell
# Node.js version
node --version    # Doit être >= 22, < 25

# npm version
npm --version     # Doit être >= 9

# Vérifier mémoire disponible
Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum | ForEach-Object {"{0:N2} GB" -f ($_.sum / 1GB)}
# Recommandé: >= 8 GB

# Vérifier espace disque
Get-PSDrive C | Select-Object Used,Free
# Recommandé: >= 10 GB libres
```

## 🐛 Dépannage Démarrage

### Problème 1 : "Page blanche" après démarrage

**Symptôme** : http://localhost:25808 affiche une page blanche

**Diagnostic** :
```powershell
# Vérifier les processus
Get-Process -Name "node", "electron" | Format-Table

# Vérifier les ports
netstat -ano | findstr "25808"
netstat -ano | findstr "5173"
```

**Solutions** :

#### A. Vite dev server pas démarré
```powershell
# Logs attendus
[WebUI] No renderer build found, proxying to Vite dev server
[ViteProxy] Error proxying GET /: ...
```

**Fix** : Attendre 30-60s que Vite compile

#### B. Cache Vite corrompu
```powershell
Remove-Item -Recurse -Force node_modules\.vite
npm run webui
```

#### C. Port 5173 déjà utilisé
```powershell
# Tuer le processus
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess
```

### Problème 2 : "Cannot find module"

**Symptôme** : 
```
Error: Cannot find module '@/common/storage'
```

**Solutions** :

#### A. node_modules corrompu
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

#### B. TypeScript paths non résolus
```powershell
# Vérifier tsconfig.json
npx tsc --showConfig
```

#### C. Cache npm
```powershell
npm cache clean --force
npm install
```

### Problème 3 : "Out of memory" (OOM)

**Symptôme** :
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Solutions** :

#### A. Augmenter mémoire Node.js
```powershell
$env:NODE_OPTIONS="--max-old-space-size=16384"  # 16GB
```

#### B. Nettoyer avant build
```powershell
Remove-Item -Recurse -Force out, dist, node_modules\.vite
```

#### C. Fermer applications gourmandes
```powershell
# Voir utilisation mémoire
Get-Process | Sort-Object WS -Descending | Select-Object -First 10
```

### Problème 4 : Port 25808 déjà utilisé

**Symptôme** :
```
Error: listen EADDRINUSE: address already in use :::25808
```

**Solutions** :

#### A. Tuer le processus
```powershell
$port = 25808
$processId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($processId) {
    Stop-Process -Id $processId -Force
}
```

#### B. Changer le port (temporaire)
Modifier `src/webserver/config/constants.ts` :
```typescript
export const DEFAULT_PORT = 25809;  // Nouveau port
```

### Problème 5 : "bun not found"

**Symptôme** : 
```
'bun' n'est pas reconnu en tant que commande
```

**Solutions** :

#### A. Utiliser npm au lieu de bun
```powershell
# Au lieu de: bun run cli -- --webui
npx electron-vite dev -- --webui
```

#### B. Installer Bun (optionnel)
```powershell
# Windows
irm bun.sh/install.ps1|iex
```

### Problème 6 : Build échoue avec erreur Vite

**Symptôme** :
```
[vite] error while building for production
```

**Solutions** :

#### A. Nettoyer complètement
```powershell
Remove-Item -Recurse -Force out, dist, node_modules\.vite, node_modules
npm install
npm run package
```

#### B. Vérifier dépendances
```powershell
npm audit
npm audit fix
```

#### C. Mode verbose
```powershell
npm run package -- --verbose
```

## 📊 Monitoring Démarrage

### Logs à Surveiller

#### 1. Console Terminal (Serveur)
```
[E-audit] app.whenReady resolved
[Extensions] Registry initialized
[WebUI] started: http://localhost:25808
[ACP] Detection completed, found X agents
```

#### 2. Console Navigateur (F12)
```
[AuthContext] Desktop mode - ...
[E-audit Cleanup] Starting cleanup...
[WebUI] Connected to server
```

### Commandes de Diagnostic

```powershell
# Vérifier que tout est OK
# 1. Processus actifs
Get-Process -Name "node", "electron" -ErrorAction SilentlyContinue

# 2. Ports ouverts
netstat -ano | findstr "25808 5173 9230"

# 3. Logs en temps réel
# (affichés dans le terminal où vous avez lancé npm run)

# 4. Test connexion serveur
Invoke-WebRequest -Uri "http://localhost:25808" -UseBasicParsing
```

## 🔄 Redémarrage Propre

### Procédure Complète

```powershell
# 1. Arrêter tous les processus
Get-Process -Name "node", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Nettoyer les caches
Remove-Item -Recurse -Force node_modules\.vite, out -ErrorAction SilentlyContinue

# 3. Attendre 5 secondes
Start-Sleep -Seconds 5

# 4. Relancer
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui

# 5. Attendre le message de confirmation (~30-60s)
# "WebUI started: http://localhost:25808"

# 6. Ouvrir le navigateur
Start-Process "http://localhost:25808"
```

### Script Automatique

Créer `restart-webui.ps1` :
```powershell
# Arrêter
Write-Host "Stopping processes..." -ForegroundColor Yellow
Get-Process -Name "node", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force

# Nettoyer
Write-Host "Cleaning cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.vite, out -ErrorAction SilentlyContinue

# Attendre
Start-Sleep -Seconds 5

# Relancer
Write-Host "Starting WebUI..." -ForegroundColor Green
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

## ✅ Checklist Démarrage Réussi

- [ ] `NODE_OPTIONS` défini (8192 MB)
- [ ] Port 25808 libre
- [ ] Port 5173 libre
- [ ] Node.js 22+ installé
- [ ] `node_modules` à jour
- [ ] Message "WebUI started" visible
- [ ] Aucune erreur dans terminal
- [ ] http://localhost:25808 accessible
- [ ] Page de login s'affiche
- [ ] Console navigateur sans erreurs

## 🎯 Temps de Démarrage Typiques

| Étape | Temps Attendu |
|-------|---------------|
| npm install (première fois) | 2-5 minutes |
| Démarrage WebUI (cache froid) | 45-60 secondes |
| Démarrage WebUI (cache chaud) | 20-30 secondes |
| Hot reload (après modification) | <1 seconde |
| Build complet | 2-3 minutes |
| Build production | 5-10 minutes |

---

**Prochain document** : [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture technique détaillée
