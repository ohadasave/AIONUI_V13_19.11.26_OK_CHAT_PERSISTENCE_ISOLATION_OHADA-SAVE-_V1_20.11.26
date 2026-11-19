# Diagnostic - Régression n8n Chat

**Date**: 2024-11-18 23:45  
**Problème rapporté**: Impossible d'envoyer le message initial "OHOH!" pour activer le chat n8n

## Symptômes observés (selon screenshot)

1. ✅ Le bouton "n8n Workflow" est visible dans la barre
2. ✅ Le champ de saisie contient "OHOH!"
3. ❌ **Hypothèse**: Le bouton "Envoyer" (icône C à droite) ne répond pas OU il manque la sélection d'agent

## État du code actuel

### Vérifications effectuées ✅

1. **`useGuidAgentSelection.ts` (lignes 203-242)**:
   - ✅ Migration `custom:builtin-n8n-workflow` → `n8n` présente
   - ✅ `LEGACY_AGENT_KEYS` mapping défini
   - ✅ Persistance de la nouvelle clé après migration

2. **`useGuidSend.ts` (lignes 20-24, 268-280)**:
   - ✅ Type guard `isN8nType()` défini
   - ✅ Branche unifiée n8n avec `platform: 'custom'`
   - ✅ `try...finally` pour garantir arrêt du spinner

3. **Application en cours**:
   - ✅ Electron tourne (process 16064 - titre "AionUi")
   - ✅ Build récent (modif isolation multi-user)

## Hypothèses de la régression

### Hypothèse 1: Race condition au démarrage ⭐ PROBABLE

**Code actuel** (`useGuidAgentSelection.ts` ligne 198):

```typescript
useEffect(() => {
  // ✅ CORRECTION: Distinguish "loading" vs "empty list"
  if (availableAgents === undefined) return; // Wait for IPC to resolve
  if (availableAgents.length === 0) return; // No agents available
  
  // ... loadLastSelectedAgent
}, [availableAgents]);
```

**Problème possible**:
- Au premier mount, `availableAgents` peut être `[]` (liste vide) avant que l'IPC ne réponde
- La condition `availableAgents.length === 0` fait un `return` précoce
- Le `useEffect` ne se ré-exécute jamais car `availableAgents` ne change pas (reste `[]`)

**Test de validation**:
```javascript
// Dans DevTools Console (F12)
console.log('availableAgents:', window.__availableAgents);
// Attendu: [{ backend: 'n8n', ... }, ...]
// Si undefined ou [] → race condition confirmée
```

### Hypothèse 2: Config.json contient encore l'ancienne clé

**Vérification**:
```powershell
Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json
```

**Si contient**:
```json
{
  "guid.lastSelectedAgent": "custom:builtin-n8n-workflow"
}
```

**Alors**: La migration ne s'est pas exécutée (voir Hypothèse 1)

### Hypothèse 3: Bouton Admin initialise quelque chose de manquant

**Observation du mémo**:
> "Admin déclenche un appel IPC qui initialise quelque chose de manquant"

**Indices possibles**:
- Admin appelle un endpoint qui charge/rafraîchit les agents disponibles
- Admin force un re-render qui ré-exécute les `useEffect`
- Admin définit une variable globale requise

**Fichiers à inspecter**:
- `src/renderer/pages/admin/*` - Que fait le clic Admin?
- `src/process/bridge/adminBridge.ts` - Quels IPC sont appelés?

### Hypothèse 4: `window.__currentUserId` encore utilisé quelque part

**Lien avec isolation multi-user**:

Notre dernier changement a modifié:
- `database.ts` - `getUserConversations(userId: string)` (required)
- `databaseBridge.ts` - Bloque si `!userId`
- `ChatHistory.tsx` - Utilise `useAuth()` au lieu de `window.__currentUserId`

**Possible conflit**:
- Si `/guid` ou hooks utilisent encore `window.__currentUserId`
- Et que celui-ci est `undefined` au démarrage
- Alors les appels IPC échouent silencieusement

**Vérification**:
```powershell
Select-String -Path "src/renderer/pages/guid/**/*.ts*" -Pattern "window.__currentUserId"
```

## Plan de diagnostic (5 étapes)

### Étape 1: Vérifier l'état runtime actuel

**Dans DevTools Console (F12)**:

```javascript
// 1. Vérifier availableAgents
console.log('availableAgents:', window.__availableAgents);

// 2. Vérifier selectedAgent
console.log('selectedAgent:', window.__selectedAgent);

// 3. Vérifier userId
console.log('currentUserId:', window.__currentUserId);

// 4. Vérifier config
await window.electron.ipcRenderer.invoke('config.get', 'guid.lastSelectedAgent')
  .then(key => console.log('Config lastSelectedAgent:', key));
```

