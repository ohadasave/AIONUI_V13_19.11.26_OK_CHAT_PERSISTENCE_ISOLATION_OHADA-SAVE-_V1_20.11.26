# Créer un Nouveau Compte — Guide Rapide

**Date:** 2 février 2025  
**Problème résolu:** "Identifiants incorrects" lors de la création d'un nouveau compte

---

## 🎯 Problème

Vous avez essayé de créer un compte avec `DALLE / LEADER00` mais vous recevez le message :

```
❌ Identifiants incorrects
```

### Pourquoi ?

Le système vérifie les credentials contre ceux déjà stockés dans `localStorage.eaudit_credentials`. Si un compte existe déjà (par exemple `ohada.save@gmail.com`), le système essaie de valider vos nouveaux identifiants contre les anciens, ce qui échoue.

---

## ✅ Solution Rapide (2 méthodes)

### Méthode 1 : Nettoyage localStorage (Recommandé)

**Temps:** 30 secondes

1. **Ouvrir DevTools** dans l'application (F12)

2. **Aller dans Console**

3. **Copier-coller ces commandes:**

```javascript
// Supprimer les credentials existants
localStorage.removeItem('eaudit_credentials')
localStorage.removeItem('eaudit_user_id')
localStorage.removeItem('eaudit_logged_in')
localStorage.removeItem('eaudit_login_time')
localStorage.removeItem('eaudit_username')

// Vérifier nettoyage (doit retourner null)
localStorage.getItem('eaudit_credentials')
```

4. **Recharger la page:** `Ctrl + R`

5. **Se connecter avec:**
   - Username: `DALLE`
   - Password: `LEADER00`

6. ✅ **Nouveau compte créé !**
   - Un nouveau `userId` unique sera généré (ex: `user_1738850000000`)
   - Vous verrez une liste de conversations vide (isolation complète)

---

### Méthode 2 : Script PowerShell

**Temps:** 10 secondes

1. **Ouvrir PowerShell** dans le dossier du projet

2. **Exécuter:**

```powershell
.\scripts\Create-NewAccount.ps1 -Username "DALLE"
```

3. **Suivre les instructions affichées**

---

### Méthode 3 : Clean-UserData.ps1 (Supprime aussi la DB)

**⚠️ ATTENTION:** Cette méthode supprime **TOUTES les données** (localStorage + base de données).

**Temps:** 20 secondes

```powershell
.\scripts\Clean-UserData.ps1
```

Ensuite, redémarrer l'application et se connecter avec `DALLE / LEADER00`.

---

## 🔍 Explication Technique

### Architecture de Validation Actuelle

```typescript
// src/renderer/context/AuthContext.tsx (ligne ~170)

const login = async ({ username, password }) => {
  // Récupérer credentials stockés
  const storedCredentials = localStorage.getItem('eaudit_credentials');
  
  if (storedCredentials) {
    // Reconnexion: valider contre credentials existants
    const { username: stored, password: storedPwd, userId } = JSON.parse(storedCredentials);
    
    if (username !== stored || password !== storedPwd) {
      return { success: false, message: 'Identifiants incorrects' }; // ❌ ERREUR ICI
    }
    
    userId = userId; // Réutiliser userId existant
  } else {
    // Premier login: créer nouveau userId
    userId = `user_${Date.now()}`; // ✅ NOUVEAU COMPTE
    localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password, userId }));
  }
  
  // Suite du login...
};
```

### Pourquoi Ce Design ?

**Objectif:** Empêcher la création de multiples comptes avec des identifiants différents sur le même appareil.

**Scénario prévu:**
1. Alice se connecte avec `alice@example.com / Alice123` → userId créé
2. Alice se déconnecte
3. Alice se reconnecte avec `alice@example.com / Alice123` → userId récupéré ✅

**Scénario non prévu (votre cas):**
1. Alice se connecte avec `alice@example.com / Alice123` → userId créé
2. Alice se déconnecte
3. Bob essaie de créer un compte avec `DALLE / LEADER00` → ❌ Validation échoue car credentials différents

### Solution Actuelle vs Future

**Solution Actuelle (implémentée):**
- Un seul compte par appareil Desktop
- Pour changer de compte: nettoyer localStorage
- Simple mais limitant

**Solution Future (à implémenter):**
- Système multi-comptes avec switch dans l'UI
- localStorage.eaudit_accounts = [{ username, userId }, ...]
- Dropdown pour sélectionner le compte actif
- Pas besoin de nettoyer localStorage

---

## 🧪 Vérifications Après Création

### 1. Vérifier localStorage

**Dans DevTools Console:**

```javascript
// Doit retourner vos nouveaux credentials
localStorage.getItem('eaudit_credentials')
// {"username":"DALLE","password":"LEADER00","userId":"user_1738850000000"}

// Doit retourner votre nouveau userId
localStorage.getItem('eaudit_user_id')
// "user_1738850000000"

// Doit être exposé globalement
window.__currentUserId
// "user_1738850000000"
```

### 2. Vérifier Base de Données

**SQL (via SQLite externe):**

```sql
-- Ouvrir: C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db

-- Compter les utilisateurs distincts
SELECT DISTINCT user_id FROM conversations;
-- Doit retourner: user_1738850000000 (DALLE)

-- Vérifier conversations de DALLE (doit être vide si nouveau compte)
SELECT COUNT(*) FROM conversations WHERE user_id = 'user_1738850000000';
-- Doit retourner: 0
```

### 3. Vérifier Isolation

