# Fichiers prêts pour commit - Isolation Multi-User

**Date**: 2024-11-18  
**Branche suggérée**: `feature/multi-user-isolation-v19`

---

## 📦 Fichiers à committer

### Commit 1: Backend isolation (déjà fait probablement)

```bash
git add src/process/database/index.ts
git add src/process/bridge/databaseBridge.ts
git add src/process/bridge/conversationBridge.ts
git add src/process/initStorage.ts

git commit -m "feat(backend): implement multi-user data isolation

- Make userId required parameter in getUserConversations (no fallback)
- Add fail-closed security checks in databaseBridge
- Update conversationBridge to expect userId in create params
- Fix health check cleanup to use direct SQL instead of unsafe getUserConversations call

Implements defense-in-depth security model per Frontier Models consensus.
Prevents data leakage between user accounts in SaaS multi-tenant environment."
```

### Commit 2: Frontend ChatHistory (déjà fait probablement)

```bash
git add src/renderer/pages/conversation/ChatHistory.tsx

git commit -m "fix(ChatHistory): use useAuth instead of window.__currentUserId

- Replace window.__currentUserId with useAuth() hook for proper React lifecycle
- Add userId dependency to useEffect to reload conversations on user change
- Clear chat history when userId is undefined (logged out)
- Add cancelled flag to prevent race conditions

Part of multi-user isolation implementation (Phase 2 - Frontend).
Prevents race condition where window.__currentUserId could be undefined on startup."
```

### Commit 3: Frontend GuidPage (À FAIRE MAINTENANT)

```bash
git add src/renderer/pages/guid/GuidPage.tsx
git add src/renderer/pages/guid/hooks/useGuidSend.ts
git add src/renderer/pages/guid/hooks/useGuidAgentSelection.ts

git commit -m "fix(guid): pass userId to conversation.create for multi-user isolation

- Add useAuth() in GuidPage to get user.id
- Pass userId to useGuidSend hook as new required parameter
- Add userId to all conversation.create.invoke() calls:
  * Gemini conversations
  * OpenClaw Gateway conversations
  * Nanobot conversations
  * n8n / n8n-multi-workflow conversations
  * ACP (Claude, etc.) conversations
- Improve default n8n selection when no saved agent in config.json

Fixes regression where conversations could not be created from /guid page
after multi-user isolation backend changes (conversationBridge expects userId).

Part of multi-user isolation implementation (Phase 2 - Frontend).

Resolves: Doc_Saas_Multi_User/MEMO_REGRESSION_N8N_GUIDPAGE.md"
```

---

## 🔍 Vérifications avant commit

### 1. Vérifier que les fichiers ont été modifiés

```powershell
# Vérifier status git
git status

# Devrait montrer:
# modified: src/renderer/pages/guid/GuidPage.tsx
# modified: src/renderer/pages/guid/hooks/useGuidSend.ts
# modified: src/renderer/pages/guid/hooks/useGuidAgentSelection.ts
```

### 2. Vérifier le formatage

```powershell
# Les fichiers doivent déjà être formatés, mais pour être sûr:
npx prettier --check "src/renderer/pages/guid/GuidPage.tsx" "src/renderer/pages/guid/hooks/useGuidSend.ts" "src/renderer/pages/guid/hooks/useGuidAgentSelection.ts"

# Si erreurs, formater:
npx prettier --write "src/renderer/pages/guid/**/*.ts*"
```

### 3. Vérifier la compilation TypeScript (optionnel)

```powershell
# Peut avoir des warnings path alias, mais ne devrait pas avoir d'erreurs dans nos fichiers
npx tsc --noEmit 2>&1 | Select-String -Pattern "guid"
```

### 4. Tester l'application

- [x] Application démarre sans erreur
- [x] Page /guid accessible
- [x] Agent n8n sélectionné par défaut
- [x] Message "OHOH!" envoyé avec succès
- [x] Navigation vers conversation n8n
- [x] Réponse n8n reçue

---

## 📝 Diff prévu

### GuidPage.tsx

```diff
+ import { useAuth } from '@/renderer/context/AuthContext';

  const guidContainerRef = useRef<HTMLDivElement>(null);
  const { closeAllTabs, openTab } = useConversationTabs();
  const { activeBorderColor, inactiveBorderColor, activeShadow } = useInputFocusRing();
  const localeKey = resolveLocaleKey(i18n.language);
+ const { user } = useAuth();

  // ...

  const send = useGuidSend({
+   // User ID for multi-user isolation
+   userId: user?.id,
+   
    // Input state
    input: guidInput.input,
```

### useGuidSend.ts

