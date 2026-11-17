# DIAGNOSTIC FINAL - Corruption Packages @babel

**Date** : 16 novembre 2026, 20:00  
**Status** : CAUSE RACINE IDENTIFIÉE - npm install BLOQUÉ  
**Priorité** : CRITIQUE - Application ne peut démarrer

---

## RÉSUMÉ EXÉCUTIF

### Problème
Application Electron ne démarre pas avec erreur `ERR_MODULE_NOT_FOUND` sur `@babel/core`

### Cause Racine Confirmée
**5 packages @babel corrompus** (installation partielle sans package.json) :
- @babel/core
- @babel/helpers  
- @babel/parser
- @babel/runtime
- @babel/types

### Blocage Actuel
**npm install timeout systématique** (6-30 minutes) empêche réparation

### Solution Requise
Débloquer npm install OU trouver alternative pour réinstaller @babel packages

---

## PREUVE TECHNIQUE CORRUPTION

### Test 1 : Structure @babel/core (ANORMALE)

```powershell
PS> Get-ChildItem node_modules\@babel\core

Mode   LastWriteTime         Length Name
----   -------------         ------ ----
d-----                              lib
d-----                              node_modules
-a----                        1106  LICENSE
-a----                         401  README.md
```

**CRITIQUE** : `package.json` MANQUANT

### Test 2 : Vérification package.json

```powershell
PS> Test-Path node_modules\@babel\core\package.json
False
```

### Test 3 : Audit Tous Packages @babel (44 total)

```powershell
PS> Get-ChildItem node_modules\@babel -Directory | ForEach-Object {
  $hasJson = Test-Path (Join-Path $_.FullName "package.json")
  "$($_.Name): $hasJson"
}
```

**Résultats** :
```
✅ .compat-data-uslDQiZk: True (temporaire mais complet)
❌ .core-Xrjs9gjm: False (installation avortée)
❌ .helpers-DcpBISoi: False (installation avortée)
⚠️  .helper-compilation-targets-LNhDM1bG: True (temporaire mais complet)
⚠️  .helper-validator-option-NDYK2QSE: True
❌ .parser-5vpNGUrS: True (temporaire)
❌ .runtime-qka1XQry: False (installation avortée)
❌ .types-hvFT9hsG: False (installation avortée)

✅ code-frame: True
✅ compat-data: True
❌ core: False                    ⚠️ CRITIQUE
✅ generator: True
✅ helper-compilation-targets: True
✅ helper-globals: True
✅ helper-module-imports: True
✅ helper-module-transforms: True
✅ helper-plugin-utils: True
✅ helper-string-parser: True
✅ helper-validator-identifier: True
✅ helper-validator-option: True
❌ helpers: False                 ⚠️ CRITIQUE
❌ parser: False                  ⚠️ CRITIQUE
✅ plugin-syntax-*: True (tous)
✅ plugin-transform-*: True
❌ runtime: False                 ⚠️ CRITIQUE
✅ template: True
✅ traverse: True
❌ types: False                   ⚠️ CRITIQUE
```

**Bilan** :
- 44 packages @babel installés
- **5 packages corrompus** (11% taux corruption)
- 4 dossiers temporaires (installations avortées)
- 35 packages sains

---

## MÉCANISME CORRUPTION IDENTIFIÉ

### Séquence Événements

```
1. npm install démarre
   ↓
2. npm télécharge @babel/core.tar.gz depuis registry
   ↓
3. npm extrait tar.gz dans node_modules/@babel/core/
   ↓
4. Extraction crée :
   - lib/ (code source)
   - node_modules/ (sous-dépendances)
   - LICENSE
   - README.md
   ↓
5. [INTERRUPTION ICI]
   - Timeout npm (6-30 min)
   - User fait Ctrl+C
   - Switch nvm use pendant install
   - Crash système
   ↓
6. package.json JAMAIS écrit
   ↓
7. npm termine sans rollback
   ↓
8. Dossier existe mais package INVALIDE
   ↓
9. Tentatives suivantes :
   - npm voit dossier existant
   - Pense package déjà installé
   - Skip installation
   - OU crée dossier temporaire .core-Xrjs9gjm
   ↓
10. Node.js ESM module resolver :
    - Lit node_modules/@babel/core/
    - Cherche package.json
    - NE TROUVE PAS
    - Erreur ERR_MODULE_NOT_FOUND
```

