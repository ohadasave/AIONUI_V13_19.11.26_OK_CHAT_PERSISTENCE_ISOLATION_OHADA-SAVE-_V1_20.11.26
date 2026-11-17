# 🚀 DÉMARRAGE RAPIDE - Réparation Environnement

**Temps estimé** : 10-20 minutes  
**Requis** : Terminal Windows (Admin recommandé)

---

## ⚡ ACTION IMMÉDIATE

### 1. Ouvrir Terminal Admin

```
1. Clic droit sur Windows Terminal
2. "Exécuter en tant qu'administrateur"
```

### 2. Lancer Script Automatique

```powershell
# Aller au projet
cd G:\Aionui_client

# Test diagnostic SANS modification (5 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1 -DiagOnly

# Si diagnostic OK → Réparation complète (10-20 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1
```

### 3. Observer Logs Temps Réel

Le script affiche progression en direct :
```
=== 1/7  Node 22.22.0 via PATH de session ===
[OK] node v22.22.0 / npm 10.x.x

=== 2/7  Diagnostic réseau ===
[OK] registry https://registry.npmjs.org : 120 ms
[OK] GitHub releases : 450 ms

=== 3/7  Exclusions Windows Defender ===
[OK] Exclusions ajoutées

=== 4/7  Nettoyage node_modules ===
[OK] node_modules supprimé

=== 5/7  Installation npm surveillée ===
  [02:35] http fetch GET 200 https://registry.npmjs.org/@babel/core
  [05:12] http fetch GET 200 https://github.com/.../electron-v37...
  [08:40] ...
```

**Si blocage > 5 min sans activité** : Script arrête auto et génère logs

### 4. Vérifier Succès

À la fin :
```
[OK] Fichiers critiques présents
[OK] Aucun package corrompu (2100+ dossiers)

Environnement réparé.
=== Lancement de l'application ===
```

### 5. Tester Application

```
Credentials Admin :
Email : ohada.save@gmail.com
Password : LEADER00
```

---

## 🔧 OPTIONS SCRIPT

### Utiliser Node 24 au lieu de 22

```powershell
.\Doc_Probleme_Lancement\repair-env.ps1 -NodeVersion 24.21.0
```

### Déplacer Projet sur C:\ (Si G:\ lent)

```powershell
# Copier projet SANS node_modules
robocopy G:\Aionui_client C:\dev\Aionui_client /E /XD node_modules

# Lancer sur C:\
cd C:\dev\Aionui_client
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1 -ProjectDir C:\dev\Aionui_client
```

### Ne pas lancer app automatiquement

```powershell
.\Doc_Probleme_Lancement\repair-env.ps1 -NoLaunch
```

---

## ❌ SI ÉCHEC

### Scénario 1 : Timeout Même avec Script

**Logs générés** :
- `npm-install.err.log`
- `npm-install.out.log`

**Action** :
1. Lire dernière ligne `npm-install.err.log`
2. Identifier où blocage (registry ? GitHub ? package ?)
3. Ouvrir `PLAN_ACTION_MANUEL.md` Phase 1
4. Diagnostics ciblés selon erreur

### Scénario 2 : Erreur Compilation (Modules Natifs)

```
[!!] postinstall en erreur (code 1) : voir npm-postinstall.err.log
```

**Solution** :
```powershell
# Installer Visual Studio Build Tools (si modules natifs requis)
# OU ignorer si modules natifs pas critiques pour votre usage
npm run start  # Tester si app démarre quand même
```

### Scénario 3 : G:\ Détecté Comme Réseau/USB

```
[KO] Projet sur lecteur réseau/USB. Déplacer vers C:\
```

**Solution** :
```powershell
# Copier vers C:\
robocopy G:\Aionui_client C:\dev\Aionui_client /E /XD node_modules
cd C:\dev\Aionui_client
.\Doc_Probleme_Lancement\repair-env.ps1
```

---

## 🆘 PLAN B (Si Script Ne Fonctionne Pas)

### Option 1 : yarn

```powershell
# Installer yarn
winget install Yarn.Yarn

# Nouveau terminal
powershell -NoProfile
cd G:\Aionui_client

# Ajouter Node au PATH
$env:Path = "C:\Users\LEADER\AppData\Local\nvm\v22.22.0;$env:Path"

# Supprimer node_modules
Remove-Item -Recurse -Force node_modules

# Installer avec yarn
yarn install --ignore-engines --network-timeout 60000

# Lancer
yarn start
```

### Option 2 : pnpm

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

### Option 3 : Miroirs (Si réseau lent)

```powershell
# Registry npm
npm config set registry https://registry.npmmirror.com

# Binaire Electron
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"

# Réessayer script
.\Doc_Probleme_Lancement\repair-env.ps1
```

---

## 📚 DOCUMENTATION COMPLÈTE

| Fichier | Usage |
|---------|-------|
| **QUICK_START.md** | **Ce fichier (démarrage rapide)** |
| **repair-env.ps1** | **Script automatique** |
| **SYNTHESE_CONSULTATION_3_LLM.md** | Consensus 3 LLMs + solutions |
| **PLAN_ACTION_MANUEL.md** | Procédure détaillée 7 phases |
| **README.md** | Index complet documentation |

---

## ⏱️ DURÉES ESTIMÉES

| Action | Durée |
|--------|-------|
| Diagnostic (`-DiagOnly`) | 5 min |
| Script complet | 10-20 min |
| Plan manuel | 20-30 min |
| yarn/pnpm alternative | 10-15 min |

---

## 📞 SUPPORT

**Si TOUT échoue** :

1. Collecter logs :
```powershell
# Sauvegarder logs
New-Item -ItemType Directory -Force .\logs-debug
Copy-Item npm-*.log .\logs-debug\
Copy-Item "$env:LOCALAPPDATA\npm-cache\_logs\*.log" .\logs-debug\
Compress-Archive -Path .\logs-debug -DestinationPath logs-debug.zip
```

2. Consulter :
- npm Discord : https://discord.gg/npm
- StackOverflow : Tags `npm`, `node.js`, `windows`, `electron`
- GitHub Issues : npm/cli, coreybutler/nvm-windows

3. Envoyer :
- `logs-debug.zip`
- `SYNTHESE_CONSULTATION_3_LLM.md`
- Output dernière tentative

---

**PRÊT ?**

```powershell
cd G:\Aionui_client
.\Doc_Probleme_Lancement\repair-env.ps1 -DiagOnly
```

**BONNE CHANCE ! 🚀**
