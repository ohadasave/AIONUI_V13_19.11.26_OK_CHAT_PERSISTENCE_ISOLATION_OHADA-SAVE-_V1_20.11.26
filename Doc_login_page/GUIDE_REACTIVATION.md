# Guide de Réactivation de la Page de Connexion

Ce guide explique comment réactiver la page de connexion E-audit après sa désactivation temporaire.

## 🎯 Objectif

Réactiver la page de connexion avec les identifiants admin définis :
- **Email** : `ohada.save@gmail.com`
- **Mot de passe** : `LEADER00`

## 📋 Méthodes de Réactivation

### Méthode 1 : Interface Graphique (Recommandée)

1. **Démarrer l'application** :
   ```bash
   npm run start
   # ou
   bun run start
   ```

2. **Ouvrir l'interface de gestion** :
   - Ouvrir un navigateur dans l'application Electron
   - Naviguer vers : `file:///G:/Aionui_client/public/enable-login.html`
   - Ou copier le fichier `enable-login.html` dans la barre d'URL

3. **Activer le login** :
   - Cliquer sur "✅ Activer le Login"
   - Le statut devrait passer à "Activé"

4. **Nettoyer la session** :
   - Cliquer sur "🧹 Nettoyer Session"
   - Cela force l'affichage de la page de login

5. **Redémarrer l'application** :
   - Fermer complètement l'application (Alt+F4)
   - Relancer : `npm run start`
   - ✅ La page de login devrait maintenant s'afficher !

### Méthode 2 : DevTools Console (Rapide)

1. **Ouvrir l'application et DevTools** :
   ```bash
   npm run start
   ```
   Puis appuyer sur `F12` pour ouvrir DevTools

2. **Exécuter dans la Console** :
   ```javascript
   // Activer la page de login
   const config = JSON.parse(localStorage.getItem('app_config') || '{}');
   config['security.loginEnabled'] = true;
   localStorage.setItem('app_config', JSON.stringify(config));

   // Nettoyer la session
   localStorage.removeItem('eaudit_logged_in');
   localStorage.removeItem('eaudit_login_time');
   localStorage.removeItem('eaudit_username');

   // Recharger l'application
   location.reload();
   ```

3. **Vérifier** :
   - La page de login devrait s'afficher immédiatement après le rechargement

### Méthode 3 : Via les Paramètres de Sécurité

1. **Ouvrir l'application** :
   ```bash
   npm run start
   ```

2. **Naviguer vers les paramètres** :
   - Cliquer sur l'icône d'engrenage (Paramètres)
   - Aller dans "Sécurité et Confidentialité"

3. **Activer le login** :
   - Basculer le switch "Écran de connexion" sur ON
   - Un message de confirmation s'affiche

4. **Forcer l'affichage du login** :
   - Ouvrir DevTools (F12)
   - Dans la Console, taper :
     ```javascript
     localStorage.removeItem('eaudit_logged_in');
     localStorage.removeItem('eaudit_login_time');
     localStorage.removeItem('eaudit_username');
     location.reload();
     ```

## ✅ Vérification de la Réactivation

### Checklist de Test

- [ ] Au démarrage, la page de login s'affiche
- [ ] Le logo E-audit est visible
- [ ] Deux onglets sont présents : "Se connecter" et "S'inscrire"
- [ ] Le thème gris est appliqué
- [ ] Les champs Email et Mot de passe sont présents

### Test de Connexion

1. **Saisir les identifiants** :
   - Email : `ohada.save@gmail.com`
   - Mot de passe : `LEADER00`

2. **Cliquer sur "Se connecter"** :
   - Un message "Connexion réussie" devrait s'afficher
   - Redirection automatique vers `/guid`

3. **Tester la persistance** :
   - Fermer l'application (Alt+F4)
   - Rouvrir : `npm run start`
   - L'application devrait s'ouvrir directement (pas de login)
   - La session persiste pendant 24 heures

### Vérifier le Statut dans la Console

```javascript
// Afficher l'état de la configuration
console.log({
  loginEnabled: JSON.parse(localStorage.getItem('app_config') || '{}')['security.loginEnabled'],
  loggedIn: localStorage.getItem('eaudit_logged_in'),
  username: localStorage.getItem('eaudit_username'),
  loginTime: new Date(parseInt(localStorage.getItem('eaudit_login_time') || '0'))
});
```

**Résultat attendu après activation** :
```javascript
{
  loginEnabled: true,
  loggedIn: null,  // ou "true" si déjà connecté
  username: null,  // ou "ohada.save@gmail.com" si connecté
  loginTime: Invalid Date  // ou une date valide si connecté
}
```

## 🔧 Résolution de Problèmes

### Problème : La page de login ne s'affiche toujours pas

**Solution 1 : Vérifier la configuration**
```javascript
// Dans DevTools Console
const config = JSON.parse(localStorage.getItem('app_config') || '{}');
console.log('Login enabled:', config['security.loginEnabled']);
// Doit afficher: Login enabled: true
```

**Solution 2 : Forcer le nettoyage complet**
```javascript
// Dans DevTools Console
localStorage.clear();
location.reload();
```

