# ✅ Correction Appliquée : Assistants n8n sur /guid

## Modifications Effectuées

### 1. Ajout des types n8n à `AcpBackendAll`

**Fichier** : `src/types/acpTypes.ts`

Ajouté :
```typescript
| 'n8n' // n8n Workflow Backend
| 'n8n-multi-workflow' // n8n Multi Workflow Backend
```

### 2. Ajout manuel des assistants n8n dans `useGuidAgentSelection`

**Fichier** : `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts`

Modifié la fonction SWR pour ajouter manuellement les assistants n8n :

```typescript
const { data: availableAgentsData } = useSWR('acp.agents.available', async () => {
  const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
  if (result.success) {
    const acpAgents = result.data.filter((agent) => !(agent.backend === 'gemini' && agent.cliPath));
    
    // Add n8n assistants manually since they are not ACP backends
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

## Résultat Attendu

Après le redémarrage de l'application :

### ✅ Page /guid
- **Barre d'assistants** visible avec icônes
- **🔄 n8n Workflow** visible et sélectionnable
- **🔀 n8n Multi Workflow** visible et sélectionnable
- `n8n Workflow` sélectionné par défaut (ligne 82 de useGuidAgentSelection.ts)

### ✅ Fonctionnalité
- Sélection d'un assistant n8n → zone de saisie active
- Envoi d'un message → crée une conversation n8n
- Redirection vers `/conversation/{id}`

### ✅ Settings → Assistants
- Liste complète des assistants
- n8n Workflow et n8n Multi Workflow cochés (enabled)

## Test à Effectuer

1. **Attendre** que l'application se charge complètement
2. **Ouvrir** la page d'accueil (`/guid`)
3. **Vérifier** la présence des icônes n8n en haut de la page
4. **Sélectionner** n8n Workflow
5. **Taper** un message : "Bonjour"
6. **Appuyer** sur Entrée
7. **Vérifier** la création d'une conversation n8n

## Pourquoi Cette Solution Fonctionne

### Problème Identifié
- n8n n'est PAS un backend ACP (comme claude/gemini)
- `getAvailableAgents()` retourne uniquement les agents ACP détectés
- Les assistants preset n8n n'étaient jamais ajoutés à `availableAgents`

### Solution
- Ajout manuel des assistants n8n à la liste des agents disponibles
- Les traiter comme des agents spéciaux (non-ACP) au même titre que gemini builtin

## Fichiers Modifiés

1. `src/types/acpTypes.ts` - Ajout des types n8n à AcpBackendAll
2. `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts` - Ajout manuel des agents n8n
3. Code formatté avec Prettier

## État de l'Application

- ✅ Application redémarrée (terminal ID: 2)
- ✅ Compilation en cours
- ⏳ Attendre ~30 secondes pour que l'application Electron démarre

## Prochaine Étape

**Rafraîchir le navigateur** ou **ouvrir l'application Electron** et vérifier que les assistants n8n apparaissent !
