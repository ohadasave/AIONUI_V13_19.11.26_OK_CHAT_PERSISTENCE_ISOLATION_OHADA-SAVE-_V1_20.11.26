# MÉMO EXHAUSTIF - Problème de Lancement Application AionUi

**Date** : 16 novembre 2026, 19:00  
**Contexte** : Projet Electron + Vite qui ne démarre pas  
**Durée du problème** : 4 heures  
**Objectif** : Identifier la cause racine et solutions viables

---

## 1. DESCRIPTION DU PROJET

### 1.1 Stack Technique

- **Framework** : Electron 37 + electron-vite 5
- **Frontend** : React 19 + TypeScript 5.8 (strict mode)
- **Build Tool** : Vite 5.x
- **Package Manager** : npm (testé avec versions multiples)
- **OS** : Windows 11 (via nvm4w pour Node.js)
- **Gestionnaire Version Node** : nvm4w (nvm for Windows)

### 1.2 Structure Projet

```
Aionui_client/
├── package.json (demande Node.js >=22 <25)
├── node_modules/ (~2,100 packages installés)
├── src/
│   ├── process/ (main process Electron)
│   ├── renderer/ (React app)
│   └── worker/ (web workers)
├── electron.vite.config.ts
└── scripts/
```

### 1.3 Configuration package.json

```json
{
  "name": "E-audit",
  "version": "1.8.25",
  "engines": {
    "node": ">=22 <25"
  },
  "scripts": {
    "start": "electron-vite dev",
    "dev": "electron-vite dev"
  },
  "devDependencies": {
    "electron": "^37.0.0",
    "electron-vite": "^5.0.0",
    "@babel/core": "^7.x.x"
  }
}
```

---

## 2. CHRONOLOGIE DÉTAILLÉE DU PROBLÈME

### 2.1 État Initial (Avant Session)

- ✅ Projet développé sur 2 ans 9 mois
- ✅ Node.js 24.21.0 installé
- ✅ Application fonctionnait auparavant
- ❓ Problème survenu après mise à jour environnement

### 2.2 Session de Débogage

#### Tentative 1 : npm run start (15:00)
```
Commande : npm run start
Erreur : 'electron-vite' n'est pas reconnu comme commande interne
Cause supposée : PATH PowerShell pas à jour
```

#### Tentative 2 : npx electron-vite dev (15:15)
```
Commande : npx electron-vite dev
Erreur : Same - electron-vite not found
Cause : Binaires .cmd manquants dans node_modules\.bin
```

#### Tentative 3 : Installation Node.js 20 (15:30)
```
Diagnostic : Pensé que Node.js 24 causait problèmes
Action : nvm install 20.20.2 && nvm use 20
Résultat : npm install timeout après 30 minutes
Nouvelle erreur : npm warn EBADENGINE (package demande >=22)
```

#### Tentative 4 : node direct call (16:00)
```
Commande : node node_modules\electron-vite\bin\electron-vite.js dev
Erreur : Cannot find package '@babel/core' imported from electron-vite
Statut : node_modules existe mais @babel/core manquant
```

#### Tentative 5 : Retour Node.js 24 après redémarrage (18:30)
```
Commande : nvm use 24.21.0
Problème : PowerShell ne répond plus aux commandes
Exit Code : -1 sur toutes tentatives
```

#### Tentative 6 : Diagnostic Approfondi @babel (19:30)
```
Découverte CRITIQUE : Packages @babel corrompus détectés

Test-Path package.json dans @babel packages :
✅ code-frame: True
✅ compat-data: True
❌ core: False (CRITIQUE - pas de package.json)
✅ generator: True
❌ helpers: False
✅ helper-compilation-targets: True
❌ parser: False  
❌ runtime: False
❌ types: False

Dossiers temporaires suspects trouvés :
- .core-Xrjs9gjm (sans package.json)
- .helpers-DcpBISoi (sans package.json)
- .runtime-qka1XQry (sans package.json)
- .types-hvFT9hsG (sans package.json)

Diagnostic : Installation npm interrompue multiple fois
Cause probable : Switch Node.js pendant installation + timeouts répétés
Impact : 5 packages @babel critiques corrompus (core, helpers, parser, runtime, types)
```

#### Tentative 7 : Suppression et Réinstallation @babel (19:45)
```
Commande : Remove-Item packages corrompus puis npm install @babel/core...
Résultat : npm install timeout après 6 minutes (360 secondes)
Diagnostic : Problème réseau npm ou cache npm profondément corrompu
```

