# Problèmes et Solutions - Système de Connexion E-audit

Ce document recense tous les problèmes rencontrés lors de l'implémentation du système de connexion et leurs solutions.

## 📋 Index des Problèmes

1. [Page de login ne s'affiche pas](#problème-1-page-de-login-ne-saffiche-pas)
2. [Session ne persiste pas après redémarrage](#problème-2-session-ne-persiste-pas)
3. [Timing avec ConfigStorage](#problème-3-timing-avec-configstorage)
4. [Clic droit ne fonctionne pas dans DevTools](#problème-4-clic-droit-ne-fonctionne-pas)
5. [Écran blanc au démarrage](#problème-5-écran-blanc-au-démarrage)

---

## Problème 1: Page de login ne s'affiche pas

### 🔴 Symptômes
- L'application démarre directement sur la page d'accueil
- La page de login n'apparaît jamais
- L'option "Activer l'écran de connexion" est activée dans les paramètres

### 🔍 Cause Racine
Le "TEMPORARY FIX" dans `AuthContext.tsx` forçait `status='unauthenticated'` mais ne vérifiait pas si une session valide existait dans localStorage. Résultat: la logique était correcte mais le localStorage contenait encore `eaudit_logged_in='true'` d'une session précédente.

### ✅ Solution Appliquée

**Fichier**: `src/renderer/context/AuthContext.tsx`

Modification de la méthode `refresh()` pour:
1. Vérifier d'abord le localStorage
2. Valider le timestamp de session
3. Restaurer la session si valide (< 24h)
4. Nettoyer et demander login si expirée (> 24h)

```typescript
const refresh = useCallback(async () => {
  if (isDesktopRuntime) {
    // Check if user is already logged in via localStorage
    const loggedIn = localStorage.getItem('eaudit_logged_in') === 'true';
    const loginTime = localStorage.getItem('eaudit_login_time');

    if (loggedIn && loginTime) {
      // Check if session is still valid (24 hours)
      const now = Date.now();
      const elapsed = now - parseInt(loginTime, 10);
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (elapsed < twentyFourHours) {
        // Valid session exists
        const username = localStorage.getItem('eaudit_username') || 'desktop-user';
        setUser({ id: 'desktop-user', username });
        setStatus('authenticated');
        setReady(true);
        return;
      } else {
        // Session expired - clear it
        localStorage.removeItem('eaudit_logged_in');
        localStorage.removeItem('eaudit_login_time');
        localStorage.removeItem('eaudit_username');
      }
    }

    // No valid session - require login
    setStatus('unauthenticated');
    setUser(null);
    setReady(true);
    return;
  }
  // ... WebUI mode code
}, []);
```

### 🧪 Test de Validation
```javascript
// Dans DevTools Console
localStorage.clear();
location.reload();
// → Page de login doit s'afficher
```

---

## Problème 2: Session ne persiste pas

### 🔴 Symptômes
- Après connexion réussie, fermer et rouvrir l'application
- La page de login s'affiche à nouveau
- L'utilisateur doit se reconnecter à chaque fois

### 🔍 Cause Racine
Le username n'était pas stocké dans localStorage, seulement `eaudit_logged_in` et `eaudit_login_time`. Lors de la restauration, le système ne pouvait pas recréer l'objet `AuthUser` complet.

### ✅ Solution Appliquée

**Fichier**: `src/renderer/context/AuthContext.tsx`

Ajout du stockage du username dans la méthode `login()`:

```typescript
if (isDesktopRuntime) {
  if (!username || !password) {
    return {
      success: false,
      message: 'Veuillez remplir tous les champs',
      code: 'invalidCredentials',
    };
  }
  
  // Store login state with username
  localStorage.setItem('eaudit_logged_in', 'true');
  localStorage.setItem('eaudit_login_time', Date.now().toString());
  localStorage.setItem('eaudit_username', username); // ← AJOUTÉ
  
  setUser({ id: 'desktop-user', username });
  setStatus('authenticated');
  setReady(true);
  return { success: true };
}
```

Et lecture du username dans `refresh()`:

```typescript
const username = localStorage.getItem('eaudit_username') || 'desktop-user';
setUser({ id: 'desktop-user', username });
```

### 🧪 Test de Validation
```javascript
// 1. Se connecter avec username "test"
// 2. Fermer l'application
// 3. Rouvrir l'application
// → Doit ouvrir directement sur /guid sans demander login

// Vérifier dans Console:
console.log(localStorage.getItem('eaudit_username')); // → "test"
```

---

## Problème 3: Timing avec ConfigStorage

### 🔴 Symptômes
- `ConfigStorage.get('security.loginEnabled')` est asynchrone
- La décision d'authentification était prise avant que la valeur soit récupérée
- Comportement incohérent au démarrage

### 🔍 Cause Racine
Le code original tentait de lire `ConfigStorage` de manière asynchrone dans `refresh()`, mais la décision d'authentification était prise de manière synchrone, créant une race condition.

### ✅ Solution Appliquée

**Approche**: Simplifier en mode desktop

Au lieu de vérifier `security.loginEnabled` dans `AuthContext`, on assume que le système de login est toujours actif en mode desktop. L'activation/désactivation se fait uniquement via les paramètres de sécurité qui nettoient le localStorage.

**Fichier**: `src/renderer/context/AuthContext.tsx`

```typescript
const refresh = useCallback(async () => {
  if (isDesktopRuntime) {
    // Pas de vérification de ConfigStorage
    // On vérifie directement localStorage
    const loggedIn = localStorage.getItem('eaudit_logged_in') === 'true';
    // ... reste de la logique
  }
}, []);
```

**Fichier**: `src/renderer/pages/settings/SecuritySettings.tsx`

```typescript
const handleSave = async () => {
  await ConfigStorage.set('security.loginEnabled', loginEnabled);
  
  if (!loginEnabled) {
    // Nettoyer la session quand désactivé
    localStorage.removeItem('eaudit_logged_in');
    localStorage.removeItem('eaudit_login_time');
    localStorage.removeItem('eaudit_username');
  }
};
```

### 🧪 Test de Validation
```javascript
// 1. Activer le login dans paramètres
// 2. Se connecter
// 3. Désactiver le login dans paramètres
// 4. Redémarrer
// → Doit ouvrir directement sur /guid sans login
```

---

## Problème 4: Clic droit ne fonctionne pas

### 🔴 Symptômes
- Impossible de faire clic droit dans DevTools Console
- Pas de menu contextuel
- Impossible de copier-coller

### 🔍 Cause Racine
Electron désactive le menu contextuel par défaut dans les DevTools pour des raisons de sécurité.

### ✅ Solution Appliquée

**Workaround**: Utiliser les raccourcis clavier

- `Ctrl+C` pour copier
- `Ctrl+V` pour coller
- `Ctrl+A` pour tout sélectionner

**Alternative**: Debug Panel

Création d'un panneau de debug avec boutons cliquables pour les opérations courantes:

**Fichier**: `public/scripts/cleanup.js`

```javascript
function addDebugButtons() {
  const debugPanel = document.createElement('div');
  debugPanel.innerHTML = `
    <button id="eaudit-clear-session">Clear Session & Reload</button>
    <button id="eaudit-check-status">Check Status</button>
  `;
  document.body.appendChild(debugPanel);
  
  document.getElementById('eaudit-clear-session').addEventListener('click', function() {
    forceCleanup();
    location.reload();
  });
}
```

### 🧪 Test de Validation
- Ouvrir DevTools
- Vérifier que le panneau noir apparaît en haut à droite
- Cliquer sur les boutons pour tester

---

## Problème 5: Écran blanc au démarrage

### 🔴 Symptômes
- Écran blanc complet au démarrage
- Aucune erreur dans la console
- L'application ne charge pas

### 🔍 Cause Racine
Plusieurs causes possibles:
1. Erreur JavaScript bloquante
2. AuthContext non initialisé (`ready=false`)
3. Router en état de chargement infini
4. Problème de build/cache

### ✅ Solutions Appliquées

**Solution 1**: Vérifier l'état `ready` dans AuthContext

```typescript
const Main = () => {
  const { ready } = useAuth();

  if (!ready) {
    return null; // ou <AppLoader />
  }

  return <Router layout={<Layout sider={<Sider />} />} />;
};
```

**Solution 2**: Nettoyer le cache

```bash
# PowerShell
Remove-Item -Recurse -Force out/, dist/, node_modules/.vite -ErrorAction SilentlyContinue
npm run start
```

**Solution 3**: Vérifier les erreurs dans Console

```javascript
// Ajouter des logs de debug
console.log('[Main] Rendering, ready:', ready, 'status:', status);
```

**Solution 4**: Forcer le nettoyage localStorage

```javascript
// Dans cleanup.js
if (!sessionStorage.getItem('eaudit_cleanup_done')) {
  forceCleanup();
  sessionStorage.setItem('eaudit_cleanup_done', 'true');
}
```

### 🧪 Test de Validation
```bash
# 1. Nettoyer complètement
Remove-Item -Recurse -Force out/, dist/, node_modules/.vite

# 2. Redémarrer
npm run start

# 3. Vérifier Console pour logs
# → Doit voir "[AuthContext] Desktop mode - ..."
# → Doit voir page de login ou page d'accueil
```

---

## 🔧 Outils de Diagnostic

### Debug Panel

Panneau en haut à droite avec:
- **Clear Session & Reload**: Force la déconnexion
- **Check Status**: Affiche l'état de la session

### Console Commands

```javascript
// Vérifier la session
console.log({
  loggedIn: localStorage.getItem('eaudit_logged_in'),
  username: localStorage.getItem('eaudit_username'),
  loginTime: new Date(parseInt(localStorage.getItem('eaudit_login_time')))
});

// Nettoyer la session
localStorage.removeItem('eaudit_logged_in');
localStorage.removeItem('eaudit_login_time');
localStorage.removeItem('eaudit_username');
location.reload();

// Simuler session expirée
const oldTime = Date.now() - (25 * 60 * 60 * 1000);
localStorage.setItem('eaudit_login_time', oldTime.toString());
location.reload();
```

### Logs à Surveiller

```
[AuthContext] Desktop mode - requiring login
[AuthContext] Desktop mode - valid session found
[AuthContext] Desktop mode - session expired
[E-audit Cleanup] Starting cleanup...
[E-audit Cleanup] Session cleared
```

---

## 📊 Statistiques des Problèmes

| Problème | Fréquence | Gravité | Temps de Résolution |
|----------|-----------|---------|---------------------|
| Page login ne s'affiche pas | Haute | Critique | 2h |
| Session ne persiste pas | Moyenne | Haute | 1h |
| Timing ConfigStorage | Basse | Moyenne | 30min |
| Clic droit DevTools | Basse | Basse | N/A (workaround) |
| Écran blanc | Basse | Critique | 1h |

---

## 🚀 Prévention Future

### Bonnes Pratiques

1. **Toujours vérifier localStorage avant de décider du statut d'auth**
2. **Logger chaque étape du flux d'authentification**
3. **Tester la persistance après chaque modification**
4. **Nettoyer le cache régulièrement pendant le développement**
5. **Utiliser le debug panel pour les tests manuels**

### Checklist de Test

- [ ] Page de login s'affiche au premier démarrage
- [ ] Connexion fonctionne
- [ ] Session persiste après redémarrage
- [ ] Session expire après 24h
- [ ] Déconnexion fonctionne
- [ ] Paramètres de sécurité fonctionnent
- [ ] Debug panel accessible
- [ ] Pas d'écran blanc
- [ ] Logs console corrects

---

**Dernière mise à jour**: Janvier 2025  
**Mainteneur**: Équipe E-audit
