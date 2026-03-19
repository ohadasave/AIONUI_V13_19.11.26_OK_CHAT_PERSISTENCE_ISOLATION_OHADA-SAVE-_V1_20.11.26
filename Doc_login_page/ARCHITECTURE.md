# Architecture - Système de Connexion E-audit

## Vue d'Ensemble

Le système de connexion E-audit est conçu pour fonctionner en mode desktop (Electron) avec une architecture basée sur React Context API et localStorage pour la persistance.

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     Application E-audit                      │
│                        (Electron)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    AuthProvider                        │  │
│  │  (Context API - Gestion globale de l'authentification)│  │
│  │                                                        │  │
│  │  State:                                                │  │
│  │  - user: AuthUser | null                              │  │
│  │  - status: 'checking' | 'authenticated' | 'unauth'    │  │
│  │  - ready: boolean                                      │  │
│  │                                                        │  │
│  │  Methods:                                              │  │
│  │  - login(username, password)                          │  │
│  │  - logout()                                            │  │
│  │  - refresh()                                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│              ┌───────────────┼───────────────┐              │
│              ▼               ▼               ▼              │
│      ┌──────────────┐ ┌──────────┐ ┌─────────────────┐     │
│      │   Router     │ │LoginPage │ │SecuritySettings │     │
│      │(Protection)  │ │          │ │                 │     │
│      └──────────────┘ └──────────┘ └─────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      localStorage                            │
│  - eaudit_logged_in: 'true' | null                          │
│  - eaudit_login_time: timestamp                             │
│  - eaudit_username: string                                  │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Composants Principaux

### 1. AuthContext (src/renderer/context/AuthContext.tsx)

**Responsabilités**:
- Gestion de l'état d'authentification global
- Vérification de session au démarrage
- Validation de session (24h)
- Persistance dans localStorage
- Fourniture des méthodes login/logout

**État**:
```typescript
type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface AuthUser {
  id: string;
  username: string;
}

interface AuthContextValue {
  ready: boolean;              // Context initialisé?
  user: AuthUser | null;       // Utilisateur connecté
  status: AuthStatus;          // État d'authentification
  login: (params) => Promise;  // Méthode de connexion
  logout: () => Promise;       // Méthode de déconnexion
  refresh: () => Promise;      // Rafraîchir la session
}
```

**Flux de Démarrage**:
```
1. AuthProvider monte
2. useEffect → refresh()
3. Vérifier isDesktopRuntime
4. Lire localStorage
   ├─ eaudit_logged_in === 'true'?
   │  ├─ Oui → Vérifier timestamp
   │  │  ├─ < 24h → setStatus('authenticated')
   │  │  └─ > 24h → Nettoyer + setStatus('unauthenticated')
   │  └─ Non → setStatus('unauthenticated')
5. setReady(true)
```

### 2. Router (src/renderer/router.tsx)

**Responsabilités**:
- Routage de l'application
- Protection des routes
- Redirection login/home

**Structure**:
```typescript
<HashRouter>
  <Routes>
    {/* Route publique */}
    <Route path="/login" element={
      status === 'authenticated' 
        ? <Navigate to="/guid" /> 
        : <LoginPage />
    } />
    
    {/* Routes protégées */}
    <Route element={<ProtectedLayout />}>
      <Route path="/guid" element={<Guid />} />
      <Route path="/conversation/:id" element={<Conversation />} />
      {/* ... autres routes */}
    </Route>
  </Routes>
</HashRouter>
```

**ProtectedLayout**:
```typescript
const ProtectedLayout = ({ layout }) => {
  const { status } = useAuth();
  
  if (status === 'checking') {
    return <AppLoader />;
  }
  
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  
  return layout;
};
```

### 3. LoginPage (src/renderer/pages/login/LoginPage.tsx)

**Responsabilités**:
- Interface de connexion/inscription
- Validation des champs
- Appel de la méthode login()
- Affichage des erreurs

**Structure**:
```
┌─────────────────────────────────────┐
│          Logo E-audit               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Tabs: Se connecter | S'inscrire│ │
│  ├─────────────────────────────┤   │
│  │ [Username Input]            │   │
│  │ [Password Input]            │   │
│  │ [Confirm Password] (signup) │   │
│  │                             │   │
│  │ [Button: Se connecter]      │   │
│  └─────────────────────────────┘   │
│                                     │
│      © 2025 E-audit                 │
└─────────────────────────────────────┘
```

### 4. SecuritySettings (src/renderer/pages/settings/SecuritySettings.tsx)

**Responsabilités**:
- Activation/désactivation du login
- Configuration de sécurité
- Nettoyage de session

**Interface**:
```
┌─────────────────────────────────────┐
│ Paramètres de Sécurité              │
│                                     │
│ ☐ Activer l'écran de connexion     │
│                                     │
│ [Sauvegarder]                       │
└─────────────────────────────────────┘
```

## 🔄 Flux d'Authentification

### Flux de Connexion

```
User entre credentials
        ↓
LoginPage.handleSignIn()
        ↓
AuthContext.login({ username, password })
        ↓
Validation basique (champs non vides)
        ↓
localStorage.setItem('eaudit_logged_in', 'true')
localStorage.setItem('eaudit_login_time', Date.now())
localStorage.setItem('eaudit_username', username)
        ↓
setUser({ id: 'desktop-user', username })
setStatus('authenticated')
        ↓
Router détecte status change
        ↓
Navigate to '/guid'
```

### Flux de Déconnexion

```
User clique logout (ou session expire)
        ↓
AuthContext.logout()
        ↓
localStorage.removeItem('eaudit_logged_in')
localStorage.removeItem('eaudit_login_time')
localStorage.removeItem('eaudit_username')
        ↓
setUser(null)
setStatus('unauthenticated')
        ↓
Router détecte status change
        ↓
Navigate to '/login'
```

### Flux de Restauration de Session

```
Application démarre
        ↓
AuthProvider monte
        ↓
useEffect → refresh()
        ↓
Lire localStorage.eaudit_logged_in
        ↓
'true' trouvé?
    ↓ Oui
    Lire localStorage.eaudit_login_time
        ↓
    Calculer elapsed = now - loginTime
        ↓
    elapsed < 24h?
        ↓ Oui
        Lire localStorage.eaudit_username
            ↓
        setUser({ id: 'desktop-user', username })
        setStatus('authenticated')
        setReady(true)
            ↓
        Router → Navigate to '/guid'
        
        ↓ Non (> 24h)
        Nettoyer localStorage
        setStatus('unauthenticated')
        setReady(true)
            ↓
        Router → Navigate to '/login'
    
    ↓ Non ('true' non trouvé)
    setStatus('unauthenticated')
    setReady(true)
        ↓
    Router → Navigate to '/login'
```

## 💾 Gestion du Stockage

### localStorage Keys

| Clé | Type | Description | Durée |
|-----|------|-------------|-------|
| `eaudit_logged_in` | `'true' \| null` | État de connexion | 24h |
| `eaudit_login_time` | `string (timestamp)` | Moment de connexion | 24h |
| `eaudit_username` | `string` | Nom d'utilisateur | 24h |

### ConfigStorage Keys

| Clé | Type | Description | Persistance |
|-----|------|-------------|-------------|
| `security.loginEnabled` | `boolean` | Activation du système | Permanente |

## 🔒 Sécurité

### Niveau Actuel (MVP)

**Implémenté**:
- ✅ Validation basique des champs
- ✅ Expiration de session (24h)
- ✅ Nettoyage automatique des sessions expirées
- ✅ Protection des routes

**Non Implémenté** (TODO):
- ❌ Hash des mots de passe
- ❌ Base de données utilisateurs
- ❌ Validation côté serveur
- ❌ Rate limiting
- ❌ CSRF protection (desktop mode)
- ❌ Chiffrement localStorage

### Considérations de Sécurité

**Mode Desktop**:
- Pas de communication réseau pour l'auth
- localStorage accessible localement
- Pas de protection contre accès physique
- Adapté pour usage personnel/interne

**Recommandations pour Production**:
1. Implémenter hash bcrypt pour mots de passe
2. Utiliser SQLite pour base utilisateurs
3. Ajouter rate limiting sur tentatives
4. Chiffrer les données sensibles
5. Implémenter 2FA (optionnel)

## 🧪 Points de Test

### Tests Unitaires Recommandés

1. **AuthContext**:
   - Initialisation correcte
   - Validation de session valide
   - Expiration de session
   - Login avec credentials valides
   - Login avec credentials invalides
   - Logout

2. **Router**:
   - Redirection vers login si non authentifié
   - Redirection vers home si authentifié
   - Protection des routes

3. **LoginPage**:
   - Validation des champs
   - Affichage des erreurs
   - Soumission du formulaire
   - Navigation entre tabs

## 🔧 Configuration

### Variables d'Environnement

Aucune variable d'environnement requise pour le mode desktop.

### Constantes

```typescript
// Dans AuthContext.tsx
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures

// Dans LoginPage.tsx
const MIN_PASSWORD_LENGTH = 6;
```

## 📊 Diagramme de Séquence Complet

```
User          LoginPage       AuthContext      localStorage      Router
 │                │                │                 │              │
 │  Enter creds  │                │                 │              │
 │──────────────>│                │                 │              │
 │                │   login()      │                 │              │
 │                │───────────────>│                 │              │
 │                │                │  setItem()      │              │
 │                │                │────────────────>│              │
 │                │                │  setItem()      │              │
 │                │                │────────────────>│              │
 │                │                │  setItem()      │              │
 │                │                │────────────────>│              │
 │                │                │                 │              │
 │                │                │  setStatus('authenticated')    │
 │                │                │─────────────────────────────>│
 │                │                │                 │              │
 │                │  success       │                 │  Navigate    │
 │                │<───────────────│                 │  to /guid    │
 │  Redirect     │                │                 │<─────────────│
 │<──────────────│                │                 │              │
```

## 🚀 Évolution Future

### Phase 2 - Sécurité Renforcée
- Base de données utilisateurs (SQLite)
- Hash bcrypt des mots de passe
- Validation robuste
- Rate limiting

### Phase 3 - Fonctionnalités Avancées
- Gestion des rôles (admin, user, viewer)
- Permissions granulaires
- Logs d'audit
- Session management avancé

### Phase 4 - Multi-utilisateurs
- Profils utilisateurs
- Préférences par utilisateur
- Historique d'activité
- Gestion d'équipe

---

**Version**: 1.0  
**Dernière mise à jour**: Janvier 2025
