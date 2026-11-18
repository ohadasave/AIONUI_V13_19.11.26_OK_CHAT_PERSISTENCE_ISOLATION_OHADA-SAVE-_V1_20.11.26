# Prompt pour Frontier Model - Bug Isolation Multi-Utilisateur

## CONTEXTE

Application **E-audit** (AionUI) - Electron Desktop multi-utilisateur avec base SQLite.

**Symptôme critique :** Après avoir implémenté l'isolation multi-utilisateur (v18 → v18.1), les utilisateurs **voient toujours les conversations des autres utilisateurs**. Les données se chevauchent dans l'interface.

---

## COMPORTEMENT OBSERVÉ

```
1. Utilisateur A login (DALLE/LEADER00)
   → Crée conversation "AAAAAA"
   → Logout

2. Utilisateur B login (nouveau compte BOB/PASSWORD456)
   → Crée conversation "Test BOB"
   → ❌ VOIT AUSSI "AAAAAA" de l'utilisateur A

3. Les tables se chevauchent visuellement
```

**Attendu :** Chaque utilisateur voit uniquement SES conversations.  
**Réel :** Tous les utilisateurs voient TOUTES les conversations.

---

## ARCHITECTURE IMPLÉMENTÉE (v18.1)

### Génération du userId (AuthContext.tsx)

```typescript
// Login Desktop mode
const login = async ({ username, password }) => {
  const storedCredentials = localStorage.getItem('eaudit_credentials');
  let userId: string;
  
  if (storedCredentials) {
    const { username: stored, password: storedPwd, userId: storedUserId } = JSON.parse(storedCredentials);
    
    if (username === stored && password === storedPwd) {
      // Reconnexion même utilisateur
      userId = storedUserId; // ✅ Réutilise userId existant
    } else {
      // Nouveau compte
      userId = `user_${Date.now()}`; // ✅ Nouveau userId
      localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
    }
  } else {
    // Premier login
    userId = `user_${Date.now()}`;
    localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
  }
  
  // Stockage
  localStorage.setItem('eaudit_user_id', userId);
  (window as any).__currentUserId = userId; // ← EXPOSITION GLOBALE
  
  setUser({ id: userId, username, role: 'admin' });
  setStatus('authenticated');
  setReady(true);
  return { success: true };
};
```

### Chaîne de Lecture (ChatHistory.tsx → Database)

```typescript
// FRONTEND: ChatHistory.tsx (ligne ~104)
useEffect(() => {
  const refresh = () => {
    const userId = (window as any).__currentUserId; // ← LIT ICI
    console.log('[ChatHistory] userId:', userId);
    
    ipcBridge.database.getUserConversations
      .invoke({ userId, page: 0, pageSize: 10000 }) // ← PASSE ICI
      .then(history => setChatHistory(history || []));
  };
  refresh();
  return addEventListener('chat.history.refresh', refresh);
}, [isConversation]);

// BACKEND: databaseBridge.ts (ligne ~27)
provider(async ({ userId, page, pageSize }) => {
  console.log('[DatabaseBridge] userId:', userId);
  
  if (userId && userId !== 'system_default_user') {
    const result = db.getUserConversations(userId, page, pageSize);
    return result.data;
  }
  // ... file storage merge ...
});

// DATABASE: index.ts (ligne ~527)
getUserConversations(userId?: string, page, pageSize) {
  const finalUserId = userId || this.defaultUserId; // ← FALLBACK ICI
  console.log('[Database] finalUserId:', finalUserId);
  
  const rows = this.db.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? 
    ORDER BY updated_at DESC 
    LIMIT ? OFFSET ?
  `).all(finalUserId, pageSize, page * pageSize);
  
  return { data: rows.map(rowToConversation), ... };
}
```

### Chaîne de Création (AgentSetupCard.tsx → Database)

```typescript
// FRONTEND: AgentSetupCard.tsx
const userId = getCurrentUserId(); // window.__currentUserId
ipcBridge.conversation.create.invoke({ type, model, extra, userId });

// BACKEND: conversationBridge.ts
ipcBridge.conversation.create.provider(async (params) => {
  const result = await ConversationService.createConversation({
    ...params,
    userId: params.userId
  });
});

// SERVICE: conversationService.ts (ligne ~191)
const result = db.createConversation(conversation, params.userId);

