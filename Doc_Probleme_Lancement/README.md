# Documentation Problème Lancement AionUi

**Date Création** : 16 novembre 2026  
**Status** : EN COURS - Corruption packages @babel identifiée, npm timeout bloque réparation  
**Durée** : 5+ heures de débogage

---

## 📋 RÉSUMÉ SITUATION

### Problème
Application Electron 37 + Vite 5 ne démarre pas avec erreur `ERR_MODULE_NOT_FOUND` sur `@babel/core`

### Cause Racine
**5 packages @babel corrompus** (sans package.json) dus à installations npm interrompues multiples

### Blocage Actuel  
**npm install timeout systématique** (6-30 min) empêche réparation des packages

### Objectif
Débloquer npm install ou trouver solution alternative pour réparer @babel packages

---

## 📁 FICHIERS DOCUMENTATION

### 1. ⭐ **repair-env.ps1** (SOLUTION AUTOMATISÉE)
**Type** : Script PowerShell automatique  
**Auteur** : Claude Opus  
**Contenu** :
- Diagnostic réseau automatique (npm + GitHub)
- Contournement nvm4w via PATH
- Suppression rapide node_modules (cmd)
- Installation surveillée (arrêt auto si blocage 5 min)
- Electron postinstall séparé
- Vérification intégrité finale

**Utilisation** :
```powershell
# Test diagnostic seulement
powershell -NoProfile -ExecutionPolicy Bypass -File .\repair-env.ps1 -DiagOnly

# Réparation complète (10-20 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\repair-env.ps1
```

### 2. **REPONSE CONSULTATION LLM.txt**
**Type** : Réponses des 3 LLMs consultés  
**Contenu** :
- Claude Opus : Script + diagnostic cause racine
- Claude Sonnet : Plan manuel 7 phases + alternatives
- Gemini Hydrogen : Analyse senior + solutions classées

**Utilisation** : Comprendre consensus 3 modèles IA experts

### 3. **PLAN_ACTION_MANUEL.md** (GUIDE COMPLET)
**Type** : Procédure pas-à-pas détaillée  
**Contenu** :
- 7 phases avec commandes exactes
- Diagnostics interprétation résultats
- 3 alternatives (yarn, pnpm, copie)
- Prévention future (config .npmrc, scripts)
- Escalade support (logs à collecter)

**Utilisation** : Si script `repair-env.ps1` échoue ou besoin comprendre détails

### 4. **MEMO_PROBLEME_LANCEMENT_EXHAUSTIF.md**
**Type** : Analyse technique complète  
**Contenu** :
- 12 sections exhaustives
- Chronologie détaillée (7 tentatives)
- 6 hypothèses avec probabilités (MISE À JOUR avec corruption confirmée)
- 8 solutions potentielles
- 12 questions spécifiques experts

**Utilisation** : Document de référence pour comprendre historique problème

### 5. **PROMPT_CONSULTATION_MODELES.md**
**Type** : Prompt structuré pour LLMs externes  
**Contenu** :
- Contexte résumé
- Symptômes avec diagnostic corruption
- Hypothèses confirmées
- Questions techniques ciblées
- Format réponse attendu

**Utilisation** : Copier-coller vers Claude/GPT-4/Gemini pour consultation externe

### 6. **DIAGNOSTIC_FINAL_BABEL_CORRUPTION.md**
**Type** : Preuve technique corruption  
**Contenu** :
- Tests PowerShell exécutés avec résultats
- Structure packages corrompus (5/44)
- Mécanisme corruption identifié (npm interrupted)
- Tentatives réparation échouées (timeouts)
- 6 solutions à tester priorisées

**Utilisation** : Référence technique pour experts npm/Node.js

### 7. **SOLUTION_FINALE_BABEL.md**
**Type** : Document diagnostic initial  
**Utilisation** : Archive historique (remplacé par documents mis à jour)

### 8. **README.md** (ce fichier)
**Type** : Index et guide navigation  
**Utilisation** : Point d'entrée documentation

---

## 🔍 DIAGNOSTIC RAPIDE

### Commandes Vérification

```powershell
# Vérifier structure @babel/core
Get-ChildItem node_modules\@babel\core
# Attendu : lib/, node_modules/, LICENSE, README.md, package.json
# Actuel : package.json MANQUANT

# Test présence package.json
Test-Path node_modules\@babel\core\package.json
# Attendu : True
# Actuel : False

# Audit tous @babel
Get-ChildItem node_modules\@babel -Directory | ForEach-Object {
  $hasJson = Test-Path (Join-Path $_.FullName "package.json")
  "$($_.Name): $hasJson"
}
# Résultat : 5/44 packages retournent False (core, helpers, parser, runtime, types)
```

### Packages Corrompus Identifiés

- ❌ `@babel/core` - CRITIQUE
- ❌ `@babel/helpers` - CRITIQUE
- ❌ `@babel/parser` - CRITIQUE
- ❌ `@babel/runtime` - CRITIQUE
- ❌ `@babel/types` - CRITIQUE

---

## 🚀 SOLUTIONS DISPONIBLES

### ⭐ **Solution 1 : Script Automatique repair-env.ps1** (RECOMMANDÉ)

**Consensus 3 LLMs : Solution optimale**

```powershell
# Terminal Windows (EN ADMIN recommandé)
cd G:\Aionui_client

# Test diagnostic SANS modification (5 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1 -DiagOnly

# Réparation complète (10-20 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1
```

**Avantages :**
- ✅ Automatise tout (diagnostic + réparation + vérification)
- ✅ Surveillance temps réel (arrêt auto si blocage > 5 min)
- ✅ Gère Electron postinstall séparément
- ✅ Génère logs détaillés si échec
- ✅ Node 22 par défaut (plus stable que 24)

