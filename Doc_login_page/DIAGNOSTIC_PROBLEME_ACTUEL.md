# Diagnostic - Problème Page de Login

## 🔴 Problème Actuel

**Symptôme**: La page d'accueil s'affiche au lieu de la page de login malgré les modifications.

**Log observé**:
```
[AuthContext.tsx:88] Desktop mode - valid session found
```

## 🔍 Analyse

### Cause Racine
Le localStorage contient encore une session valide:
- `eaudit_logged_in = 'true'`
- `eaudit_login_time = [timestamp récent]`
- `eaudit_username = [username]`

### Pourquoi le nettoyage ne fonctionne pas?

1. **Timing**: Le script `cleanup.js` s'exécute, mais React lit le localStorage trop rapidement
2. **sessionStorage**: La vérification `sessionStorage.getItem('eaudit_cleanup_done')` peut ne pas fonctionner en Electron
3. **Cache**: Le localStorage peut être mis en cache

## ✅ Solution Immédiate

### Option 1: Utiliser le Debug Panel (RECOMMANDÉ)

1. L'application devrait afficher un panneau noir en haut à droite
2. Cliquer sur le bouton rouge "Clear Session & Reload"
3. L'application va redémarrer et afficher la page de login

**Si le panneau n'est pas visible**:
- Vérifier que DevTools est ouvert (F12)
- Le panneau devrait apparaître après quelques secondes

### Option 2: Console DevTools

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet Console
3. Taper:
```javascript
localStorage.clear();
location.reload();
```
4. Appuyer sur Entrée

### Option 3: Nettoyage Manuel

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet Application (ou Storage)
3. Dans le menu de gauche: Local Storage → file://
4. Supprimer les clés:
   - `eaudit_logged_in`
   - `eaudit_login_time`
   - `eaudit_username`
5. Recharger la page (F5)

## 🔧 Modification Appliquée

Le script `cleanup.js` a été modifié pour forcer le nettoyage à CHAQUE démarrage:

```javascript
// FORCE CLEANUP IMMEDIATELY - For testing login page
console.log('[E-audit Cleanup] FORCING CLEANUP ON EVERY START (TESTING MODE)');
forceCleanup();
```

**IMPORTANT**: Cette modification force la déconnexion à chaque démarrage. C'est temporaire pour tester la page de login.

## 📋 Procédure de Test

### Étape 1: Redémarrer l'Application

```bash
# Fermer l'application complètement (Alt+F4)
# Puis redémarrer
npm run start
```

### Étape 2: Vérifier les Logs Console

Vous devriez voir dans DevTools Console:
```
[E-audit Cleanup] Starting cleanup...
[E-audit Cleanup] FORCING CLEANUP ON EVERY START (TESTING MODE)
[E-audit Cleanup] FORCING session cleanup...
[E-audit Cleanup] Session cleared. Login page should appear.
[AuthContext] Desktop mode - requiring login
```

### Étape 3: Vérifier la Page Affichée

**Résultat attendu**:
- ✅ Page de login avec logo E-audit
- ✅ Deux onglets: "Se connecter" et "S'inscrire"
- ✅ Thème gris

**Si la page d'accueil s'affiche encore**:
- Utiliser l'Option 1, 2 ou 3 ci-dessus
- Vérifier que le script cleanup.js a bien été modifié

## 🐛 Debug Avancé

### Vérifier l'État du localStorage

Dans DevTools Console:
```javascript
console.log({
  loggedIn: localStorage.getItem('eaudit_logged_in'),
  loginTime: localStorage.getItem('eaudit_login_time'),
  username: localStorage.getItem('eaudit_username'),
  allKeys: Object.keys(localStorage)
});
```

### Vérifier l'Ordre d'Exécution

Dans DevTools Console, chercher ces logs dans l'ordre:
1. `[E-audit Cleanup] Starting cleanup...`
2. `[E-audit Cleanup] FORCING CLEANUP...`
3. `[E-audit Cleanup] Session cleared`
4. `[AuthContext] Desktop mode - requiring login`

Si l'ordre est différent, il y a un problème de timing.

### Forcer le Nettoyage Manuellement

Dans DevTools Console:
```javascript
// Fonction de nettoyage manuel
function forceLogout() {
  localStorage.removeItem('eaudit_logged_in');
  localStorage.removeItem('eaudit_login_time');
  localStorage.removeItem('eaudit_username');
  console.log('Session cleared manually');
  location.reload();
}

// Exécuter
forceLogout();
```

## 🎯 Prochaines Actions

### Si le problème persiste après redémarrage:

1. **Vérifier que cleanup.js a été modifié**:
   - Ouvrir `public/scripts/cleanup.js`
   - Chercher "FORCING CLEANUP ON EVERY START"
   - Si absent, le fichier n'a pas été sauvegardé

2. **Nettoyer le cache Electron**:
```bash
# Supprimer les dossiers de cache
Remove-Item -Recurse -Force out/, dist/, node_modules/.vite
npm run start
```

3. **Vérifier que le script est chargé**:
   - Dans DevTools Console
   - Chercher `[E-audit Cleanup]`
   - Si absent, le script n'est pas chargé

4. **Vérifier index.html**:
   - Ouvrir `public/index.html`
   - Vérifier que `<script src="./scripts/cleanup.js"></script>` est présent dans `<head>`

## 📞 Support

Si aucune solution ne fonctionne:

1. Copier tous les logs de la console
2. Copier le résultat de:
```javascript
console.log({
  localStorage: Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]),
  sessionStorage: Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)]),
  location: window.location.href
});
```
3. Vérifier que les fichiers suivants ont été modifiés:
   - `src/renderer/context/AuthContext.tsx`
   - `public/scripts/cleanup.js`

## ⚠️ Note Importante

Le nettoyage forcé à chaque démarrage est **temporaire** pour tester la page de login. Une fois le test validé, il faudra:

1. Retirer le bloc de nettoyage forcé dans `cleanup.js`
2. Garder seulement le nettoyage des anciennes données AionUi
3. La session devra persister normalement après connexion

---

**Date**: Janvier 2025  
**Statut**: En diagnostic  
**Priorité**: Critique
