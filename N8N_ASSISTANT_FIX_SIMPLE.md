# Solution Simple pour Afficher les Assistants n8n

## Problème Identifié

Les assistants n8n sont **activés** dans les settings (✅ cochés), mais n'apparaissent PAS sur la page `/guid`.

### Cause Racine

1. **n8n n'est PAS un backend ACP** comme claude ou gemini
2. `getAvailableAgents()` retourne uniquement les agents ACP détectés (claude, gemini, etc.)
3. Les assistants avec `presetAgentType='n8n'` sont dans `customAgents` mais ne sont jamais ajoutés à `availableAgents`

### Code problématique

Dans `useGuidAgentSelection.ts` ligne 178 :

```typescript
const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
  const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
  if (result.success) {
    // ❌ Retourne SEULEMENT les agents ACP (claude, gemini, codex, etc.)
    // n8n n'est PAS un agent ACP donc n'apparaît jamais ici
    return result.data.filter((agent) => !(agent.backend === 'gemini' && agent.cliPath));
  }
  return [];
});
```

## Solution Simple

Ajouter les assistants n8n manuellement à la liste des agents disponibles dans `useGuidAgentSelection.ts`.

### Modification à apporter

Dans `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts`, après la ligne 183, ajouter :

```typescript
// --- SWR: Fetch available agents ---
const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
  const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
  if (result.success) {
    const acpAgents = result.data.filter((agent) => !(agent.backend === 'gemini' && agent.cliPath));
    
    // ✅ Ajouter manuellement n8n et n8n-multi-workflow comme agents disponibles
    const n8nAgents = [
      {
        backend: 'n8n' as AcpBackend,
        name: 'n8n Workflow',
        cliPath: undefined,
        customAgentId: 'builtin-n8n-workflow',
        isPreset: true,
        context: '',
        avatar: '🔄',
        supportedTransports: []
      },
      {
        backend: 'n8n-multi-workflow' as AcpBackend,
        name: 'n8n Multi Workflow',
        cliPath: undefined,
        customAgentId: 'builtin-n8n-multi-workflow',
        isPreset: true,
        context: '',
        avatar: '🔀',
        supportedTransports: []
      }
    ];
    
    return [...acpAgents, ...n8nAgents];
  }
  return [];
});
```

### Types à modifier

Il faudra aussi ajouter `'n8n'` et `'n8n-multi-workflow'` au type `AcpBackendAll` dans `src/types/acpTypes.ts` :

```typescript
export type AcpBackendAll =
  | 'claude'
  | 'gemini'
  | 'qwen'
  // ... autres backends ...
  | 'nanobot'
  | 'n8n'              // ✅ Ajouter
  | 'n8n-multi-workflow' // ✅ Ajouter
  | 'custom';
```

## Vérification

Après ces modifications :
1. Redémarrer l'application
2. Ouvrir `/guid`
3. Les assistants n8n devraient apparaître dans la barre d'assistants
4. Sélectionner n8n et envoyer un message devrait créer une conversation n8n

## Alternative (Plus propre)

Une solution plus robuste serait de modifier `getAvailableAgents()` pour qu'il retourne également les assistants preset activés qui ne sont pas des backends ACP (comme n8n, gemini builtin, etc.).

Mais la solution ci-dessus est la plus simple et rapide à implémenter.
