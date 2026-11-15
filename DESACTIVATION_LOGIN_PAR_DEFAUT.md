# Désactivation du Login par Défaut - Documentation

## Vue d'ensemble

Ce document décrit les modifications apportées pour désactiver la page de login par défaut et corriger le système d'authentification en mode desktop.

## Problèmes Résolus

### 1. Login activé par défaut

**Avant** : L'application affichait toujours la page de login au démarrage, même quand l'option n'était pas activée dans les paramètres.

**Après** : Le login est désactivé par défaut. L'application s'ouvre directement sans écran de connexion.

### 2. Impossibilité de se reconnecter

**Avant** : Après création d'un compte, impossible de se reconnecter avec les mêmes credentials. L'erreur "username incorrect" s'affichait systématiquement.

**Après** : Le système stocke les credentials lors de la première connexion et les valide lors des reconnexions.

## Modifications Effectuées

### 1. Fichier `src/common/storage.ts`

Ajout de la clé `security.loginEnabled` dans l'interface `IConfigStorageRefer` :

```typescript
// Security: Login enabled flag / Sécurité: Activation de la page de connexion
'security.loginEnabled'?: boolean;
```

**Type** : `boolean` optionnel  
**Valeur par défaut** : `undefined` (interprété comme `false`)  
**Comportement** :

- `undefined` ou `false` → Login désactivé, authentification automatique
- `true` → Login activé, page de connexion requise

### 2. Fichier `src/renderer/context/AuthContext.tsx`

#### A. Méthode `refresh()` - Vérification de `loginEnabled`

La méthode vérifie désormais si le login est activé avant de décider du comportement :

```typescript
const loginEnabled = await ConfigStorage.get('security.loginEnabled');

if (loginEnabled === false || loginEnabled === undefined) {
  // Login désactivé : authentification automatique
  console.log('[AuthContext] Desktop mode - login disabled, auto-authenticating');
  setUser({ id: 'desktop-user', username: 'local' });
  setStatus('authenticated');
  setReady(true);
  return;
}
```

**Flux d'authentification** :

1. **Login désactivé** (`loginEnabled === false` ou `undefined`)
   - Authentification automatique
   - Utilisateur : `{ id: 'desktop-user', username: 'local' }`
   - Aucune page de login affichée

2. **Login activé** (`loginEnabled === true`)
   - Vérification de la session existante dans `localStorage`
   - Session valide (< 24h) → connexion automatique
   - Session expirée ou inexistante → page de login requise

#### B. Méthode `login()` - Stockage et validation des credentials

La méthode gère maintenant deux cas distincts :

**Première connexion** : Aucun credential stocké

```typescript
if (!storedCredentials) {
  // First login: store credentials
  localStorage.setItem('eaudit_credentials', JSON.stringify({ username, password }));
}
```

**Reconnexion** : Validation des credentials

```typescript
if (storedCredentials) {
  // Reconnection: validate credentials
  const { username: storedUsername, password: storedPassword } = JSON.parse(storedCredentials);

  if (username !== storedUsername || password !== storedPassword) {
    return {
      success: false,
      message: 'Identifiants incorrects',
      code: 'invalidCredentials',
    };
  }
}
```

#### C. Méthode `logout()` - Conservation des credentials

Lors de la déconnexion, les credentials sont **conservés** pour permettre la reconnexion :

```typescript
localStorage.removeItem('eaudit_logged_in');
localStorage.removeItem('eaudit_login_time');
localStorage.removeItem('eaudit_username');
// Note: on ne supprime PAS eaudit_credentials pour permettre la reconnexion
```

## Valeurs Stockées dans localStorage

### 1. `eaudit_credentials` (nouveau)

**Format** : JSON `{ username: string, password: string }`  
**Création** : Lors de la première connexion  
**Suppression** : Jamais (sauf erreur de parsing)  
**Usage** : Validation des reconnexions

### 2. `eaudit_logged_in`

**Format** : `"true"` ou absent  
**Création** : Lors de la connexion réussie  
**Suppression** : Lors de la déconnexion ou expiration  
**Usage** : Indicateur de session active

### 3. `eaudit_login_time`

**Format** : Timestamp en millisecondes (string)  
**Création** : Lors de la connexion réussie  
**Suppression** : Lors de la déconnexion ou expiration  
**Usage** : Calcul de la validité de la session (24h)

### 4. `eaudit_username`

**Format** : String  
**Création** : Lors de la connexion réussie  
**Suppression** : Lors de la déconnexion ou expiration  
**Usage** : Affichage du nom d'utilisateur dans l'interface

## Logique de Fonctionnement

### Scénario 1 : Premier démarrage (login désactivé par défaut)

1. Application démarre
2. `refresh()` vérifie `security.loginEnabled` → `undefined`
3. Authentification automatique avec `username: 'local'`
4. Application s'ouvre directement

### Scénario 2 : Activation du login dans les paramètres

1. Utilisateur active "Écran de connexion" dans Paramètres > Sécurité
2. `security.loginEnabled` est défini à `true` dans `ConfigStorage`
3. Au prochain démarrage, `refresh()` détecte `loginEnabled === true`
4. Page de login s'affiche

