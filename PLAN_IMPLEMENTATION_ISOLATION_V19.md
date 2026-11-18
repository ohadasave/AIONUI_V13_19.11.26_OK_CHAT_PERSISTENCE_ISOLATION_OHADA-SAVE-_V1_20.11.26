# Plan d'Implémentation - Isolation Multi-Utilisateur v19

**Date:** 7 Février 2025  
**Basé sur:** Réponses de 3 Frontier Models (ChatGPT, Claude Opus, Claude Sonnet)  
**Statut:** PRÊT POUR EXÉCUTION

---

## 🎯 Consensus des Frontier Models

### Diagnostic Confirmé

**Cause Racine (unanimité):**
Le fallback `const finalUserId = userId || this.defaultUserId;` dans `database/index.ts` est le défaut architectural **critique**.

**Causes Secondaires:**
1. ✅ **Merge file storage** sans filtrage userId (ChatGPT, Opus, Sonnet)
2. ✅ **Dépendances useEffect incorrectes** `[isConversation]` au lieu de `[user?.id]` (Opus, Sonnet)
3. ⚠️ **Race condition window.__currentUserId** (peu probable selon tous les modèles)
4. ✅ **Pas de contrôle propriétaire** dans delete/update/get (Opus, Sonnet)
5. ✅ **Stockage mono-compte** dans eaudit_credentials (tous les modèles)

### Solution Recommandée (consensus)

**Defense in Depth (7 niveaux):**
1. useAuth() dans les composants React
2. Bloquer userId undefined dans databaseBridge
3. Supprimer fallback defaultUserId dans database
4. Contrôle propriétaire dans toutes les opérations
5. Sécuriser CREATE avec validation stricte
6. Stocker multi-comptes avec hash
7. Identité côté main process (optionnel, phase 2)

---

## 📋 Plan d'Implémentation (Ordre Exact)

### Phase 1: Backend - Sécurisation Immédiate (30 min)

#### 1.1 Supprimer le Fallback (CRITIQUE) ✅

**Fichier:** `src/process/database/index.ts`  
**Ligne:** ~533

**AVANT:**
```typescript
getUserConversations(userId?: string, page = 0, pageSize = 50): IPaginatedResult<TChatConversation> {
  const finalUserId = userId || this.defaultUserId; // ← DANGER
  console.log(`[Database] getUserConversations called with userId=${userId}, using finalUserId=${finalUserId}`);
  // ...
}
```

**APRÈS:**
```typescript
getUserConversations(userId: string, page = 0, pageSize = 50): IPaginatedResult<TChatConversation> {
  if (!userId) {
    console.error('[Database] CRITICAL: userId is required for getUserConversations');
    throw new Error('userId is required for getUserConversations');
  }

  console.log(`[Database] getUserConversations userId=${userId}`);

  const countResult = this.db.prepare('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?').get(userId) as {
    count: number;
  };

  const rows = this.db
    .prepare(`
      SELECT *
      FROM conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC LIMIT ?
      OFFSET ?
    `)
    .all(userId, pageSize, page * pageSize) as IConversationRow[];

  return {
    data: rows.map(rowToConversation),
    total: countResult.count,
    page,
    pageSize,
    hasMore: (page + 1) * pageSize < countResult.count,
  };
}
```

---

#### 1.2 Bloquer Appels sans userId (SÉCURITÉ) ✅

**Fichier:** `src/process/bridge/databaseBridge.ts`  
**Ligne:** ~27

**AVANT:**
```typescript
ipcBridge.database.getUserConversations.provider(async ({ userId, page = 0, pageSize = 10000 }) => {
  console.log(`[DatabaseBridge] getUserConversations called with userId=${userId}`);
  const db = getDatabase();
  const result = db.getUserConversations(userId, page, pageSize);
  const dbConversations = result.data || [];

  if (userId && userId !== 'system_default_user') {
    return dbConversations;
  }
  // ... merge file storage
});
```