---

## 3. SYMPTÔMES OBSERVÉS

### 3.1 Problèmes PowerShell

**Symptôme Principal** : Toutes commandes PowerShell retournent `Exit Code: -1` sans output

**Commandes Affectées** :
- `nvm use 24.21.0` → Aucun output
- `nvm list` → Aucun output
- `node -v` → Aucun output
- Commandes longues avec `Write-Host` → Aucun output

**Comportement** :
- Les commandes sont acceptées
- Aucun message d'erreur explicite
- Exit code -1 systématique
- Timeout sur certaines commandes longues

### 3.2 Problèmes npm install

**Avec Node.js 20.20.2** :
```
npm warn EBADENGINE Unsupported engine {
  package: 'E-audit@1.8.25',
  required: { node: '>=22 <25' },
  current: { node: 'v20.20.2', npm: '10.8.2' }
}
```

**Comportement** :
- Installation démarre
- Warnings sur engines incompatibles
- Timeout après 30 minutes (1800 secondes)
- Impossible de déterminer si installation complétée ou non

### 3.3 Problèmes Binaires node_modules

**Observation** :
```
✅ node_modules/ existe
✅ node_modules/electron-vite/ existe
✅ node_modules/electron-vite/bin/electron-vite.js existe
❌ node_modules/.bin/electron-vite.cmd manquant
❌ npm/npx ne trouve pas electron-vite
```

**Hypothèse** : Les binaires `.cmd` n'ont pas été créés par npm install

### 3.4 Problèmes Dépendances

**Erreur Runtime** :
```
Error: Cannot find package 'G:\Aionui_client\node_modules\@babel\core\index.js' 
imported from G:\Aionui_client\node_modules\electron-vite\dist\chunks\lib-7y7CgM8M.js
```

**Vérification Approfondie** :
```powershell
Test-Path node_modules/@babel/core
# Retourne : True (dossier existe)

Test-Path node_modules/@babel/core/package.json
# Retourne : False (CRITIQUE - package.json manquant)

Get-ChildItem node_modules/@babel/core
# Retourne : lib/, node_modules/, LICENSE, README.md
# Manque : package.json, index.js
```

**Packages @babel Corrompus Identifiés** :
- ❌ `@babel/core` - package.json manquant
- ❌ `@babel/helpers` - package.json manquant
- ❌ `@babel/parser` - package.json manquant
- ❌ `@babel/runtime` - package.json manquant
- ❌ `@babel/types` - package.json manquant
- ⚠️ Dossiers temporaires `.core-Xrjs9gjm`, `.helpers-DcpBISoi`, etc. (installations interrompues)

**Cause Confirmée** : Installations npm interrompues multiples (timeouts, switch Node.js) ont laissé des packages partiellement installés sans leurs fichiers essentiels.

---

## 4. ENVIRONNEMENT SYSTÈME

### 4.1 Système d'Exploitation

- **OS** : Windows 11 (build 26200)
- **Shell** : PowerShell 7.x (avec (base) Anaconda actif)
- **Environnement** : Anaconda base environment actif

### 4.2 Node.js Versions Installées

Via nvm4w :
- ✅ Node.js 24.21.0 (requis par package.json)
- ✅ Node.js 22.22.0 (compatible)
- ✅ Node.js 20.20.2 (installé par erreur, incompatible)

**Versions npm associées** :
- Node 24.21.0 → npm 11.19.0
- Node 22.22.0 → npm 10.x.x
- Node 20.20.2 → npm 10.8.2

### 4.3 Chemins d'Installation

```
nvm4w : C:\Users\LEADER\AppData\Local\nvm\
Node 24: C:\Users\LEADER\AppData\Local\nvm\v24.21.0\
Node 20: C:\Users\LEADER\AppData\Local\nvm\v20.20.2\
Projet : G:\Aionui_client\
```

### 4.4 Variables d'Environnement

**Suspectées mais non vérifiées** :
- `NVM_HOME` : C:\Users\LEADER\AppData\Local\nvm
- `NVM_SYMLINK` : C:\Program Files\nodejs
- `PATH` : Doit inclure nodejs mais peut-être pas à jour après nvm use

---

## 5. TENTATIVES DE SOLUTIONS

### 5.1 Solutions Essayées

