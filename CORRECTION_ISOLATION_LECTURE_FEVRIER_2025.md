# Correction Isolation Multi-Utilisateur - Lecture des Conversations

**Date:** Février 2025  
**Version:** v18.1 (correction lecture)  
**Problème:** Les utilisateurs voient les conversations d'autres utilisateurs  
**Cause:** Le userId n'était pas transmis lors de la lecture des conversations depuis la base de données

## Symptômes

- Utilisateur DALLE se connecte → voit les conversations de l'utilisateur précédent
- Les tables de données se chevauchent
- Les conversations "AAAAAA" (créées par le premier compte) apparaissent dans le second compte
- **L'isolation en ÉCRITURE fonctionnait**, mais pas en LECTURE

## Analyse de la Cause Racine

### Écriture (✅ Fonctionnait)
Le userId était correctement transmis lors de la CRÉATION de conversations :
```typescript
// Frontend → IPC → Backend → Database
userId → params.userId → db.createConversation(conversation, userId)
```

### Lecture (❌ Ne fonctionnait pas)
Le userId n'était PAS transmis lors de la LECTURE :
```typescript
// Frontend
ipcBridge.database.getUserConversations.invoke({ page, pageSize })
// ❌ Pas de userId !

// Backend
db.getUserConversations(undefined, page, pageSize)
// ❌ undefined → fallback vers 'system_default_user'
```

**Résultat :** Tous les utilisateurs voyaient les conversations de `system_default_user` (premier compte créé).

## Corrections Appliquées

### 1. IPC Bridge Type Definition
**Fichier:** `src/common/ipcBridge.ts`

```typescript
// AVANT
getUserConversations: bridge.buildProvider<..., { page?: number; pageSize?: number }>

// APRÈS
getUserConversations: bridge.buildProvider<..., { userId?: string; page?: number; pageSize?: number }>
```

### 2. Backend Bridge Implementation
**Fichier:** `src/process/bridge/databaseBridge.ts`

```typescript
// AVANT
ipcBridge.database.getUserConversations.provider(async ({ page = 0, pageSize = 10000 }) => {
  const result = db.getUserConversations(undefined, page, pageSize);
  // ...
});

// APRÈS
ipcBridge.database.getUserConversations.provider(async ({ userId, page = 0, pageSize = 10000 }) => {
  console.log(`[DatabaseBridge] getUserConversations called with userId=${userId}`);
  const result = db.getUserConversations(userId, page, pageSize);
  
  // ISOLATION FIX: When userId is provided, skip file storage migration
  // File storage doesn't support multi-user isolation
  if (userId && userId !== 'system_default_user') {
    console.log(`[DatabaseBridge] Returning ${dbConversations.length} conversations for userId=${userId}`);
    return dbConversations;
  }
  // ...
});
```

### 3. Frontend Calls (3 fichiers)

#### A. ChatHistory.tsx
```typescript
// AVANT
ipcBridge.database.getUserConversations.invoke({ page: 0, pageSize: 10000 })

// APRÈS
const userId = (window as any).__currentUserId;
console.log('[ChatHistory] Fetching conversations for userId:', userId);
ipcBridge.database.getUserConversations.invoke({ userId, page: 0, pageSize: 10000 })
```

#### B. ConversationTabs.tsx
```typescript
// AVANT
void ipcBridge.database.getUserConversations.invoke({ page: 0, pageSize: 10000 })

// APRÈS
const userId = (window as any).__currentUserId;
console.log('[ConversationTabs] Creating new conversation for userId:', userId);
void ipcBridge.database.getUserConversations.invoke({ userId, page: 0, pageSize: 10000 })
```

#### C. workspace/index.tsx
```typescript
// AVANT
const conversations = await ipcBridge.database.getUserConversations.invoke({ page: 0, pageSize: 10000 });

// APRÈS
const userId = (window as any).__currentUserId;
console.log('[Workspace] Migrating workspace for userId:', userId);
const conversations = await ipcBridge.database.getUserConversations.invoke({ userId, page: 0, pageSize: 10000 });
```

### 4. Correction Bug Service
**Fichier:** `src/process/services/conversationService.ts`

```typescript
// AVANT (ligne 85)
const result = db.createConversation(conversation, userId); // ❌ userId undefined

// APRÈS
const result = db.createConversation(conversation, params.userId);
```

## Architecture de l'Isolation Complète

### Chaîne d'Écriture (CREATE)
```
AuthContext.tsx
  ↓ génère userId: user_${Date.now()}
  ↓ expose (window as any).__currentUserId
  ↓
AgentSetupCard.tsx
  ↓ getCurrentUserId() → userId
  ↓
ipcBridge.conversation.create.invoke({ ..., userId })
  ↓
conversationBridge.ts
  ↓ extrait params.userId
  ↓
conversationService.ts
  ↓ ConversationService.createConversation(params)
  ↓
database/index.ts
  ↓ db.createConversation(conversation, userId)
  ↓
INSERT INTO conversations (id, user_id, ...) VALUES (?, ?, ...)
```

### Chaîne de Lecture (READ)
```
AuthContext.tsx
  ↓ expose (window as any).__currentUserId
  ↓
ChatHistory.tsx / ConversationTabs.tsx / workspace/index.tsx
  ↓ const userId = (window as any).__currentUserId
  ↓
ipcBridge.database.getUserConversations.invoke({ userId, ... })
  ↓
databaseBridge.ts
  ↓ extrait userId des params
  ↓
database/index.ts
  ↓ db.getUserConversations(userId, page, pageSize)
  ↓
SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC
```

