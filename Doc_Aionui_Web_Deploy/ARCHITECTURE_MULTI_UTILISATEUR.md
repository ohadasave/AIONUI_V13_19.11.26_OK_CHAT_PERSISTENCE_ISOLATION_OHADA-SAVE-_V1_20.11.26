# Architecture Multi-Utilisateur — État Actuel et Transformation SaaS

**Objectif** : Documenter l'architecture actuelle de gestion des utilisateurs et des données, puis identifier les modifications nécessaires pour transformer AionUi en SaaS multi-tenant avec isolation des données et gestion admin.

---

## 1. Configuration Actuelle (État des Lieux)

### 1.1. Base de Données

**Type** : SQLite (better-sqlite3)  
**Emplacement** : `<dataPath>/aionui.db` (fichier unique)  
**Version du schéma** : v16 (définie dans `schema.ts`)

### 1.2. Tables Principales

#### **Table `users`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                -- Format: user_<timestamp> ou system_default_user
  username TEXT UNIQUE NOT NULL,      -- Nom d'utilisateur unique
  email TEXT UNIQUE,                  -- Email (optionnel, UNIQUE)
  password_hash TEXT NOT NULL,        -- Hash bcrypt du mot de passe
  avatar_path TEXT,                   -- Chemin de l'avatar
  jwt_secret TEXT,                    -- Secret JWT par utilisateur (v6+)
  created_at INTEGER NOT NULL,        -- Timestamp de création
  updated_at INTEGER NOT NULL,        -- Timestamp de dernière modification
  last_login INTEGER                  -- Timestamp de dernière connexion
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

**Champs manquants pour SaaS** :
- ❌ `is_active` / `status` : pour bloquer/débloquer un utilisateur
- ❌ `role` : pour distinguer admin/user
- ❌ `blocked_at` : timestamp du blocage
- ❌ `blocked_by` : ID de l'admin qui a bloqué
- ❌ `blocked_reason` : raison du blocage

#### **Table `conversations`**

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,              -- 🔑 CLÉ D'ISOLATION PAR UTILISATEUR
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('gemini', 'acp', 'codex', 'openclaw-gateway', 'nanobot', 'n8n')),
  extra TEXT NOT NULL,                -- JSON des données extra
  model TEXT,                         -- JSON du modèle (gemini only)
  status TEXT CHECK(status IN ('pending', 'running', 'finished')),
  source TEXT,                        -- Source de la conversation (telegram, lark, dingtalk, etc.)
  channel_chat_id TEXT,               -- ID de chat pour isolation par canal
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
```

**✅ Isolation existante** : Toutes les conversations sont liées à `user_id` avec `FOREIGN KEY` et `ON DELETE CASCADE`.

#### **Table `messages`**

```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,      -- Lié à une conversation
  msg_id TEXT,
  type TEXT NOT NULL,
  content TEXT NOT NULL,              -- JSON du contenu du message
  position TEXT CHECK(position IN ('left', 'right', 'center', 'pop')),
  status TEXT CHECK(status IN ('finish', 'pending', 'error', 'work')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
```

**✅ Isolation indirecte** : Les messages sont isolés par `conversation_id`, qui lui-même est isolé par `user_id`.

---

## 2. Mécanisme d'Isolation Actuel

### 2.1. Filtrage par `user_id`

**Toutes les requêtes conversations** utilisent `WHERE user_id = ?` :

```typescript
// src/process/database/index.ts

// Récupération des conversations d'un utilisateur
getUserConversations(userId?: string, page = 0, pageSize = 50): IPaginatedResult<TChatConversation> {
  const finalUserId = userId || this.defaultUserId;
  
  const rows = this.db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `).all(finalUserId, pageSize, page * pageSize);
  
  return { data: rows.map(rowToConversation), ... };
}

// Recherche de conversation par canal
findChannelConversation(source, channelChatId, type, backend?, userId?): IQueryResult<TChatConversation | null> {
  const finalUserId = userId || this.defaultUserId;
  
  const row = this.db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ? AND source = ? AND channel_chat_id = ? AND type = ?
    ORDER BY updated_at DESC LIMIT 1
  `).get(finalUserId, source, channelChatId, type);
  
  return { success: true, data: row ? rowToConversation(row) : null };
}
```

### 2.2. Utilisateur par Défaut

**Utilisateur système** : `system_default_user`
- Créé automatiquement au démarrage si inexistant
- Utilisé quand aucun `userId` n'est fourni (`userId || this.defaultUserId`)
- **Problème** : Toutes les conversations sans utilisateur explicite sont attribuées à cet utilisateur système

### 2.3. Authentification WebUI

**Middleware JWT** : `src/webserver/auth/middleware/TokenMiddleware.ts`

```typescript
// Vérifie le token JWT et attache req.user
const decoded = AuthService.verifyToken(token);
if (!decoded) {
  strategy.handleUnauthorized(res);
  return;
}