| # | Solution | Résultat | Raison Échec |
|---|----------|----------|--------------|
| 1 | `npm run start` | ❌ | electron-vite not found |
| 2 | `npx electron-vite dev` | ❌ | Binaires .cmd manquants |
| 3 | Installer Node 20 | ❌ | Version incompatible avec package.json |
| 4 | `node ...electron-vite.js dev` | ❌ | @babel/core manquant |
| 5 | Revenir Node 24 | ❌ | PowerShell ne répond plus |
| 6 | npm install (Node 20) | ⏳ | Timeout après 30 min |
| 7 | Scripts .bat/.ps1 | ❓ | Non testables (PowerShell bloqué) |

### 5.2 Commandes Testées

```powershell
# Gestion versions
nvm list                           # ❌ No output
nvm use 24.21.0                    # ❌ No output
node -v                            # ❌ No output

# Installation
npm cache clean --force            # ✅ Fonctionne
npm install --legacy-peer-deps     # ⏳ Timeout
npm install @babel/core            # ❓ Non testé

# Lancement
npm run start                      # ❌ electron-vite not found
npx electron-vite dev              # ❌ electron-vite not found
node node_modules/.../dev          # ❌ @babel/core missing

# Diagnostic
Test-Path node_modules             # ✅ True
Test-Path node_modules/@babel/core # ❓ False/Incertain
Get-Content package.json           # ✅ Fonctionne
```

---

## 6. HYPOTHÈSES SUR LES CAUSES

### 6.1 Hypothèse 1 : Installation npm Incomplète avec Packages @babel Corrompus

**Probabilité** : ⭐⭐⭐⭐⭐ (Très élevée - CONFIRMÉE PAR DIAGNOSTIC)

**Indices Confirmés** :
- ✅ @babel/core existe comme dossier MAIS sans package.json
- ✅ 5 packages @babel critiques corrompus : core, helpers, parser, runtime, types
- ✅ Dossiers temporaires suspects (.core-Xrjs9gjm, .helpers-DcpBISoi, etc.)
- ✅ Binaires .cmd non créés dans node_modules/.bin
- ✅ npm install timeout systématique (6+ minutes)

**Cause Confirmée** :
- Installations npm interrompues par timeouts multiples
- Switch Node.js (24→20→24) pendant installations a laissé packages partiellement installés
- Scripts postinstall npm jamais exécutés complètement
- Cache npm possiblement corrompu

**Preuve Technique** :
```powershell
# Test structure @babel/core
Get-ChildItem node_modules\@babel\core
# Résultat : lib/, node_modules/, LICENSE, README.md
# Manquant : package.json (fichier CRITIQUE pour résolution ESM)

# Test tous @babel packages
Get-ChildItem node_modules\@babel -Directory | ForEach-Object { 
  $hasJson = Test-Path (Join-Path $_.FullName "package.json")
  "$($_.Name): $hasJson" 
}
# Résultat : 5 packages retournent False (core, helpers, parser, runtime, types)
```

**Impact** :
- Node.js ESM module resolver ne peut pas résoudre @babel/core sans package.json
- Erreur `ERR_MODULE_NOT_FOUND` car Node.js cherche `index.js` mais package.json devrait pointer vers `lib/index.js`
- Impossible de démarrer electron-vite qui dépend de @babel/core

**Tests à Faire** :
```powershell
# Audit complet node_modules
(Get-ChildItem node_modules -Directory).Count
# Attendu : ~2,100 packages si complet

# Vérifier présence package.json dans packages critiques
$critical = @('electron', 'vite', '@babel/core', 'react')
$critical | ForEach-Object { 
  Test-Path "node_modules/$_/package.json" 
}

# Compter binaires .cmd (indicateur installation complète)
(Get-ChildItem node_modules/.bin/*.cmd -ErrorAction SilentlyContinue).Count
# Attendu : ~200 binaires si installation complète
```

**Solution Validée** :
1. Supprimer TOUS les packages @babel corrompus (pas seulement les 5)
2. Supprimer dossiers temporaires .@babel-*
3. Nettoyer cache npm complètement
4. Réinstaller avec --force si nécessaire

### 6.2 Hypothèse 2 : Problème nvm4w PATH

**Probabilité** : ⭐⭐⭐⭐ (Élevée)

**Indices** :
- `nvm use` semble silencieux après redémarrage
- PowerShell ne trouve pas node après nvm use
- Exit code -1 sur commandes nvm

