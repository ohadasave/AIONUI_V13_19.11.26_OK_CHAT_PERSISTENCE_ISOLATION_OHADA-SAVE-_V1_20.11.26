# PROMPT DE CONSULTATION - Problème Lancement Application Electron

**À destination de** : Modèles IA experts (Claude, GPT-4, Gemini, etc.)  
**Type de consultation** : Diagnostic technique + Solutions  
**Domaine** : Node.js, Electron, Windows, npm, PowerShell

---

## CONTEXTE DU PROBLÈME

Je travaille sur un projet Electron + Vite qui ne démarre plus après des tentatives de résolution d'un problème d'environnement. J'ai documenté exhaustivement le problème dans un mémo de 12 sections.

**Projet** :
- Stack : Electron 37 + electron-vite 5 + React 19 + TypeScript 5.8
- OS : Windows 11 (PowerShell 7 + Anaconda base actif)
- Gestionnaire Node : nvm4w (Node Version Manager for Windows)
- Package Manager : npm
- Versions Node installées : 24.21.0, 22.22.0, 20.20.2
- package.json demande : Node.js >=22 <25

---

## SYMPTÔMES PRINCIPAUX - MISE À JOUR CRITIQUE

### 1. PowerShell Bloqué (Priorité Haute)

Après redémarrage Windows, toutes ces commandes retournent **Exit Code -1 sans aucun output** :

```powershell
nvm use 24.21.0    # Aucun output
nvm list           # Aucun output  
node -v            # Aucun output
npm -v             # Aucun output
```

**Questions** :
- Pourquoi PowerShell retourne -1 sans message d'erreur ?
- Est-ce un problème de profile PowerShell corrompu ?
- L'environnement Anaconda `(base)` actif peut-il causer ça ?

### 2. Application Ne Démarre Pas - CAUSE IDENTIFIÉE

**Erreur Root Cause Confirmée** :
```
Error: Cannot find package '@babel/core/index.js'
code: 'ERR_MODULE_NOT_FOUND'
```

**Diagnostic Approfondi Révèle** :
```powershell
# Test structure @babel/core
Get-ChildItem node_modules\@babel\core
# Résultat : lib/, node_modules/, LICENSE, README.md
# CRITIQUE : package.json MANQUANT

# Test tous packages @babel
45 packages @babel au total, 5 CORROMPUS confirmés :
❌ @babel/core - pas de package.json
❌ @babel/helpers - pas de package.json  
❌ @babel/parser - pas de package.json
❌ @babel/runtime - pas de package.json
❌ @babel/types - pas de package.json

Dossiers temporaires suspects (installations avortées) :
- .core-Xrjs9gjm (sans package.json)
- .helpers-DcpBISoi (sans package.json)
- .runtime-qka1XQry (sans package.json)
- .types-hvFT9hsG (sans package.json)
```

**Mécanisme Technique Identifié** :
```
npm install démarre 
→ télécharge et extrait .tar.gz
→ crée dossiers lib/, LICENSE, README.md
→ [INTERRUPTION - timeout ou kill]
→ package.json JAMAIS écrit
→ Dossier existe mais invalide
→ Node.js ESM ne peut résoudre sans package.json
→ ERR_MODULE_NOT_FOUND
```

**Questions Actualisées** :
- Pourquoi npm écrit lib/ AVANT package.json ? (ordre extraction tar.gz?)
- Comment npm peut laisser packages dans état partiel sans rollback?
- Est-ce comportement npm normal ou bug connu?
- Comment forcer npm à vérifier intégrité après install?

### 3. npm install Problématique - TIMEOUTS SYSTÉMATIQUES

**Observations** :
- Première tentative : timeout après **30 minutes** (Node.js 20)
- Suppression + réinstall @babel seulement : timeout après **6 minutes** (Node.js 24)
- npm cache clean réussit rapidement (30 secondes)

**Questions Critiques** :
- Pourquoi npm install timeout mais npm cache clean fonctionne ?
- Registry npm inaccessible ou problème local ?
- Cache npm contient-il données corrompues causant boucle infinie ?
- Comment diagnostiquer si problème vient de npm, réseau, ou registry ?

---

## INFORMATIONS VÉRIFIÉES

### ✅ Ce Qui Fonctionne

- `node_modules/` existe physiquement
- `node_modules/electron-vite/bin/electron-vite.js` existe
- `package.json` est valide
- nvm4w a bien 3 versions Node installées
- npm cache clean fonctionne

### ❌ Ce Qui Ne Fonctionne Pas