// DATABASE: index.ts
createConversation(conversation, userId) {
  if (!userId) throw new Error('userId required');
  const row = conversationToRow(conversation, userId);
  INSERT INTO conversations (id, user_id, ...) VALUES (?, ?, ...)
}
```

**Note :** La création (WRITE) semble fonctionner selon les logs, donc `userId` est bien transmis en écriture.

---

## HYPOTHÈSES PRINCIPALES

### Hypothèse #1: Race Condition `window.__currentUserId` ⭐⭐⭐⭐⭐

**Probabilité :** TRÈS HAUTE

**Explication :**
- `setUser()` dans `AuthContext.login()` déclenche un re-render React
- `ChatHistory.tsx` se monte IMMÉDIATEMENT
- Le `useEffect` s'exécute AVANT que `window.__currentUserId` soit défini
- Résultat : `userId = undefined` → fallback vers `'system_default_user'`

**Code suspect :**
```typescript
// AuthContext.tsx
(window as any).__currentUserId = userId;
setUser({ id: userId, ... });
// ↓ React re-render IMMÉDIAT
// ↓ ChatHistory useEffect s'exécute

// ChatHistory.tsx
const userId = (window as any).__currentUserId; // ← undefined ?
```

**Test de diagnostic :**
```typescript
const userId = (window as any).__currentUserId;
console.log('[ChatHistory] __currentUserId:', userId);
console.log('[ChatHistory] typeof:', typeof userId);

if (!userId) {
  console.error('[ChatHistory] CRITICAL: userId is undefined!');
}
```

**Solution proposée :**
```typescript
// Utiliser useAuth() au lieu de window.__currentUserId
import { useAuth } from '@renderer/context/AuthContext';

const { user } = useAuth();

useEffect(() => {
  if (!user?.id) {
    console.log('[ChatHistory] No user, skip loading');
    setChatHistory([]);
    return;
  }
  
  const refresh = () => {
    ipcBridge.database.getUserConversations
      .invoke({ userId: user.id, page: 0, pageSize: 10000 })
      .then(history => setChatHistory(history || []));
  };
  
  refresh();
  return addEventListener('chat.history.refresh', refresh);
}, [user?.id]); // ← Dépendance sur user.id
```

---

### Hypothèse #2: Les conversations sont créées avec `user_id = 'system_default_user'` ⭐⭐⭐⭐

**Probabilité :** HAUTE

**Explication :**
- Même si le frontend passe le bon `userId` en lecture, les conversations en base ont toutes le même `user_id`
- Le problème est en ÉCRITURE, pas en LECTURE
- Query `SELECT * FROM conversations WHERE user_id = 'user_XXX'` retourne vide
- Mais `SELECT * FROM conversations WHERE user_id = 'system_default_user'` retourne tout

**Test de diagnostic :**
```sql
-- Vérifier les user_id réels
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"

SELECT id, user_id, name, created_at 
FROM conversations 
ORDER BY created_at DESC 
LIMIT 10;

-- Si tous ont user_id = 'system_default_user' → BUG EN ÉCRITURE
-- Si chaque conversation a un user_id différent → BUG EN LECTURE
```

**Solution proposée :**
```typescript
// conversationService.ts - Vérifier que params.userId est bien défini
static async createConversation(params: ICreateConversationOptions) {
  if (!params.userId) {
    console.error('[ConversationService] BLOCKED: userId is required');
    throw new Error('userId is required for conversation creation');
  }
  
  console.log('[ConversationService] Creating conversation for userId:', params.userId);
  const result = db.createConversation(conversation, params.userId);
  
  if (result.success) {
    console.log('[ConversationService] Created conversation with user_id:', params.userId);
  }
  
  return result;
}
```

---

### Hypothèse #3: File Storage Merge Pollue les Résultats ⭐⭐

**Probabilité :** MOYENNE

**Explication :**
- `databaseBridge.ts` merge les conversations DB avec celles du file storage
- Le file storage ne supporte PAS multi-user
- Les conversations du file sont ajoutées SANS filtrage par userId

**Code suspect :**
```typescript
// databaseBridge.ts
if (userId && userId !== 'system_default_user') {
  return dbConversations; // Skip file storage
}

// Mais si userId est undefined, on arrive ici:
const fileConversations = await ProcessChat.get('chat.history');
const fileOnlyConversations = fileConversations.filter(conv => !dbConversationMap.has(conv.id));
return [...dbConversations, ...fileOnlyConversations]; // ← Pollution possible
```

**Solution proposée :**
```typescript
// Toujours skip file storage en mode multi-user
provider(async ({ userId, page, pageSize }) => {
  if (!userId) {
    console.error('[DatabaseBridge] userId required, returning empty');
    return [];
  }
  
  const result = db.getUserConversations(userId, page, pageSize);
  
  // Skip file storage en mode multi-user
  console.log(`[DatabaseBridge] Multi-user mode: ${result.data.length} conversations from DB`);
  return result.data;
});
```

---

## PISTES DE SOLUTION

### Solution #1: Utiliser useAuth() (RECOMMANDÉ) ⭐⭐⭐⭐⭐

**Fichiers à modifier :** 3 fichiers frontend

```typescript
// 1. ChatHistory.tsx
import { useAuth } from '@renderer/context/AuthContext';

