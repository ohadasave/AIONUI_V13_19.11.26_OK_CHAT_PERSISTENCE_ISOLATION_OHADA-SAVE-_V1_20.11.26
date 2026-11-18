# Architecture Debug - Isolation Multi-Utilisateur (v19)

**Date:** 7 Février 2025  
**Statut:** BUG CRITIQUE - Isolation en lecture ne fonctionne toujours pas  
**Contexte:** Application Electron Desktop, base SQLite, multi-utilisateur

---

## 1. SYMPTÔMES DU PROBLÈME

### Comportement Observé
```
1. Utilisateur A se connecte → Crée conversation "AAAAA"
2. Utilisateur A logout
3. Utilisateur B se connecte (nouveau compte)
4. Utilisateur B voit AUSSI la conversation "AAAAA" de l'utilisateur A ❌
5. Les données se chevauchent dans l'interface
```

### Logs Attendus vs Réels

**Attendu:**
```
[AuthContext] Desktop login successful for user: user_1738976543210
[ChatHistory] Fetching conversations for userId: user_1738976543210
[DatabaseBridge] getUserConversations called with userId=user_1738976543210
[Database] getUserConversations called with userId=user_1738976543210
SELECT * FROM conversations WHERE user_id = 'user_1738976543210'
→ Retourne seulement les conversations de user_1738976543210
```

**Réel (suspicion):**
```
[AuthContext] Desktop login successful for user: user_1738976550000
[ChatHistory] Fetching conversations for userId: user_1738976550000
[DatabaseBridge] getUserConversations called with userId=user_1738976550000
[Database] getUserConversations called avec finalUserId=system_default_user ❌
SELECT * FROM conversations WHERE user_id = 'system_default_user'
→ Retourne TOUTES les conversations du premier compte
```

---

## 2. ARCHITECTURE ACTUELLE (v18.1)

### 2.1 Génération du userId

**Fichier:** `src/renderer/context/AuthContext.tsx`

```typescript
// Lors du login Desktop
const login = useCallback(async ({ username, password, remember }: LoginParams) => {
  if (isDesktopRuntime) {
    const storedCredentials = localStorage.getItem('eaudit_credentials');
    let userId: string;

    if (storedCredentials) {
      const { username: storedUsername, password: storedPassword, userId: storedUserId } = JSON.parse(storedCredentials);
      
      if (username === storedUsername && password === storedPassword) {
        // Reconnexion même utilisateur
        userId = storedUserId; // ✅ Réutilise userId existant
      } else {
        // Nouveau compte différent
        userId = `user_${Date.now()}`; // ✅ Génère nouveau userId
        localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
      }
    } else {
      // Premier login
      userId = `user_${Date.now()}`;
      localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
    }

    // Stockage session
    localStorage.setItem('eaudit_user_id', userId);
    localStorage.setItem('eaudit_username', username);
    
    // CRITIQUE: Exposition globale pour IPC
    (window as any).__currentUserId = userId; // ✅ Défini ici
    
    setUser({ id: userId, username, role: 'admin' });
    return { success: true };
  }
}, []);
```

**Points de Vérification:**
1. `__currentUserId` est-il correctement défini au login ?
2. Reste-t-il défini pendant toute la session ?
3. Est-il accessible depuis ChatHistory.tsx au moment de l'appel IPC ?