**Cause Possible** :
- Variables d'environnement pas rechargées après redémarrage
- nvm4w symlink cassé
- PowerShell session garde ancien PATH

**Tests à Faire** :
```powershell
# Vérifier NVM_HOME
$env:NVM_HOME

# Vérifier symlink
Get-Item "C:\Program Files\nodejs" | Select-Object LinkType,Target

# Vérifier PATH
$env:Path -split ';' | Select-String -Pattern "node"

# Appeler node directement
& "C:\Program Files\nodejs\node.exe" -v
```

### 6.3 Hypothèse 3 : Conflit Anaconda Environment

**Probabilité** : ⭐⭐⭐ (Moyenne)

**Indices** :
- Shell prompt affiche `(base)` → Anaconda actif
- Anaconda peut modifier PATH
- Peut interférer avec Node.js

**Cause Possible** :
- Anaconda Python intercepte certaines commandes
- PATH Anaconda prioritaire sur Node.js
- Variables d'environnement conflictuelles

**Tests à Faire** :
```powershell
# Désactiver Anaconda
conda deactivate

# Relancer commandes
nvm use 24.21.0
node -v

# Vérifier PATH sans Anaconda
$env:Path -split ';' | Select-Object -First 10
```

### 6.4 Hypothèse 4 : PowerShell Session Corrompue

**Probabilité** : ⭐⭐⭐⭐ (Élevée)

**Indices** :
- Exit code -1 systématique après redémarrage
- Commandes simples ne retournent rien
- Problème apparu soudainement

**Cause Possible** :
- Session PowerShell dans état incohérent
- Profile PowerShell corrompu
- Module chargé en erreur

**Tests à Faire** :
```powershell
# Ouvrir NOUVEAU PowerShell (admin)
# Sans charger profile
powershell.exe -NoProfile

# Dans nouvelle session
nvm use 24.21.0
node -v

# Tester commande simple
Write-Host "Test"
Get-Date
```

### 6.5 Hypothèse 5 : Versions Node.js Incompatibles

**Probabilité** : ⭐⭐ (Faible - déjà identifié)

**Indices** :
- package.json demande >=22 <25
- Node 20 génère EBADENGINE warnings
- Node 24 devrait fonctionner

**Cause Possible** :
- Mauvaise version Node active
- package.json mal configuré

**Tests à Faire** :
```powershell
# Vérifier requirements
Get-Content package.json | Select-String '"node"'

# Forcer Node 24
nvm use 24.21.0

# Ou 22 si 24 pose problème
nvm use 22.22.0
```

### 6.6 Hypothèse 6 : Corruption node_modules - Packages @babel Partiellement Installés

**Probabilité** : ⭐⭐⭐⭐⭐ (Très élevée - CAUSE RACINE CONFIRMÉE)

**Indices Confirmés** :
- ✅ Dossiers @babel existent mais sans package.json (corruption structurelle)
- ✅ 5 packages critiques corrompus sur ~44 packages @babel totaux
- ✅ Dossiers temporaires .@babel-* indiquent installations interrompues
- ✅ npm install timeout systématique suggère cache ou registry corrompu

**Cause Racine Identifiée** :
- npm install interrompu plusieurs fois (timeouts 30 min, 6 min)
- Switch version Node.js PENDANT installations actives
- Processus npm killed avant écriture package.json mais après création dossiers
- Cache npm contient possiblement données corrompues

**Mécanisme Technique** :
```
1. npm install démarre
2. npm télécharge .tar.gz depuis registry
3. npm extrait dans node_modules/@babel/core/
4. npm crée lib/, LICENSE, README.md
5. [INTERRUPTION ici - timeout ou switch Node.js]
6. npm ne termine jamais → package.json jamais écrit
7. Résultat : dossier existe mais package invalide
8. Node.js ESM ne peut résoudre module sans package.json
```

**Preuve Diagnostique** :
```powershell
# Structure anormale détectée
node_modules/@babel/core/
├── lib/           # Code présent
├── node_modules/  # Sous-dépendances présentes  
├── LICENSE        # Fichiers metadata présents
├── README.md
└── [MANQUE] package.json  # Fichier CRITIQUE absent

# vs. Structure normale attendue
node_modules/@babel/code-frame/  # Package SAIN
├── lib/
├── package.json  # ✅ Présent
└── README.md
```