### Pourquoi Node.js Échoue

**Node.js ESM Resolution (Node 24)** :
```javascript
// 1. Import depuis electron-vite
import babel from '@babel/core';

// 2. Node.js résout chemin
// G:\Aionui_client\node_modules\@babel\core

// 3. Node.js lit package.json pour trouver "main" ou "exports"
const pkg = readJSON('G:\\...\\@babel\\core\\package.json');
// ❌ ERREUR : package.json not found

// 4. Fallback : cherche index.js dans racine
// G:\Aionui_client\node_modules\@babel\core\index.js
// ❌ ERREUR : index.js not found

// 5. Lance exception ERR_MODULE_NOT_FOUND
throw new Error(`Cannot find package '@babel/core/index.js'`);
```

**Structure Attendue @babel/core** :
```json
{
  "name": "@babel/core",
  "version": "7.24.0",
  "main": "./lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./package.json": "./package.json"
  }
}
```

Sans ce fichier, Node.js ne sait pas que le code est dans `lib/index.js`.

---

## TENTATIVES RÉPARATION ÉCHOUÉES

### Tentative 1 : Suppression + Réinstall Packages Corrompus

```powershell
PS> Remove-Item -Recurse -Force node_modules\@babel\core
PS> Remove-Item -Recurse -Force node_modules\@babel\helpers
PS> Remove-Item -Recurse -Force node_modules\@babel\parser
PS> Remove-Item -Recurse -Force node_modules\@babel\runtime
PS> Remove-Item -Recurse -Force node_modules\@babel\types

PS> npm install @babel/core @babel/parser @babel/types @babel/helpers @babel/runtime --save-dev --legacy-peer-deps
```

**Résultat** : Timeout après 6 minutes (360 secondes)

### Tentative 2 : Clean Cache + Réinstall

```powershell
PS> npm cache clean --force
# ✅ Succès en 30 secondes

PS> npm install @babel/core --save-dev
```

**Résultat** : Timeout après 6 minutes à nouveau

### Tentative 3 : Suppression Temporaires + Réinstall

```powershell
PS> Remove-Item -Recurse -Force node_modules\@babel\.*
# Supprime .core-Xrjs9gjm, .helpers-DcpBISoi, etc.

PS> npm cache clean --force
PS> npm install @babel/core @babel/parser @babel/types @babel/helpers @babel/runtime --save-dev --legacy-peer-deps --timeout=300000
```

**Résultat** : Timeout après 6 minutes (commande interrompue avant 300s)

---

## ANALYSE TIMEOUT npm install

### Observations

1. **npm cache clean** fonctionne rapidement (30 sec)
2. **npm install** timeout systématiquement (6-30 min)
3. Timeout survient MÊME pour réinstaller seulement 5 packages
4. node_modules contient déjà ~2,000 packages

### Hypothèses Timeout

#### H1 : Registry npm Lent/Inaccessible
```
npm install → contact registry.npmjs.org
→ Registry lent à répondre
→ Timeout
```
**Test** : `npm ping`, `curl https://registry.npmjs.org`

#### H2 : Cache npm Corrompu (malgré clean)
```
npm cache clean --force → ne nettoie pas tout
→ Cache contient données corrompues @babel
→ npm lit cache corrompu
→ Boucle infinie tentatives
→ Timeout
```
**Test** : `npm cache verify`, supprimer manuellement `npm config get cache`

