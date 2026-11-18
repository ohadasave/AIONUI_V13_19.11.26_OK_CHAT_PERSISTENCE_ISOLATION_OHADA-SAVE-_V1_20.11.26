# Test de Persistance par Utilisateur

**Date** : 2026-11-18  
**Objectif** : Tester si la sélection d'agent n8n persiste **par utilisateur** et non globalement  
**Login activé** : ✅ OUI (`security.loginEnabled: true`)

---

## 🎯 Objectif du test

Vérifier que la configuration `guid.lastSelectedAgent` est :
- ✅ **Isolée par utilisateur** (User A sélectionne Claude, User B sélectionne n8n)
- ❌ **PAS globale** (tous les users partagent la même sélection)

---

## 🔧 Configuration actuelle

### Login activé

```json
// C:\Users\LEADER\AppData\Roaming\E-audit\config.json
{
  "security.loginEnabled": true
}
```

**Identifiants par défaut (mode desktop)** :
- Username: `admin`
- Password: `admin`

### Architecture de persistance

**ConfigStorage** utilise actuellement :
- **localStorage** (côté renderer)
- **Fichier JSON global** (côté main process)

**Question clé** : Est-ce que ConfigStorage est **déjà isolé par utilisateur** ?

---

## 📋 Procédure de test

### Préparation : Créer 2 utilisateurs

#### Utilisateur 1 : Admin (existant)

- Username: `admin`
- Password: `admin` (défaut desktop)
- Rôle: admin

#### Utilisateur 2 : Test User (à créer)

**Création** :
1. Se connecter avec `admin` / `admin`
2. Aller dans **Settings** > **Admin** (ou **Security**)
3. Créer un nouvel utilisateur :
   - Username: `testuser`
   - Password: `test123`
   - Rôle: user

---

### Test 1 : Persistance admin

**Étapes** :
1. Se connecter avec `admin` / `admin`
2. Naviguer vers `/guid`
3. Sélectionner **"Claude 3.5 Sonnet"** (ou un autre agent)
4. **Se déconnecter** (logout)

**Vérification** :
```powershell
# Vérifier config.json
Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json
```

**Attendu** :
```json
{
  "security.loginEnabled": true,
  "guid.lastSelectedAgent": "claude" 
}
```

---

### Test 2 : Persistance testuser

**Étapes** :
1. Se connecter avec `testuser` / `test123`
2. Naviguer vers `/guid`
3. Observer : **Quel agent est sélectionné ?**
   - Si **Claude** → ❌ Config globale (problème)
   - Si **n8n** (default) → ✅ Config isolée par user
4. Sélectionner **"Gemini 2.0 Flash"**
5. **Se déconnecter**

---

### Test 3 : Vérification isolation

**Étapes** :
1. Se reconnecter avec `admin` / `admin`
2. Naviguer vers `/guid`
3. Observer : **Quel agent est sélectionné ?**
   - Si **Claude** (de Test 1) → ✅ Config isolée
   - Si **Gemini** (de Test 2) → ❌ Config globale (écrasée)

---

## 🔍 Analyse attendue

### Scénario A : Config déjà isolée par user ✅

**Indices** :
- Chaque user voit son propre agent sélectionné
- Se déconnecter/reconnecter restaure la préférence personnelle

**Explication technique** :
- ConfigStorage utilise peut-être `user.id` dans la clé
- Exemple : `user.${userId}.guid.lastSelectedAgent`

**Action** : ✅ Rien à faire, fonctionne comme attendu

### Scénario B : Config globale (tous les users partagent) ❌

**Indices** :
- User B voit l'agent sélectionné par User A
- Dernier user à sélectionner un agent écrase pour tout le monde

**Explication technique** :
- ConfigStorage utilise une clé globale : `guid.lastSelectedAgent`
- Pas d'isolation par user

**Action** : Modifier ConfigStorage pour ajouter `userId` dans les clés

---

## 🛠️ Solution si config globale