**Test:**
1. Créer une conversation avec le compte DALLE
2. Vérifier qu'elle est visible dans la liste
3. Se déconnecter (bouton "Déconnexion" dans sider)
4. Nettoyer localStorage avec Méthode 1
5. Se connecter avec un autre compte (ex: `BOB / Bob123`)
6. ✅ Vérifier que Bob ne voit PAS la conversation de DALLE

---

## 📋 Scripts Disponibles

### 1. Create-NewAccount.ps1 (NOUVEAU)

**Usage:**
```powershell
.\scripts\Create-NewAccount.ps1 -Username "DALLE"
```

**Ce qu'il fait:**
- Affiche les instructions pour nettoyer localStorage
- Pas de suppression automatique (sécurité)
- Guide étape par étape

### 2. Clean-UserData.ps1

**Usage:**
```powershell
.\scripts\Clean-UserData.ps1
```

**Ce qu'il fait:**
- Supprime localStorage (tous les comptes)
- Supprime base de données (toutes les conversations)
- Crée une backup de la DB
- ⚠️ Irréversible (sauf backup)

---

## 🚀 Workflow Recommandé

### Scénario 1: Tester Plusieurs Comptes

**Objectif:** Créer Alice, Bob, Charlie et vérifier l'isolation

```
1. Clean-UserData.ps1
2. Start app → Login: alice@example.com / Alice123
3. Créer 2 conversations (Alice)
4. Logout (bouton dans sider)
5. Clean localStorage (Méthode 1)
6. Reload → Login: bob@example.com / Bob456
7. Vérifier: Liste vide ✅ (Bob ne voit pas Alice)
8. Créer 1 conversation (Bob)
9. Logout
10. Clean localStorage
11. Reload → Login: charlie@example.com / Charlie789
12. Vérifier: Liste vide ✅
```

### Scénario 2: Développement Quotidien

**Objectif:** Un seul compte de développement

```
1. Clean-UserData.ps1 (une seule fois)
2. Start app → Login: dev@example.com / Dev123
3. Travailler normalement
4. Logout → Reconnexion: dev@example.com / Dev123 ✅
   (pas besoin de Clean-UserData.ps1, credentials conservés)
```

### Scénario 3: Démo Client

**Objectif:** Compte propre pour démonstration

```
1. Clean-UserData.ps1
2. Start app → Login: demo@client.com / Demo2025
3. Créer conversations de démo
4. Présenter au client
5. Fin démo: Clean-UserData.ps1
6. Recommencer pour prochain client
```

---

## ⚠️ Limitations Connues

### 1. Un Seul Compte Desktop Sans Nettoyage

**Problème:** 
- Impossible de créer un 2ème compte sans nettoyer localStorage
- Erreur "Identifiants incorrects" si credentials différents

**Solution Actuelle:**
- Nettoyer localStorage (Méthode 1) avant chaque nouveau compte

**Solution Future:**
- Système multi-comptes avec switch UI (à implémenter)

### 2. Credentials Conservés au Logout

**Problème:**
- `localStorage.eaudit_credentials` conservé après logout
- Reconnexion automatique avec les mêmes identifiants

**Raison:**
- By design, pour faciliter la reconnexion
- Évite de ressaisir username/password à chaque fois

**Solution Future:**
- Option "Se souvenir de moi" sur login page
- Si décoché: supprime credentials au logout

### 3. Pas de Migration Automatique

**Problème:**
- Comptes existants avant v18 restent sur `'system_default_user'`

**Solution:**
- Migration manuelle SQL (voir documentation v18)

---

## 🎓 Bonnes Pratiques

### Pour Développeurs

1. **Nettoyer régulièrement** — `Clean-UserData.ps1` chaque semaine
2. **Un compte par machine** — Éviter de multiplier les comptes de test
3. **Documenter les credentials** — Noter username/password dans un fichier sécurisé
4. **Backup avant Clean** — Le script crée une backup automatique

### Pour Testeurs

1. **Scénarios isolés** — Nettoyer entre chaque test multi-compte
2. **Logs de vérification** — Ouvrir DevTools, vérifier localStorage et userId
3. **SQL checks** — Vérifier base de données avec SQLite Browser
4. **Documentation** — Noter les résultats de chaque test

---

## 📞 Support

### Problème: "Identifiants incorrects" persiste

**Diagnostic:**
```javascript
// Dans DevTools Console
localStorage.getItem('eaudit_credentials')
// Si retourne un objet, des credentials existent
```

**Solution:**
```javascript
localStorage.removeItem('eaudit_credentials')
location.reload()
```

### Problème: userId ne change pas entre comptes

**Diagnostic:**
```javascript
window.__currentUserId
localStorage.getItem('eaudit_user_id')
```

**Solution:**
```powershell
.\scripts\Clean-UserData.ps1
```

### Problème: Conversations de l'ancien compte visibles

**Diagnostic:**
```sql
SELECT DISTINCT user_id FROM conversations;
```

**Solution:**
Si plusieurs `user_id` identiques, l'isolation est cassée. Vérifier logs:
```
[conversationBridge] Creating conversation with userId: ???
```

---

## ✅ Résumé

**Problème initial:**
```
❌ Connexion avec DALLE / LEADER00 → "Identifiants incorrects"
```

**Solution:**
```
✅ Nettoyer localStorage (Méthode 1) → Reload → Login DALLE / LEADER00 → Nouveau compte créé
```

**Commande rapide:**
```powershell
.\scripts\Create-NewAccount.ps1 -Username "DALLE"
# Suivre instructions affichées
```

---

**Date:** 2 février 2025  
**Version:** v18.1  
**Status:** ✅ **RÉSOLU**

