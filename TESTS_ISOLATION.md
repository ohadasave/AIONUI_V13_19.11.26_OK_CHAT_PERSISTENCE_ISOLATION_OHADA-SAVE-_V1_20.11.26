# Plan de Tests - Isolation Multi-Utilisateur

**Date:** 2025-02-02  
**Version:** 1.0  
**Objectif:** Valider que l'isolation des données entre utilisateurs fonctionne correctement

---

## Pré-requis

1. **Base de données propre** : Exécuter `.\scripts\Clean-UserData.ps1`
2. **Application démarrée** : `npm run start:mem`
3. **DevTools ouverts** : F12 pour voir les logs

---

## Test 1: Création du Premier Compte (Alice)

### Étapes

1. **Démarrer l'application** (déjà faite)
2. **Page de login apparaît** ✅
3. **Entrer credentials:**
   - Username: `alice@example.com`
   - Password: `Alice123`
4. **Vérifier logs dans DevTools Console:**
   ```
   [AuthContext] Desktop login successful for user: user_<timestamp>
   ```
   📝 **Noter le userId généré** : `user_________________`

5. **Créer une conversation** nommée "Alice Conversation 1"
6. **Envoyer un message** : "Bonjour, je suis Alice"
7. **Vérifier logs:**
   ```
   [conversationBridge] Creating conversation with userId: user_<timestamp>
   [ConversationService] Created gemini conversation <conv_id> with userId=user_<timestamp>
   ```

8. **Vérifier localStorage dans DevTools Console:**
   ```javascript
   localStorage.getItem('eaudit_user_id')
   // Doit retourner: "user_<timestamp>"
   
   localStorage.getItem('eaudit_credentials')
   // Doit contenir: {"username":"alice@example.com","password":"Alice123","userId":"user_<timestamp>"}
   
   window.__currentUserId
   // Doit retourner: "user_<timestamp>"
   ```

9. **Créer une deuxième conversation** nommée "Alice Conversation 2"
10. **Envoyer un message** : "Deuxième conversation d'Alice"

### Résultats Attendus

- ✅ Page de login affichée au démarrage
- ✅ Login réussi avec génération d'un userId unique
- ✅ Deux conversations créées et visibles dans la liste
- ✅ Messages persistés correctement
- ✅ localStorage contient le userId et les credentials

### Vérification Base de Données

```sql
-- Compter les conversations d'Alice
SELECT COUNT(*) FROM conversations WHERE user_id = 'user_<timestamp>';
-- Attendu: 2

-- Lister les conversations d'Alice
SELECT id, user_id, name, created_at FROM conversations WHERE user_id = 'user_<timestamp>';
-- Attendu: 2 lignes avec "Alice Conversation 1" et "Alice Conversation 2"

-- Compter les messages d'Alice
SELECT COUNT(*) FROM messages WHERE conversation_id IN (
  SELECT id FROM conversations WHERE user_id = 'user_<timestamp>'
);
-- Attendu: 4 (2 user + 2 assistant)
```

---

## Test 2: Déconnexion et Reconnexion (Alice)

### Étapes

