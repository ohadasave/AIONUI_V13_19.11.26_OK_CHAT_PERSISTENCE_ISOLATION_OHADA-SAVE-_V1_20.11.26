# Analyse Cause Racine - Problème Admin Button

**Date** : 2026-11-18  
**Investigation par** : Kiro AI (Claude Sonnet 4.5)

---

## 🔬 Diagnostic confirmé

### Cause racine identifiée

**Race condition entre chargement des agents et migration de config**

```typescript
// useGuidAgentSelection.ts (ligne 83)
const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>();  
// ❌ État initial = undefined

// Ligne 182 : SWR fetch agents via IPC (asynchrone)
const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
  const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
  // ...
});

// Ligne 188 : Mise à jour des agents quand IPC répond
useEffect(() => {
  if (availableAgentsData) {
    setAvailableAgents(availableAgentsData);  // ← Peut prendre 50-500ms
  }
}, [availableAgentsData]);

// Ligne 193 : useEffect de migration CONFIG
useEffect(() => {
  if (!availableAgents || availableAgents.length === 0) return;  
  // ❌ PROBLÈME : Sort immédiatement si availableAgents est vide/undefined
  
  // ... migration legacy keys + load config
}, [availableAgents]);  // ← Dépend de availableAgents
```

---

## 📊 Ordre d'exécution

### Scénario 1 : Premier démarrage à froid (❌ ÉCHOUE)

```
T=0ms    : Component mount
T=0ms    : availableAgents = undefined
T=0ms    : useEffect migration s'exécute
           → if (!availableAgents || availableAgents.length === 0) return;
           → ❌ SORT IMMÉDIATEMENT

T=10ms   : SWR déclenche IPC getAvailableAgents
T=200ms  : IPC répond avec liste d'agents
T=200ms  : setAvailableAgents(data) mis à jour
T=200ms  : useEffect migration SE RÉEXÉCUTE (dépendance availableAgents)
           → availableAgents.length > 0 ✅
           → Charge config et applique migration
           → ✅ Fonctionne MAINTENANT

MAIS : Le render initial a déjà affiché "Sélectionner un assistant..." 
       pendant 200ms, et l'utilisateur voit ce placeholder.
```

### Scénario 2 : Après clic Admin (✅ FONCTIONNE)

```
Utilisateur clique "Admin" → Navigate vers /admin → Retour vers /guid

T=0ms    : Component re-mount
T=0ms    : availableAgents = undefined
T=0ms    : SWR RÉCUPÈRE DEPUIS LE CACHE ⚡
           → availableAgentsData déjà présent
T=0ms    : setAvailableAgents(cachedData)
           → availableAgents.length > 0 immédiatement ✅

T=0ms    : useEffect migration s'exécute
           → if (!availableAgents...) // false, ne sort pas
           → Charge config et applique migration
           → ✅ Fonctionne immédiatement
```

### Scénario 3 : Application "chaude" lors de la validation (✅ FONCTIONNE)

```
Application démarrée depuis 15 minutes, agents déjà chargés en mémoire

T=0ms    : Premier render de /guid
T=0ms    : SWR récupère depuis cache ⚡
T=0ms    : availableAgents peuplé immédiatement
T=0ms    : useEffect migration fonctionne
           → ✅ "n8n Workflow" sélectionné

EXPLICATION : C'est pourquoi la validation initiale (17h00) a réussi !
L'application était déjà "chaude" après les tests précédents.
```

---

## 🎯 Solution

### Option 1 : Attendre explicitement que les agents soient chargés ✅ RECOMMANDÉE

**Principe** : Ne pas sortir prématurément du `useEffect` de migration.

```typescript
// useGuidAgentSelection.ts
useEffect(() => {
  // ❌ AVANT : Sort si vide
  if (!availableAgents || availableAgents.length === 0) return;
  
  // ✅ APRÈS : Ne sort QUE si availableAgents est explicitement vide (pas undefined)
  if (availableAgents === undefined) return; // Attendre le chargement
  if (availableAgents.length === 0) return;   // Liste vide = aucun agent dispo
  
  // ... migration et load config
}, [availableAgents]);
```

**Avantage** : Simple, minimal, ne change pas l'architecture.

### Option 2 : Charger la config AVANT de vérifier availableAgents

**Principe** : Charger la config indépendamment, puis valider après.

```typescript
// useGuidAgentSelection.ts
const [loadedAgentKey, setLoadedAgentKey] = useState<string | null>(null);

// Charger la config immédiatement au mount
useEffect(() => {
  const loadConfig = async () => {
    const LEGACY_AGENT_KEYS = { ... };
    const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');
    const migratedKey = LEGACY_AGENT_KEYS[rawKey] ?? rawKey ?? 'n8n';
    setLoadedAgentKey(migratedKey);
    
    // Persister la migration
    if (migratedKey !== rawKey) {
      await ConfigStorage.set('guid.lastSelectedAgent', migratedKey);
    }
  };
  
  loadConfig();
}, []); // ← Pas de dépendance

// Appliquer la clé chargée seulement quand agents disponibles
useEffect(() => {
  if (!loadedAgentKey || !availableAgents || availableAgents.length === 0) return;
  
  const isValid = availableAgents.some(agent => {
    const key = agent.backend === 'custom' && agent.customAgentId 
      ? `custom:${agent.customAgentId}` 
      : agent.backend;
    return key === loadedAgentKey;
  });
  
  if (isValid) {
    _setSelectedAgentKey(loadedAgentKey);
  }
}, [loadedAgentKey, availableAgents]);
```