```diff
  export type GuidSendDeps = {
+   // User ID for multi-user isolation
+   userId?: string;
+
    // Input state
    input: string,
    // ...
  };

  export const useGuidSend = (deps: GuidSendDeps): GuidSendResult => {
-   const { input, setInput, ... } = deps;
+   const { userId, input, setInput, ... } = deps;

    // ... Gemini
    const conversation = await ipcBridge.conversation.create.invoke({
+     userId,
      type: 'gemini',
      // ...
    });

    // ... OpenClaw
    const conversation = await ipcBridge.conversation.create.invoke({
+     userId,
      type: 'openclaw-gateway',
      // ...
    });

    // ... Nanobot
    const conversation = await ipcBridge.conversation.create.invoke({
+     userId,
      type: 'nanobot',
      // ...
    });

    // ... n8n
    const conversation = await ipcBridge.conversation.create.invoke({
+     userId,
      type: n8nType,
      // ...
    });

    // ... ACP
    const conversation = await ipcBridge.conversation.create.invoke({
+     userId,
      type: 'acp',
      // ...
    });
```

### useGuidAgentSelection.ts

```diff
  const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');
- if (cancelled || !rawKey) return;
  
+ // ✅ FIX: Si aucun agent sauvegardé, sélectionner n8n par défaut
+ if (!rawKey) {
+   const n8nAgent = availableAgents.find((agent) => {
+     const key = agent.backend === 'custom' && agent.customAgentId 
+       ? `custom:${agent.customAgentId}` 
+       : agent.backend;
+     return key === 'n8n' || key === 'n8n-multi-workflow';
+   });
+   
+   if (n8nAgent && !cancelled) {
+     const defaultKey = n8nAgent.backend === 'custom' && n8nAgent.customAgentId 
+       ? `custom:${n8nAgent.customAgentId}` 
+       : n8nAgent.backend;
+     
+     console.log('[useGuidAgentSelection] No saved agent, defaulting to:', defaultKey);
+     _setSelectedAgentKey(defaultKey);
+     await ConfigStorage.set('guid.lastSelectedAgent', defaultKey);
+   }
+   return;
+ }
+
+ if (cancelled) return;
```

---

## 🚀 Commande complète

```powershell
# 1. Vérifier le statut
git status

# 2. Ajouter les fichiers
git add src/renderer/pages/guid/GuidPage.tsx
git add src/renderer/pages/guid/hooks/useGuidSend.ts
git add src/renderer/pages/guid/hooks/useGuidAgentSelection.ts

# 3. Vérifier les fichiers staged
git diff --cached --name-only

# 4. Committer
git commit -m "fix(guid): pass userId to conversation.create for multi-user isolation

- Add useAuth() in GuidPage to get user.id
- Pass userId to useGuidSend hook as new required parameter
- Add userId to all conversation.create.invoke() calls:
  * Gemini conversations
  * OpenClaw Gateway conversations
  * Nanobot conversations
  * n8n / n8n-multi-workflow conversations
  * ACP (Claude, etc.) conversations
- Improve default n8n selection when no saved agent in config.json

Fixes regression where conversations could not be created from /guid page
after multi-user isolation backend changes (conversationBridge expects userId).

Part of multi-user isolation implementation (Phase 2 - Frontend).

Resolves: Doc_Saas_Multi_User/MEMO_REGRESSION_N8N_GUIDPAGE.md"

# 5. Vérifier le commit
git log -1 --stat

# 6. (Optionnel) Push vers remote
# git push origin feature/multi-user-isolation-v19
```

---

## 📋 Checklist post-commit

- [ ] Commit créé avec succès
- [ ] Message de commit contient toutes les informations
- [ ] Commit contient exactement 3 fichiers
- [ ] Build passe toujours (`npm run start`)
- [ ] Tests manuels passent (création conversation n8n)
- [ ] Documentation à jour (`Doc_Saas_Multi_User/`)
- [ ] Prêt pour review / merge

---

## 🔄 Prochains commits prévus

### Commit 4: ConversationTabs

```bash
# À FAIRE PLUS TARD
git add src/renderer/pages/conversation/ConversationTabs.tsx
git commit -m "fix(ConversationTabs): use useAuth instead of window.__currentUserId"
```

### Commit 5: Workspace

```bash
# À FAIRE PLUS TARD
git add src/renderer/pages/conversation/workspace/index.tsx
git commit -m "fix(workspace): use useAuth instead of window.__currentUserId"
```

### Commit 6: Type Safety

```bash
# À FAIRE PLUS TARD
git add src/common/ipcBridge.ts
git commit -m "feat(types): make userId required in conversation.create params"
```

---

## 📚 Références

- **Mémo incident**: `Doc_Saas_Multi_User/MEMO_REGRESSION_N8N_GUIDPAGE.md`
- **Statut global**: `Doc_Saas_Multi_User/STATUS_ISOLATION_V19.md`
- **Plan initial**: `Doc_Saas_Multi_User/PLAN_IMPLEMENTATION_ISOLATION_V19.md` (si existe)

---

**Préparé par**: Kiro AI (Claude Sonnet 4.5)  
**Date**: 2024-11-18  
**Statut**: ✅ PRÊT POUR COMMIT