**Solution 3 : Vérifier le cache**
```bash
# Dans PowerShell
Remove-Item -Recurse -Force g:\Aionui_client\out\, g:\Aionui_client\dist\ -ErrorAction SilentlyContinue
npm run start
```

### Problème : Écran blanc au démarrage

**Solution : Vérifier les logs**
1. Ouvrir DevTools (F12)
2. Onglet Console
3. Chercher les logs `[AuthContext]`
4. Vérifier qu'il y a : `[AuthContext] Desktop mode - requiring login`

Si absent, vérifier que `security.loginEnabled` est bien à `true`.

### Problème : Les identifiants ne fonctionnent pas

**Note** : Le système actuel accepte **n'importe quel** email et mot de passe pour la première connexion. Les identifiants fournis (`ohada.save@gmail.com` / `LEADER00`) sont les identifiants recommandés, mais le système ne les valide pas encore.

Pour implémenter une vraie validation, voir [FUTURE_IMPROVEMENTS.md](notes/FUTURE_IMPROVEMENTS.md).

## 📝 Commandes Utiles

### Démarrer l'application
```bash
npm run start          # Démarrage normal
npm run start:mem      # Avec allocation mémoire (8 Go)
```

### Nettoyer le cache
```bash
# PowerShell
Remove-Item -Recurse -Force out/, dist/, node_modules/.vite -ErrorAction SilentlyContinue
```

### Vérifier le statut (Console DevTools)
```javascript
// État complet
console.table({
  'Login Enabled': JSON.parse(localStorage.getItem('app_config') || '{}')['security.loginEnabled'],
  'Logged In': localStorage.getItem('eaudit_logged_in'),
  'Username': localStorage.getItem('eaudit_username'),
  'Login Time': new Date(parseInt(localStorage.getItem('eaudit_login_time') || '0')).toLocaleString()
});
```

### Forcer la déconnexion
```javascript
// Dans DevTools Console
localStorage.removeItem('eaudit_logged_in');
localStorage.removeItem('eaudit_login_time');
localStorage.removeItem('eaudit_username');
location.reload();
```

## 🎬 Scénario Complet de Test

### Étape 1 : Réactivation
```bash
# Terminal
npm run start
```

```javascript
// DevTools Console (F12)
const config = JSON.parse(localStorage.getItem('app_config') || '{}');
config['security.loginEnabled'] = true;
localStorage.setItem('app_config', JSON.stringify(config));
localStorage.clear(); // Nettoie tout sauf app_config
location.reload();
```

**✅ Résultat** : Page de login s'affiche

### Étape 2 : Première Connexion
1. Saisir : `ohada.save@gmail.com`
2. Saisir : `LEADER00`
3. Cliquer "Se connecter"

**✅ Résultat** : Redirection vers `/guid`

### Étape 3 : Test de Persistance
1. Fermer l'app (Alt+F4)
2. Relancer : `npm run start`

**✅ Résultat** : Ouvre directement sans login

### Étape 4 : Test de Déconnexion
```javascript
// DevTools Console
localStorage.removeItem('eaudit_logged_in');
localStorage.removeItem('eaudit_login_time');
localStorage.removeItem('eaudit_username');
location.reload();
```

**✅ Résultat** : Retour à la page de login

### Étape 5 : Test d'Expiration
```javascript
// DevTools Console - Simuler une session expirée (25h)
const oldTime = Date.now() - (25 * 60 * 60 * 1000);
localStorage.setItem('eaudit_login_time', oldTime.toString());
location.reload();
```

**✅ Résultat** : Page de login s'affiche (session expirée)

## 📚 Documentation Associée

- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture du système
- [GUIDE_IMPLEMENTATION.md](GUIDE_IMPLEMENTATION.md) - Détails d'implémentation
- [GUIDE_TEST.md](GUIDE_TEST.md) - Procédures de test complètes
- [PROBLEMES_ET_SOLUTIONS.md](PROBLEMES_ET_SOLUTIONS.md) - Historique des problèmes
- [LOGIN_FIX_FINAL.md](LOGIN_FIX_FINAL.md) - Documentation du fix final

## 🔗 Fichiers Clés

- `src/renderer/context/AuthContext.tsx` - Logique d'authentification
- `src/renderer/pages/login/LoginPage.tsx` - Interface de login
- `src/renderer/pages/settings/SecuritySettings.tsx` - Paramètres de sécurité
- `src/renderer/router.tsx` - Routage avec protection
- `public/enable-login.html` - Interface de gestion du login

## 📞 Support

Si tu rencontres des problèmes :

1. Consulter [PROBLEMES_ET_SOLUTIONS.md](PROBLEMES_ET_SOLUTIONS.md)
2. Vérifier les logs dans DevTools Console
3. Utiliser l'interface `enable-login.html`
4. Nettoyer le cache et redémarrer

---

**Date de création** : Janvier 2025  
**Dernière mise à jour** : Janvier 2025  
**Version** : 1.0  
**Statut** : ✅ Prêt à l'emploi