- Commandes nvm* retournent -1
- `node -v` ne répond pas
- Binaires `.cmd` absents de `node_modules/.bin/`
- `@babel/core` manquant ou inaccessible
- npm install timeout ou incomplet

### ❓ État Incertain

- Version Node.js réellement active actuellement
- Nombre exact de packages dans node_modules (2,100 attendus)
- État du symlink nvm4w (`C:\Program Files\nodejs`)
- Variables PATH et NVM_HOME après redémarrage

---

## HYPOTHÈSES À VALIDER - MISE À JOUR AVEC CONFIRMATION

J'ai identifié 6 hypothèses par ordre de probabilité **AVEC CAUSE RACINE CONFIRMÉE** :

1. **Packages @babel corrompus - installation partielle** (⭐⭐⭐⭐⭐) - **CONFIRMÉ**
   - ✅ Diagnostic effectué : 5 packages sans package.json
   - ✅ Dossiers temporaires .@babel-* trouvés (installations avortées)
   - ✅ Mécanisme identifié : npm crée lib/ mais timeout avant écrire package.json
   - ✅ Impact : Node.js ESM ne peut résoudre modules → ERR_MODULE_NOT_FOUND

2. **npm install timeout systématique** (⭐⭐⭐⭐⭐) - **CONFIRMÉ BLOQUANT**
   - ✅ 30 min timeout (installation complète)
   - ✅ 6 min timeout (réinstall @babel seulement)  
   - ❓ Cause inconnue : registry lent ? cache corrompu ? réseau ?
   
3. **PowerShell session corrompue** (⭐⭐⭐⭐) - Empêche diagnostics
4. **Problème nvm4w PATH** (⭐⭐⭐⭐) - Variables environnement
5. **Conflit Anaconda** (⭐⭐⭐) - (base) interfère possiblement
6. **Versions Node incompatibles** (⭐⭐) - Résolu (Node 24 actif)

**Question Principale Actualisée** : 

**Comment débloquer npm install qui timeout systématiquement alors que cache clean fonctionne ?**

Sous-questions :
- npm ping fonctionne-t-il (registry accessible) ?
- npm cache verify montre-t-il corruption ?
- Faut-il changer de registry (npmjs → mirror) ?
- Faut-il abandonner npm pour yarn/pnpm ?
- Installation locale depuis tarballs téléchargés manuellement ?

---

## TENTATIVES DÉJÀ FAITES

| Solution Essayée | Résultat | Raison Échec |
|------------------|----------|--------------|
| `npm run start` | ❌ | electron-vite not found |
| `npx electron-vite dev` | ❌ | Binaires .cmd manquants |
| Installer Node.js 20 | ❌ | Version incompatible (besoin >=22) |
| Appel direct node CLI | ❌ | @babel/core manquant |
| Revenir Node.js 24 | ❌ | PowerShell ne répond plus |
| npm install (Node 20) | ⏳ | Timeout 30 min |
| Scripts .bat/.ps1 | ❓ | Non testables (PowerShell bloqué) |

---

## QUESTIONS SPÉCIFIQUES POUR EXPERTS

### Questions PowerShell / Windows

1. **Exit Code -1** : Qu'est-ce qui cause Exit Code -1 sans output dans PowerShell après redémarrage ?
   - Profile corrompu ?
   - Module chargé en erreur ?
   - Conflit Anaconda ?

2. **nvm4w** : Comment diagnostiquer/réparer le symlink nvm4w sur Windows 11 ?
   ```powershell
   # Comment vérifier ?
   Get-Item "C:\Program Files\nodejs" | Select-Object LinkType,Target
   ```

