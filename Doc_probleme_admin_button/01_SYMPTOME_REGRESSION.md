# Symptôme : Régression Bouton Admin

**Application** : E-audit v1.8.25  
**Date détection** : 2026-11-18 17:52  
**Contexte** : Régression post-validation du correctif n8n  
**Gravité** : 🔴 BLOQUANT (empêche utilisation normale)

---

## 📋 Description du symptôme

### Comportement observé

**Au premier démarrage de l'application** :
1. Ouvrir l'application E-audit
2. **NE PAS cliquer sur "Admin"**
3. Naviguer vers `/guid` (page d'accueil)
4. ❌ **Symptôme** : L'agent n8n n'est **pas sélectionné** / liste vide / fonctionnalités manquantes

**Après avoir cliqué sur "Admin"** :
1. Cliquer sur le bouton "Admin" en haut de l'interface
2. Retourner vers `/guid`
3. ✅ **Fonctionnement normal** : Agent n8n sélectionné, tout fonctionne

### Chronologie

```
17:00 → Validation initiale : ✅ 3/3 tests passés
        "Le message a pu être envoyé et la réponse n8n obtenue"
        
17:30 → Finalisation documentation
        
17:52 → Redémarrage application pour test à froid
        ❌ Symptôme réapparaît : nécessite clic Admin
```

---

## 🔍 Observations clés

### Ce qui fonctionne

- ✅ Après le premier clic sur "Admin", tout fonctionne parfaitement
- ✅ Le correctif de migration legacy keys est bien présent dans le code
- ✅ Le type guard `isN8nType()` fonctionne correctement
- ✅ L'application démarre sans erreur (base de données OK)

### Ce qui ne fonctionne pas

- ❌ Au premier démarrage, avant clic Admin, `/guid` ne fonctionne pas
- ❌ Comportement non reproductible lors de la validation initiale
  - **Hypothèse** : L'application était déjà "chaude" lors des tests

---

## 🧪 Hypothèses de cause racine

### Hypothèse 1 : `availableAgents` non initialisé au mount

**Théorie** :
```typescript
// useGuidAgentSelection.ts
const { availableAgents } = useAgents();  // Vide au premier render ?

useEffect(() => {
  // Migration s'exécute mais selectedAgent ne match rien dans availableAgents vide
  const config = await readConfig();
  const migratedAgent = LEGACY_AGENT_KEYS[config.lastSelectedAgent] || config.lastSelectedAgent;
  setSelectedAgent(migratedAgent);  // "n8n"
  
  // Mais si availableAgents = [], l'UI ne peut pas afficher "n8n"
}, []);
```

**Test** :
- Vérifier ordre d'exécution : `useAgents()` vs `useEffect` de migration
- Logger `availableAgents.length` au mount

### Hypothèse 2 : Race condition - IPC non résolu

**Théorie** :
```typescript
// useAgents() appelle probablement un IPC
const useAgents = () => {
  const [agents, setAgents] = useState([]);
  
  useEffect(() => {
    window.api.getAgents().then(setAgents);  // Asynchrone !
  }, []);
  
  return { availableAgents: agents };
};

// → Au premier render, agents = [] (appel IPC pas encore résolu)
```

**Test** :
- Vérifier logs IPC : quand `getAgents` est-il appelé ?
- Vérifier si Admin déclenche un `refreshAgents()` ou équivalent

### Hypothèse 3 : Admin initialise un contexte manquant

**Théorie** :

Le bouton "Admin" pourrait déclencher :
1. Un appel IPC qui charge les agents depuis le main process
2. Une initialisation de contexte (AuthContext ?)
3. Une mise à jour de state globale nécessaire

**Test** :
- Lire le code du bouton "Admin"
- Identifier tous les effets de bord du clic

### Hypothèse 4 : Dépendance manquante dans `useEffect`

**Théorie** :
```typescript
useEffect(() => {
  loadConfig();
}, []);  // ❌ Devrait dépendre de availableAgents ?

// Correction potentielle :
useEffect(() => {
  if (availableAgents.length > 0) {
    loadConfig();
  }
}, [availableAgents]);  // ✅ Attend que les agents soient chargés
```

---

## 🎯 Plan d'investigation

### Phase 1 : Diagnostic des logs

**Actions** :
1. Relancer l'application avec DevTools ouvert (F12)
2. Observer les logs console au démarrage
3. Chercher :
   - `[useGuidAgentSelection]` logs
   - `[useAgents]` ou `[ACP]` logs
   - Ordre d'exécution des `useEffect`

### Phase 2 : Lecture de code

**Fichiers à inspecter** :
1. `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts` (déjà modifié)
2. `src/renderer/hooks/useAgents.ts` (ou équivalent) ← **Clé**
3. Composant du bouton "Admin" ← **Clé**
4. `src/renderer/pages/guid/GuidPage.tsx` (order of hooks)

### Phase 3 : Test de contournement

**Essayer** :
```typescript
// Dans useGuidAgentSelection.ts
useEffect(() => {
  // Attendre que availableAgents soit peuplé
  if (availableAgents.length === 0) return;
  
  loadConfig();
}, [availableAgents]);  // Dépendance ajoutée
```

---

## 📊 Comparaison validation vs régression

| Critère | Validation (17h00) | Régression (17h52) |
|---------|-------------------|-------------------|
| Application | Démarrée depuis 15 min | Redémarrage à froid |
| Clic Admin préalable | Peut-être (non confirmé) | Non |
| Agents chargés | Oui (chauds en mémoire ?) | Non (au mount) |
| Résultat | ✅ Fonctionne | ❌ Nécessite Admin |

**Conclusion préliminaire** : 
Le correctif fonctionne **mais uniquement si les agents sont déjà chargés**. Au premier mount à froid, la race condition fait que `availableAgents` est vide quand la migration s'exécute.

---

## 🚀 Prochaines étapes

1. **Identifier le hook `useAgents()`** et son comportement asynchrone
2. **Lire le code du bouton "Admin"** pour comprendre son effet
3. **Ajouter logs détaillés** pour tracer l'ordre d'exécution
4. **Proposer correctif** : probablement ajouter `availableAgents` comme dépendance

---

**Statut** : 🔴 INVESTIGATION EN COURS  
**Priorité** : HAUTE (bloque utilisation normale)
