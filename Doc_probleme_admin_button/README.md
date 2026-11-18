# Documentation - Problème Admin Button (Régression)

**Problème** : Nécessité de cliquer sur "Admin" avant d'accéder à `/guid`  
**Date détection** : 2026-11-18 17:52  
**Cause racine** : Race condition `availableAgents` undefined vs empty array  
**Statut** : 🟡 CORRECTIF APPLIQUÉ - EN ATTENTE VALIDATION UTILISATEUR

---

## 🎯 Accès rapide

| Document | Usage |
|----------|-------|
| **[INSTRUCTIONS_TEST_IMMEDIAT.md](INSTRUCTIONS_TEST_IMMEDIAT.md)** | 🚀 **COMMENCER ICI** - Procédure de test |
| [01_SYMPTOME_REGRESSION.md](01_SYMPTOME_REGRESSION.md) | Description du problème |
| **[02_ANALYSE_CAUSE_RACINE.md](02_ANALYSE_CAUSE_RACINE.md)** | 📚 **Analyse complète** ⭐ |
| [03_CORRECTIF_APPLIQUE.md](03_CORRECTIF_APPLIQUE.md) | Modification de code + instructions test |
| [04_VALIDATION_DEMARRAGE_DERNIER_CHAT.md](04_VALIDATION_DEMARRAGE_DERNIER_CHAT.md) | Observation : app démarre sur dernier chat |
| [05_TEST_PERSISTANCE_PAR_USER.md](05_TEST_PERSISTANCE_PAR_USER.md) | Test multi-utilisateur (optionnel) |

---

## ⚡ Résumé ultra-rapide

### Symptôme

❌ Au redémarrage à froid, il faut cliquer sur "Admin" avant que `/guid` fonctionne  
✅ Après clic Admin, tout fonctionne normalement

### Cause racine

```typescript
// useGuidAgentSelection.ts (~ligne 195)
useEffect(() => {
  if (!availableAgents || availableAgents.length === 0) return;  
  // ❌ PROBLÈME : !availableAgents est TRUE quand availableAgents === undefined
  //    Au premier render, IPC pas encore résolu → undefined → sort immédiatement
  
  // ... migration + load config (jamais exécuté)
}, [availableAgents]);
```

**Ordre d'exécution** :
1. `T=0ms` : Component mount, `availableAgents = undefined`
2. `T=0ms` : `useEffect` sort immédiatement (`!undefined === true`)
3. `T=200ms` : IPC répond, `setAvailableAgents([...])`
4. `T=200ms` : `useEffect` SE RÉEXÉCUTE, migration fonctionne **TROP TARD**

### Solution appliquée

```typescript
// ✅ CORRECTION : 2 lignes au lieu d'1
if (availableAgents === undefined) return; // Attendre IPC
if (availableAgents.length === 0) return;   // Liste vide
```

**Fichier modifié** : `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts` (ligne ~195)

---

## 🧪 Tests requis

### Test principal : Redémarrage à froid

1. Fermer complètement E-audit
2. Relancer `npm run start`
3. **NE PAS cliquer Admin**
4. Aller sur `/guid`

**Attendu** :
- ✅ "n8n Workflow" sélectionné automatiquement
- ✅ Pas besoin de cliquer Admin

---

## 📊 Lien avec Doc_activation_workflow_n8n_chat

| Phase | Problème | Status |
|-------|----------|--------|
| **Phase 1-4** | Migration legacy keys + spinner infini | ✅ RÉSOLU |
| **Phase 5** | Validation initiale | ✅ PASSÉE (17h00) |
| **Régression** | Race condition availableAgents | 🟡 CORRECTIF APPLIQUÉ |

**Note** : La validation initiale a réussi car l'application était "chaude" (agents déjà en cache SWR).

---

## 🔧 Commit prévu (après validation)

```bash
git add src/renderer/pages/guid/hooks/useGuidAgentSelection.ts
git commit -m "fix(guid): race condition in agent selection initialization

Fix regression where n8n agent was not selected by default on cold start.

Problem:
- useEffect checked (!availableAgents || length === 0) which treated 
  undefined (loading) the same as [] (empty)
- On first render, availableAgents is undefined while IPC is resolving
- Migration useEffect returned early, never loaded saved agent
- After clicking Admin, SWR cache was warm, so it worked

Solution:
- Distinguish undefined (loading) from [] (empty list)
- Wait for IPC to resolve before attempting to load config
- One-line change: if (availableAgents === undefined) return;

Related: Doc_activation_workflow_n8n_chat (original n8n fix)
Closes regression detected post-validation"
```

---

## ✅ Critères de succès

| Test | Statut |
|------|--------|
| Démarrage à froid → n8n sélectionné | ⏳ EN ATTENTE |
| Navigation Admin → pas de reset | ⏳ EN ATTENTE |
| Migration legacy key fonctionne | ⏳ EN ATTENTE |

---

**Créé par** : Kiro AI (Claude Sonnet 4.5)  
**Date** : 2026-11-18  
**Impact** : 1 ligne modifiée, risque minimal  
**Priorité** : HAUTE