3. **PATH** : Comment forcer rechargement variables d'environnement sans redémarrer ?
   ```powershell
   # Ceci suffit ?
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

### Questions npm / Node.js

4. **Packages Partiels** : Pourquoi npm laisse packages dans état partiel sans rollback ?
   - npm écrit lib/ AVANT package.json dans extraction tar.gz ?
   - Pas de transaction atomique npm install ?
   - Comment forcer vérification intégrité post-install ?

5. **@babel/core Corruption** : Comment réparer package corrompu sans réinstallation complète ?
   ```powershell
   # Options testées :
   Remove-Item @babel/core; npm install @babel/core  # Timeout 6 min
   npm install --force @babel/core                   # Timeout aussi
   
   # Alternatives ?
   npm install @babel/core --prefer-offline          # Utiliser cache ?
   npm install ./path/to/babel-core-7.x.x.tgz        # Depuis tarball local ?
   ```

6. **npm timeout diagnostics** : Comment identifier cause timeout npm ?
   ```powershell
   # Tests suggérés :
   npm ping                                    # Registry accessible ?
   npm config get registry                     # Quel registry utilisé ?
   npm install @babel/core --verbose           # Voir où ça bloque ?
   npm install --loglevel=silly > log.txt      # Logs détaillés ?
   curl https://registry.npmjs.org/@babel/core # Accès direct registry ?
   ```

7. **npm cache corruption** : Cache npm peut-il causer timeouts ?
   ```powershell
   npm cache verify     # Montre combien de corrupted ?
   npm cache clean      # Efface vraiment tout ?
   
   # Cache location
   npm config get cache  # Où est cache physiquement ?
   # Supprimer manuellement si npm cache clean insuffisant ?
   ```

### Questions Electron / Vite

7. **Electron 37 requirements** : Y a-t-il des requirements spécifiques Electron 37 ?
   - Version Node.js minimale absolue ?
   - Packages système Windows requis ?
   - Configurations particulières ?

8. **electron-vite 5** : Pourquoi electron-vite ne trouve pas @babel/core ?
   - Dépendance peer ?
   - Version incompatible ?
   - Configuration manquante ?

### Questions Stratégiques

9. **Diagnostic npm Timeout** : Quelle séquence pour identifier cause timeout npm ?
   ```powershell
   # Séquence proposée - validez/corrigez :
   1. npm ping                           # Registry accessible ?
   2. npm cache verify                   # Cache corrompu ?
   3. curl https://registry.npmjs.org    # Réseau OK ?
   4. npm config get registry            # Bon registry ?
   5. npm install @babel/core --verbose  # Logs détaillés
   6. Changer registry si timeout persiste
   7. Essayer yarn/pnpm en alternative
   ```

10. **Solution Rapide @babel** : Comment réinstaller UNIQUEMENT packages @babel corrompus ?
    ```powershell
    # Approche actuelle qui échoue :
    Remove-Item -Recurse node_modules\@babel\core
    npm install @babel/core  # Timeout après 6 min
    
    # Alternatives à tester :
    A. npm install @babel/core --prefer-offline --no-audit
    B. Télécharger .tgz manuellement → npm install ./babel-core.tgz
    C. Copier @babel/core depuis projet similaire fonctionnel
    D. Utiliser yarn add @babel/core (contourne npm)
    E. Supprimer TOUT @babel et reinstaller en bloc
    
    # Laquelle est viable/recommandée ?
    ```

11. **Solution Durable** : Architecture pour éviter corruption node_modules future ?
    - Package manager alternatif (pnpm = symlinks, yarn = plus robuste) ?
    - CI/CD avec cache npm pré-validé ?
    - Docker pour environnement isolé ?
    - Lock strict versions + npm ci au lieu npm install ?

---

## DONNÉES TECHNIQUES COMPLÈTES

### Configuration package.json

```json
{
  "name": "E-audit",
  "version": "1.8.25",
  "engines": {
    "node": ">=22 <25"
  },
  "scripts": {
    "start": "electron-vite dev"
  },
  "devDependencies": {
    "electron": "^37.0.0",
    "electron-vite": "^5.0.0",
    "@babel/core": "^7.x.x",
    "vite": "^5.x.x",
    "react": "^19.x.x"
  }
}
```

### Environnement Système

```yaml
OS: Windows 11 (build 26200)
Shell: PowerShell 7.x
Python: Anaconda (base) environment actif
NVM: nvm4w (version exacte inconnue)
Node Versions Installées:
  - 24.21.0 (npm 11.19.0) - Requis
  - 22.22.0 (npm 10.x.x) - Compatible
  - 20.20.2 (npm 10.8.2) - Incompatible
Projet Path: G:\Aionui_client
NVM Path: C:\Users\LEADER\AppData\Local\nvm\
```

### Erreur Runtime Exacte

```
node:internal/modules/esm/resolve:215
  const resolvedOption = FSLegacyMainResolve(packageJsonUrlString, packageConfig.main, baseStringified);
                         ^