**APRÈS:**
```typescript
ipcBridge.database.getUserConversations.provider(async ({ userId, page = 0, pageSize = 10000 }) => {
  console.log('[DatabaseBridge] getUserConversations:', { userId, page, pageSize });

  // FAIL CLOSED: bloquer tout appel sans userId
  if (!userId) {
    console.error('[DatabaseBridge] BLOCKED: userId is required');
    return [];
  }

  // Mode multi-utilisateur: AUCUN merge avec file storage
  const db = getDatabase();
  const result = db.getUserConversations(userId, page, pageSize);
  const dbConversations = result.data || [];

  console.log(`[DatabaseBridge] Returning ${dbConversations.length} conversations for userId=${userId}`);
  return dbConversations;
});
```

---

#### 1.3 Sécuriser CREATE (VALIDATION) ✅

**Fichier:** `src/process/bridge/conversationBridge.ts`  
**Ligne:** ~70

**AVANT:**
```typescript
ipcBridge.conversation.create.provider(async (params) => {
  console.log('[ConversationBridge] Creating conversation with userId:', params.userId);
  const result = await ConversationService.createConversation({
    ...params,
    userId: params.userId,
  });
  // ...
});
```

**APRÈS:**
```typescript
ipcBridge.conversation.create.provider(async (params) => {
  console.log('[ConversationBridge] CREATE:', { userId: params.userId, type: params.type });

  // BLOQUER toute création sans userId
  if (!params.userId) {
    console.error('[ConversationBridge] BLOCKED: userId is required for conversation creation');
    throw new Error('userId is required for conversation creation');
  }

  const result = await ConversationService.createConversation({
    ...params,
    userId: params.userId,
  });

  if (result.success && result.conversation) {
    console.log('[ConversationBridge] Created:', result.conversation.id, 'userId:', params.userId);
  }

  return result.conversation;
});
```

---

#### 1.4 userId Obligatoire dans createConversation ✅

**Fichier:** `src/process/database/index.ts`  
**Ligne:** ~360 (fonction createConversation)

**AVANT:**
```typescript
createConversation(conversation: TChatConversation, userId?: string): IQueryResult<boolean> {
  try {
    if (!userId) {
      console.error('[Database] CRITICAL: userId is required for createConversation');
      throw new Error('userId is required');
    }
    // ...
  }
}
```

**APRÈS:**
```typescript
createConversation(conversation: TChatConversation, userId: string): IQueryResult<boolean> {
  try {
    if (!userId) {
      console.error('[Database] BLOCKED CREATE: userId is required');
      throw new Error('userId is required for createConversation');
    }

    console.log('[Database] Creating conversation:', conversation.id, 'for userId:', userId);

    const row = conversationToRow(conversation, userId);
    // ... reste du code
  }
}
```

---

### Phase 2: Frontend - useAuth() (30 min)

#### 2.1 ChatHistory.tsx ✅

**Fichier:** `src/renderer/pages/conversation/ChatHistory.tsx`  
**Ligne:** ~101

**AVANT:**
```typescript
useEffect(() => {
  const refresh = () => {
    const userId = (window as any).__currentUserId;
    console.log('[ChatHistory] Fetching conversations for userId:', userId);
    
    ipcBridge.database.getUserConversations
      .invoke({ userId, page: 0, pageSize: 10000 })
      .then((history) => {
        // ...
      });
  };
  refresh();
  return addEventListener('chat.history.refresh', refresh);
}, [isConversation]);
```