export const ChatHistory = ({ onSessionClick }) => {
  const { user } = useAuth(); // ← Utiliser Context React
  
  useEffect(() => {
    if (!user?.id) {
      setChatHistory([]);
      return;
    }
    
    const refresh = () => {
      ipcBridge.database.getUserConversations
        .invoke({ userId: user.id, page: 0, pageSize: 10000 })
        .then(history => setChatHistory(history || []));
    };
    
    refresh();
    return addEventListener('chat.history.refresh', refresh);
  }, [user?.id]); // ← Garantit que user.id est défini
};

// 2. ConversationTabs.tsx (même pattern)
const { user } = useAuth();

const handleNewConversation = useCallback(() => {
  if (!user?.id) return;
  
  void ipcBridge.database.getUserConversations
    .invoke({ userId: user.id, page: 0, pageSize: 10000 })
    .then(conversations => { /* ... */ });
}, [user?.id]);

// 3. workspace/index.tsx (même pattern)
const { user } = useAuth();

const handleMigrateWorkspace = async () => {
  if (!user?.id) return;
  
  const conversations = await ipcBridge.database.getUserConversations
    .invoke({ userId: user.id, page: 0, pageSize: 10000 });
};
```

**Avantages :**
- ✅ React garantit que `user.id` est défini quand le useEffect s'exécute
- ✅ Pas de race condition
- ✅ Type-safe

---

### Solution #2: Bloquer les appels sans userId (SÉCURITÉ)

**Fichiers à modifier :** 1 fichier backend

```typescript
// databaseBridge.ts
provider(async ({ userId, page = 0, pageSize = 10000 }) => {
  console.log('[DatabaseBridge] Received userId:', userId);
  
  if (!userId) {
    console.error('[DatabaseBridge] BLOCKED: userId is required');
    console.error('[DatabaseBridge] Returning empty array to prevent data leak');
    return []; // ← Fail-safe
  }
  
  const result = db.getUserConversations(userId, page, pageSize);
  console.log(`[DatabaseBridge] Returning ${result.data.length} conversations for userId=${userId}`);
  return result.data;
});
```

**Avantages :**
- ✅ Empêche le fallback silencieux vers `system_default_user`
- ✅ Force le debug (liste vide visible)
- ✅ Évite fuite de données entre utilisateurs

---

### Solution #3: Supprimer defaultUserId fallback (STRICT)

**Fichiers à modifier :** 1 fichier database

```typescript
// database/index.ts
getUserConversations(userId: string, page = 0, pageSize = 50) { // ← Plus de '?'
  console.log(`[Database] getUserConversations userId=${userId}`);
  
  // Pas de fallback
  const countResult = this.db.prepare(
    'SELECT COUNT(*) as count FROM conversations WHERE user_id = ?'
  ).get(userId);
  
  const rows = this.db.prepare(`
    SELECT * FROM conversations 
    WHERE user_id = ? 
    ORDER BY updated_at DESC 
    LIMIT ? OFFSET ?
  `).all(userId, pageSize, page * pageSize);
  
  return {
    data: rows.map(rowToConversation),
    total: countResult.count,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < countResult.count,
  };
}
```

**Avantages :**
- ✅ Erreur explicite si userId manque
- ✅ Force correction upstream

---

### Solution #4: Logs exhaustifs pour diagnostic

**Fichiers à modifier :** 4 fichiers (AuthContext, ChatHistory, databaseBridge, database)

```typescript
// AuthContext.tsx (après setUser)
console.log('[AuthContext] ===== LOGIN SUCCESS =====');
console.log('[AuthContext] userId:', userId);
console.log('[AuthContext] window.__currentUserId:', (window as any).__currentUserId);
console.log('[AuthContext] localStorage:', localStorage.getItem('eaudit_user_id'));

// ChatHistory.tsx (dans useEffect)
console.log('[ChatHistory] ===== FETCH CONVERSATIONS =====');
console.log('[ChatHistory] window.__currentUserId:', (window as any).__currentUserId);
console.log('[ChatHistory] typeof:', typeof (window as any).__currentUserId);

// databaseBridge.ts (dans provider)
console.log('[DatabaseBridge] ===== IPC RECEIVED =====');
console.log('[DatabaseBridge] userId:', userId);
console.log('[DatabaseBridge] typeof:', typeof userId);

