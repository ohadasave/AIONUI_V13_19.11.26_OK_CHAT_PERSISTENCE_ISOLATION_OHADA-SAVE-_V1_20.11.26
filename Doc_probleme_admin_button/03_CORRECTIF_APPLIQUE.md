# Correctif Appliqué - Race Condition availableAgents

**Date** : 2026-11-18  
**Fichier modifié** : `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts`  
**Lignes modifiées** : ~195-196

---

## 🔧 Modification apportée

### Code avant (bugué)

```typescript
useEffect(() => {
  if (!availableAgents || availableAgents.length === 0) return;  
  // ❌ PROBLÈME : !availableAgents inclut undefined ET []
  //    → Sort immédiatement au premier render (agents pas encore chargés)
  
  let cancelled = false;
  const loadLastSelectedAgent = async () => {
    // ... migration + load config
  };
  
  loadLastSelectedAgent();
  
  return () => { cancelled = true; };
}, [availableAgents]);
```

### Code après (corrigé)

```typescript
useEffect(() => {
  // ✅ CORRECTION: Distinguish "loading" vs "empty list"
  if (availableAgents === undefined) return; // Wait for IPC to resolve
  if (availableAgents.length === 0) return;   // No agents available
  
  let cancelled = false;
  const loadLastSelectedAgent = async () => {
    // ... migration + load config
  };
  
  loadLastSelectedAgent();
  
  return () => { cancelled = true; };
}, [availableAgents]);
```

---

## 📊 Différence de comportement

### Avant le correctif

| État | Valeur | Comportement |
|------|--------|--------------|
| Initial | `undefined` | ❌ Sort immédiatement (ne charge pas la config) |
| IPC résolu | `[...]` | ✅ Se réexécute, charge la config (trop tard) |
| Liste vide | `[]` | ❌ Sort immédiatement |

**Résultat** : Au premier render, selectedAgentKey reste `'n8n'` (default) mais n'est pas validé contre `availableAgents` vide, donc l'UI affiche le placeholder.

### Après le correctif

| État | Valeur | Comportement |
|------|--------|--------------|
| Initial | `undefined` | ✅ Attend (ne fait rien) |
| IPC résolu | `[...]` | ✅ Charge la config et applique migration |
| Liste vide | `[]` | ✅ Sort proprement (aucun agent dispo) |

**Résultat** : Le `useEffect` attend que `availableAgents` soit réellement peuplé avant de charger la config.

---

## 🧪 Tests à effectuer

### Test 1 : Redémarrage à froid ⭐ PRINCIPAL

**Procédure** :
1. Fermer complètement l'application E-audit
2. (Optionnel) Supprimer le cache : `Remove-Item -Recurse -Force out, .vite`
3. Relancer : `npm run start`
4. **NE PAS cliquer sur "Admin"**
5. Naviguer vers `/guid` (page d'accueil)

**Résultat attendu** :
- ✅ "n8n Workflow" est sélectionné par défaut
- ✅ Liste des assistants affichée
- ✅ Bouton "Envoyer" fonctionne sans cliquer Admin

**Si échec** :
- Ouvrir DevTools (F12)
- Console → Chercher `[useGuidAgentSelection]` logs
- Capturer screenshot du sélecteur d'assistant

### Test 2 : Navigation Admin (pas de régression)

**Procédure** :
1. Depuis `/guid` avec n8n sélectionné
2. Cliquer sur "Settings" ou naviguer vers `/admin`
3. Retourner vers `/guid`

**Résultat attendu** :
- ✅ "n8n Workflow" reste sélectionné
- ✅ Pas de reset vers placeholder

### Test 3 : Migration legacy key

**Procédure** :
1. Fermer l'application
2. Éditer manuellement `C:\Users\LEADER\AppData\Roaming\E-audit\config.json` :
   ```json
   {
     "lastSelectedAgent": "custom:builtin-n8n-workflow"
   }
   ```
3. Relancer l'application
4. Aller sur `/guid`

**Résultat attendu** :
- ✅ "n8n Workflow" sélectionné (migration auto)
- ✅ `config.json` mis à jour avec `"lastSelectedAgent": "n8n"`

---

## 🔍 Logs de diagnostic (si échec)

### Console DevTools attendue

```
[useGuidAgentSelection] availableAgents status: { isUndefined: true, length: undefined }
[useGuidAgentSelection] Waiting for agents to load...
...
[ACP] Detection completed in 200ms, found 7 agents
[useGuidAgentSelection] availableAgents status: { isUndefined: false, length: 7 }
[useGuidAgentSelection] Loading saved agent key...
[useGuidAgentSelection] Loaded agent: n8n
```

### PowerShell - Vérifier config.json

```powershell
Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json | Format-List
```

**Attendu** :
```
lastSelectedAgent : n8n
```

---

## 📦 Commit prévu

### Message de commit

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
| Démarrage à froid → n8n sélectionné | [ ] |
| Navigation Admin → pas de reset | [ ] |
| Migration legacy key fonctionne | [ ] |

**SUCCÈS** : 3/3 tests passent ✅

---

## 🔄 Si le problème persiste

### Diagnostics avancés

1. **Vérifier ordre d'exécution** :
   ```typescript
   // Ajouter logs temporaires
   console.log('[Mount] availableAgents:', availableAgents);
   ```

2. **Vérifier IPC** :
   ```powershell
   # Dans DevTools console
   await window.api.acpConversation.getAvailableAgents()
   ```

3. **Vérifier SWR cache** :
   ```typescript
   // Dans un useEffect
   console.log('[SWR] availableAgentsData:', availableAgentsData);
   ```

4. **Forcer re-fetch** :
   ```typescript
   import { mutate } from 'swr';
   mutate('acp.agents.available');
   ```

---

**Statut** : 🟡 CORRECTIF APPLIQUÉ - EN ATTENTE DE VALIDATION  
**Priorité** : HAUTE  
**Impact** : 1 ligne modifiée, risque minimal