**APRÈS:**
```typescript
import { useAuth } from '@renderer/context/AuthContext';

const ChatHistory: React.FC<Props> = ({ onSessionClick, collapsed }) => {
  const { user } = useAuth(); // ← Utiliser React Context
  const userId = user?.id;
  // ... autres hooks

  useEffect(() => {
    // Purge immédiate au changement d'utilisateur
    setChatHistory([]);

    if (!userId) {
      console.log('[ChatHistory] No authenticated user - conversations not loaded');
      return;
    }

    let cancelled = false;

    const refresh = () => {
      console.log('[ChatHistory] Fetching conversations for userId:', userId);

      ipcBridge.database.getUserConversations
        .invoke({ userId, page: 0, pageSize: 10000 })
        .then((history) => {
          if (cancelled) return; // Ignorer réponses d'un ancien utilisateur
          if (history && Array.isArray(history) && history.length > 0) {
            const sortedHistory = history.sort((a, b) => getActivityTime(b) - getActivityTime(a));
            setChatHistory(sortedHistory);
          } else {
            setChatHistory([]);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error('[ChatHistory] Failed to load conversations:', error);
            setChatHistory([]);
          }
        });
    };

    refresh();
    const removeListener = addEventListener('chat.history.refresh', refresh);

    return () => {
      cancelled = true;
      removeListener();
    };
  }, [userId]); // ← Dépendance sur userId, pas isConversation
};
```

---

#### 2.2 ConversationTabs.tsx ✅

**Fichier:** `src/renderer/pages/conversation/ConversationTabs.tsx`  
**Ligne:** ~127

**AVANT:**
```typescript
const handleNewConversation = useCallback(() => {
  const userId = (window as any).__currentUserId;
  console.log('[ConversationTabs] Creating new conversation for userId:', userId);

  void ipcBridge.database.getUserConversations
    .invoke({ userId, page: 0, pageSize: 10000 })
    .then((conversations) => {
      // ...
    });
}, [openTabs, activeTabId]);
```

**APRÈS:**
```typescript
import { useAuth } from '@renderer/context/AuthContext';

const ConversationTabs: React.FC = () => {
  const { user } = useAuth();
  // ...

  const handleNewConversation = useCallback(() => {
    if (!user?.id) {
      console.error('[ConversationTabs] No authenticated user');
      return;
    }

    cleanupSiderTooltips();
    const currentTab = openTabs.find((tab) => tab.id === activeTabId);
    if (!currentTab || !currentTab.workspace) {
      void navigate('/guid');
      return;
    }

    console.log('[ConversationTabs] Creating new conversation for userId:', user.id);

    void ipcBridge.database.getUserConversations
      .invoke({ userId: user.id, page: 0, pageSize: 10000 })
      .then((conversations) => {
        // ... reste du code
      });
  }, [user?.id, openTabs, activeTabId, navigate, t]);
};
```

---

#### 2.3 workspace/index.tsx ✅

**Fichier:** `src/renderer/pages/conversation/workspace/index.tsx`  
**Ligne:** ~271

**AVANT:**
```typescript
const handleMigrateWorkspace = async () => {
  const userId = (window as any).__currentUserId;
  console.log('[Workspace] Migrating workspace for userId:', userId);
  
  const conversations = await ipcBridge.database.getUserConversations.invoke({ userId, page: 0, pageSize: 10000 });
  // ...
};
```

**APRÈS:**
```typescript
import { useAuth } from '@renderer/context/AuthContext';

const WorkspacePage: React.FC = () => {
  const { user } = useAuth();
  // ...

  const handleMigrateWorkspace = async () => {
    if (!user?.id) {
      console.error('[Workspace] No authenticated user');
      messageApi.error(t('conversation.workspace.migration.authError'));
      return;
    }

    setMigrationLoading(true);

    try {
      console.log('[Workspace] Migrating workspace for userId:', user.id);
      const conversations = await ipcBridge.database.getUserConversations.invoke({ userId: user.id, page: 0, pageSize: 10000 });
      const currentConversation = conversations?.find((conv) => conv.id === conversation_id);
      // ... reste du code
    } catch (error) {
      // ...
    }
  };
};
```

---

### Phase 3: Type Safety (10 min)

#### 3.1 ipcBridge.ts - userId Obligatoire ✅

**Fichier:** `src/common/ipcBridge.ts`  
**Ligne:** ~346

**AVANT:**
```typescript
getUserConversations: bridge.buildProvider<
  import('@/common/storage').TChatConversation[], 
  { userId?: string; page?: number; pageSize?: number }
>('database.get-user-conversations'),
```

