# Debug - Problème après changement de compte

**Date**: 2024-11-18  
**Symptôme**: Après déconnexion et connexion à un autre compte, impossible d'envoyer message n8n

## Scénario exact

1. Utilisateur 1 → Login → Fonctionne ✅
2. Utilisateur 1 → Logout
3. Utilisateur 2 → Login → Ne fonctionne pas ❌

## Hypothèses

### Hypothèse 1: useAuth() pas à jour après login
Le `user.id` reste celui de l'ancien user ou devient undefined

### Hypothèse 2: Cache/State React pas rafraîchi
Les hooks gardent l'ancien état après logout/login

### Hypothèse 3: Race condition au login
`useAuth()` pas encore prêt quand GuidPage render

## Actions de diagnostic requises

Ouvrir DevTools (F12) et exécuter:

```javascript
// 1. Vérifier le user actuel
console.log('Current user from useAuth:', window.__currentUser);

// 2. Vérifier l'ancien window global
console.log('Legacy window.userId:', window.__currentUserId);

// 3. Vérifier AuthContext
// Dans React DevTools → Components → chercher AuthProvider
```

## Solution probable

Le problème est que `useAuth()` retourne `undefined` après le login du 2ème user.

Besoin de vérifier:
1. AuthContext se met-il à jour correctement au login?
2. GuidPage re-render-t-il avec le nouveau userId?