1. **Cliquer sur Logout** (ou fermer l'application)
2. **Vérifier logs:**
   ```
   [AuthContext] Desktop mode - session expired
   ```
   
3. **Vérifier localStorage:**
   ```javascript
   localStorage.getItem('eaudit_logged_in')
   // Doit retourner: null
   
   localStorage.getItem('eaudit_user_id')
   // Doit retourner: null
   
   window.__currentUserId
   // Doit retourner: undefined
   
   localStorage.getItem('eaudit_credentials')
   // Doit TOUJOURS contenir: {"username":"alice@example.com","password":"Alice123","userId":"user_<timestamp>"}
   // (Les credentials ne sont PAS supprimés pour permettre la reconnexion)
   ```

4. **Page de login réapparaît** ✅

5. **Re-entrer credentials:**
   - Username: `alice@example.com`
   - Password: `Alice123`

6. **Vérifier logs:**
   ```
   [AuthContext] Desktop login successful for user: user_<timestamp>
   ```
   ⚠️ **Le userId doit être LE MÊME** qu'au Test 1

7. **Vérifier la liste des conversations:**
   - ✅ "Alice Conversation 1" présente
   - ✅ "Alice Conversation 2" présente

8. **Ouvrir "Alice Conversation 1"**
9. **Vérifier que le message "Bonjour, je suis Alice" est présent** ✅

### Résultats Attendus

- ✅ Déconnexion efface la session mais PAS les credentials
- ✅ Reconnexion avec même userId (pas de nouveau userId généré)
- ✅ Toutes les conversations précédentes sont visibles
- ✅ Tous les messages précédents sont conservés

---

## Test 3: Création du Deuxième Compte (Bob) - ISOLATION

### Étapes

1. **Logout d'Alice**

2. **CRUCIAL: Nettoyer la base de données ET localStorage:**
   ```powershell
   .\scripts\Clean-UserData.ps1
   ```
   ⚠️ **Sans ce nettoyage, les credentials d'Alice persistent et empêchent la création du compte Bob**

3. **Redémarrer l'application** (ou attendre qu'elle se recharge)

4. **Page de login apparaît** ✅

5. **Entrer credentials:**
   - Username: `bob@example.com`
   - Password: `Bob456`

6. **Vérifier logs:**
   ```
   [AuthContext] Desktop login successful for user: user_<nouveau_timestamp>
   ```
   📝 **Noter le nouveau userId** : `user_________________`
   ⚠️ **Ce userId DOIT être différent de celui d'Alice**

7. **Vérifier localStorage:**
   ```javascript
   localStorage.getItem('eaudit_user_id')
   // Doit retourner: "user_<nouveau_timestamp>" (différent d'Alice)
   
   localStorage.getItem('eaudit_credentials')
   // Doit contenir: {"username":"bob@example.com","password":"Bob456","userId":"user_<nouveau_timestamp>"}
   
   window.__currentUserId
   // Doit retourner: "user_<nouveau_timestamp>"
   ```

8. **Vérifier la liste des conversations:**
   - ✅ **AUCUNE conversation visible** (liste vide)
   - ❌ **Ne doit PAS voir "Alice Conversation 1"**
   - ❌ **Ne doit PAS voir "Alice Conversation 2"**

9. **Créer une conversation** nommée "Bob Conversation 1"
10. **Envoyer un message** : "Bonjour, je suis Bob"

11. **Vérifier logs:**
    ```
    [conversationBridge] Creating conversation with userId: user_<nouveau_timestamp>
    [ConversationService] Created gemini conversation <conv_id> with userId=user_<nouveau_timestamp>
    ```

### Résultats Attendus