**APRÈS:**
```typescript
getUserConversations: bridge.buildProvider<
  import('@/common/storage').TChatConversation[], 
  { userId: string; page?: number; pageSize?: number } // ← userId OBLIGATOIRE
>('database.get-user-conversations'),
```

**Note:** TypeScript listera ensuite tous les appelants qui n'ont pas de userId.

---

### Phase 4: Contrôle Propriétaire (20 min)

#### 4.1 getConversation avec Vérification ✅

**Fichier:** `src/process/database/index.ts`

**AVANT:**
```typescript
getConversation(conversationId: string): IQueryResult<TChatConversation> {
  const row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  // ...
}
```

**APRÈS:**
```typescript
getConversation(conversationId: string, userId?: string): IQueryResult<TChatConversation> {
  try {
    let row: IConversationRow | undefined;

    if (userId) {
      // Mode multi-utilisateur: vérifier propriétaire
      row = this.db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, userId) as IConversationRow | undefined;
    } else {
      // Mode legacy/admin
      row = this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as IConversationRow | undefined;
    }

    if (!row) {
      return {
        success: false,
        error: userId ? 'Conversation not found or access denied' : 'Conversation not found',
      };
    }

    return {
      success: true,
      data: rowToConversation(row),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

#### 4.2 deleteConversation avec Vérification ✅

**AVANT:**
```typescript
deleteConversation(conversationId: string): IQueryResult<boolean> {
  const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
  const result = stmt.run(conversationId);
  // ...
}
```

**APRÈS:**
```typescript
deleteConversation(conversationId: string, userId?: string): IQueryResult<boolean> {
  try {
    let stmt;
    let result;

    if (userId) {
      // Mode multi-utilisateur: vérifier propriétaire
      stmt = this.db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?');
      result = stmt.run(conversationId, userId);
    } else {
      // Mode legacy/admin
      stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
      result = stmt.run(conversationId);
    }

    return {
      success: true,
      data: result.changes > 0,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

#### 4.3 updateConversation avec Vérification ✅

**AVANT:**
```typescript
updateConversation(conversationId: string, updates: Partial<TChatConversation>): IQueryResult<boolean> {
  const existing = this.getConversation(conversationId);
  // ...
  const row = conversationToRow(updated, this.defaultUserId); // ← PROBLÈME
  // ...
}
```

**APRÈS:**
```typescript
updateConversation(conversationId: string, updates: Partial<TChatConversation>, userId?: string): IQueryResult<boolean> {
  try {
    const existing = this.getConversation(conversationId, userId);
    if (!existing.success || !existing.data) {
      return {
        success: false,
        error: 'Conversation not found or access denied',
      };
    }

    const updated = {
      ...existing.data,
      ...updates,
      modifyTime: Date.now(),
    } as TChatConversation;

    // Préserver le user_id existant
    const row = conversationToRow(updated, existing.data.extra?.userId || this.defaultUserId);

    const stmt = this.db.prepare(`
      UPDATE conversations
      SET name       = ?,
          extra      = ?,
          model      = ?,
          status     = ?,
          updated_at = ?
      WHERE id = ? ${userId ? 'AND user_id = ?' : ''}
    `);

    if (userId) {
      stmt.run(row.name, row.extra, row.model, row.status, row.updated_at, conversationId, userId);
    } else {
      stmt.run(row.name, row.extra, row.model, row.status, row.updated_at, conversationId);
    }

    return {
      success: true,
      data: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

---

### Phase 5: Stockage Multi-Comptes (20 min)

#### 5.1 AuthContext.tsx - Multi-Accounts ✅

**Fichier:** `src/renderer/context/AuthContext.tsx`  
**Ligne:** ~165 (fonction login)

**AVANT:**
```typescript
const storedCredentials = localStorage.getItem('eaudit_credentials');
let userId: string;

if (storedCredentials) {
  const { username: storedUsername, password: storedPassword, userId: storedUserId } = JSON.parse(storedCredentials);
  
  if (username === storedUsername && password === storedPassword) {
    userId = storedUserId;
  } else {
    userId = `user_${Date.now()}`;
    localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
  }
} else {
  userId = `user_${Date.now()}`;
  localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
}
```

**APRÈS:**
```typescript
type Accounts = Record<string, { password: string; userId: string }>;

const loadAccounts = (): Accounts => {
  try {
    return JSON.parse(localStorage.getItem('eaudit_accounts') || '{}');
  } catch {
    return {};
  }
};

const saveAccounts = (accounts: Accounts) => {
  localStorage.setItem('eaudit_accounts', JSON.stringify(accounts));
};

// Dans la fonction login:
const accounts = loadAccounts();
const existing = accounts[username];
let userId: string;

if (existing) {
  // Compte existant: vérifier mot de passe
  if (existing.password !== password) {
    return {
      success: false,
      message: 'Identifiants incorrects',
      code: 'invalidCredentials',
    };
  }
  userId = existing.userId;
  console.log('[AuthContext] User reconnecting:', username, userId);
} else {
  // Nouveau compte: créer userId et stocker
  userId = `user_${Date.now()}`;
  accounts[username] = { password, userId };
  saveAccounts(accounts);
  console.log('[AuthContext] New account created:', username, userId);
}

// Stockage session (inchangé)
localStorage.setItem('eaudit_logged_in', 'true');
localStorage.setItem('eaudit_login_time', Date.now().toString());
localStorage.setItem('eaudit_username', username);
localStorage.setItem('eaudit_user_id', userId);

(window as any).__currentUserId = userId;

setUser({ id: userId, username, role: 'admin' });
setStatus('authenticated');
setReady(true);
return { success: true };
```

**Note:** Les mots de passe en clair sont temporaires. Phase 2 implémentera un hash PBKDF2.

---

### Phase 6: Tests de Validation (15 min)

#### 6.1 Test SQL Direct ✅

```bash
# Dans PowerShell
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"

# Test 1: Vérifier user_id
SELECT id, user_id, name, created_at FROM conversations ORDER BY created_at DESC;

# Test 2: Compter par utilisateur
SELECT user_id, COUNT(*) as count FROM conversations GROUP BY user_id;

# Résultat attendu:
# user_1738976543210 | 2
# user_1738976550000 | 1

# Si tous en 'system_default_user' → Bug en création
```

---

#### 6.2 Test Scénario Alice/Bob ✅

**Procédure:**
```bash
# 1. Nettoyer base de données
Remove-Item "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db" -Force

# 2. Redémarrer application
npm run start:mem

# 3. Alice login
# Username: ALICE
# Password: PASSWORD123

# 4. Alice crée conversation "Test ALICE"

# 5. Vérifier DB
sqlite3 aionui.db "SELECT id, user_id, name FROM conversations;"
# Résultat attendu: user_id = user_XXXXXXXX (pas system_default_user)

# 6. Logout Alice

# 7. Bob login
# Username: BOB
# Password: PASSWORD456

# 8. Bob crée conversation "Test BOB"

# 9. Vérifier isolation
# Interface Bob doit montrer SEULEMENT "Test BOB"
# ❌ Pas de "Test ALICE" visible

# 10. Vérifier DB
sqlite3 aionui.db "SELECT id, user_id, name FROM conversations ORDER BY created_at;"
# Résultat attendu: 2 lignes avec user_id différents

# 11. Logout Bob

# 12. Alice reconnexion
# Username: ALICE
# Password: PASSWORD123

# 13. Vérifier reconnexion
# Alice doit retrouver "Test ALICE" uniquement
# ✅ userId preserved, pas de nouveau userId généré
```

---

#### 6.3 Test Accès Croisé ✅

**Console DevTools (F12):**
```javascript
// 1. Bob connecté, récupérer id d'une conversation d'Alice
const aliceConvId = '<id_conversation_alice>';

// 2. Tenter getConversation (sera rejeté après Phase 4)
window.electronAPI.conversation.get({ id: aliceConvId })
  .then(result => console.log('Accès croisé:', result))
  .catch(err => console.log('Accès bloqué ✅:', err));

// Résultat attendu: Accès bloqué ou undefined
```

---

### Phase 7: Cleanup et Documentation (10 min)

#### 7.1 Supprimer window.__currentUserId (Optionnel) ⚠️

**Fichier:** `src/renderer/context/AuthContext.tsx`

**Note:** Garder `window.__currentUserId` pour compatibilité avec AgentSetupCard.tsx et autres composants non encore migrés. Supprimer seulement après migration complète.

```typescript
// Dans logout():
delete (window as any).__currentUserId; // ← Conserver pour l'instant
```

---

#### 7.2 Ajouter Tests Automatisés (Phase 2) 📋

**Fichier:** `tests/unit/database-isolation.test.ts` (à créer)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AionUIDatabase } from '@process/database';

describe('Database Isolation', () => {
  let db: AionUIDatabase;

  beforeEach(() => {
    db = new AionUIDatabase(':memory:');
  });

  it('should throw error when getUserConversations called without userId', () => {
    expect(() => {
      db.getUserConversations('', 0, 10);
    }).toThrow('userId is required');
  });

  it('should isolate conversations between users', () => {
    const conv1 = { id: 'conv1', name: 'Alice Conv', /* ... */ };
    const conv2 = { id: 'conv2', name: 'Bob Conv', /* ... */ };

    db.createConversation(conv1, 'user_alice');
    db.createConversation(conv2, 'user_bob');

    const aliceConvs = db.getUserConversations('user_alice', 0, 10);
    const bobConvs = db.getUserConversations('user_bob', 0, 10);

    expect(aliceConvs.data.length).toBe(1);
    expect(aliceConvs.data[0].id).toBe('conv1');

    expect(bobConvs.data.length).toBe(1);
    expect(bobConvs.data[0].id).toBe('conv2');
  });

  it('should block delete with wrong userId', () => {
    const conv = { id: 'conv1', name: 'Alice Conv', /* ... */ };
    db.createConversation(conv, 'user_alice');

    const result = db.deleteConversation('conv1', 'user_bob');
    expect(result.data).toBe(false); // ← Aucune ligne supprimée

    const check = db.getConversation('conv1', 'user_alice');
    expect(check.success).toBe(true); // ← Conversation toujours là
  });
});
```

---

## 📊 Récapitulatif des Modifications

### Fichiers Modifiés (11 fichiers)

| Fichier | Phase | Lignes | Changement |
|---------|-------|--------|------------|
| `src/process/database/index.ts` | 1.1, 1.4, 4 | ~150 | Supprimer fallback, userId obligatoire, contrôle propriétaire |
| `src/process/bridge/databaseBridge.ts` | 1.2 | ~20 | Bloquer userId undefined, supprimer merge file |
| `src/process/bridge/conversationBridge.ts` | 1.3 | ~10 | Validation userId pour CREATE |
| `src/renderer/pages/conversation/ChatHistory.tsx` | 2.1 | ~30 | useAuth() + dépendance userId + purge state |
| `src/renderer/pages/conversation/ConversationTabs.tsx` | 2.2 | ~15 | useAuth() |
| `src/renderer/pages/conversation/workspace/index.tsx` | 2.3 | ~10 | useAuth() |
| `src/common/ipcBridge.ts` | 3.1 | 1 | userId obligatoire dans type |
| `src/renderer/context/AuthContext.tsx` | 5.1 | ~40 | Multi-accounts storage |
| `tests/unit/database-isolation.test.ts` | 7.2 | ~50 | Nouveau fichier (tests) |

**Total:** ~326 lignes modifiées/ajoutées

---

## ✅ Checklist d'Exécution

### Avant de Commencer

- [x] Réponses Frontier Models lues et analysées
- [x] Plan d'implémentation créé
- [ ] Backup de la base de données actuelle
- [ ] Backup du code (commit Git)
- [ ] Terminal 2 arrêté (processus Electron)

### Phase 1: Backend (30 min)

- [ ] 1.1 - Supprimer fallback dans database/index.ts
- [ ] 1.2 - Bloquer userId undefined dans databaseBridge.ts
- [ ] 1.3 - Sécuriser CREATE dans conversationBridge.ts
- [ ] 1.4 - userId obligatoire dans createConversation
- [ ] Tester compilation: `bunx tsc --noEmit`

### Phase 2: Frontend (30 min)

- [ ] 2.1 - useAuth() dans ChatHistory.tsx
- [ ] 2.2 - useAuth() dans ConversationTabs.tsx
- [ ] 2.3 - useAuth() dans workspace/index.tsx
- [ ] Tester compilation: `bunx tsc --noEmit`

### Phase 3: Type Safety (10 min)

- [ ] 3.1 - userId obligatoire dans ipcBridge.ts
- [ ] Corriger erreurs TypeScript listées

### Phase 4: Contrôle Propriétaire (20 min)

- [ ] 4.1 - getConversation avec vérification
- [ ] 4.2 - deleteConversation avec vérification
- [ ] 4.3 - updateConversation avec vérification

### Phase 5: Multi-Comptes (20 min)

- [ ] 5.1 - Stocker multi-accounts dans AuthContext.tsx
- [ ] Tester login/logout/reconnexion

### Phase 6: Tests (15 min)

- [ ] 6.1 - Test SQL direct
- [ ] 6.2 - Test scénario Alice/Bob
- [ ] 6.3 - Test accès croisé

### Phase 7: Cleanup (10 min)

- [ ] 7.1 - (Optionnel) Supprimer window.__currentUserId
- [ ] 7.2 - Créer tests automatisés
- [ ] Linter: `bun run lint:fix`
- [ ] Tests: `bun run test`

### Après Exécution

- [ ] Mettre à jour documentation
- [ ] Commit Git: `feat(isolation): implement v19 multi-user isolation`
- [ ] Créer rapport de validation

---

## 🚀 Commandes d'Exécution

```bash
# 0. Backup
git add . && git commit -m "backup: before v19 isolation implementation"

# 1. Arrêter l'application
# Fermer Terminal 2 ou Ctrl+C

# 2. Appliquer les modifications
# (Utiliser les snippets ci-dessus)

# 3. Vérifier TypeScript
bunx tsc --noEmit

# 4. Linter
bun run lint:fix

# 5. Tests
bun run test

# 6. Redémarrer
npm run start:mem

# 7. Tests manuels (scénario Alice/Bob)

# 8. Commit
git add .
git commit -m "feat(isolation): implement v19 multi-user isolation

- Remove defaultUserId fallback in database
- Block undefined userId in databaseBridge
- Secure CREATE with userId validation
- Use useAuth() in ChatHistory, ConversationTabs, workspace
- Add owner verification for get/delete/update
- Implement multi-account storage
- Add isolation tests

Fixes: #isolation-bug
Based on: Frontier Models consensus (ChatGPT, Claude Opus, Claude Sonnet)"
```

---

## 📈 Métriques de Succès

### Avant v19

| Métrique | Valeur |
|----------|--------|
| Isolation CREATE | ⚠️ Partielle (userId parfois undefined) |
| Isolation READ | ❌ Toutes conversations visibles |
| Fallback defaultUserId | ❌ Actif (danger) |
| Merge file storage | ❌ Actif (pollution) |
| Contrôle propriétaire | ❌ Absent |
| Multi-comptes | ❌ Mono-compte seulement |

### Après v19

| Métrique | Valeur |
|----------|--------|
| Isolation CREATE | ✅ Complète (userId obligatoire) |
| Isolation READ | ✅ Complète (par userId) |
| Fallback defaultUserId | ✅ Supprimé |
| Merge file storage | ✅ Désactivé en multi-user |
| Contrôle propriétaire | ✅ Implémenté (get/delete/update) |
| Multi-comptes | ✅ Stockage multi-comptes |

---

**PRÊT POUR EXÉCUTION** ✅

**Temps estimé total:** 2h15 (avec tests)  
**Temps estimé minimal:** 1h30 (sans Phase 7)