#### H3 : Résolution Dépendances Bloquée
```
npm install @babel/core
→ Résout peer dependencies
→ Détecte conflits avec packages existants
→ Boucle infinie tentatives résolution
→ Timeout
```
**Test** : `npm install @babel/core --legacy-peer-deps --no-audit --no-fund --loglevel=verbose`

#### H4 : Windows Defender / Firewall
```
npm télécharge packages
→ Windows Defender scan en temps réel
→ Bloque temporairement fichiers
→ npm attend release
→ Timeout
```
**Test** : Exclure temporairement `node_modules\` de Windows Defender

#### H5 : npm Bug Connu Node.js 24
```
npm 11.19.0 (shipped with Node 24.21.0)
→ Bug résolution ESM modules
→ Timeout spécifique @babel scope
```
**Test** : Downgrade npm `npm install -g npm@10.8.2`, ou essayer Node.js 22

---

## DONNÉES POUR CONSULTATION EXTERNE

### Environnement Exact

```yaml
OS: Windows 11 Pro (build 26200)
Shell: PowerShell 7.x
Python: Anaconda base environment (désactivable)
Node.js: v24.21.0 (via nvm4w)
npm: v11.19.0
nvm4w: C:\Users\LEADER\AppData\Local\nvm\
Projet: G:\Aionui_client\
node_modules: ~2,000 packages présents
@babel packages: 44 total, 5 corrompus
```

### Erreur Complète

```
Error: Cannot find package 'G:\Aionui_client\node_modules\@babel\core\index.js' 
imported from G:\Aionui_client\node_modules\electron-vite\dist\chunks\lib-q6ns0vZr.js
    at legacyMainResolve (node:internal/modules/esm/resolve:215:26)
    at packageMainResolve (node:internal/modules/esm/resolve:266:14)
    at packageResolve (node:internal/modules/esm/resolve:850:14)
    at moduleResolve (node:internal/modules/esm/resolve:924:18)
    at defaultResolve (node:internal/modules/esm/resolve:1155:11)
    at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:390:12)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:359:25)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:241:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:168:49) {
  code: 'ERR_MODULE_NOT_FOUND'
}

Node.js v24.21.0
```

### Commandes Timeout Exactes

```powershell
# Timeout 1 : Installation complète (Node 20)
npm install --legacy-peer-deps
# Durée : 30 minutes timeout

# Timeout 2 : Réinstall @babel (Node 24)
npm install @babel/core @babel/parser @babel/types @babel/helpers @babel/runtime --save-dev --legacy-peer-deps
# Durée : 6 minutes timeout

# Timeout 3 : Single package (Node 24)
npm install @babel/core --save-dev
# Durée : 6 minutes timeout
```

---

## SOLUTIONS À TESTER

### Solution A : Diagnostics npm Rapides

```powershell
# Test 1 : Registry accessible (10 sec max)
npm ping --timeout=10000

# Test 2 : Cache intégrité (30 sec)
npm cache verify

# Test 3 : Installation package simple non-@babel (30 sec)
npm install lodash --no-save --fetch-timeout=30000

# Test 4 : Installation @babel verbose (60 sec)
npm install @babel/core --no-save --fetch-timeout=60000 --verbose
```

### Solution B : Installer depuis Tarball Local

```powershell
# Télécharger manuellement
curl -o core.tgz https://registry.npmjs.org/@babel/core/-/core-7.24.0.tgz

# Installer local
npm install ./core.tgz --save-dev
```

### Solution C : Utiliser yarn

```powershell
# Installer yarn (si npm fonctionne pour global)
npm install -g yarn --fetch-timeout=60000

# OU télécharger yarn standalone
curl -o yarn.js https://yarnpkg.com/latest.js

# Installer @babel avec yarn
yarn add @babel/core @babel/parser @babel/types @babel/helpers @babel/runtime --dev
```

### Solution D : Changer Registry npm

```powershell
# Option 1 : Mirror chinois (rapide depuis Asie)
npm config set registry https://registry.npmmirror.com