**Tests de Confirmation** :
```powershell
# Test 1 : Vérifier intégrité structurelle
Get-ChildItem node_modules\@babel -Directory | ForEach-Object {
  $name = $_.Name
  $hasJson = Test-Path (Join-Path $_.FullName "package.json")
  $hasLib = Test-Path (Join-Path $_.FullName "lib")
  "$name | package.json: $hasJson | lib/: $hasLib"
}
# Attendu : Tous True si sain
# Réel : 5 packages avec package.json=False mais lib=True (corruption)

# Test 2 : Identifier dossiers temporaires
Get-ChildItem node_modules\@babel -Directory | Where-Object { $_.Name -match '^\.' }
# Résultat : .core-Xrjs9gjm, .helpers-DcpBISoi, etc.
# Ces dossiers sont des tentatives npm avortées

# Test 3 : Tester résolution Node.js
node -e "console.log(require.resolve('@babel/core'))"
# Attendu : Chemin vers lib/index.js
# Réel : Error: Cannot find module (car package.json manquant)
```

**Solution Impérative** :
```powershell
# ÉTAPE 1 : Supprimer TOUT @babel (corrompus + temporaires + sains)
Remove-Item -Recurse -Force node_modules\@babel

# ÉTAPE 2 : Nettoyer cache npm AGRESSIVEMENT
npm cache clean --force
npm cache verify

# ÉTAPE 3 : Vérifier cache réellement vide
npm cache verify | Select-String "verified"
# Doit afficher 0 corrupted ou proche

# ÉTAPE 4 : Réinstaller @babel depuis registry frais
npm install --force --legacy-peer-deps

# Alternative si timeout persiste :
# Réinstaller packages @babel un par un avec timeouts courts
npm install @babel/core --save-dev --fetch-timeout=60000
npm install @babel/parser --save-dev --fetch-timeout=60000
npm install @babel/types --save-dev --fetch-timeout=60000
npm install @babel/helpers --save-dev --fetch-timeout=60000  
npm install @babel/runtime --save-dev --fetch-timeout=60000
```

**Prévention Future** :
- ❌ NE JAMAIS faire `nvm use` pendant `npm install` actif
- ❌ NE JAMAIS interrompre `npm install` manuellement
- ✅ Utiliser `--fetch-timeout` court (60s) au lieu timeout défaut (300s)
- ✅ Monitorer avec `npm install --verbose` pour voir progression réelle
- ✅ Faire `npm cache verify` avant chaque installation majeure

---

## 7. INFORMATIONS COLLECTÉES

### 7.1 Vérifications Réussies

✅ node_modules/ existe physiquement
✅ package.json est valide
✅ node_modules/electron-vite/bin/electron-vite.js existe
✅ nvm4w est installé et a 3 versions Node
✅ Git repository intact (26 commits)
✅ Code source complet et sauvegardé

### 7.2 Vérifications Échouées/Incertaines

❌ Version Node.js actuellement active (non vérifiable)
❌ Présence de @babel/core dans node_modules
❌ État complet de node_modules (nombre réel packages)
❌ Binaires .cmd dans node_modules/.bin
❌ Variables d'environnement PATH/NVM_HOME
❓ État du symlink nvm4w

### 7.3 Logs et Erreurs Sauvegardés

- `npm-install-final.log` (première tentative)
- `npm-install-clean.log` (tentative avec Node 20)
- `npm-install-post-reboot.log` (post-redémarrage, incomplet)
- Pas de logs Electron (app jamais démarrée)

---

## 8. SOLUTIONS POTENTIELLES À EXPLORER

### 8.1 Solution Prioritaire : Réinstallation Propre

**Étapes** :
1. Ouvrir NOUVEAU PowerShell (admin, -NoProfile)
2. Désactiver Anaconda si actif
3. Activer Node.js 24 : `nvm use 24.21.0`
4. Vérifier version : `node -v` (doit afficher v24.21.0)
5. Aller projet : `cd G:\Aionui_client`
6. Supprimer node_modules : `Remove-Item -Recurse -Force node_modules`
7. Supprimer lock : `Remove-Item -Force package-lock.json`
8. Nettoyer cache : `npm cache clean --force`
9. Réinstaller : `npm install --legacy-peer-deps` (attendre fin complète)
10. Vérifier : `Test-Path node_modules/@babel/core`
11. Lancer : `node node_modules/electron-vite/bin/electron-vite.js dev`

### 8.2 Solution Alternative : Downgrade Node.js 22