### Étape 2: Vérifier le fichier config.json

```powershell
$config = Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json
$config | ConvertTo-Json -Depth 10
```

### Étape 3: Rechercher window.__currentUserId dans /guid

```powershell
Select-String -Path "src/renderer/pages/guid/**/*.ts*" -Pattern "window.__currentUserId"
```

### Étape 4: Inspecter le comportement du bouton Admin

**Dans le code**:
```powershell
Select-String -Path "src/renderer/pages/guid/**/*.ts*" -Pattern "admin|Admin" -Context 3,3
```

**Dans DevTools**:
- Ouvrir Network tab (F12)
- Cliquer Admin
- Observer les requêtes IPC

### Étape 5: Ajouter logging temporaire

**Modifier temporairement `useGuidAgentSelection.ts`**:

```typescript
useEffect(() => {
  console.log('[DEBUG] availableAgents changed:', {
    value: availableAgents,
    isUndefined: availableAgents === undefined,
    length: availableAgents?.length,
  });

  if (availableAgents === undefined) {
    console.log('[DEBUG] Waiting for IPC to resolve...');
    return;
  }
  if (availableAgents.length === 0) {
    console.log('[DEBUG] No agents available, returning...');
    return;
  }

  console.log('[DEBUG] Loading last selected agent...');
  // ... reste du code
}, [availableAgents]);
```

## Solutions envisagées

### Solution 1: Force re-trigger du useEffect

**Si race condition confirmée**:

```typescript
useEffect(() => {
  // ✅ Attendre que availableAgents soit réellement peuplé
  if (!availableAgents || availableAgents.length === 0) {
    // Retry après un délai court
    const timer = setTimeout(() => {
      // Force re-check (via state local)
    }, 100);
    return () => clearTimeout(timer);
  }
  
  // ... loadLastSelectedAgent
}, [availableAgents]);
```

### Solution 2: Sélection par défaut si aucun config

**Si config.json vide ou absent**:

```typescript
useEffect(() => {
  // ...
  const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');
  
  if (!rawKey) {
    // ✅ Pas de config → sélectionner n8n par défaut
    const n8nAgent = availableAgents.find(a => 
      (a.backend === 'custom' && a.customAgentId === 'n8n') ||
      a.backend === 'n8n'
    );
    
    if (n8nAgent) {
      const key = n8nAgent.backend === 'custom' && n8nAgent.customAgentId 
        ? `custom:${n8nAgent.customAgentId}` 
        : n8nAgent.backend;
      _setSelectedAgentKey(key);
      await ConfigStorage.set('guid.lastSelectedAgent', key);
    }
    return;
  }
  
  // ... reste de la migration
}, [availableAgents]);
```

### Solution 3: Fallback dans useGuidSend

**Si selectedAgent reste undefined**:

```typescript
const handleSend = useCallback(async (message: string) => {
  // ...
  
  // ✅ Fallback: si aucun agent sélectionné, forcer n8n
  const effectiveAgent = selectedAgent || selectedAgentKey || 'n8n';
  const n8nType: N8nType | undefined = isN8nType(effectiveAgent) 
    ? effectiveAgent 
    : undefined;
  
  if (n8nType) {
    // ... branche n8n
  }
  // ...
}, [selectedAgent, selectedAgentKey]);
```

## Prochaines actions recommandées

### Immédiat (5 min)

1. **Ouvrir DevTools** (F12) dans l'application
2. **Exécuter les 4 commandes** de l'Étape 1
3. **Copier les résultats** dans le chat
4. **Cliquer Admin** et observer changements

### Court terme (15 min)

5. **Vérifier config.json** (Étape 2)
6. **Rechercher window.__currentUserId** (Étape 3)
7. **Ajouter logging temporaire** (Étape 5)
8. **Redémarrer app** et observer les logs

### Moyen terme (30 min)

9. **Implémenter Solution 2** (sélection par défaut forcée)
10. **Tester cycle complet**: démarrage → sélection auto → envoi message
11. **Commit si succès**

## Références

- Mémo original: `Doc_activation_workflow_n8n_chat/10_MEMO_RESOLUTION_COMPLETE.md`
- Section régression: Ligne 744 du mémo
- Code modifié précédemment:
  - `useGuidAgentSelection.ts` lignes 203-242
  - `useGuidSend.ts` lignes 20-24, 268-280

---

**Diagnostic rédigé par**: Kiro AI (Claude Sonnet 4.5)  
**Attente**: Résultats DevTools Console pour confirmer hypothèse
