# Incident Technique : better-sqlite3 non compatible Electron

**Date** : 2026-11-18 16:50
**Durée** : ~10 minutes
**Gravité** : 🔴 BLOQUANT (empêche démarrage application)

---

## 🔍 Symptôme

```
[Process] Failed to initialize ChannelManager: Error: Could not locate the bindings file.
```

Application Electron démarre mais crash immédiatement au moment d'initialiser la base de données SQLite.

---

## 🧪 Diagnostic

### Analyse des logs

```
Error: Could not locate the bindings file. Tried:
 ✗ G:\Aionui_client\node_modules\better-sqlite3\build\better_sqlite3.node
 ✗ G:\Aionui_client\node_modules\better-sqlite3\build\Release\better_sqlite3.node
 ✗ ...13 chemins testés
```

### Cause racine

**Modules natifs Node.js ≠ Modules natifs Electron**

- `better-sqlite3` est un **module natif** (binding C++)
- Compilé pour **Node.js 24.21.0** (V8 version X)
- Electron 37 utilise **Chromium/V8 version Y différente**
- Le binding `.node` n'est **pas compatible** entre les deux

### Pourquoi ça marchait avant ?

Le package `better-sqlite3` était probablement :
1. Déjà compilé pour Electron lors d'une installation antérieure, OU
2. Perdu lors du nettoyage agressif des `node_modules` durant les tentatives de réparation

---

## ✅ Solution appliquée

### Commande de résolution

```powershell
npx @electron/rebuild -f -w better-sqlite3 -o better-sqlite3
```

### Explication des paramètres

| Paramètre | Signification |
|-----------|---------------|
| `@electron/rebuild` | Outil officiel Electron pour recompiler modules natifs |
| `-f` | Force (ignore cache) |
| `-w better-sqlite3` | Module à recompiler (whitelist) |
| `-o better-sqlite3` | Module seulement (ignore autres modules) |

### Résultat

```
Searching dependency tree
Building modules: better-sqlite3
✔ Rebuild Complete
```

**Fichier créé** : `node_modules\better-sqlite3\build\Release\better_sqlite3.node`

---

## ✅ Vérification post-résolution

### 1. Binding natif présent

```powershell
Test-Path "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
# Retour : True ✅
```

### 2. Application démarre

```
[Database] Initializing database at: C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db
[Database] Schema initialized successfully
[Migrations] Running 17 migrations from v0 to v17
[Migrations] All migrations completed successfully ✅
```

### 3. Fonctionnalités DB opérationnelles

- 7 agents détectés
- ChannelManager initialisé
- Extension registry opérationnel

---

## 📚 Leçons apprises

### À retenir pour le futur

1. **Modules natifs sensibles** : `better-sqlite3`, `node-pty`, `keytar`, `tree-sitter-*`
2. **Recompiler après** :
   - Changement de version Electron
   - Nettoyage agressif `node_modules`
   - Clone frais du dépôt
3. **Ordre d'installation recommandé** :
   ```bash
   npm install
   npx @electron/rebuild
   ```

### Commande préventive (à ajouter au `postinstall` ?)

```json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js && electron-rebuild -f -w better-sqlite3 -o better-sqlite3"
  }
}
```

⚠️ **Note** : Éviter de rebuild tous les modules (`-o` manquant) car `node-pty` nécessite composants Visual Studio Spectre non installés.

---

## 🎯 Impact sur le plan d'implémentation

| Phase | Impact |
|-------|--------|
| Phase 1-2 | ✅ Non affecté |
| Phase 3 | ❌ Non exécutée (timeout `lint:fix` / `tsc`) |
| Phase 4 | ✅ Résolu (incident) |
| Phase 5 | ⏳ Prêt pour validation utilisateur |

**Délai ajouté** : +10 minutes (diagnostic + résolution)

---

## ✅ Statut final

🟢 **RÉSOLU** - Application fonctionnelle, base de données opérationnelle, prêt pour validation fonctionnelle Phase 5.