const user = UserRepository.findById(decoded.userId);
if (!user) {
  strategy.handleUnauthorized(res);
  return;
}

req.user = {
  id: user.id,
  username: user.username,
};
```

**Type Express étendu** : `src/webserver/types/express.d.ts`

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: Pick<AuthUser, 'id' | 'username'>;
      cookies?: Record<string, string>;
      csrfToken?: () => string;
    }
  }
}
```

**Routes protégées** :
- `/api/user/profile` : Récupère `req.user!.id`
- `/api/user/change-password` : Utilise `req.user!.id`

---

## 3. Points Forts de l'Architecture Actuelle

### ✅ Isolation Complète au Niveau Base de Données

1. **Foreign Key Cascade** : `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
   - Si un utilisateur est supprimé, toutes ses conversations ET tous ses messages sont automatiquement supprimés.

2. **Index Performants** :
   - `idx_conversations_user_id` : requêtes rapides par utilisateur
   - `idx_conversations_user_updated` : tri rapide par date de modification
   - `idx_messages_conversation_id` : récupération rapide des messages

3. **Requêtes Systématiques** :
   - Toutes les requêtes de conversations incluent `WHERE user_id = ?`
   - Pas de possibilité d'accès croisé entre utilisateurs

### ✅ JWT Par Utilisateur (v6+)

Chaque utilisateur peut avoir son propre `jwt_secret` :
- Permet d'invalider les tokens d'un utilisateur spécifique
- Utile pour forcer la déconnexion d'un utilisateur compromis

### ✅ Architecture Multi-Process Sécurisée

- **Main Process** : Gère la base de données (pas d'accès direct depuis Renderer)
- **Renderer Process** : Appelle des API HTTP authentifiées
- **IPC Bridge** : Communication sécurisée entre processus

---

## 4. Limitations Actuelles

### ❌ Pas de Gestion de Statut Utilisateur

**Problème** : Impossible de bloquer/débloquer un utilisateur
- Pas de champ `is_active` ou `status` dans la table `users`
- Un utilisateur bloqué peut toujours se connecter

### ❌ Pas de Rôles (Admin vs User)

**Problème** : Tous les utilisateurs ont les mêmes permissions
- Pas de champ `role` dans la table `users`
- Impossible de distinguer un admin d'un utilisateur normal
- Pas de contrôle d'accès basé sur les rôles (RBAC)

### ❌ Utilisateur par Défaut Ambigüe

**Problème** : `system_default_user` reçoit toutes les conversations orphelines
- Utilisé dans Desktop mode (sans login)
- Utilisé quand `userId` n'est pas fourni explicitement
- **Risque** : Mélange des données de test/système avec des vraies données

### ❌ Pas d'Audit Trail

**Problème** : Impossible de tracer qui a fait quoi
- Pas de table `audit_log` pour enregistrer les actions sensibles
- Pas de traçabilité des modifications (qui a bloqué un utilisateur, quand, pourquoi)

### ❌ Fichier SQLite Unique

**Problème** : Scalabilité limitée
- Tous les utilisateurs partagent le même fichier `aionui.db`
- Verrouillage de fichier en écriture (SQLite limitation)
- Difficulté à distribuer sur plusieurs serveurs

---

## 5. Architecture Cible SaaS

### 5.1. Modifications de la Table `users`

**Migration v17 : Ajout des champs admin**

```sql
-- Ajout de colonnes pour gestion admin
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user'));
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'blocked', 'suspended'));
ALTER TABLE users ADD COLUMN blocked_at INTEGER;
ALTER TABLE users ADD COLUMN blocked_by TEXT;
ALTER TABLE users ADD COLUMN blocked_reason TEXT;