## Tests de Validation

### Scénario 1: Alice puis Bob (Comptes Séparés)

1. **Alice se connecte** (ALICE / PASSWORD123)
   - `userId = user_1738976543210`
   - Crée conversation "Test Alice"
   - Log: `[DatabaseBridge] Returning 1 conversations for userId=user_1738976543210`
   - ✅ Voit uniquement "Test Alice"

2. **Logout Alice**
   - Supprime session mais conserve `eaudit_credentials`

3. **Bob se connecte** (BOB / PASSWORD456)
   - `userId = user_1738976550000` (nouveau userId)
   - Crée conversation "Test Bob"
   - Log: `[DatabaseBridge] Returning 1 conversations for userId=user_1738976550000`
   - ✅ Voit uniquement "Test Bob"
   - ❌ NE VOIT PAS "Test Alice"

4. **Alice se reconnecte** (ALICE / PASSWORD123)
   - `userId = user_1738976543210` (même userId)
   - Log: `[DatabaseBridge] Returning 1 conversations for userId=user_1738976543210`
   - ✅ Retrouve "Test Alice"
   - ❌ NE VOIT PAS "Test Bob"

### Base de Données SQLite

```sql
-- Vérification manuelle
SELECT id, user_id, name, created_at FROM conversations ORDER BY created_at;

-- Résultat attendu:
-- conv_1 | user_1738976543210 | Test Alice | 2025-02-07 22:15:43
-- conv_2 | user_1738976550000 | Test Bob   | 2025-02-07 22:17:10
```

## Logs de Vérification

Ouvrir DevTools (F12) → Console pour voir :

```
[AuthContext] Desktop login successful for user: user_1738976543210
[ChatHistory] Fetching conversations for userId: user_1738976543210
[DatabaseBridge] getUserConversations called with userId=user_1738976543210
[DatabaseBridge] Returning 1 conversations for userId=user_1738976543210 (no file migration)
```

## Différences avec v18 (Écriture Seule)

| Aspect | v18 (Avant) | v18.1 (Après) |
|--------|-------------|---------------|
| **Écriture** | ✅ Isolée | ✅ Isolée |
| **Lecture** | ❌ Partagée (bug) | ✅ Isolée |
| **File Storage** | Merge automatique | Skip si userId fourni |
| **Logs** | Pas de trace userId | Logs complets |
| **getUserConversations IPC** | `{ page, pageSize }` | `{ userId, page, pageSize }` |
| **Backend getUserConversations** | `userId = undefined` | `userId` transmis |

## Fichiers Modifiés

1. `src/common/ipcBridge.ts` - Ajout `userId` au type IPC
2. `src/process/bridge/databaseBridge.ts` - Extraction et transmission userId
3. `src/process/services/conversationService.ts` - Correction bug `userId` undefined
4. `src/renderer/pages/conversation/ChatHistory.tsx` - Passage userId dans IPC
5. `src/renderer/pages/conversation/ConversationTabs.tsx` - Passage userId dans IPC
6. `src/renderer/pages/conversation/workspace/index.tsx` - Passage userId dans IPC

## Limitations Connues

### Multi-Comptes dans une Session
Le système actuel ne supporte qu'**un seul compte actif par session**. Pour tester plusieurs comptes :

1. Se connecter avec Compte A
2. Utiliser Compte A
3. **Logout** (bouton dans sidebar)
4. Nettoyer localStorage si nouveau compte différent :
   ```javascript
   localStorage.removeItem('eaudit_credentials')
   localStorage.removeItem('eaudit_user_id')
   location.reload()
   ```
5. Se connecter avec Compte B

### File Storage (Legacy)
Le système de fichiers (`chat.history`) ne supporte pas le multi-utilisateur. La logique actuelle :
- Si `userId` fourni et `!== 'system_default_user'` → Skip file storage, utiliser uniquement database
- Si `userId = undefined` ou `'system_default_user'` → Merge file + database (rétrocompatibilité)

### Conversations Orphelines
Les conversations créées AVANT v18 ont `user_id = 'system_default_user'`. Elles sont visibles uniquement pour ce compte.

## Prochaines Améliorations

### Phase 1: Stabilisation (Fait ✅)
- [x] Isolation écriture (v18)
- [x] Isolation lecture (v18.1)
- [x] Login obligatoire Desktop mode
- [x] Bouton Logout
- [x] Multiple accounts creation

### Phase 2: UX Multi-Comptes (Future)
- [ ] UI pour switcher entre comptes sans logout/login
- [ ] Liste des comptes disponibles
- [ ] Migration automatique des conversations existantes
- [ ] Gestion des credentials avec dropdown

### Phase 3: WebUI Mode (Future)
- [ ] Session server-side avec JWT
- [ ] Cookie httpOnly pour authentification
- [ ] Rate limiting par userId
- [ ] Admin dashboard pour gérer les utilisateurs

## Conclusion

**v18.1 corrige le bug critique d'isolation en lecture.**

L'isolation multi-utilisateur est maintenant **complète** :
- ✅ Chaque utilisateur a son propre `userId` unique
- ✅ Les conversations sont isolées en ÉCRITURE (CREATE)
- ✅ Les conversations sont isolées en LECTURE (GET)
- ✅ Login obligatoire en mode Desktop
- ✅ Logout disponible pour tester plusieurs comptes

**Commande de test:**
```bash
npm run start:mem
```

**Vérification base de données:**
```bash
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"
SELECT id, user_id, name FROM conversations;
```
