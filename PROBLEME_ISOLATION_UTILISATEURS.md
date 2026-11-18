# ⚠️ PROBLÈME : Isolation des Utilisateurs en Mode Desktop

## 🔴 Problèmes Identifiés

### Problème 1 : Données non isolées entre comptes
**Symptôme** : Après création d'un nouveau compte, les données de l'ancien compte (sans connexion) sont toujours visibles.

**Cause racine** : 
- En mode Desktop, l'application utilise un `user_id` fixe (`'desktop-user'`) pour tous les utilisateurs
- Les modifications récentes ont créé un `user_id` unique par compte (`user_${timestamp}`)
- MAIS le système ne passe pas ce `user_id` à la database à travers la chaîne IPC
- Résultat : la database utilise `defaultUserId = 'system_default_user'` pour TOUTES les conversations

### Problème 2 : Pas de login au redémarrage
**Symptôme** : Après redémarrage, l'utilisateur entre directement dans l'application sans page de login.

**Cause racine** :
- Le localStorage contient encore `eaudit_logged_in = 'true'`
- La session est considérée comme valide (< 24h)
- Le système restaure automatiquement la session

---

## 🏗️ Architecture Actuelle (Problématique)

```
┌─────────────────────────────────────────────────────────┐
│  AuthContext (Frontend)                                 │
│  - user.id = "user_1738838400000" ✅                    │
│  - Stocké dans localStorage                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ IPC Call (conversation.create)
                   │ ❌ userId NON transmis
                   ▼
┌─────────────────────────────────────────────────────────┐
│  ConversationService (Backend)                          │
│  - Crée la conversation                                 │
│  - N'a PAS accès au userId du frontend                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ db.createConversation(conversation)
                   │ ❌ Pas de userId passé
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Database (AionUIDatabase)                              │
│  - userId manquant                                      │
│  - Utilise defaultUserId = 'system_default_user' ❌     │
│  - TOUTES les conversations vont au même user_id        │
└─────────────────────────────────────────────────────────┘
```

**Résultat** : 
- Utilisateur A crée des conversations → `user_id = 'system_default_user'`
- Utilisateur B crée des conversations → `user_id = 'system_default_user'`
- Les deux voient les mêmes données ! ❌

---

## ✅ Architecture Cible (À Implémenter)

```
┌─────────────────────────────────────────────────────────┐
│  AuthContext (Frontend)                                 │
│  - user.id = "user_1738838400000" ✅                    │
│  - Exposé globalement via window.__currentUserId        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ IPC Call (conversation.create)
                   │ ✅ + { userId: user.id }
                   ▼
┌─────────────────────────────────────────────────────────┐
│  ConversationBridge (IPC Handler)                       │
│  - Récupère userId depuis params OU window context      │
│  - Valide que userId existe                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ ConversationService.create({ ..., userId })
                   │ ✅ userId transmis
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Database (AionUIDatabase)                              │
│  - Reçoit userId explicitement                          │
│  - Si manquant, ERREUR (pas de fallback)                │
│  - conversation.user_id = userId passé ✅               │
└─────────────────────────────────────────────────────────┘
```

**Résultat** :
- Utilisateur A crée des conversations → `user_id = 'user_123'` ✅
- Utilisateur B crée des conversations → `user_id = 'user_456'` ✅
- Isolation complète ! ✅

---

## 🔧 Fichiers à Modifier

### 1. **AuthContext.tsx** ✅ (Déjà modifié partiellement)

**Changements déjà faits** :
```typescript
// Création d'un userId unique par compte
userId = `user_${Date.now()}`;
localStorage.setItem('eaudit_user_id', userId);

// Restauration du userId au redémarrage
const userId = localStorage.getItem('eaudit_user_id') || 'desktop-user';
setUser({ id: userId, username, role: 'admin' });
```

**Changements manquants** :
```typescript
// Exposer le userId globalement pour les bridges IPC
if (typeof window !== 'undefined') {
  (window as any).__currentUserId = userId;
}
```

---

### 2. **conversationBridge.ts** ❌ (À modifier)

**Fichier** : `src/process/bridge/conversationBridge.ts`

**Changement nécessaire** :
```typescript
ipcBridge.conversation.create.provider(async (params): Promise<TChatConversation> => {
  // AVANT : Pas de userId
  const result = await ConversationService.createConversation({
    ...params,
    source: 'aionui',
  });
  
  // APRÈS : Passer le userId
  const userId = params.userId || (global as any).__currentUserId || 'system_default_user';
  
  const result = await ConversationService.createConversation({
    ...params,
    userId, // ✅ Ajouter userId
    source: 'aionui',
  });
  
  // ... reste du code
});
```

---

### 3. **conversationService.ts** ❌ (À modifier)