-- Index pour les requêtes admin
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Foreign key pour blocked_by (référence à un autre user)
-- Note: SQLite ne supporte pas ALTER TABLE ADD CONSTRAINT après coup
-- Il faudra recréer la table avec la contrainte si nécessaire
```

**Exemple de données** :

| id | username | email | role | status | blocked_at | blocked_by | blocked_reason |
|----|----------|-------|------|--------|------------|------------|----------------|
| user_1234567890 | john@example.com | john@example.com | user | active | NULL | NULL | NULL |
| user_1234567891 | admin@aionui.com | admin@aionui.com | admin | active | NULL | NULL | NULL |
| user_1234567892 | spam_user@test.com | spam_user@test.com | user | blocked | 1738838400000 | user_1234567891 | Spam detected |

### 5.2. Nouvelle Table `audit_log`

**Migration v17 : Création de la table d'audit**

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                  -- Utilisateur qui a effectué l'action
  target_user_id TEXT,                    -- Utilisateur cible (pour actions admin)
  action TEXT NOT NULL,                   -- login, logout, block_user, unblock_user, create_conversation, etc.
  resource_type TEXT,                     -- user, conversation, message, etc.
  resource_id TEXT,                       -- ID de la ressource affectée
  details TEXT,                           -- JSON avec détails supplémentaires
  ip_address TEXT,                        -- Adresse IP de l'action
  user_agent TEXT,                        -- User-Agent du navigateur
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_user_id ON audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
```

**Exemple d'entrée d'audit** :

```json
{
  "id": "audit_1738838400000_abc123",
  "user_id": "user_1234567891",
  "target_user_id": "user_1234567892",
  "action": "block_user",
  "resource_type": "user",
  "resource_id": "user_1234567892",
  "details": "{\"reason\": \"Spam detected\", \"previous_status\": \"active\"}",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": 1738838400000
}
```

### 5.3. Endpoints Admin API

**Route `/api/admin/users`** (protégée, role=admin uniquement)

#### **GET /api/admin/users** — Liste tous les utilisateurs

```typescript
// Query params: ?page=0&pageSize=50&status=active&search=john
// Réponse:
{
  "success": true,
  "data": [
    {
      "id": "user_1234567890",
      "username": "john@example.com",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "created_at": 1738838400000,
      "last_login": 1738924800000,
      "conversation_count": 42
    }
  ],
  "pagination": {
    "total": 150,
    "page": 0,
    "pageSize": 50,
    "hasMore": true
  }
}
```

#### **POST /api/admin/users/:userId/block** — Bloquer un utilisateur

```typescript
// Body: { "reason": "Spam detected" }
// Réponse:
{
  "success": true,
  "message": "User blocked successfully",
  "data": {
    "id": "user_1234567892",
    "username": "spam_user@test.com",
    "status": "blocked",
    "blocked_at": 1738838400000,
    "blocked_by": "user_1234567891",
    "blocked_reason": "Spam detected"
  }
}
```

**Comportement attendu** :
1. Vérifie que `req.user.role === 'admin'`
2. Met à jour `status = 'blocked'`, `blocked_at`, `blocked_by`, `blocked_reason`
3. Invalide tous les JWT tokens de l'utilisateur (via `jwt_secret` rotation)
4. Enregistre l'action dans `audit_log`
5. Retourne le statut mis à jour

#### **POST /api/admin/users/:userId/unblock** — Débloquer un utilisateur

```typescript
// Réponse:
{
  "success": true,
  "message": "User unblocked successfully",
  "data": {
    "id": "user_1234567892",
    "username": "spam_user@test.com",
    "status": "active",
    "blocked_at": null,
    "blocked_by": null,
    "blocked_reason": null
  }
}
```