// database/index.ts (dans getUserConversations)
console.log('[Database] ===== GET CONVERSATIONS =====');
console.log('[Database] Input userId:', userId);
console.log('[Database] Final userId:', finalUserId);
console.log('[Database] SQL: SELECT * FROM conversations WHERE user_id = ?', finalUserId);
```

---

## PLAN D'IMPLÉMENTATION

### Phase 1: Diagnostic (15 min)

1. **Ajouter logs exhaustifs** dans les 4 fichiers critiques
2. **Redémarrer** l'application : `npm run start:mem`
3. **Ouvrir DevTools** (F12) et Console
4. **Login** avec compte test (ALICE/PASSWORD123)
5. **Observer logs :**
   ```
   [AuthContext] userId: user_XXXXXX
   [ChatHistory] window.__currentUserId: undefined ← BUG ICI ?
   [DatabaseBridge] userId: undefined ← BUG CONFIRMÉ ?
   [Database] finalUserId: system_default_user ← FALLBACK ACTIVÉ
   ```
6. **Vérifier base de données :**
   ```sql
   SELECT id, user_id, name FROM conversations;
   ```

**Résultats possibles :**

| Observation | Diagnostic | Solution |
|-------------|------------|----------|
| `__currentUserId: undefined` | Race condition | Solution #1 (useAuth) |
| `userId (backend): undefined` | IPC sérialisation | Solution #2 (bloquer) |
| `finalUserId: system_default_user` | Fallback activé | Solution #3 (strict) |
| `DB: tous user_id = system_default_user` | Bug en création | Audit createConversation |

### Phase 2: Correction (30 min)

**Si race condition détectée :**
- Appliquer Solution #1 + Solution #2 (defense in depth)
- Modifier 3 fichiers frontend + 1 fichier backend

**Si bug en création détecté :**
- Audit complet de `conversationService.createConversation()`
- Vérifier que `params.userId` est bien défini à tous les appels

### Phase 3: Test (15 min)

1. **Nettoyer base :** `rm aionui.db`
2. **Redémarrer :** `npm run start:mem`
3. **Créer compte ALICE** → conversation "Test ALICE"
4. **Vérifier DB :** user_id doit être `user_XXXXXX`
5. **Logout + nouveau compte BOB** → conversation "Test BOB"
6. **Vérifier isolation :** BOB ne voit que "Test BOB"
7. **Reconnexion ALICE :** retrouve "Test ALICE" uniquement

---

## QUESTIONS POUR FRONTIER MODEL

1. **Quelle hypothèse est la plus probable ?**
   - Race condition `window.__currentUserId` ?
   - Bug en création (tous les `user_id` identiques en DB) ?
   - Autre cause non identifiée ?

2. **Quelle solution recommandez-vous ?**
   - Solution #1 (useAuth) seule ?
   - Combinaison Solution #1 + Solution #2 ?
   - Autre approche ?

3. **Y a-t-il d'autres points de fuite de données ?**
   - File storage merge ?
   - Autres appels IPC non identifiés ?
   - Cache frontend ?

4. **Comment garantir l'isolation à 100% ?**
   - Tests automatisés ?
   - Architecture alternative ?
   - Migration des données existantes ?

5. **Est-ce que l'IPC Electron peut perdre le userId ?**
   - Sérialisation `{ userId: undefined }` → `{}` ?
   - Structuredclone behavior ?

---

## FICHIERS CRITIQUES FOURNIS

1. **`AuthContext.tsx`** (310 lignes) - Génération userId, login, logout
2. **`database/index.ts`** (getUserConversations extrait, ligne 527-566) - Query SQL avec fallback
3. **`ChatHistory.tsx`** (200 premières lignes) - Lecture conversations frontend

**Fichiers secondaires disponibles sur demande :**
- `databaseBridge.ts` (IPC provider)
- `conversationService.ts` (service création)
- `ipcBridge.ts` (type definitions)
- `ConversationTabs.tsx` (autre usage getUserConversations)
- `workspace/index.tsx` (autre usage getUserConversations)

---

## DEMANDE AU FRONTIER MODEL

**Analysez l'architecture fournie et :**

1. **Identifiez la cause racine du bug** (avec preuves)
2. **Proposez une solution complète** (code précis, fichiers à modifier)
3. **Priorisez les hypothèses** (probabilité haute → faible)
4. **Fournissez un plan d'implémentation** (étapes détaillées)
5. **Suggérez des tests de validation** (scénarios Alice/Bob)

**Format de réponse souhaité :**
- Diagnostic clair (1-2 paragraphes)
- Code exact à appliquer (snippets complets)
- Ordre des modifications (fichier 1 → 2 → 3)
- Tests de validation (commandes SQL + UI)

**Contraintes :**
- Électron 37 + React 19 + TypeScript strict
- Base SQLite (better-sqlite3)
- Ne pas casser la reconnexion utilisateur
- Ne pas casser le mode WebUI

Merci de votre expertise ! 🙏