# Option 2 : Cloudflare mirror
npm config set registry https://npm.cloudflare.com

# Réessayer install
npm install @babel/core --save-dev
```

### Solution E : Copier depuis Projet Similaire

```powershell
# Si un autre projet Node.js avec @babel existe
Copy-Item -Recurse autre_projet\node_modules\@babel\core node_modules\@babel\
Copy-Item -Recurse autre_projet\node_modules\@babel\parser node_modules\@babel\
# etc.
```

### Solution F : Réinstallation Complète (Dernier Recours)

```powershell
# Backup package-lock.json
Copy-Item package-lock.json package-lock.json.bak

# Suppression totale
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Clean agressif
npm cache clean --force
npm cache verify

# Réinstall avec timeouts courts
npm install --legacy-peer-deps --fetch-timeout=120000
```

---

## QUESTIONS POUR EXPERTS

### Questions Critiques

1. **Pourquoi npm timeout alors que cache clean fonctionne ?**
   - Registry accessible mais lent ?
   - Cache corrompu malgré clean --force ?
   - npm bug dans version 11.19.0 ?

2. **Comment forcer npm à overwrite packages corrompus ?**
   - `npm install --force` suffit ?
   - Faut-il supprimer manuellement avant ?
   - Option `--ignore-scripts` aide ?

3. **Tarball local est-elle solution viable ?**
   - Risques incompatibilités dépendances ?
   - npm résout quand même peer deps depuis registry ?
   - Dois-je télécharger TOUS les @babel tarballs ?

4. **yarn/pnpm contournent-ils le problème npm ?**
   - yarn utilise même cache npm ?
   - yarn plus robuste sur Windows ?
   - Migration npm → yarn sans tout réinstaller ?

5. **Quelle commande diagnostic npm la plus utile ?**
   - `npm doctor` ?
   - `npm config list` ?
   - `npm install --dry-run --loglevel=silly` ?

### Commandes à Valider

```powershell
# Vérifier si corruption cache profonde
Get-ChildItem (npm config get cache) -Recurse | Measure-Object

# Test réseau registry
Measure-Command { curl https://registry.npmjs.org/@babel/core }

# npm verbose logs
npm install @babel/core --loglevel=silly > npm-debug.log 2>&1

# Forcer réinstall sans cache
npm install @babel/core --cache-min=0 --force
```

---

## PROCHAINES ÉTAPES

### Immédiat (Si PowerShell Accessible)

1. Ouvrir **nouveau PowerShell propre** (`powershell.exe -NoProfile`)
2. Désactiver Anaconda : `conda deactivate`
3. Activer Node 24 : `nvm use 24.21.0`
4. Tester diagnostics rapides (Solution A)
5. Si timeout persiste → Tester Solution B (tarball) ou C (yarn)

### Court Terme (Si Diagnostics Révèlent Cause)

- Appliquer solution ciblée selon diagnostic
- Documenter solution finale
- Créer script réparation automatique

### Moyen Terme (Prévention)

- Migrer vers package manager plus robuste (pnpm ?)
- Ajouter CI/CD avec cache validé
- Documenter procédure récupération corruption

---

## FICHIERS DOCUMENTATION

- `MEMO_PROBLEME_LANCEMENT_EXHAUSTIF.md` - Analyse 12 sections complète
- `PROMPT_CONSULTATION_MODELES.md` - Prompt structuré pour LLMs externes
- `DIAGNOSTIC_FINAL_BABEL_CORRUPTION.md` - Ce document (preuve technique)
- Logs : `npm-install-*.log` (tentatives multiples)

---

**Status Actuel** : EN ATTENTE SOLUTION npm timeout  
**Blocage** : npm install ne fonctionne pas pour réparer corruption  
**Besoin** : Expertise npm/Node.js/Windows pour débloquer  

**Date Diagnostic** : 16 novembre 2026, 20:00  
**Durée Problème Total** : 5+ heures