### Modification de ConfigStorage

**Principe** : Préfixer les clés sensibles avec l'ID utilisateur

#### Option 1 : Wrapper dans le hook

```typescript
// src/renderer/pages/guid/hooks/useGuidAgentSelection.ts

// ❌ AVANT
const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');

// ✅ APRÈS
const userId = user?.id || 'anonymous';
const rawKey = await ConfigStorage.get(`user.${userId}.guid.lastSelectedAgent`);
```

**Avantage** : Simple, pas besoin de modifier ConfigStorage  
**Inconvénient** : À faire dans chaque hook qui utilise ConfigStorage

#### Option 2 : Modifier ConfigStorage centralisé

```typescript
// src/common/storage.ts

export class ConfigStorage {
  private static currentUserId: string | null = null;

  static setUserId(userId: string) {
    this.currentUserId = userId;
  }

  static async get<K extends keyof StorageSchema>(key: K) {
    // Clés sensibles à préfixer avec userId
    const userSpecificKeys = ['guid.lastSelectedAgent', 'acp.config', ...];
    
    let effectiveKey = key;
    if (this.currentUserId && userSpecificKeys.includes(key)) {
      effectiveKey = `user.${this.currentUserId}.${key}`;
    }
    
    // ... reste du code
  }
}
```

**Avantage** : Centralisé, transparent pour les consommateurs  
**Inconvénient** : Plus complexe, nécessite `setUserId()` au login

---

## 📊 Checklist de validation

| Test | Résultat attendu | Statut |
|------|------------------|--------|
| Login admin | ✅ Connexion réussie | [ ] |
| Sélection Claude (admin) | ✅ Persisté pour admin | [ ] |
| Login testuser | ✅ Connexion réussie | [ ] |
| Agent par défaut (testuser) | ✅ n8n ou default (pas Claude) | [ ] |
| Sélection Gemini (testuser) | ✅ Persisté pour testuser | [ ] |
| Reconnexion admin | ✅ Claude toujours sélectionné | [ ] |
| Reconnexion testuser | ✅ Gemini toujours sélectionné | [ ] |

**SUCCÈS** : 7/7 tests passent → Config isolée par user ✅

**ÉCHEC** : Un test échoue → Config globale → Modifier ConfigStorage

---

## 🚀 Étapes suivantes

### Si config isolée ✅

1. ✅ Confirmer que la persistance par user fonctionne
2. Documenter ce comportement dans AGENTS.md
3. Passer aux tests de validation du correctif race condition

### Si config globale ❌

1. Choisir Option 1 (quick fix) ou Option 2 (solution robuste)
2. Implémenter la modification
3. Retester avec 2 users
4. Commit avec message approprié

---

## 📝 Logs de diagnostic

### Vérifier config.json en live

```powershell
# PowerShell
Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json | Format-List
```

### Vérifier localStorage (DevTools)

```javascript
// Dans DevTools Console (F12)
console.log('All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`${key}: ${localStorage.getItem(key)}`);
}

// Chercher spécifiquement
console.log('guid.lastSelectedAgent:', localStorage.getItem('guid.lastSelectedAgent'));
```

### Vérifier base de données (users table)

```powershell
# PowerShell - Inspecter la DB
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db" "SELECT * FROM users;"
```

---

## 🔗 Relation avec problème n8n

### Impact sur le correctif race condition

**Bonne nouvelle** : Les 2 problèmes sont **indépendants**

| Problème | Scope | Impact |
|----------|-------|--------|
| Race condition availableAgents | Timing (IPC) | Affecte tous les users |
| Persistance par user | Isolation données | Affecte multi-user uniquement |

**Test prioritaire** : Validation race condition (Test 1-4 du document précédent)  
**Test secondaire** : Isolation par user (ce document)

---

**Statut** : 🟢 LOGIN ACTIVÉ - PRÊT POUR LES TESTS  
**Action immédiate** : Redémarrer l'application et se connecter