**Options :**
```powershell
# Utiliser Node 24
.\repair-env.ps1 -NodeVersion 24.21.0

# Projet sur C:\ au lieu de G:\
.\repair-env.ps1 -ProjectDir C:\dev\Aionui_client

# Ne pas lancer app automatiquement
.\repair-env.ps1 -NoLaunch
```

---

### 📖 **Solution 2 : Procédure Manuelle (PLAN_ACTION_MANUEL.md)**

**Si script échoue ou besoin comprendre chaque étape**

Voir fichier `PLAN_ACTION_MANUEL.md` pour :
- 7 phases détaillées (PHASE 0 à PHASE 7)
- Diagnostics avec interprétation résultats
- Commandes PowerShell exactes
- 3 alternatives (yarn, pnpm, copie node_modules)
- Configuration prévention future

**Phases principales :**
1. Terminal propre + Node direct (contourner nvm4w)
2. Diagnostic racine (lecteur, réseau, corruption)
3. Exclusions Windows Defender
4. Suppression node_modules rapide
5. Installation npm ci avec logs verbeux
6. Scripts postinstall (Electron séparé)
7. Vérification intégrité + lancement

---

### 🔄 **Alternatives Si npm Reste Bloqué**

**Option A : yarn (Package manager alternatif)**
```powershell
winget install Yarn.Yarn
cd G:\Aionui_client
Remove-Item -Recurse -Force node_modules
yarn install --ignore-engines --network-timeout 60000
```

**Option B : pnpm (Plus robuste interruptions)**
```powershell
npm install -g pnpm
echo "node-linker=hoisted" > .npmrc
pnpm install --ignore-scripts
pnpm rebuild electron
```

**Option C : Miroirs (Si réseau lent)**
```powershell
# Registry npm
npm config set registry https://registry.npmmirror.com

# Binaire Electron
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"

# Réessayer
npm ci --legacy-peer-deps
```

---

## 🛠️ ENVIRONNEMENT TECHNIQUE

### Système

```yaml
OS: Windows 11 Pro (build 26200)
Shell: PowerShell 7.x
Python: Anaconda base environment actif
Node.js: v24.21.0 (via nvm4w)
npm: v11.19.0
Projet: G:\Aionui_client\
```

### Stack Application

```yaml
Framework: Electron 37
Build Tool: electron-vite 5
Frontend: React 19 + TypeScript 5.8
Package Manager: npm
Requirements: Node.js >=22 <25
```

### État node_modules

```yaml
Total packages: ~2,000
@babel packages: 44 total
@babel corrompus: 5 (11% corruption)
Dossiers temporaires: 4 (.core-*, .helpers-*, etc.)
```

---

## 📊 CHRONOLOGIE DÉBOGAGE

### Session 1 : Tentatives Lancement (15:00-17:00)

1. `npm run start` → electron-vite not found
2. `npx electron-vite dev` → binaires .cmd manquants
3. Installer Node.js 20 → EBADENGINE (besoin >=22)
4. `node ...electron-vite.js dev` → @babel/core manquant

### Session 2 : Switch Node + Redémarrage (17:00-18:30)

5. Retour Node.js 24 → PowerShell bloqué (Exit Code -1)
6. Redémarrage Windows → PowerShell toujours bloqué

### Session 3 : Diagnostic Approfondi (19:00-20:00)

7. Analyse structure @babel → **5 packages corrompus identifiés**
8. Tentative réinstall @babel → **npm timeout 6 min**
9. Clean cache + retry → **npm timeout persiste**

### Status Actuel (20:00)

- ✅ Cause racine identifiée : Packages @babel corrompus
- ❌ npm install bloqué (timeout systématique)
- 📝 Documentation complète créée
- ⏳ Attente solution npm timeout ou alternative

---

## 🎯 PROCHAINES ÉTAPES

### Immédiat

1. Ouvrir nouveau PowerShell propre (`-NoProfile`)
2. Désactiver Anaconda : `conda deactivate`
3. Activer Node 24 : `nvm use 24.21.0`
4. Tester Option A (diagnostics npm rapides)
5. Si timeout → Tester Option B ou C

### Court Terme

- Appliquer solution finale
- Documenter procédure réparation
- Tester lancement application

### Moyen Terme

- Créer script diagnostic automatique
- Évaluer migration pnpm/yarn
- Documenter prévention corruption

---

## 💡 CONSULTATION EXTERNE

### Fichiers à Partager

Pour consultation avec experts externes (Discord, StackOverflow, GitHub Issues) :

1. **PROMPT_CONSULTATION_MODELES.md** - Prompt structuré LLM
2. **DIAGNOSTIC_FINAL_BABEL_CORRUPTION.md** - Preuves techniques
3. **MEMO_PROBLEME_LANCEMENT_EXHAUSTIF.md** - Contexte complet

### Questions Clés

1. Pourquoi npm timeout alors que cache clean fonctionne ?
2. Comment forcer npm overwrite packages corrompus ?
3. Tarball local viable pour réparer ?
4. yarn/pnpm contournent problème ?
5. npm 11.19.0 (Node 24) a-t-il bugs connus ?

---

## 📞 SUPPORT

### Ressources

- npm documentation : https://docs.npmjs.com
- Node.js ESM : https://nodejs.org/api/esm.html
- @babel issues : https://github.com/babel/babel/issues
- nvm-windows : https://github.com/coreybutler/nvm-windows

### Communautés

- npm Discord
- Node.js Discord  
- StackOverflow (tag: npm, node.js, windows, babel)
- Reddit r/node

---

**Dernière Mise à Jour** : 16 novembre 2026, 20:00  
**Status** : Documentation complète - Attente solution npm timeout  
**Auteur** : Diagnostic automatisé + Agent IA