Error: Cannot find package 'G:\Aionui_client\node_modules\@babel\core\index.js' 
imported from G:\Aionui_client\node_modules\electron-vite\dist\chunks\lib-7y7CgM8M.js
    at legacyMainResolve (node:internal/modules/esm/resolve:215:26)
    ...
    at ModuleJob._link (node:internal/modules/esm/module_job:168:49) {
  code: 'ERR_MODULE_NOT_FOUND'
}
```

### Diagnostic Corruption @babel/core

```powershell
# Structure actuelle (CORROMPUE)
PS> Get-ChildItem node_modules\@babel\core
Mode   Name
----   ----
d----- lib
d----- node_modules  
-a---- LICENSE (1106 bytes)
-a---- README.md (401 bytes)
# MANQUE : package.json (fichier CRITIQUE)
# MANQUE : index.js (mais peut-être lib/index.js suffit si package.json présent)

# Test présence package.json
PS> Test-Path node_modules\@babel\core\package.json
False

# Test tous packages @babel
PS> Get-ChildItem node_modules\@babel -Directory | ForEach-Object {
  $hasJson = Test-Path (Join-Path $_.FullName "package.json")
  "$($_.Name): $hasJson"
}

Résultats (44 packages @babel, 5 corrompus confirmés) :
✅ code-frame: True
✅ compat-data: True
❌ core: False          # CRITIQUE
✅ generator: True
❌ helpers: False       # CRITIQUE
✅ helper-*: True (multiples)
❌ parser: False        # CRITIQUE
❌ runtime: False       # CRITIQUE
❌ types: False         # CRITIQUE
✅ plugin-*: True (multiples)
⚠️  .core-Xrjs9gjm: True (dossier temporaire npm)
⚠️  .helpers-DcpBISoi: False (installation avortée)
⚠️  .runtime-qka1XQry: False (installation avortée)
⚠️  .types-hvFT9hsG: False (installation avortée)
```

### Tentatives Réparation Échouées

```powershell
# Tentative 1 : Supprimer et réinstaller packages corrompus
Remove-Item -Recurse -Force node_modules\@babel\core, helpers, parser, runtime, types
npm install @babel/core @babel/parser @babel/types @babel/helpers @babel/runtime --save-dev --legacy-peer-deps
# Résultat : Timeout après 6 minutes (360 secondes)

# Tentative 2 : npm cache clean
npm cache clean --force
# Résultat : Succès en 30 secondes
npm install @babel/core --save-dev
# Résultat : Timeout après 6 minutes à nouveau
```

---

## CE QUE J'ATTENDS DE VOUS - FOCUS NPM TIMEOUT

### 1. Diagnostic Cause Racine npm Timeout

**Question Principale** : Pourquoi npm install timeout systématiquement alors que :
- npm cache clean fonctionne (30 sec)
- node_modules existe déjà (~2,000 packages)
- Seulement 5 packages @babel à réinstaller

**Sous-questions** :
- Registry npm inaccessible depuis mon réseau ?
- Cache npm corrompu malgré clean --force ?
- npm bloqué dans boucle infinie sur résolution dépendances ?
- Problème spécifique à @babel scope packages ?
- Windows Defender ou firewall bloque npm ?

### 2. Plan d'Action Hiérarchisé

Proposez un plan en étapes **TESTABLES RAPIDEMENT** :

**Phase Diagnostic (5 min max par étape)** :
1. Tester accessibilité registry
2. Vérifier cache npm intégrité
3. Tester installation package simple (non @babel)
4. Identifier si problème spécifique @babel ou général

**Phase Solution (priorité vitesse)** :
5. Solution la plus rapide pour obtenir @babel/core fonctionnel
6. Alternative si npm install reste bloqué
7. Workaround si tout échoue

Avec pour chaque étape :
- Commande exacte PowerShell
- Timeout max acceptable (ne pas attendre 30 min)
- Output attendu si OK
- Action si KO (abandon rapide vers alternative)

### 3. Solutions Alternatives Concrètes

Si npm install reste bloqué, évaluez ces alternatives **PAR ORDRE DE VIABILITÉ** :

**A. Installer depuis tarball local**
```powershell
# Télécharger manuellement depuis registry
curl -O https://registry.npmjs.org/@babel/core/-/core-7.24.0.tgz
npm install ./core-7.24.0.tgz
# Viable ? Contourne timeout registry ?
```

**B. Utiliser yarn/pnpm**
```powershell
# Installer yarn globalement
npm install -g yarn --force  # Si npm marche pour packages globaux
yarn add @babel/core @babel/parser @babel/types
# yarn plus robuste que npm sur Windows ?
```

**C. Copier depuis autre projet**
```powershell
# Si autre projet Node.js fonctionnel existe
Copy-Item -Recurse autre_projet\node_modules\@babel\core node_modules\@babel\
# Risques incompatibilités versions ?
```

**D. Changer registry npm**
```powershell
npm config set registry https://registry.npmmirror.com
npm install @babel/core
# Mirrors chinois plus rapides depuis certaines régions ?
```

**E. Réinstallation complète node_modules**
```powershell
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps
# Dernier recours - 40+ min mais résout tout ?
```

**Classez par** : 1) Probabilité succès, 2) Rapidité, 3) Risques

### 4. Prévention Future

- Comment éviter ce problème à l'avenir ?
- Quelle configuration robuste recommandez-vous ?
- Y a-t-il des outils de monitoring/diagnostic à installer ?

---

## FORMAT DE RÉPONSE ATTENDU

Merci de structurer votre réponse ainsi :

### A. Diagnostic npm Timeout
- Cause probable : [Registry lent ? Cache corrompu ? Réseau ? Autre ?]
- Confiance : [%]
- Justification : [Indices techniques]
- Tests rapides pour confirmer : [Commandes < 2 min chacune]

### B. Plan Action Rapide (Priorité Vitesse)

**Phase 1 : Diagnostic (10 min total max)**
```powershell
# Test 1 : Registry accessible (timeout 10 sec)
npm ping --timeout=10000
# OK si : {registry: "...", latency: <1000ms}
# KO si : Timeout → Aller Test 2