#### **GET /api/admin/audit** — Logs d'audit

```typescript
// Query params: ?user_id=xxx&action=block_user&page=0&pageSize=100
// Réponse:
{
  "success": true,
  "data": [
    {
      "id": "audit_1738838400000_abc123",
      "user_id": "user_1234567891",
      "user_username": "admin@aionui.com",
      "target_user_id": "user_1234567892",
      "target_username": "spam_user@test.com",
      "action": "block_user",
      "resource_type": "user",
      "details": { "reason": "Spam detected" },
      "ip_address": "192.168.1.100",
      "created_at": 1738838400000
    }
  ],
  "pagination": { ... }
}
```

### 5.4. Middleware de Vérification du Statut

**Nouveau middleware** : `src/webserver/auth/middleware/checkUserStatus.ts`

```typescript
/**
 * Middleware pour vérifier le statut de l'utilisateur authentifié
 * Bloque les requêtes si l'utilisateur est bloqué ou suspendu
 */
export function checkUserStatus(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    // Pas d'utilisateur authentifié, passer au prochain middleware
    return next();
  }

  const user = UserRepository.findById(req.user.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not found',
    });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({
      success: false,
      error: 'Your account has been blocked',
      details: {
        blocked_at: user.blocked_at,
        reason: user.blocked_reason,
      },
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'Your account has been suspended',
    });
  }

  next();
}
```

**Intégration dans les routes** :

```typescript
// src/webserver/index.ts
import { checkUserStatus } from './auth/middleware/checkUserStatus';

// Appliquer le middleware après l'authentification, avant les routes protégées
app.use('/api/*', AuthMiddleware.authenticateToken, checkUserStatus);
```

### 5.5. Middleware de Contrôle d'Accès Admin

**Nouveau middleware** : `src/webserver/auth/middleware/requireAdmin.ts`

```typescript
/**
 * Middleware pour vérifier que l'utilisateur a le rôle admin
 * Doit être utilisé APRÈS authenticateToken
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const user = UserRepository.findById(req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }

  next();
}
```

**Utilisation** :

```typescript
// src/webserver/routes/adminRoutes.ts
import { requireAdmin } from '../auth/middleware/requireAdmin';

const router = express.Router();

// Toutes les routes admin nécessitent l'authentification + role admin
router.use(AuthMiddleware.authenticateToken);
router.use(checkUserStatus);
router.use(requireAdmin);

router.get('/users', AdminController.listUsers);
router.post('/users/:userId/block', AdminController.blockUser);
router.post('/users/:userId/unblock', AdminController.unblockUser);
router.get('/audit', AdminController.getAuditLog);

export default router;
```

---

## 6. Séparation des Données par Utilisateur

### 6.1. État Actuel ✅

**Isolation déjà en place** :
- `conversations.user_id` filtre TOUTES les requêtes
- `messages` sont isolés par `conversation_id` (qui est isolé par `user_id`)
- Pas de requête cross-user possible

**Exemple de requête existante** :

```typescript
// Récupérer les conversations d'un utilisateur
getUserConversations(userId?: string, page = 0, pageSize = 50): IPaginatedResult<TChatConversation> {
  const finalUserId = userId || this.defaultUserId;
  
  // ✅ Toutes les conversations sont filtrées par user_id
  const rows = this.db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `).all(finalUserId, pageSize, page * pageSize);
  
  return { data: rows.map(rowToConversation), ... };
}
```

### 6.2. Améliorations pour SaaS

**Supprimer l'utilisateur système par défaut** :
- Ne plus utiliser `this.defaultUserId` comme fallback
- Exiger un `userId` explicite pour toutes les opérations
- Lever une erreur si `userId` est manquant

**Avant** :
```typescript
getUserConversations(userId?: string, page = 0, pageSize = 50) {
  const finalUserId = userId || this.defaultUserId; // ❌ Fallback dangereux
  // ...
}
```

**Après** :
```typescript
getUserConversations(userId: string, page = 0, pageSize = 50) {
  if (!userId) {
    throw new Error('userId is required'); // ✅ Erreur explicite
  }
  // ...
}
```

**Mettre à jour tous les appels** :
```typescript
// WebUI : req.user.id est toujours disponible après authenticateToken
const conversations = db.getUserConversations(req.user!.id, page, pageSize);