- ✅ Nouveau userId généré (différent d'Alice)
- ✅ Liste de conversations vide au démarrage
- ✅ Bob ne voit AUCUNE conversation d'Alice
- ✅ Bob peut créer ses propres conversations
- ✅ Isolation complète entre Alice et Bob

### Vérification Base de Données (Après Nettoyage)

```sql
-- Compter TOUS les utilisateurs distincts
SELECT DISTINCT user_id FROM conversations;
-- Attendu: 1 ligne avec "user_<timestamp_bob>"
-- (Alice a été effacée par Clean-UserData.ps1)

-- Compter les conversations de Bob
SELECT COUNT(*) FROM conversations WHERE user_id = 'user_<timestamp_bob>';
-- Attendu: 1

-- Vérifier qu'aucune conversation d'Alice n'existe
SELECT COUNT(*) FROM conversations WHERE user_id LIKE 'user_%' AND user_id != 'user_<timestamp_bob>';
-- Attendu: 0 (base propre après nettoyage)
```

---

## Test 4: Sans Nettoyage - Credentials Persistent (Scénario d'Erreur)

⚠️ **Ce test démontre pourquoi Clean-UserData.ps1 est nécessaire entre comptes**

### Étapes

1. **Logout d'Alice** (Test 1)

2. **NE PAS exécuter Clean-UserData.ps1**

3. **Tenter de se connecter avec:**
   - Username: `bob@example.com`
   - Password: `Bob456`

4. **Résultat attendu:**
   - ❌ **Login échoue avec "Identifiants incorrects"**
   
5. **Raison:**
   ```javascript
   // localStorage contient toujours:
   localStorage.getItem('eaudit_credentials')
   // {"username":"alice@example.com","password":"Alice123","userId":"user_<timestamp_alice>"}
   
   // AuthContext compare:
   // Entrée: bob@example.com / Bob456
   // Stocké: alice@example.com / Alice123
   // Résultat: Mismatch → Login refusé
   ```

6. **Solution:**
   - Exécuter `.\scripts\Clean-UserData.ps1`
   - OU implémenter un vrai système multi-comptes avec switch

### Résultats Attendus

- ❌ Login échoue (comportement attendu)
- ✅ Démontre que l'isolation fonctionne (pas de création accidentelle de compte)

---

## Test 5: Vérification Logs Backend

### Étapes

1. **Ouvrir DevTools** → Console
2. **Filtrer les logs** par `[conversationBridge]`, `[ConversationService]`, `[Database]`
3. **Créer une conversation** avec Alice connectée
4. **Rechercher dans les logs:**

### Logs Attendus

```
[AuthContext] Desktop login successful for user: user_1738838400000
[conversationBridge] Creating conversation with userId: user_1738838400000
[ConversationService] Created gemini conversation conv_abc123 with userId=user_1738838400000
```

### Logs Interdits (Ne Devraient PAS Apparaître)

```
❌ [Database] createConversation called without userId
❌ [Database] findChannelConversation called without userId
❌ [Database] updateChannelConversationModel called without userId
```

**Si ces logs apparaissent:**
- ❌ Un appel IPC ne passe pas le userId
- ❌ L'isolation est cassée pour cet appel
- 🔧 Trouver l'appel manquant et ajouter `userId: getCurrentUserId()`

---

## Test 6: Health Check (Model Test)

### Étapes

1. **Connecté en tant qu'Alice**
2. **Aller dans Settings** → Models
3. **Cliquer sur "Test" pour un modèle**
4. **Vérifier logs:**
   ```
   [conversationBridge] Creating conversation with userId: user_<timestamp_alice>
   [ConversationService] Created gemini conversation [Health Check] <platform> - <model> with userId=user_<timestamp_alice>
   ```

5. **Attendre fin du test**
6. **Vérifier que la conversation health check est liée à Alice:**

```sql
SELECT id, user_id, name FROM conversations WHERE name LIKE '[Health Check]%';
-- Attendu: user_id = user_<timestamp_alice>
```

### Résultats Attendus

- ✅ Health check crée une conversation temporaire
- ✅ Cette conversation est liée au userId d'Alice
- ✅ Bob ne verra pas les health checks d'Alice

---

## Test 7: Switch Agent (AgentSetupCard)

### Étapes

1. **Connecté en tant qu'Alice**
2. **Créer une conversation Gemini**
3. **Cliquer sur "Switch Agent"** (si disponible dans l'UI)
4. **Sélectionner un autre agent** (ex: ACP/Claude)
5. **Vérifier logs:**
   ```
   [conversationBridge] Creating conversation with userId: user_<timestamp_alice>
   [ConversationService] Created acp conversation <conv_id> with userId=user_<timestamp_alice>
   ```

6. **Vérifier que la nouvelle conversation apparaît dans la liste d'Alice**

### Résultats Attendus

- ✅ Switch agent crée une nouvelle conversation
- ✅ Cette conversation est liée au userId d'Alice
- ✅ Bob ne verra pas cette conversation

---

## Récapitulatif des Tests

| Test | Objectif | Statut |
|------|----------|--------|
| Test 1 | Création compte Alice + 2 conversations | ⏳ À tester |
| Test 2 | Reconnexion Alice + récupération données | ⏳ À tester |
| Test 3 | Création compte Bob + isolation | ⏳ À tester |
| Test 4 | Credentials persistent sans nettoyage | ⏳ À tester |
| Test 5 | Vérification logs backend | ⏳ À tester |
| Test 6 | Health check avec userId | ⏳ À tester |
| Test 7 | Switch agent avec userId | ⏳ À tester |

---

## Checklist Finale

### Fonctionnalités Validées

- [ ] Page de login apparaît au démarrage
- [ ] Génération d'un userId unique à chaque nouveau compte
- [ ] Récupération du userId existant à la reconnexion
- [ ] window.__currentUserId exposé après login
- [ ] window.__currentUserId supprimé après logout
- [ ] Conversations créées avec userId correct
- [ ] Messages persistés sous le bon userId
- [ ] Liste conversations filtrée par userId
- [ ] Isolation complète entre comptes (Bob ne voit pas Alice)
- [ ] Logs backend confirment transmission du userId
- [ ] Health checks liés au userId
- [ ] Switch agent lie au userId

### Erreurs Connues (Attendues)

- [ ] ⚠️ Login échoue sans Clean-UserData.ps1 entre comptes (comportement normal)
- [ ] ⚠️ Conversations existantes (`system_default_user`) non migrées automatiquement

---

## En Cas d'Échec

### Symptôme: Bob voit les conversations d'Alice

**Diagnostic:**
```sql
-- Vérifier les user_id en base
SELECT id, user_id, name FROM conversations ORDER BY created_at DESC;

-- Si user_id identique pour Alice et Bob:
-- ❌ L'isolation est cassée
```

**Solutions:**
1. Vérifier que `window.__currentUserId` est différent pour Alice et Bob
2. Vérifier les logs backend : `userId` doit être transmis
3. Vérifier `getCurrentUserId()` retourne bien le bon userId
4. Exécuter Clean-UserData.ps1 et recommencer les tests

---

### Symptôme: [Database] createConversation called without userId

**Diagnostic:**
- ❌ Un appel IPC ne passe pas le userId

**Solutions:**
1. Identifier l'appel manquant dans les logs
2. Trouver le fichier renderer correspondant
3. Ajouter :
   ```typescript
   import { getCurrentUserId } from '@/renderer/utils/auth';
   
   const userId = getCurrentUserId();
   
   await ipcBridge.conversation.create.invoke({
     // ... params existants
     userId, // ✅ Ajouter cette ligne
   });
   ```

---

### Symptôme: userId undefined dans logs backend

**Diagnostic:**
```
[conversationBridge] Creating conversation with userId: undefined
```
- ❌ `getCurrentUserId()` retourne undefined
- ❌ `window.__currentUserId` n'est pas défini

**Solutions:**
1. Vérifier dans DevTools Console :
   ```javascript
   window.__currentUserId
   ```
2. Si undefined, vérifier AuthContext :
   - Login réussi ?
   - `(window as any).__currentUserId = userId;` exécuté ?
3. Vérifier localStorage :
   ```javascript
   localStorage.getItem('eaudit_user_id')
   ```

---

## Commandes Utiles

### Nettoyage Base de Données
```powershell
.\scripts\Clean-UserData.ps1
```

### Redémarrer Application
```powershell
npm run start:mem
```

### Vérifier Base de Données (DevTools Console)
```javascript
// Via IPC (si bridge exposé)
await ipcBridge.database.getUserConversations.invoke({})

// Sinon, utiliser un outil SQLite externe :
// C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db
```

### Vérifier localStorage
```javascript
Object.keys(localStorage).filter(k => k.startsWith('eaudit_')).map(k => ({ [k]: localStorage.getItem(k) }))
```

---

**Statut Tests:** ⏳ **EN ATTENTE DE COMPILATION ET EXECUTION**