**Fichier** : `src/process/services/conversationService.ts`

**Interface à modifier** :
```typescript
export interface ICreateConversationOptions extends ICreateConversationParams {
  source?: ConversationSource;
  channelChatId?: string;
  userId?: string; // ✅ Ajouter userId
}
```

**Méthode à modifier** :
```typescript
static async createConversation(params: ICreateConversationOptions): Promise<ICreateConversationResult> {
  const { type, extra, name, model, id, source, userId } = params; // ✅ Extraire userId
  
  try {
    let conversation: TChatConversation;
    
    // ... création de la conversation selon le type ...
    
    // ✅ Ajouter userId à la conversation
    if (userId) {
      (conversation as any).user_id = userId;
    }
    
    // Save to database avec userId
    const db = getDatabase();
    const result = db.createConversation(conversation, userId); // ✅ Passer userId
    
    // ... reste du code
  }
}
```

---

### 4. **database/index.ts** ❌ (À modifier)

**Fichier** : `src/process/database/index.ts`

**Méthode à modifier** :
```typescript
createConversation(conversation: TChatConversation, userId?: string): IQueryResult<void> {
  try {
    // AVANT : Utilise defaultUserId si userId manquant
    const finalUserId = userId || this.defaultUserId;
    
    // APRÈS : Erreur si userId manquant (mode strict)
    if (!userId) {
      return {
        success: false,
        error: 'userId is required for creating conversations'
      };
    }
    
    const row = conversationToRow(conversation, userId); // userId obligatoire
    
    this.db.prepare(`
      INSERT INTO conversations (
        id, user_id, name, type, extra, model, status, 
        source, channel_chat_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      userId, // ✅ Utiliser userId passé
      row.name,
      row.type,
      row.extra,
      row.model,
      row.status,
      row.source,
      row.channel_chat_id,
      row.created_at,
      row.updated_at
    );
    
    return { success: true };
  } catch (error) {
    // ... gestion erreur
  }
}
```

**Autres méthodes à modifier** :
- `getUserConversations(userId: string)` ✅ Déjà OK
- `getConversation(conversationId: string, userId: string)` ✅ Déjà OK  
- `updateConversation(conversation: TChatConversation, userId: string)` ❌ À ajouter userId obligatoire
- `deleteConversation(conversationId: string, userId: string)` ✅ Déjà OK

---

### 5. **ipcBridge.ts** ❌ (À modifier)

**Fichier** : `src/common/ipcBridge.ts`

**Interface à modifier** :
```typescript
export interface ICreateConversationParams {
  type: ConversationType;
  name?: string;
  model: TProviderWithModel;
  extra: any;
  id?: string;
  userId?: string; // ✅ Ajouter userId optionnel
}
```

---

### 6. **Tous les appels IPC depuis le Frontend** ❌ (À modifier)

**Fichiers concernés** :
- `src/renderer/hooks/useConversation.ts`
- `src/renderer/pages/guid/index.tsx`
- Tout code qui appelle `window.electronAPI.conversation.create(...)`

**Changement nécessaire** :
```typescript
// AVANT
const conversation = await window.electronAPI.conversation.create({
  type: 'gemini',
  name: 'New Chat',
  model: selectedModel,
  extra: { workspace: '/path' }
});

// APRÈS : Passer userId depuis AuthContext
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();

const conversation = await window.electronAPI.conversation.create({
  type: 'gemini',
  name: 'New Chat',
  model: selectedModel,
  extra: { workspace: '/path' },
  userId: user?.id // ✅ Ajouter userId
});
```

---

## 🚨 Solution Temporaire (Workaround)

En attendant les modifications complètes, voici comment nettoyer et isoler les données :

### Script 1 : Nettoyage Complet du LocalStorage

```powershell
# Arrêter l'application
Stop-Process -Name "E-audit" -Force -ErrorAction SilentlyContinue

# Supprimer TOUTES les données localStorage
$localStoragePath = "$env:APPDATA\E-audit\Local Storage"
Remove-Item -Path "$localStoragePath\*" -Recurse -Force -ErrorAction SilentlyContinue

# Supprimer la database SQLite (⚠️ PERTE DE DONNÉES)
$dbPath = "$env:APPDATA\E-audit\aionui\aionui.db"
Remove-Item -Path $dbPath -Force -ErrorAction SilentlyContinue