// Desktop : créer un utilisateur "desktop_local_user" au premier lancement
const conversations = db.getUserConversations(getOrCreateDesktopUser(), page, pageSize);
```

---

## 7. Roadmap de Transformation SaaS

### Phase 1 : Préparation (1-2 jours)

**Objectif** : Ajouter les champs nécessaires sans casser l'existant

- [ ] **Migration v17** :
  - [ ] Ajouter colonnes `role`, `status`, `blocked_at`, `blocked_by`, `blocked_reason` à `users`
  - [ ] Créer table `audit_log`
  - [ ] Créer index pour performance
- [ ] **Valeurs par défaut** :
  - [ ] Tous les utilisateurs existants → `role='user'`, `status='active'`
  - [ ] Créer un premier utilisateur admin (via script CLI)
- [ ] **Tests unitaires** :
  - [ ] Vérifier que les migrations n'ont pas cassé les requêtes existantes

### Phase 2 : Backend Admin (2-3 jours)

**Objectif** : Implémenter les endpoints et middlewares admin

- [ ] **Middlewares** :
  - [ ] `checkUserStatus` : bloquer les utilisateurs bloqués/suspendus
  - [ ] `requireAdmin` : vérifier le rôle admin
- [ ] **Routes Admin** :
  - [ ] `GET /api/admin/users` : liste des utilisateurs
  - [ ] `POST /api/admin/users/:userId/block` : bloquer un utilisateur
  - [ ] `POST /api/admin/users/:userId/unblock` : débloquer un utilisateur
  - [ ] `GET /api/admin/users/:userId` : détails d'un utilisateur
  - [ ] `GET /api/admin/audit` : logs d'audit
- [ ] **Services** :
  - [ ] `AdminService.blockUser(adminId, targetUserId, reason)`
  - [ ] `AdminService.unblockUser(adminId, targetUserId)`
  - [ ] `AdminService.listUsers(filters, pagination)`
  - [ ] `AuditLogService.logAction(userId, action, details)`
- [ ] **Invalidation JWT** :
  - [ ] Rotation du `jwt_secret` lors du blocage
  - [ ] Vérification du statut dans `verifyToken()`
- [ ] **Tests d'intégration** :
  - [ ] Tester blocage/déblocage
  - [ ] Vérifier que les utilisateurs bloqués ne peuvent plus se connecter
  - [ ] Vérifier que seuls les admins peuvent accéder aux routes admin

### Phase 3 : Interface Admin Frontend (3-4 jours)

**Objectif** : Créer l'interface de gestion des utilisateurs

- [ ] **Page Admin** :
  - [ ] `/admin/users` : liste des utilisateurs avec filtres (status, role, search)
  - [ ] Tableau avec colonnes : username, email, role, status, last_login, actions
  - [ ] Actions : Bloquer, Débloquer, Voir détails
- [ ] **Modale de blocage** :
  - [ ] Formulaire avec champ "reason"
  - [ ] Confirmation avant blocage
  - [ ] Affichage du succès/erreur
- [ ] **Page détails utilisateur** :
  - [ ] `/admin/users/:userId` : infos complètes
  - [ ] Nombre de conversations, messages
  - [ ] Historique d'audit (actions effectuées par cet utilisateur)
- [ ] **Page logs d'audit** :
  - [ ] `/admin/audit` : tableau des actions sensibles
  - [ ] Filtres : user, action, date range
- [ ] **Protection des routes** :
  - [ ] Vérifier `req.user.role === 'admin'` côté serveur
  - [ ] Rediriger les non-admins vers `/`
- [ ] **Tests E2E** :
  - [ ] Créer un admin, un user normal
  - [ ] Tester blocage depuis l'interface admin
  - [ ] Vérifier que l'utilisateur bloqué ne peut plus se connecter

### Phase 4 : Suppression du Fallback système (1 jour)

**Objectif** : Supprimer `defaultUserId` et exiger un `userId` explicite

- [ ] **Mise à jour de `AionUIDatabase`** :
  - [ ] Supprimer `defaultUserId` comme fallback
  - [ ] Lever une erreur si `userId` est manquant
- [ ] **Mise à jour des appels** :
  - [ ] WebUI : toujours passer `req.user!.id`
  - [ ] Desktop : créer un utilisateur "desktop_local_user"
- [ ] **Tests de régression** :
  - [ ] Vérifier que toutes les routes passent encore les tests
  - [ ] Vérifier que Desktop mode fonctionne toujours

### Phase 5 : Déploiement et Monitoring (1 jour)

**Objectif** : Déployer la version SaaS et surveiller les logs

- [ ] **Documentation** :
  - [ ] Mettre à jour README avec instructions admin
  - [ ] Documenter les endpoints admin dans Swagger/OpenAPI
- [ ] **Scripts de migration** :
  - [ ] Script pour créer le premier admin
  - [ ] Script pour migrer les utilisateurs existants
- [ ] **Monitoring** :
  - [ ] Dashboard des utilisateurs actifs
  - [ ] Alertes sur actions sensibles (blocages, suspensions)
- [ ] **Tests de charge** :
  - [ ] Simuler 100+ utilisateurs simultanés
  - [ ] Vérifier les temps de réponse

---

## 8. Considérations de Scalabilité

### 8.1. Limites de SQLite

**Problèmes potentiels** :
- **Écriture concurrente** : SQLite verrouille le fichier en écriture (1 writer à la fois)
- **Fichier unique** : Difficile à distribuer sur plusieurs serveurs
- **Sauvegarde à chaud** : Nécessite des outils spécifiques (litestream, sqlite-backup)

**Quand migrer vers PostgreSQL ?** :
- Si vous dépassez **1000+ utilisateurs actifs simultanés**
- Si vous avez besoin de **réplication multi-régions**
- Si vous avez besoin de **requêtes complexes** (analytics, reporting)

### 8.2. Optimisations SQLite pour SaaS

**Si vous gardez SQLite** :
- [ ] **WAL mode** : Déjà activé (`PRAGMA journal_mode = WAL`)
- [ ] **Connection pool** : Utiliser `better-sqlite3-pool` pour gérer les connexions
- [ ] **Read replicas** : Utiliser `litestream` pour répliquer vers S3/GCS
- [ ] **Sharding** : Séparer les utilisateurs en plusieurs fichiers SQLite (par région, par plan, etc.)

**Exemple de sharding** :
- `aionui_free.db` : utilisateurs free (1-10 conversations max)
- `aionui_pro.db` : utilisateurs pro (conversations illimitées)
- `aionui_enterprise.db` : clients entreprise

### 8.3. Migration vers PostgreSQL (optionnel, future)

**Si vous devez évoluer vers PostgreSQL** :
- Utiliser un ORM (Prisma, TypeORM, Drizzle) pour abstraire la base
- Garder `better-sqlite3` pour Desktop mode
- Utiliser Postgres pour WebUI SaaS

**Architecture hybride** :
```
Desktop mode → SQLite local (1 fichier par utilisateur)
WebUI SaaS   → PostgreSQL centralisé (tous les utilisateurs)
```

---

## 9. Résumé des Fichiers à Modifier

### Nouveaux Fichiers (à créer)

```
src/process/database/migrations.ts
  → migration_v17 : Ajout colonnes admin + table audit_log