### Scénario 3 : Première connexion avec login activé

1. Utilisateur entre `username: "SEKA"` et `password: "LEADER00"`
2. `login()` ne trouve pas `eaudit_credentials`
3. Stockage des credentials : `{ username: "SEKA", password: "LEADER00" }`
4. Stockage de la session (logged_in, login_time, username)
5. Authentification réussie

### Scénario 4 : Reconnexion avec credentials valides

1. Utilisateur se déconnecte (credentials conservés)
2. Page de login s'affiche
3. Utilisateur entre `username: "SEKA"` et `password: "LEADER00"`
4. `login()` compare avec `eaudit_credentials` → match
5. Authentification réussie

### Scénario 5 : Reconnexion avec mauvais password

1. Utilisateur entre `username: "SEKA"` et `password: "WRONGPASS"`
2. `login()` compare avec `eaudit_credentials` → mismatch
3. Retour d'erreur : `{ success: false, message: 'Identifiants incorrects' }`
4. Authentification refusée

### Scénario 6 : Session expirée (> 24h)

1. Application démarre après 24h d'inactivité
2. `refresh()` calcule le temps écoulé depuis `eaudit_login_time`
3. Session expirée → suppression de `logged_in`, `login_time`, `username`
4. Credentials conservés → reconnexion possible
5. Page de login s'affiche

## Tests à Effectuer

### Test 1 : Login désactivé par défaut

1. Lancer l'application pour la première fois
2. **Résultat attendu** : Application s'ouvre directement, pas de page de login

### Test 2 : Activation du login

1. Ouvrir Paramètres > Sécurité
2. Activer "Écran de connexion"
3. Redémarrer l'application
4. **Résultat attendu** : Page de login s'affiche

### Test 3 : Première connexion

1. Entrer `username: "SEKA"` et `password: "LEADER00"`
2. Cliquer sur "Se connecter"
3. **Résultat attendu** : Connexion réussie, application s'ouvre

### Test 4 : Déconnexion

1. Se déconnecter depuis l'interface
2. **Résultat attendu** : Retour à la page de login

### Test 5 : Reconnexion avec credentials valides

1. Entrer `username: "SEKA"` et `password: "LEADER00"` (mêmes credentials)
2. Cliquer sur "Se connecter"
3. **Résultat attendu** : Connexion réussie

### Test 6 : Reconnexion avec mauvais password

1. Entrer `username: "SEKA"` et `password: "WRONGPASS"`
2. Cliquer sur "Se connecter"
3. **Résultat attendu** : Message d'erreur "Identifiants incorrects"

### Test 7 : Désactivation du login

1. Dans Paramètres > Sécurité, désactiver "Écran de connexion"
2. Redémarrer l'application
3. **Résultat attendu** : Application s'ouvre directement, pas de page de login

### Test 8 : Session persistante (< 24h)

1. Se connecter
2. Redémarrer l'application dans les 24h
3. **Résultat attendu** : Connexion automatique, pas de page de login

### Test 9 : Session expirée (> 24h)

1. Se connecter
2. Modifier manuellement `eaudit_login_time` dans localStorage (mettre un timestamp vieux de 25h)
3. Redémarrer l'application
4. **Résultat attendu** : Page de login s'affiche, mais reconnexion possible avec credentials

## Sécurité

### Stockage des credentials en clair

⚠️ **Note importante** : Les credentials sont stockés en clair dans `localStorage` car :

1. **Mode desktop uniquement** : Ce système est conçu pour le mode desktop, pas WebUI
2. **Pas de transmission réseau** : Les credentials ne sont jamais envoyés sur le réseau
3. **Protection locale** : `localStorage` est protégé par les permissions du système d'exploitation
4. **Pas de multi-utilisateurs** : Application desktop mono-utilisateur

### Recommandations

- Ne pas réutiliser le même password pour d'autres services
- Ce système est adapté pour un environnement desktop personnel
- Pour un environnement partagé, activer le login et verrouiller la session Windows

## Compatibilité

- ✅ Mode desktop (Electron)
- ✅ Mode WebUI (non affecté par ces changements)
- ✅ Rétrocompatibilité : les anciennes sessions sans credentials continuent de fonctionner

## Fichiers Modifiés

1. `src/common/storage.ts` - Ajout de la clé `security.loginEnabled`
2. `src/renderer/context/AuthContext.tsx` - Logique d'authentification mise à jour

## Commandes Exécutées

```bash
# Formatage du code
bun run lint:fix

# Vérification des types
bunx tsc --noEmit

# Commit
git add src/common/storage.ts src/renderer/context/AuthContext.tsx DESACTIVATION_LOGIN_PAR_DEFAUT.md
git commit -m "fix(auth): disable login by default and fix credential validation"
```

## Références

- Interface utilisateur du login : `src/renderer/pages/login/LoginPage.tsx`
- Paramètres de sécurité : `src/renderer/pages/settings/SecuritySettings.tsx`
- Documentation du problème : `Doc_login_page/DIAGNOSTIC_PROBLEME_ACTUEL.md`