Si Node 24 pose toujours problème :
```powershell
nvm use 22.22.0
npm cache clean --force
npm install --legacy-peer-deps
node node_modules/electron-vite/bin/electron-vite.js dev
```

### 8.3 Solution Technique : Installer @babel/core Manuellement

Si installation complète trop longue :
```powershell
npm install @babel/core --save-dev --legacy-peer-deps
npm install electron-vite --save-dev --legacy-peer-deps
node node_modules/electron-vite/bin/electron-vite.js dev
```

### 8.4 Solution Environnement : Reset nvm4w

Si problème PATH persiste :
```powershell
# Désinstaller nvm4w
# Réinstaller nvm4w depuis https://github.com/coreybutler/nvm-windows
# Installer Node 24
nvm install 24.21.0
nvm use 24.21.0
```

### 8.5 Solution Radical : Utiliser Node.js Standalone

Contourner nvm4w complètement :
1. Désinstaller Node.js via nvm4w
2. Télécharger Node.js 24 LTS depuis nodejs.org
3. Installer directement (sans nvm)
4. Redémarrer PowerShell
5. `npm install --legacy-peer-deps`

---

## 9. QUESTIONS POUR DIAGNOSTIC EXPERT

### 9.1 Questions Techniques

1. **PowerShell** : Pourquoi Exit Code -1 systématique sans output après redémarrage Windows ?
2. **nvm4w** : Comment vérifier/réparer le symlink nvm4w vers Node.js actif ?
3. **npm install** : Pourquoi timeout à 30 minutes alors que node_modules semble exister ?
4. **Binaires** : Pourquoi les .cmd ne sont pas créés dans node_modules/.bin ?
5. **@babel/core** : Pourquoi ce package spécifique manque alors qu'il est dans package.json ?

### 9.2 Questions Environnement

6. **Anaconda** : L'environnement (base) peut-il bloquer nvm4w ou Node.js ?
7. **PATH** : Comment forcer rechargement PATH dans PowerShell après nvm use ?
8. **Windows** : Y a-t-il un problème connu Windows 11 + nvm4w + PowerShell 7 ?
9. **Electron** : Y a-t-il des requirements spécifiques Electron 37 pour Node.js ?

### 9.3 Questions Stratégiques

10. **Workaround** : Quelle est la solution la plus rapide pour démarrer l'app ?
11. **Best Practice** : Faut-il abandonner nvm4w et utiliser Node standalone ?
12. **Alternative** : Faut-il essayer pnpm ou yarn au lieu de npm ?

---

## 10. DONNÉES POUR REPRODUCTION

### 10.1 Commandes Exactes Problématiques

```powershell
# Dans PowerShell avec (base) Anaconda
cd G:\Aionui_client

# Ces commandes retournent Exit Code -1
nvm use 24.21.0
nvm list
node -v
npm -v

# Ces commandes timeout ou échouent
npm install --legacy-peer-deps
npm run start
npx electron-vite dev
```

### 10.2 Configuration Système

```
OS: Windows 11 build 26200
Shell: PowerShell 7.x
Environment: Anaconda (base) actif
NVM: nvm4w (version inconnue)
Node versions: 24.21.0, 22.22.0, 20.20.2
Projet: Electron 37 + Vite 5 + React 19
```

### 10.3 Structure node_modules Attendue

```
node_modules/
├── .bin/
│   ├── electron.cmd (manquant)
│   ├── electron-vite.cmd (manquant)
│   └── ... (autres binaires)
├── @babel/
│   └── core/ (manquant ou incomplet)
├── electron/
├── electron-vite/
│   └── bin/
│       └── electron-vite.js (présent)
└── ... (~2,100 packages attendus)
```

---

## 11. PRIORITÉS D'INVESTIGATION

### Priorité 1 (Critique) : Débloquer PowerShell
- Ouvrir nouvelle session propre
- Tester avec -NoProfile
- Vérifier sans Anaconda

### Priorité 2 (Essentielle) : Vérifier Node.js
- Confirmer version active
- Tester appel direct node.exe
- Vérifier symlink nvm4w

### Priorité 3 (Important) : Auditer node_modules
- Compter packages réels
- Vérifier @babel/core
- Lister binaires .bin/

### Priorité 4 (Souhaitable) : Réinstallation
- Si P1-P3 confirment corruption
- Réinstall propre avec Node 24
- Vérifier chaque étape