src/webserver/auth/middleware/checkUserStatus.ts
  → Vérifier status utilisateur (blocked/suspended)

src/webserver/auth/middleware/requireAdmin.ts
  → Vérifier role admin

src/webserver/routes/adminRoutes.ts
  → Routes admin (list users, block, unblock, audit)

src/webserver/controllers/AdminController.ts
  → Logique métier admin

src/webserver/services/AdminService.ts
  → Service pour blocage/déblocage utilisateurs

src/webserver/services/AuditLogService.ts
  → Service pour logs d'audit

src/renderer/pages/admin/UserManagement.tsx
  → Interface admin (liste utilisateurs)

src/renderer/pages/admin/UserDetails.tsx
  → Détails d'un utilisateur

src/renderer/pages/admin/AuditLog.tsx
  → Logs d'audit

tests/integration/admin.test.ts
  → Tests d'intégration admin

tests/e2e/admin-ui.e2e.ts
  → Tests E2E interface admin
```

### Fichiers Existants (à modifier)

```
src/process/database/schema.ts
  → Mettre à jour CURRENT_DB_VERSION = 17

src/process/database/types.ts
  → Ajouter IUser.role, IUser.status, etc.
  → Ajouter IAuditLogRow

src/process/database/index.ts
  → Supprimer defaultUserId fallback (Phase 4)
  → Ajouter méthodes: blockUser(), unblockUser(), logAuditAction()

