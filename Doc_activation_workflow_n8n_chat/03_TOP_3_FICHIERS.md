# Top 3 des fichiers critiques à envoyer aux experts Frontier

## 🥇 #1 - useGuidSend.ts (PRIORITÉ MAXIMUM)

**Chemin**: `src/renderer/pages/guid/hooks/useGuidSend.ts`  
**Raison**: **Cœur du problème** - C'est ici que le bouton "Envoyer" devrait créer la conversation n8n mais échoue.

### Pourquoi ce fichier est critique

1. **Point d'entrée utilisateur**: Appelé directement au clic sur "Envoyer"
2. **Logique de routage**: Décide quelle branche (gemini/acp/n8n) exécuter
3. **Condition problématique**: `if (selectedAgent === 'n8n')` jamais vraie
4. **Modification récente**: Ajout des branches n8n (commit ec247856)

### Questions spécifiques pour les experts

1. **La condition est-elle correctement formulée ?**
   ```typescript
   if (selectedAgent === 'n8n' || (isPreset && finalEffectiveAgentType === 'n8n'))
   ```

2. **Le placeholder model est-il valide ?**
   ```typescript
   const placeholderModel = currentModel || {
     id: 'n8n-placeholder',
     name: 'n8n',
     useModel: 'n8n-workflow',
     platform: 'n8n' as const,
     baseUrl: '',
     apiKey: '',
   };
   ```

3. **Pourquoi `selectedAgent` n'est jamais `'n8n'` ?**
   - Type union incomplet ?
   - État initial incorrect ?
   - Transformation intermédiaire ?

### Sections clés à examiner

- **Lignes 179-219**: Branche n8n path
- **Lignes 221-261**: Branche n8n-multi-workflow path  
- **Lignes 13-26**: Type `GuidSendDeps` avec union élargie
- **Lignes 270+**: Branche ACP path (fallback actuel)

---

## 🥈 #2 - useGuidAgentSelection.ts (PRIORITÉ HAUTE)

**Chemin**: `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts`  
**Raison**: **Source de l'état** - Gère `selectedAgentKey` qui détermine `selectedAgent` utilisé dans useGuidSend.

### Pourquoi ce fichier est critique

1. **État initial**: `useState<string>('n8n')` ligne 133
2. **Liste des agents**: Récupère `availableAgents` via IPC
3. **Logique de disponibilité**: `isMainAgentAvailable('n8n')` doit retourner true
4. **Transformation**: `selectedAgentKey` → `selectedAgent` (ligne 225)

### Questions spécifiques pour les experts

1. **L'état initial est-il bien appliqué ?**
   ```typescript
   const [selectedAgentKey, _setSelectedAgentKey] = useState<string>('n8n'); // Ligne 133
   ```
   
2. **La logique de disponibilité n8n est-elle correcte ?**
   ```typescript
   if (agentType === 'n8n' || agentType === 'n8n-multi-workflow') {
     return true; // Health check at conversation creation
   }
   ```

3. **Pourquoi `findAgentByKey('n8n')` pourrait retourner undefined ?**
   ```typescript
   const selectedAgentInfo = useMemo(
     () => findAgentByKey(selectedAgentKey),
     [selectedAgentKey, availableAgents, customAgents]
   );
   ```

### Sections clés à examiner

- **Ligne 133**: État initial `selectedAgentKey`
- **Lignes 127-156**: Hook `useSWR('acp.agents.available')`
- **Lignes 162-177**: Load last selected agent from storage
- **Lignes 225-226**: Dérivation de `selectedAgent` depuis `selectedAgentKey`
- **Lignes 419-430**: Fonction `isMainAgentAvailable`

---

## 🥉 #3 - acpTypes.ts (PRIORITÉ MOYENNE)

**Chemin**: `src/types/acpTypes.ts`  
**Raison**: **Fondation du système de types** - Définit `AcpBackendAll` qui doit inclure `'n8n'`.

### Pourquoi ce fichier est critique

1. **Type union**: `AcpBackendAll` doit contenir `'n8n' | 'n8n-multi-workflow'`
2. **Configuration**: `ACP_BACKENDS_ALL` définit les backends disponibles
3. **Type guards**: `isValidAcpBackend()` doit reconnaître n8n
4. **Preset types**: `PresetAgentType` inclut `'n8n' | 'n8n-multi-workflow'`

### Questions spécifiques pour les experts

1. **Le type union est-il complet ?**
   ```typescript
   export type AcpBackendAll =
     | 'claude'
     | 'gemini'
     // ...
     | 'n8n'                    // ✅ Ajouté
     | 'n8n-multi-workflow'     // ✅ Ajouté
     | 'custom';
   ```

2. **La configuration des backends est-elle correcte ?**
   ```typescript
   n8n: {
     id: 'n8n',
     name: 'n8n Workflow',
     cliCommand: undefined, // n8n is a backend service, not a CLI
     authRequired: false,
     enabled: true,
     supportsStreaming: false,
   },
   ```

3. **Le type `PresetAgentType` est-il aligné ?**
   ```typescript
   export type PresetAgentType = 
     'gemini' | 'claude' | 'codex' | 'codebuddy' | 'opencode' | 'qwen' 
     | 'n8n' | 'n8n-multi-workflow'; // ✅ Ajouté
   ```

### Sections clés à examiner

- **Lignes 14-15**: Type `PresetAgentType`
- **Lignes 39-58**: Type `AcpBackendAll`
- **Lignes 220-238**: Configuration `ACP_BACKENDS_ALL.n8n`
- **Lignes 245-250**: Fonction `isValidAcpBackend()`

---

## 📎 Fichiers supplémentaires de contexte

### Fichier bonus #4: AcpDetector.ts
**Chemin**: `src/agent/acp/AcpDetector.ts`  
**Raison**: Ajoute n8n à la liste des backends détectés au démarrage

**Section critique**:
```typescript
// Lignes ~105-115
detected.push({
  backend: 'n8n',
  name: 'n8n Workflow',
  cliPath: undefined,
});
detected.push({
  backend: 'n8n-multi-workflow',
  name: 'n8n Multi Workflow',
  cliPath: undefined,
});
```

### Fichier bonus #5: GuidPage.tsx
**Chemin**: `src/renderer/pages/guid/GuidPage.tsx`  
**Raison**: Coordonne tous les hooks et affiche l'UI

**Section critique**:
```typescript
// Lignes 34-38
const send = useGuidSend({
  selectedAgent: agentSelection.selectedAgent,
  selectedAgentKey: agentSelection.selectedAgentKey,
  // ...
});
```

---

## 📋 Checklist pour l'expert

Avant de répondre, vérifier :

- [ ] Les 3 fichiers contiennent bien les modifications du commit ec247856
- [ ] Le type `AcpBackendAll` inclut `'n8n'` et `'n8n-multi-workflow'`
- [ ] L'état initial `selectedAgentKey` est bien `'n8n'` (ligne 133)
- [ ] La branche `if (selectedAgent === 'n8n')` existe dans useGuidSend
- [ ] Le placeholder model n8n est correctement typé
- [ ] La logique `isMainAgentAvailable('n8n')` retourne `true`

---

**Dernière mise à jour**: 18/11/2026 16:20