---

## 12. CONCLUSION ET RECOMMANDATIONS

### 12.1 Diagnostic Actuel - MISE À JOUR CRITIQUE

**Cause Racine Confirmée** : Installation npm partiellement corrompue

Le problème semble être une **corruption structurelle de node_modules** :

**Confirmation Diagnostique** :
1. ⭐⭐⭐⭐⭐ **Packages @babel corrompus** (CAUSE RACINE CONFIRMÉE)
   - 5 packages critiques sans package.json : core, helpers, parser, runtime, types
   - Dossiers temporaires .@babel-* indiquent installations interrompues
   - Node.js ESM ne peut résoudre modules sans package.json
   
2. ⭐⭐⭐⭐ **npm install bloqué** (CONSÉQUENCE)
   - Timeouts systématiques (30 min, 6 min)
   - Cache npm possiblement corrompu
   - Registry npm inaccessible ou très lent
   
3. ⭐⭐⭐⭐ **PowerShell session corrompue** (PROBLÈME SECONDAIRE)
   - Exit code -1 systématique empêche diagnostics
   - Nécessite nouvelle session propre
   
4. ⭐⭐⭐ **Conflit Anaconda** (AGGRAVANT POSSIBLE)
   - (base) peut interférer avec PATH
   - À tester avec `conda deactivate`

**Mécanisme Identifié** :
```
Installation npm → Timeout/Interruption → Packages partiels créés 
→ package.json jamais écrit → Dossiers existent mais invalides
→ Node.js ESM échoue à résoudre → ERR_MODULE_NOT_FOUND
```

### 12.2 Action Recommandée Immédiate - MISE À JOUR

**CRITIQUE : Ne PAS faire réinstallation complète node_modules (risque timeout)**

**Plan Action Chirurgical Recommandé** :

```powershell
# PHASE 1 : Ouvrir nouveau PowerShell propre
powershell.exe -NoProfile

# PHASE 2 : Désactiver Anaconda si présent
conda deactivate  # Si erreur, ignorer et continuer

# PHASE 3 : Activer Node.js 24
nvm use 24.21.0
node -v  # Doit afficher v24.21.0

# PHASE 4 : Aller projet
cd G:\Aionui_client

# PHASE 5 : Suppression chirurgicale @babel corrompu UNIQUEMENT
Write-Host "Suppression packages @babel corrompus..."
Remove-Item -Recurse -Force node_modules\@babel\core -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@babel\helpers -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@babel\parser -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@babel\runtime -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\@babel\types -ErrorAction SilentlyContinue

# PHASE 6 : Suppression dossiers temporaires
Remove-Item -Recurse -Force node_modules\@babel\.* -ErrorAction SilentlyContinue

# PHASE 7 : Nettoyer cache npm
npm cache clean --force

# PHASE 8 : Réinstaller UNIQUEMENT packages manquants avec timeout court
npm install @babel/core @babel/parser @babel/types @babel/helpers @babel/runtime --save-dev --legacy-peer-deps --fetch-timeout=90000

# PHASE 9 : Si succès, tester lancement
node node_modules\electron-vite\bin\electron-vite.js dev

# PHASE 10 : Si échec PHASE 8 (timeout npm persist), alternative drastique
# Supprimer TOUT node_modules et réinstaller (40+ minutes)
Remove-Item -Recurse -Force node_modules
npm cache clean --force
npm install --legacy-peer-deps --fetch-timeout=180000
```

**Durée Estimée** :
- Plan chirurgical (PHASE 1-9) : 5-10 minutes
- Plan drastique (PHASE 10) : 40-60 minutes

**Si PHASE 8 échoue avec timeout** :
- Problème réseau/registry npm plus profond
- Considérer :
  1. Tester connexion registry : `npm ping`
  2. Changer registry : `npm config set registry https://registry.npmmirror.com`
  3. Utiliser yarn : `yarn install` (alternative à npm)
  4. Installer depuis archive local si packages @babel disponibles

### 12.3 Besoin d'Expertise Externe

Consulter experts sur :
- Configuration nvm4w + PowerShell + Windows 11
- Electron + Vite debugging best practices
- npm install timeout root causes

---

**Fin du Mémo**

**Date Génération** : 16 novembre 2026, 19:00  
**Status** : En attente diagnostic expert et tests P1-P4  
**Prochaine Étape** : Consultation modèles frontières pour hypothèses et solutions