Write-Host "✅ Nettoyage complet effectué"
Write-Host "⚠️  Toutes les conversations ont été supprimées"
Write-Host "→ Redémarrer l'application pour créer un nouveau compte"
```

### Script 2 : Créer un Utilisateur Dédié

**IMPORTANT** : En mode Desktop actuel, chaque utilisateur doit utiliser un compte Windows/macOS séparé pour avoir ses propres données isolées.

**Option 1 : Comptes Windows séparés** (Recommandé)
```
Utilisateur A → Session Windows A → %APPDATA%\E-audit\ (base A)
Utilisateur B → Session Windows B → %APPDATA%\E-audit\ (base B)
```

**Option 2 : Profils Electron séparés** (À implémenter)
```typescript
// src/index.ts
const userDataPath = app.getPath('userData');
const profilePath = path.join(userDataPath, 'profiles', userId);
app.setPath('userData', profilePath);
```

---

## 📋 Plan d'Action Complet

### Phase 1 : Nettoyage Immédiat (5 min)

```powershell
# Exécuter le script de nettoyage
.\scripts\Clean-UserData.ps1
```

Résultat : Base de données vide, prête pour un nouveau départ

---

### Phase 2 : Modifications Backend (2-3 heures)

1. **database/index.ts** :
   - [ ] Rendre `userId` obligatoire dans `createConversation()`
   - [ ] Supprimer le fallback `defaultUserId`
   - [ ] Lever une erreur si `userId` manquant

2. **conversationService.ts** :
   - [ ] Ajouter `userId` dans `ICreateConversationOptions`
   - [ ] Passer `userId` à `db.createConversation()`

3. **conversationBridge.ts** :
   - [ ] Récupérer `userId` depuis params ou context global
   - [ ] Passer `userId` à `ConversationService`

4. **ipcBridge.ts** :
   - [ ] Ajouter `userId` dans `ICreateConversationParams`

---

### Phase 3 : Modifications Frontend (1-2 heures)

1. **AuthContext.tsx** :
   - [ ] Exposer `userId` globalement : `window.__currentUserId`
   - [ ] Mettre à jour au login/logout

2. **useConversation.ts** :
   - [ ] Passer `userId` dans tous les appels IPC
   - [ ] Utiliser `user.id` depuis `useAuth()`

3. **guid/index.tsx** :
   - [ ] Passer `userId` lors de la création de conversation
   - [ ] Afficher une erreur si `user` non disponible

---

### Phase 4 : Tests (1 heure)

1. **Test Isolation** :
   - [ ] Créer compte A (alice@test.com)
   - [ ] Créer 3 conversations
   - [ ] Se déconnecter
   - [ ] Créer compte B (bob@test.com)
   - [ ] Créer 3 conversations
   - [ ] Vérifier qu'Alice ne voit que ses 3 conversations ✅
   - [ ] Vérifier que Bob ne voit que ses 3 conversations ✅

2. **Test Persistance** :
   - [ ] Se connecter avec Alice
   - [ ] Fermer l'application
   - [ ] Rouvrir l'application
   - [ ] Vérifier que la session Alice est restaurée ✅
   - [ ] Vérifier que seules les conversations d'Alice sont visibles ✅

3. **Test Database** :
   - [ ] Inspecter `aionui.db` avec SQLite Browser
   - [ ] Vérifier que `conversations.user_id` contient les bons IDs
   - [ ] Vérifier qu'il n'y a plus de `'system_default_user'`

---

## 🎯 Résultat Attendu

### Avant (Problématique)
```sql
SELECT id, user_id, name FROM conversations;

-- Résultat :
-- conv_123 | system_default_user | Chat 1  (créé par Alice)
-- conv_456 | system_default_user | Chat 2  (créé par Alice)
-- conv_789 | system_default_user | Chat 3  (créé par Bob)
-- conv_101 | system_default_user | Chat 4  (créé par Bob)

-- ❌ Tous les users voient TOUTES les conversations
```

### Après (Corrigé)
```sql
SELECT id, user_id, name FROM conversations;

-- Résultat :
-- conv_123 | user_1738838400000 | Chat 1  (Alice)
-- conv_456 | user_1738838400000 | Chat 2  (Alice)
-- conv_789 | user_1738838500000 | Chat 3  (Bob)
-- conv_101 | user_1738838500000 | Chat 4  (Bob)

-- ✅ Isolation complète : Alice voit conv_123,456 | Bob voit conv_789,101
```

---

## 📞 Support

### Documentation Référence
- `Doc_comprehension_projet/03_ISOLATION_DONNEES_UTILISATEURS.md` - Architecture isolation
- `Doc_Saas_Multi_User/ARCHITECTURE_MULTI_UTILISATEUR.md` - Système SaaS complet

### Scripts Disponibles
- `scripts/Clean-UserData.ps1` - Nettoyage complet
- `scripts/Inspect-Database.ps1` - Inspecter les user_id dans la DB

---

**Date** : Janvier 2025  
**Version** : 1.0  
**Statut** : ⚠️ Problème identifié, solution documentée  
**Priorité** : 🔴 Critique (isolation utilisateurs compromise)