### 2.2 Chaîne d'Appel READ (Lecture des Conversations)

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (Renderer Process)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. ChatHistory.tsx (useEffect)                                  │
│    ↓                                                             │
│    const userId = (window as any).__currentUserId; // ← Point critique │
│    console.log('[ChatHistory] userId:', userId);                │
│    ↓                                                             │
│ 2. ipcBridge.database.getUserConversations.invoke({             │
│      userId: userId,  // ← Passé ici                            │
│      page: 0,                                                    │
│      pageSize: 10000                                             │
│    })                                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ IPC Channel
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Main Process)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 3. databaseBridge.ts (IPC Provider)                             │
│    ↓                                                             │
│    provider(async ({ userId, page, pageSize }) => {             │
│      console.log('[DatabaseBridge] userId:', userId); // ← Vérifier │
│      ↓                                                           │
│      const result = db.getUserConversations(userId, page, pageSize); │
│    })                                                            │
│    ↓                                                             │
│ 4. database/index.ts (getUserConversations)                     │
│    ↓                                                             │
│    getUserConversations(userId?: string, page, pageSize) {      │
│      const finalUserId = userId || this.defaultUserId; // ← SUSPECT │
│      console.log('[Database] finalUserId:', finalUserId);       │
│      ↓                                                           │
│      SELECT * FROM conversations WHERE user_id = ?              │
│      ↓                                                           │
│      return rows.map(rowToConversation);                        │
│    }                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Chaîne d'Appel WRITE (Création de Conversation)

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. AgentSetupCard.tsx                                           │
│    ↓                                                             │
│    import { getCurrentUserId } from '@renderer/utils/auth';     │
│    const userId = getCurrentUserId(); // window.__currentUserId │
│    ↓                                                             │
│ 2. ipcBridge.conversation.create.invoke({                       │
│      type: 'gemini',                                             │
│      model: { ... },                                             │
│      extra: { ... },                                             │
│      userId: userId  // ← Passé explicitement                   │
│    })                                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ IPC
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 3. conversationBridge.ts                                        │
│    ↓                                                             │
│    ipcBridge.conversation.create.provider(async (params) => {   │
│      console.log('[ConversationBridge] params.userId:', params.userId); │
│      ↓                                                           │
│ 4. conversationService.ts                                       │
│    ↓                                                             │
│      ConversationService.createConversation({                   │
│        ...params,                                                │
│        userId: params.userId  // ← Transmis au service          │
│      })                                                          │
│      ↓                                                           │
│ 5. database/index.ts                                            │
│    ↓                                                             │
│      createConversation(conversation, userId) {                 │
│        const row = conversationToRow(conversation, userId);     │
│        INSERT INTO conversations (id, user_id, ...) VALUES (...) │
│      }                                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** L'écriture FONCTIONNE (vérifié par logs), donc `userId` est bien transmis en création.

---

## 3. HYPOTHÈSES SUR LA CAUSE DU BUG

### Hypothèse #1: `window.__currentUserId` est `undefined` au moment de la lecture ⭐⭐⭐⭐⭐

**Probabilité:** TRÈS HAUTE

**Raison:**
- Le `useEffect` dans `ChatHistory.tsx` se déclenche AVANT que `AuthContext.login()` ait terminé
- Race condition entre `setUser()` et le rendu de `<ChatHistory>`
- `window.__currentUserId` n'est pas encore défini quand `getUserConversations` est appelé

**Code suspect:**
```typescript
// AuthContext.tsx - login()
(window as any).__currentUserId = userId;
setUser({ id: userId, username, role: 'admin' });
setStatus('authenticated');
setReady(true);
// ↓ React re-render déclenché ICI
// ↓ ChatHistory.tsx useEffect s'exécute IMMÉDIATEMENT
// ↓ Mais est-ce que __currentUserId est déjà défini ?

// ChatHistory.tsx - useEffect
const userId = (window as any).__currentUserId; // ← undefined ?
ipcBridge.database.getUserConversations.invoke({ userId: undefined }) // ← BUG
```

**Test de diagnostic:**
```typescript
// Dans ChatHistory.tsx
const userId = (window as any).__currentUserId;
console.log('[ChatHistory] __currentUserId:', userId);
console.log('[ChatHistory] typeof userId:', typeof userId);
console.log('[ChatHistory] localStorage.eaudit_user_id:', localStorage.getItem('eaudit_user_id'));

if (!userId) {
  console.error('[ChatHistory] CRITICAL: __currentUserId is undefined!');
}
```

**Solution si confirmée:**
```typescript
// Option 1: Lire depuis localStorage en fallback
const userId = (window as any).__currentUserId || localStorage.getItem('eaudit_user_id');

// Option 2: Utiliser useAuth() pour accéder au user.id
import { useAuth } from '@renderer/context/AuthContext';
const { user } = useAuth();
const userId = user?.id;

// Option 3: Attendre que user soit défini
useEffect(() => {
  if (!user?.id) {
    console.log('[ChatHistory] Waiting for user to be defined...');
    return;
  }
  
  const refresh = () => {
    console.log('[ChatHistory] Fetching for userId:', user.id);
    ipcBridge.database.getUserConversations.invoke({ userId: user.id, ... });
  };
  refresh();
}, [user?.id]); // ← Dépendance sur user.id
```

---

### Hypothèse #2: `userId` se perd dans la sérialisation IPC ⭐⭐⭐

**Probabilité:** MOYENNE

**Raison:**
- Electron IPC sérialise les paramètres avec `structuredClone`
- Si `userId` est `undefined`, il peut être omis de l'objet sérialisé
- Le backend reçoit `{}` au lieu de `{ userId: undefined }`

**Code suspect:**
```typescript
// Frontend
invoke({ userId: undefined, page: 0, pageSize: 10000 })
// ↓ Sérialisation IPC
// ↓ { page: 0, pageSize: 10000 } ← userId omis car undefined

// Backend
provider(async ({ userId, page, pageSize }) => {
  console.log(userId); // ← undefined (normal)
  // Mais le code ne distingue pas "userId pas passé" vs "userId = undefined"
});
```

**Solution si confirmée:**
```typescript
// Backend - databaseBridge.ts
provider(async (params) => {
  console.log('[DatabaseBridge] Received params:', JSON.stringify(params));
  console.log('[DatabaseBridge] Has userId property:', 'userId' in params);
  
  const { userId, page = 0, pageSize = 10000 } = params;
  
  if (!userId) {
    console.error('[DatabaseBridge] CRITICAL: userId is missing or undefined!');
    console.error('[DatabaseBridge] params:', params);
    // Fallback intelligent
    // return []; // ← Retourner vide pour forcer le debug
  }
  
  const result = db.getUserConversations(userId, page, pageSize);
});
```

---

### Hypothèse #3: `defaultUserId` fallback cache un bug de création ⭐⭐⭐⭐

**Probabilité:** HAUTE

**Raison:**
- Les conversations sont créées avec `user_id = 'system_default_user'` au lieu du vrai userId
- Même si le frontend passe le bon userId en lecture, toutes les conversations sont sous le même user_id en DB
- Le problème est en ÉCRITURE, pas en LECTURE

**Code suspect:**
```typescript
// database/index.ts - createConversation
createConversation(conversation: TChatConversation, userId?: string): IQueryResult<boolean> {
  try {
    if (!userId) {
      console.error('[Database] CRITICAL: userId is required for createConversation');
      throw new Error('userId is required'); // ← Devrait bloquer
    }
    
    const row = conversationToRow(conversation, userId);
    // ...
  }
}
```

**Mais est-ce que `conversationService.ts` passe vraiment le userId ?**

```typescript
// conversationService.ts - ligne 85 (corrigée)
const result = db.createConversation(conversation, params.userId);
// ↑ params.userId est-il défini ?

// conversationService.ts - ligne 191 (autre appel)
const result = db.createConversation(conversation, params.userId);
// ↑ params.userId est-il défini ICI aussi ?
```

**Test de diagnostic:**
```sql
-- Vérifier les user_id réels en base
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"

SELECT id, user_id, name, created_at 
FROM conversations 
ORDER BY created_at DESC 
LIMIT 10;

-- Si tous ont user_id = 'system_default_user' → BUG en ÉCRITURE
-- Si chaque conversation a un user_id différent → BUG en LECTURE
```

---

### Hypothèse #4: File storage merge pollue les résultats ⭐⭐

**Probabilité:** FAIBLE (mais possible)

**Raison:**
- `databaseBridge.ts` merge les conversations de la base avec celles du file storage
- Le file storage ne supporte pas multi-user
- Les conversations du file sont ajoutées SANS filtrage par userId

**Code suspect:**
```typescript
// databaseBridge.ts
if (userId && userId !== 'system_default_user') {
  return dbConversations; // ← Skip file storage
}

// Mais si userId est undefined, on arrive ici:
const fileOnlyConversations = fileConversations.filter(conv => !dbConversationMap.has(conv.id));
return [...dbConversations, ...fileOnlyConversations]; // ← Pollution
```

**Solution si confirmée:**
```typescript
// Toujours skip file storage en mode multi-user
if (userId) {
  console.log(`[DatabaseBridge] Multi-user mode: skip file storage, userId=${userId}`);
  return dbConversations;
}

// Ou: Supprimer complètement le merge file storage en mode Desktop multi-user
```

---

## 4. POINTS DE CONTRÔLE (Breakpoints)

### Frontend (Renderer DevTools)

```typescript
// ChatHistory.tsx ligne ~104
const userId = (window as any).__currentUserId;
console.log('[ChatHistory] ===== READ CONVERSATIONS =====');
console.log('[ChatHistory] window.__currentUserId:', userId);
console.log('[ChatHistory] localStorage.eaudit_user_id:', localStorage.getItem('eaudit_user_id'));
console.log('[ChatHistory] AuthContext user:', user); // Ajouter useAuth()
debugger; // ← BREAKPOINT ICI
```

### Backend (Main Process Logs)

```typescript
// databaseBridge.ts ligne ~27
provider(async ({ userId, page, pageSize }) => {
  console.log('[DatabaseBridge] ===== IPC RECEIVED =====');
  console.log('[DatabaseBridge] userId:', userId);
  console.log('[DatabaseBridge] typeof userId:', typeof userId);
  console.log('[DatabaseBridge] page:', page, 'pageSize:', pageSize);
  
  const result = db.getUserConversations(userId, page, pageSize);
  console.log('[DatabaseBridge] result.data.length:', result.data.length);
  console.log('[DatabaseBridge] First conversation user_id:', result.data[0]?.extra?.userId);
  return result.data;
});

// database/index.ts ligne ~533
getUserConversations(userId?: string, page, pageSize) {
  const finalUserId = userId || this.defaultUserId;
  console.log('[Database] ===== GET CONVERSATIONS =====');
  console.log('[Database] Input userId:', userId);
  console.log('[Database] Final userId:', finalUserId);
  console.log('[Database] defaultUserId:', this.defaultUserId);
  
  const countResult = this.db.prepare('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?').get(finalUserId);
  console.log('[Database] Total conversations for user:', countResult.count);
  
  // ...
}
```

---

## 5. SCHÉMA DE DONNÉES

### localStorage (Frontend)

```javascript
{
  "eaudit_credentials": "{\"username\":\"DALLE\",\"password\":\"LEADER00\",\"userId\":\"user_1738976543210\"}",
  "eaudit_user_id": "user_1738976543210",
  "eaudit_username": "DALLE",
  "eaudit_logged_in": "true",
  "eaudit_login_time": "1738976543210"
}
```

### window.__currentUserId (Frontend Global)

```javascript
(window as any).__currentUserId = "user_1738976543210"
```

### SQLite conversations table

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- ← Clé d'isolation
  name TEXT,
  type TEXT,
  model TEXT,
  extra TEXT,
  source TEXT DEFAULT 'aionui',
  channel_chat_id TEXT,
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index pour performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at);
```

### Exemple de données (État attendu)

```sql
-- Utilisateur DALLE
INSERT INTO conversations VALUES (
  'conv_abc123',
  'user_1738976543210',  -- ← userId de DALLE
  'Conversation DALLE',
  'gemini',
  '...',
  '...',
  'aionui',
  NULL,
  'active',
  1738976543210,
  1738976543210
);

-- Utilisateur BOB
INSERT INTO conversations VALUES (
  'conv_def456',
  'user_1738976550000',  -- ← userId de BOB (différent)
  'Conversation BOB',
  'gemini',
  '...',
  '...',
  'aionui',
  NULL,
  'active',
  1738976550000,
  1738976550000
);
```

**Query lecture pour DALLE:**
```sql
SELECT * FROM conversations WHERE user_id = 'user_1738976543210';
-- Doit retourner SEULEMENT conv_abc123
```

**Query lecture pour BOB:**
```sql
SELECT * FROM conversations WHERE user_id = 'user_1738976550000';
-- Doit retourner SEULEMENT conv_def456
```

---

## 6. TESTS DE VALIDATION

### Test #1: Vérifier __currentUserId au login

```typescript
// Dans AuthContext.tsx, après setUser()
console.log('[AuthContext] ===== LOGIN SUCCESS =====');
console.log('[AuthContext] userId:', userId);
console.log('[AuthContext] window.__currentUserId:', (window as any).__currentUserId);
console.log('[AuthContext] localStorage.eaudit_user_id:', localStorage.getItem('eaudit_user_id'));

// Vérifier que les 3 sont identiques
if ((window as any).__currentUserId !== userId) {
  console.error('[AuthContext] MISMATCH: __currentUserId !== userId');
}
if (localStorage.getItem('eaudit_user_id') !== userId) {
  console.error('[AuthContext] MISMATCH: localStorage !== userId');
}
```

### Test #2: Vérifier transmission IPC

```typescript
// Dans ChatHistory.tsx
const testUserId = (window as any).__currentUserId;
console.log('[ChatHistory] About to invoke IPC with userId:', testUserId);

ipcBridge.database.getUserConversations
  .invoke({ userId: testUserId, page: 0, pageSize: 10000 })
  .then(conversations => {
    console.log('[ChatHistory] IPC returned:', conversations.length, 'conversations');
    conversations.forEach(conv => {
      console.log('[ChatHistory] - Conversation:', conv.id, 'name:', conv.name);
    });
  });
```

### Test #3: Vérifier base de données directement

```bash
# PowerShell
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"

# Dans sqlite3:
.mode column
.headers on

SELECT id, user_id, name, created_at FROM conversations ORDER BY created_at DESC;

# Résultat attendu: chaque conversation a un user_id différent
# Si tous ont 'system_default_user' → BUG EN ÉCRITURE
# Si chaque conversation a son user_id mais l'UI montre tout → BUG EN LECTURE
```

---

## 7. PISTES DE SOLUTION

### Solution #1: Utiliser useAuth() au lieu de window.__currentUserId ⭐⭐⭐⭐⭐

**Raison:** React Context garantit la synchronisation avec l'état d'authentification

```typescript
// ChatHistory.tsx
import { useAuth } from '@renderer/context/AuthContext';

export const ChatHistory: React.FC<Props> = ({ id, onSessionClick }) => {
  const { user } = useAuth(); // ← Utiliser le context
  
  useEffect(() => {
    if (!user?.id) {
      console.log('[ChatHistory] No user logged in, skip loading conversations');
      setChatHistory([]);
      return;
    }
    
    const refresh = () => {
      console.log('[ChatHistory] Fetching conversations for user:', user.id);
      
      ipcBridge.database.getUserConversations
        .invoke({ userId: user.id, page: 0, pageSize: 10000 }) // ← user.id garanti défini
        .then((history) => {
          // ...
        });
    };
    
    refresh();
    return addEventListener('chat.history.refresh', refresh);
  }, [user?.id]); // ← Dépendance sur user.id
};
```

**Avantages:**
- ✅ React garantit que `user.id` est défini quand le useEffect s'exécute
- ✅ Pas de race condition
- ✅ Type-safe (TypeScript sait que user.id est une string)

---

### Solution #2: Bloquer les appels IPC si userId est undefined

```typescript
// databaseBridge.ts
provider(async ({ userId, page, pageSize }) => {
  if (!userId) {
    console.error('[DatabaseBridge] BLOCKED: userId is required for getUserConversations');
    console.error('[DatabaseBridge] Returning empty array to prevent data leak');
    return []; // ← Forcer vide au lieu de fallback
  }
  
  console.log('[DatabaseBridge] Fetching conversations for userId:', userId);
  const result = db.getUserConversations(userId, page, pageSize);
  return result.data;
});
```

**Avantages:**
- ✅ Fail-safe: empêche le fallback silencieux vers `system_default_user`
- ✅ Force le debug en rendant le bug visible (liste vide)
- ✅ Évite la fuite de données entre utilisateurs

---

### Solution #3: Supprimer complètement defaultUserId fallback

```typescript
// database/index.ts
getUserConversations(userId?: string, page, pageSize) {
  if (!userId) {
    console.error('[Database] CRITICAL: userId is required');
    throw new Error('userId is required for getUserConversations');
  }
  
  console.log('[Database] Fetching conversations for userId:', userId);
  
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

**Avantages:**
- ✅ Pas de fallback silencieux
- ✅ Erreur explicite si userId manque
- ✅ Force les développeurs à corriger le bug upstream

---

### Solution #4: Audit complet de la transmission userId en création

```typescript
// conversationBridge.ts
ipcBridge.conversation.create.provider(async (params) => {
  console.log('[ConversationBridge] ===== CREATE CONVERSATION =====');
  console.log('[ConversationBridge] params.userId:', params.userId);
  console.log('[ConversationBridge] params.type:', params.type);
  
  if (!params.userId) {
    console.error('[ConversationBridge] BLOCKED: userId is required');
    throw new Error('userId is required for conversation creation');
  }
  
  const result = await ConversationService.createConversation({
    ...params,
    userId: params.userId, // ← Garantir transmission
  });
  
  if (result.success && result.conversation) {
    console.log('[ConversationBridge] Created conversation:', result.conversation.id);
    console.log('[ConversationBridge] With userId:', params.userId);
  }
  
  return result.conversation;
});
```

---

## 8. PLAN D'IMPLÉMENTATION COMPLET

### Phase 1: Diagnostic (15 min)

```bash
# 1. Ajouter logs exhaustifs
# - Modifier ChatHistory.tsx (logs __currentUserId)
# - Modifier databaseBridge.ts (logs params)
# - Modifier database/index.ts (logs finalUserId)

# 2. Redémarrer l'app
npm run start:mem

# 3. Ouvrir DevTools Console (F12)

# 4. Login avec compte test
# Créer ALICE/PASSWORD123

# 5. Observer les logs:
[AuthContext] Desktop login successful for user: user_XXXXXX
[ChatHistory] window.__currentUserId: user_XXXXXX ou undefined ?
[DatabaseBridge] userId: user_XXXXXX ou undefined ?
[Database] finalUserId: user_XXXXXX ou system_default_user ?

# 6. Vérifier base de données
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"
SELECT id, user_id, name FROM conversations;
```

**Résultats possibles:**

| Logs | Diagnostic | Solution |
|------|------------|----------|
| `__currentUserId: undefined` | Race condition login → render | Solution #1 (useAuth) |
| `userId (backend): undefined` | Problème sérialisation IPC | Solution #2 (bloquer) |
| `finalUserId: system_default_user` | Fallback activé à tort | Solution #3 (supprimer fallback) |
| `DB: tous user_id = system_default_user` | Bug en création | Solution #4 (audit CREATE) |

### Phase 2: Correction (30 min)

**Si race condition détectée:**

```typescript
// ChatHistory.tsx
import { useAuth } from '@renderer/context/AuthContext';

const { user } = useAuth();

useEffect(() => {
  if (!user?.id) {
    setChatHistory([]);
    return;
  }
  
  const refresh = () => {
    ipcBridge.database.getUserConversations
      .invoke({ userId: user.id, page: 0, pageSize: 10000 })
      .then(history => setChatHistory(history || []))
      .catch(error => {
        console.error('[ChatHistory] Error:', error);
        setChatHistory([]);
      });
  };
  
  refresh();
  return addEventListener('chat.history.refresh', refresh);
}, [user?.id]);
```

```typescript
// ConversationTabs.tsx
const { user } = useAuth();

const handleNewConversation = useCallback(() => {
  if (!user?.id) {
    console.error('[ConversationTabs] No user logged in');
    return;
  }
  
  void ipcBridge.database.getUserConversations
    .invoke({ userId: user.id, page: 0, pageSize: 10000 })
    .then(conversations => { /* ... */ });
}, [user?.id]);
```

```typescript
// workspace/index.tsx
const { user } = useAuth();

const handleMigrateWorkspace = async () => {
  if (!user?.id) {
    console.error('[Workspace] No user logged in');
    return;
  }
  
  const conversations = await ipcBridge.database.getUserConversations
    .invoke({ userId: user.id, page: 0, pageSize: 10000 });
  // ...
};
```

**Bloquer les appels sans userId:**

```typescript
// databaseBridge.ts
provider(async ({ userId, page = 0, pageSize = 10000 }) => {
  if (!userId) {
    console.error('[DatabaseBridge] userId is required, returning empty array');
    return [];
  }
  
  const result = db.getUserConversations(userId, page, pageSize);
  return result.data || [];
});
```

**Supprimer fallback database:**

```typescript
// database/index.ts
getUserConversations(userId: string, page = 0, pageSize = 50) { // ← Plus de '?'
  console.log(`[Database] getUserConversations userId=${userId}`);
  
  // Pas de fallback, userId obligatoire
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

### Phase 3: Test (15 min)

```bash
# 1. Nettoyer la base de données
rm "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"

# 2. Redémarrer l'app
npm run start:mem

# 3. Créer compte ALICE
# Login: ALICE / PASSWORD123
# Créer conversation "Test ALICE"

# 4. Vérifier logs
[AuthContext] userId: user_1738976543210
[ChatHistory] Fetching for userId: user_1738976543210
[DatabaseBridge] userId: user_1738976543210
[Database] userId: user_1738976543210
→ SELECT * FROM conversations WHERE user_id = 'user_1738976543210'

# 5. Vérifier DB
sqlite3 aionui.db "SELECT id, user_id, name FROM conversations;"
→ Doit montrer user_1738976543210

# 6. Logout
# Nettoyer localStorage
localStorage.removeItem('eaudit_credentials')
location.reload()

# 7. Créer compte BOB
# Login: BOB / PASSWORD456
# Créer conversation "Test BOB"

# 8. Vérifier isolation
# Interface doit montrer SEULEMENT "Test BOB"
# Pas de "Test ALICE" visible ✅

# 9. Vérifier DB
sqlite3 aionui.db "SELECT id, user_id, name FROM conversations ORDER BY created_at;"
→ Doit montrer 2 lignes avec user_id différents

# 10. Reconnexion ALICE
localStorage.removeItem('eaudit_credentials')
location.reload()
# Login: ALICE / PASSWORD123
# Doit retrouver "Test ALICE" uniquement ✅
```

---

## 9. MÉTRIQUES DE SUCCÈS

| Métrique | Avant (v18.1) | Après (v19) |
|----------|---------------|-------------|
| **Isolation CREATE** | ✅ (si userId passé) | ✅ (obligatoire) |
| **Isolation READ** | ❌ (tous voient tout) | ✅ (chacun voit son profil) |
| **Logs tracables** | ⚠️ (partiels) | ✅ (exhaustifs) |
| **Fallback silencieux** | ❌ (system_default_user) | ✅ (erreur explicite) |
| **Race conditions** | ⚠️ (window.__currentUserId) | ✅ (useAuth context) |
| **Type safety** | ⚠️ (userId?: string) | ✅ (userId: string) |

---

## 10. CHECKLIST FINALE

### Avant Release v19

- [ ] Logs exhaustifs ajoutés (AuthContext, ChatHistory, databaseBridge, database)
- [ ] Tests manuels Alice/Bob passés
- [ ] Base de données vérifiée (user_id différents pour chaque utilisateur)
- [ ] Pas de conversations "fantômes" d'autres utilisateurs
- [ ] Reconnexion fonctionne (Alice retrouve ses conversations)
- [ ] Fallback `defaultUserId` supprimé ou documenté
- [ ] useAuth() utilisé au lieu de window.__currentUserId
- [ ] Documentation mise à jour (cette architecture + AGENTS.md)

### Questions pour Frontier Model

1. **Est-ce que `window.__currentUserId` est défini au bon moment ?**  
   Race condition entre login et rendu de ChatHistory ?

2. **Est-ce que l'IPC Electron sérialise correctement `{ userId: undefined }` ?**  
   Ou bien le backend reçoit `{}` sans clé userId ?

3. **Est-ce que `conversationService.createConversation()` reçoit `params.userId` ?**  
   Y a-t-il un autre endroit où les conversations sont créées sans userId ?

4. **Est-ce que le merge file storage pollue les résultats ?**  
   Les conversations du file sont-elles ajoutées même avec un userId défini ?

5. **Quelle est la VRAIE valeur de `user_id` en base de données ?**  
   Tous 'system_default_user' ou chacun son user_TIMESTAMP ?

---

## 11. FICHIERS CRITIQUES

### Top 3 pour Frontier Model

1. **`src/renderer/context/AuthContext.tsx`** (génération userId, login, logout)
2. **`src/process/database/index.ts`** (getUserConversations, createConversation)
3. **`src/renderer/pages/conversation/ChatHistory.tsx`** (lecture conversations)

### Fichiers Secondaires (Description Intégrée)

#### 4. `src/process/bridge/databaseBridge.ts` (IPC Provider getUserConversations)

**Rôle:** Provider IPC qui reçoit les paramètres du frontend et appelle `db.getUserConversations()`

**Code clé:**
```typescript
// Ligne ~27
ipcBridge.database.getUserConversations.provider(async ({ userId, page = 0, pageSize = 10000 }) => {
  console.log(`[DatabaseBridge] getUserConversations called with userId=${userId}`);
  const db = getDatabase();
  const result = db.getUserConversations(userId, page, pageSize);
  const dbConversations = result.data || [];

  // ISOLATION FIX: When userId is provided, skip file storage migration
  if (userId && userId !== 'system_default_user') {
    console.log(`[DatabaseBridge] Returning ${dbConversations.length} conversations for userId=${userId}`);
    return dbConversations; // ← Skip file storage merge
  }

  // Merge with file storage (legacy behavior)
  const fileConversations = await ProcessChat.get('chat.history') || [];
  const dbConversationMap = new Map(dbConversations.map(conv => [conv.id, conv]));
  const fileOnlyConversations = fileConversations.filter(conv => !dbConversationMap.has(conv.id));
  
  return [...dbConversations, ...fileOnlyConversations]; // ← Potential pollution
});
```

**Points critiques:**
- Ligne 28: Reçoit `userId` du frontend via IPC
- Ligne 35-38: Si `userId` fourni et différent de `'system_default_user'` → skip file storage
- Ligne 41-46: Sinon → merge avec file storage (peut polluer les résultats)
- **Bug suspect:** Si `userId = undefined`, passe `undefined` à `db.getUserConversations()`

---

#### 5. `src/common/ipcBridge.ts` (Type Definition IPC)

**Rôle:** Définit les types TypeScript pour les appels IPC entre renderer et main process

**Code clé:**
```typescript
// Ligne ~346
export const database = {
  getUserConversations: bridge.buildProvider<
    import('@/common/storage').TChatConversation[], 
    { userId?: string; page?: number; pageSize?: number } // ← userId optionnel
  >('database.get-user-conversations'),
};
```

**Historique:**
- **v17:** `{ page?: number; pageSize?: number }` - Pas de userId
- **v18.1:** `{ userId?: string; page?: number; pageSize?: number }` - userId ajouté mais optionnel

**Problème:** `userId?` (optionnel) permet au frontend de passer `undefined` sans erreur TypeScript

**Solution proposée v19:**
```typescript
getUserConversations: bridge.buildProvider<
  TChatConversation[], 
  { userId: string; page?: number; pageSize?: number } // ← userId OBLIGATOIRE
>('database.get-user-conversations'),
```

---

#### 6. `src/process/services/conversationService.ts` (Création Conversations)

**Rôle:** Service qui crée les conversations et les enregistre en base de données

**Code clé:**
```typescript
// Ligne ~85 (createGeminiConversation)
const db = getDatabase();
const result = db.createConversation(conversation, params.userId); // ← Corrigé en v18.1
if (!result.success) {
  console.error('[ConversationService] Failed to create conversation:', result.error);
  return { success: false, error: result.error };
}

// Ligne ~191 (createConversation)
const result = db.createConversation(conversation, params.userId); // ← Corrigé en v18.1
```

**Historique bug:**
- **Avant v18.1:** `db.createConversation(conversation, userId)` où `userId` était undefined (variable non déclarée)
- **v18.1:** Corrigé en `params.userId`

**Vérification:** L'écriture (CREATE) fonctionne maintenant, selon les logs utilisateur

---

#### 7. `src/renderer/pages/conversation/ConversationTabs.tsx` (Lecture pour Nouvelle Conv)

**Rôle:** Crée une nouvelle conversation en copiant la config de la conversation courante

**Code clé:**
```typescript
// Ligne ~127
const handleNewConversation = useCallback(() => {
  // ISOLATION FIX: Get userId from auth context
  const userId = (window as any).__currentUserId; // ← MÊME PROBLÈME que ChatHistory
  console.log('[ConversationTabs] Creating new conversation for userId:', userId);

  void ipcBridge.database.getUserConversations
    .invoke({ userId, page: 0, pageSize: 10000 }) // ← userId potentiellement undefined
    .then((conversations) => {
      const currentConversation = conversations?.find((conv) => conv.id === currentTab.id);
      // ... créer nouvelle conversation basée sur la courante
    });
}, [openTabs, activeTabId, navigate, t]);
```

**Problème identique à ChatHistory:** Utilise `window.__currentUserId` qui peut être `undefined`

**Solution proposée:**
```typescript
const { user } = useAuth();

const handleNewConversation = useCallback(() => {
  if (!user?.id) return;
  
  void ipcBridge.database.getUserConversations
    .invoke({ userId: user.id, page: 0, pageSize: 10000 })
    .then(conversations => { /* ... */ });
}, [user?.id, openTabs, activeTabId]);
```

---

#### 8. `src/renderer/pages/conversation/workspace/index.tsx` (Migration Workspace)

**Rôle:** Migre un workspace vers un autre en copiant les fichiers et la conversation

**Code clé:**
```typescript
// Ligne ~271
const handleMigrateWorkspace = async () => {
  // ISOLATION FIX: Get userId from auth context
  const userId = (window as any).__currentUserId; // ← MÊME PROBLÈME
  console.log('[Workspace] Migrating workspace for userId:', userId);
  
  const conversations = await ipcBridge.database.getUserConversations
    .invoke({ userId, page: 0, pageSize: 10000 }); // ← userId potentiellement undefined
  const currentConversation = conversations?.find(conv => conv.id === conversation_id);
  // ... migration logic
};
```

**Problème identique:** Utilise `window.__currentUserId`

**Solution proposée:**
```typescript
const { user } = useAuth();

const handleMigrateWorkspace = async () => {
  if (!user?.id) {
    console.error('[Workspace] No user logged in');
    return;
  }
  
  const conversations = await ipcBridge.database.getUserConversations
    .invoke({ userId: user.id, page: 0, pageSize: 10000 });
  // ... migration logic
};
```

---

#### 9. `src/process/bridge/conversationBridge.ts` (IPC Provider Create)

**Rôle:** Provider IPC pour la création de conversations (appelle ConversationService)

**Code clé:**
```typescript
// Ligne ~70
ipcBridge.conversation.create.provider(async (params) => {
  // ISOLATION FIX: Extract userId from params
  console.log('[ConversationBridge] Creating conversation with userId:', params.userId);
  
  const result = await ConversationService.createConversation({
    ...params,
    userId: params.userId, // ← Transmis au service
  });
  
  if (result.success && result.conversation) {
    console.log('[ConversationBridge] Created conversation:', result.conversation.id);
  }
  
  return result.conversation;
});
```

**Note:** L'écriture (CREATE) fonctionne correctement selon les tests utilisateur, donc ce provider n'est pas la cause du bug actuel

---

### Résumé Fichiers Secondaires

| Fichier | Rôle | Bug Potentiel | Priorité |
|---------|------|---------------|----------|
| databaseBridge.ts | IPC provider READ | Reçoit userId undefined | ⭐⭐⭐ |
| ipcBridge.ts | Type definition | userId optionnel | ⭐⭐ |
| conversationService.ts | Service CREATE | Corrigé v18.1 | ✅ |
| ConversationTabs.tsx | Nouvelle conv | window.__currentUserId | ⭐⭐⭐ |
| workspace/index.tsx | Migration | window.__currentUserId | ⭐⭐⭐ |
| conversationBridge.ts | IPC provider CREATE | Fonctionne | ✅ |

**Conclusion:** Le problème est cohérent sur tous les fichiers de **lecture** (ChatHistory, ConversationTabs, workspace) qui utilisent `window.__currentUserId`. L'écriture (conversationBridge, conversationService) fonctionne correctement.

---

**FIN DE L'ARCHITECTURE DEBUG v19**