**Avantage** : Séparation claire entre "charger config" et "valider config".  
**Inconvénient** : Plus de code, état intermédiaire supplémentaire.

### Option 3 : Utiliser SWR pour la config aussi

**Principe** : Tout passe par SWR avec gestion de cache cohérente.

```typescript
const { data: savedAgentKey } = useSWR('guid.lastSelectedAgent', async () => {
  const LEGACY_AGENT_KEYS = { ... };
  const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');
  const migratedKey = LEGACY_AGENT_KEYS[rawKey] ?? rawKey ?? 'n8n';
  
  // Persister la migration
  if (migratedKey !== rawKey) {
    await ConfigStorage.set('guid.lastSelectedAgent', migratedKey);
  }
  
  return migratedKey;
});

useEffect(() => {
  if (!savedAgentKey || !availableAgents) return;
  
  const isValid = availableAgents.some(agent => ...);
  if (isValid) {
    _setSelectedAgentKey(savedAgentKey);
  }
}, [savedAgentKey, availableAgents]);
```

**Avantage** : Cohérence avec le pattern existant (agents via SWR).  
**Inconvénient** : SWR pour un simple localStorage est overkill.

---

## 🚀 Recommandation finale

**Option 1** est la meilleure : minimale, claire, résout le problème.

**Correctif à appliquer** :

```typescript
// src/renderer/pages/guid/hooks/useGuidAgentSelection.ts
// Ligne ~193

useEffect(() => {
  // ✅ CORRECTION : Distinguer "en cours de chargement" vs "liste vide"
  if (availableAgents === undefined) return; // Attendre le chargement IPC
  if (availableAgents.length === 0) return;   // Aucun agent disponible
  
  let cancelled = false;

  const loadLastSelectedAgent = async () => {
    try {
      // Migration map
      const LEGACY_AGENT_KEYS: Record<string, string> = {
        'custom:builtin-n8n-workflow': 'n8n',
        'custom:builtin-n8n-multi-workflow': 'n8n-multi-workflow',
      };

      const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');
      if (cancelled || !rawKey) return;

      // Appliquer la migration
      const savedAgentKey = LEGACY_AGENT_KEYS[rawKey] ?? rawKey;

      const isInAvailable = availableAgents.some((agent) => {
        const key = agent.backend === 'custom' && agent.customAgentId 
          ? `custom:${agent.customAgentId}` 
          : agent.backend;
        return key === savedAgentKey;
      });

      if (isInAvailable) {
        _setSelectedAgentKey(savedAgentKey);

        // Persister la nouvelle clé si migration appliquée
        if (savedAgentKey !== rawKey) {
          void ConfigStorage.set('guid.lastSelectedAgent', savedAgentKey);
        }
      }
    } catch (error) {
      console.error('Failed to load last selected agent:', error);
    }
  };

  void loadLastSelectedAgent();

  return () => {
    cancelled = true;
  };
}, [availableAgents]);
```

**Changement** : Une seule ligne modifiée !

```diff
- if (!availableAgents || availableAgents.length === 0) return;
+ if (availableAgents === undefined) return; // Attendre le chargement
+ if (availableAgents.length === 0) return;   // Liste vide
```

---

## ✅ Vérification du correctif

### Tests à effectuer

1. **Test à froid** : Fermer complètement l'application, relancer
   - ✅ Attendu : "n8n Workflow" sélectionné automatiquement
   
2. **Test après Admin** : Clic Admin puis retour `/guid`
   - ✅ Attendu : Continue de fonctionner (pas de régression)
   
3. **Test avec config legacy** : Supprimer `config.json`, ajouter ancienne clé manuellement
   - ✅ Attendu : Migration automatique vers `n8n`

---

## 📝 Logs de diagnostic à ajouter (optionnel)

```typescript
useEffect(() => {
  console.log('[useGuidAgentSelection] availableAgents status:', {
    isUndefined: availableAgents === undefined,
    length: availableAgents?.length,
    agents: availableAgents?.map(a => a.backend),
  });
  
  if (availableAgents === undefined) {
    console.log('[useGuidAgentSelection] Waiting for agents to load...');
    return;
  }
  if (availableAgents.length === 0) {
    console.log('[useGuidAgentSelection] No agents available');
    return;
  }
  
  console.log('[useGuidAgentSelection] Loading saved agent key...');
  // ...
}, [availableAgents]);
```

---

**Statut** : 🟢 CAUSE RACINE CONFIRMÉE  
**Solution** : 🟢 CORRECTIF IDENTIFIÉ (1 ligne)  
**Prochaine étape** : Appliquer le correctif