src/webserver/auth/repository/UserRepository.ts
  → Ajouter méthodes: listUsers(), blockUser(), unblockUser()

src/webserver/auth/service/AuthService.ts
  → Vérifier status dans verifyToken()
  → Invalider JWT lors du blocage

src/webserver/index.ts
  → Intégrer checkUserStatus middleware
  → Monter les routes admin

src/webserver/types/express.d.ts
  → Ajouter req.user.role

src/renderer/router/index.tsx
  → Ajouter routes /admin/users, /admin/audit

Doc_Aionui_Web_Deploy/ARCHITECTURE.md
  → Documenter architecture multi-utilisateur

Doc_Aionui_Web_Deploy/PROBLEMES_ET_SOLUTIONS.md
  → Ajouter section "Multi-Utilisateur SaaS"
```

---

## 10. Exemple de Code : BlockUser

### Backend Service

```typescript
// src/webserver/services/AdminService.ts
import { UserRepository } from '../auth/repository/UserRepository';
import { AuditLogService } from './AuditLogService';
import { AuthService } from '../auth/service/AuthService';
import crypto from 'crypto';

export class AdminService {
  /**
   * Bloquer un utilisateur
   */
  static async blockUser(
    adminId: string,
    targetUserId: string,
    reason: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Vérifier que l'admin ne se bloque pas lui-même
      if (adminId === targetUserId) {
        return { success: false, error: 'Cannot block yourself' };
      }

      const db = getDatabase();
      const now = Date.now();

      // Mettre à jour le statut
      db.prepare(`
        UPDATE users
        SET status = 'blocked',
            blocked_at = ?,
            blocked_by = ?,
            blocked_reason = ?,
            updated_at = ?
        WHERE id = ?
      `).run(now, adminId, reason, now, targetUserId);

      // Invalider tous les JWT tokens de l'utilisateur
      const newJwtSecret = crypto.randomBytes(32).toString('hex');
      UserRepository.updateJwtSecret(targetUserId, newJwtSecret);

      // Logger l'action
      await AuditLogService.logAction({
        userId: adminId,
        targetUserId,
        action: 'block_user',
        resourceType: 'user',
        resourceId: targetUserId,
        details: { reason },
        ipAddress,
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AdminService] Block user error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Débloquer un utilisateur
   */
  static async unblockUser(
    adminId: string,
    targetUserId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getDatabase();
      const now = Date.now();

      // Récupérer la raison actuelle (pour l'audit)
      const user = UserRepository.findById(targetUserId);
      const previousReason = user?.blocked_reason;

      // Mettre à jour le statut
      db.prepare(`
        UPDATE users
        SET status = 'active',
            blocked_at = NULL,
            blocked_by = NULL,
            blocked_reason = NULL,
            updated_at = ?
        WHERE id = ?
      `).run(now, targetUserId);

      // Logger l'action
      await AuditLogService.logAction({
        userId: adminId,
        targetUserId,
        action: 'unblock_user',
        resourceType: 'user',
        resourceId: targetUserId,
        details: { previous_reason: previousReason },
        ipAddress,
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AdminService] Unblock user error:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### Frontend Component

```tsx
// src/renderer/pages/admin/UserManagement.tsx
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Input, Message } from '@arco-design/web-react';
import type { IUser } from '@/common/types';

export function UserManagement() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Charger les utilisateurs
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (error) {
      Message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleBlock() {
    if (!selectedUser || !blockReason.trim()) {
      Message.error('Please enter a reason');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ reason: blockReason }),
      });

      const result = await response.json();
      if (result.success) {
        Message.success('User blocked successfully');
        setBlockModalVisible(false);
        setBlockReason('');
        loadUsers(); // Recharger la liste
      } else {
        Message.error(result.error || 'Failed to block user');
      }
    } catch (error) {
      Message.error('Network error');
    }
  }

  async function handleUnblock(userId: string) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        Message.success('User unblocked successfully');
        loadUsers();
      } else {
        Message.error(result.error || 'Failed to unblock user');
      }
    } catch (error) {
      Message.error('Network error');
    }
  }

  const columns = [
    { title: 'Username', dataIndex: 'username' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Role', dataIndex: 'role' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => (
        <span className={status === 'active' ? 'text-green-600' : 'text-red-600'}>
          {status}
        </span>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      render: (timestamp: number) =>
        timestamp ? new Date(timestamp).toLocaleString() : 'Never',
    },
    {
      title: 'Actions',
      render: (_: any, user: IUser) => (
        <div className="flex gap-2">
          {user.status === 'active' ? (
            <Button
              type="primary"
              status="danger"
              size="small"
              onClick={() => {
                setSelectedUser(user);
                setBlockModalVisible(true);
              }}
            >
              Block
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              onClick={() => handleUnblock(user.id)}
            >
              Unblock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <Table
        columns={columns}
        data={users}
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title="Block User"
        visible={blockModalVisible}
        onCancel={() => setBlockModalVisible(false)}
        onOk={handleBlock}
      >
        <p className="mb-4">
          Are you sure you want to block <strong>{selectedUser?.username}</strong>?
        </p>
        <Input.TextArea
          placeholder="Reason for blocking (required)"
          value={blockReason}
          onChange={setBlockReason}
          rows={3}
        />
      </Modal>
    </div>
  );
}
```

---

## 11. Checklist de Vérification

### ✅ Isolation des Données

- [x] Toutes les conversations sont filtrées par `user_id`
- [x] Les messages sont isolés par `conversation_id` (qui est isolé par `user_id`)
- [x] `FOREIGN KEY` avec `ON DELETE CASCADE` pour suppression en cascade
- [x] Index performants sur `user_id`

### ❌ Fonctionnalités Manquantes pour SaaS

- [ ] Table `users` : colonnes `role`, `status`, `blocked_at`, `blocked_by`, `blocked_reason`
- [ ] Table `audit_log` pour traçabilité
- [ ] Middleware `checkUserStatus` pour bloquer les utilisateurs bloqués
- [ ] Middleware `requireAdmin` pour protéger les routes admin
- [ ] Routes admin : `/api/admin/users`, `/api/admin/users/:userId/block`, etc.
- [ ] Interface frontend : `/admin/users`, `/admin/audit`
- [ ] Invalidation JWT lors du blocage
- [ ] Suppression du fallback `defaultUserId`

---

## Conclusion

**État actuel** :
- ✅ Isolation des données **déjà en place** au niveau base de données
- ✅ Architecture sécurisée (JWT, multi-process, IPC bridge)
- ✅ Support multi-utilisateurs existant (table `users` + authentification)

**Pour transformer en SaaS** :
- ⚙️ Ajouter gestion admin (rôles, statuts, blocage)
- ⚙️ Ajouter audit trail (logs des actions sensibles)
- ⚙️ Créer interface admin (liste utilisateurs, blocage, logs)
- ⚙️ Supprimer le fallback `defaultUserId`

**Estimation** : 8-12 jours de développement (1-2 développeurs)

**Prochaines étapes** :
1. Valider ce plan avec l'équipe
2. Créer une branche `feature/saas-multi-user`
3. Commencer par la Phase 1 (migrations)
4. Itérer phase par phase avec tests de régression

---

**Document créé le** : 2024-02-06  
**Auteur** : Documentation automatique Kiro  
**Version** : 1.0