# Test 2 : Cache intégrité (30 sec)
npm cache verify
# OK si : 0 corrupted
# KO si : >0 corrupted → npm cache clean --force et retry

# Test 3 : Package simple (timeout 30 sec)
npm install lodash --no-save --fetch-timeout=30000
# OK si : Installed en < 30 sec → npm fonctionne
# KO si : Timeout → npm est bloqué, aller Alternative B ou D

# Test 4 : Specific @babel (timeout 60 sec)
npm install @babel/core --no-save --fetch-timeout=60000 --verbose
# Observer logs pour voir où ça bloque
```

**Phase 2 : Solution Recommandée**
- Solution #1 : [Nom] - [Commandes] - [Durée estimée]
- Si échec → Solution #2 : [Alternative]
- Si échec → Solution #3 : [Dernier recours]

### C. Alternatives Classées

| # | Solution | Probabilité Succès | Durée | Risques | Commande |
|---|----------|-------------------|-------|---------|----------|
| 1 | [Nom] | [%] | [X min] | [Liste] | `[cmd]` |
| 2 | [Nom] | [%] | [X min] | [Liste] | `[cmd]` |
| 3 | [Nom] | [%] | [X min] | [Liste] | `[cmd]` |

### D. Si Tout Échoue

- Workaround temporaire pour démarrer app : [Solution hack]
- Investigation approfondie nécessaire : [Outils diagnostics avancés]
- Escalade vers : [Support npm ? GitHub issues ? Autre ?]

---

## CONTEXTE ADDITIONNEL

**Urgence** : Moyenne (projet en dev, pas en production)  
**Compétences** : Développeur expérimenté mais pas expert Windows/PowerShell  
**Contraintes** : Doit fonctionner sur Windows 11 avec Electron  
**Préférence** : Solutions simples et robustes sur solutions complexes

---

## FICHIERS DE RÉFÉRENCE

J'ai créé un mémo exhaustif de 12 sections avec :
- Chronologie détaillée (Section 2)
- Symptômes observés (Section 3)
- Environnement complet (Section 4)
- 6 hypothèses avec tests (Section 6)
- 8 solutions potentielles (Section 8)
- 12 questions spécifiques (Section 9)

**Le mémo complet est disponible dans** : `MEMO_PROBLEME_LANCEMENT_EXHAUSTIF.md`

---

## QUESTION FINALE

**En tant qu'expert npm/Node.js/Windows, comment débloquer npm install qui timeout systématiquement (6-30 min) pour installer 5 packages @babel alors que cache clean fonctionne et node_modules existe déjà ?**

**Focus attendu** :
1. Diagnostic cause timeout npm (registry ? cache ? réseau ? Windows ?)
2. Tests rapides (< 2 min chacun) pour identifier blocage
3. Solution la plus rapide pour obtenir @babel/core fonctionnel (objectif < 15 min)
4. Alternatives si npm définitivement bloqué (yarn ? tarball local ? copie manuelle ?)

**Contraintes** :
- Ne PAS attendre 30+ minutes pour réinstallation complète (dernier recours uniquement)
- Privilégier tests courts avec timeouts explicites (--fetch-timeout=60000)
- Avoir plan B et C si solution A échoue

Merci de votre aide ! 🙏
