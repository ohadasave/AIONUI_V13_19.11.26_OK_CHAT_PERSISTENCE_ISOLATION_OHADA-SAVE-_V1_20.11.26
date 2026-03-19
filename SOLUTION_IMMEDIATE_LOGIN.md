# 🚨 Solution Immédiate - Afficher la Page de Login

## Problème
La page d'accueil s'affiche au lieu de la page de login car une session valide existe dans le localStorage.

## ✅ Solution Rapide (3 options)

### Option 1: Debug Panel (Le Plus Simple)

**Si vous voyez un panneau noir en haut à droite de l'application**:
1. Cliquer sur le bouton rouge "Clear Session & Reload"
2. L'application va redémarrer
3. La page de login devrait s'afficher

### Option 2: Console DevTools (Recommandé)

1. **Ouvrir DevTools**: Appuyer sur `F12`
2. **Aller dans l'onglet Console**
3. **Taper cette commande**:
```javascript
localStorage.clear(); location.reload();
```
4. **Appuyer sur Entrée**
5. La page va recharger et afficher le login

### Option 3: Redémarrage Complet

1. **Fermer complètement l'application** (Alt+F4 ou X)
2. **Redémarrer**:
```bash
npm run start
```
3. Le script de nettoyage forcé devrait s'exécuter automatiquement

## 🔍 Vérification

Après avoir appliqué une solution, vous devriez voir:

**Dans la Console DevTools**:
```
[E-audit Cleanup] FORCING CLEANUP ON EVERY START (TESTING MODE)
[E-audit Cleanup] Session cleared. Login page should appear.
[AuthContext] Desktop mode - requiring login
```

**Dans l'Application**:
- ✅ Page de login avec logo E-audit
- ✅ Titre "E-audit"
- ✅ Sous-titre "Automatisez vos activités, d'audit, risque et contrôle"
- ✅ Deux onglets: "Se connecter" et "S'inscrire"
- ✅ Thème gris (pas blanc)

## ❌ Si Ça Ne Fonctionne Toujours Pas

### Nettoyage Manuel du localStorage

1. Ouvrir DevTools (F12)
2. Onglet **Application** (ou **Storage**)
3. Menu gauche: **Local Storage** → **file://**
4. Supprimer ces clés:
   - `eaudit_logged_in`
   - `eaudit_login_time`
   - `eaudit_username`
5. Recharger (F5)

### Nettoyer le Cache Electron

```bash
# Dans PowerShell
Remove-Item -Recurse -Force out/, dist/, node_modules/.vite -ErrorAction SilentlyContinue
npm run start
```

## 📝 Après le Test

Une fois que la page de login s'affiche correctement:

1. **Tester la connexion**:
   - Entrer n'importe quel username/password
   - Cliquer "Se connecter"
   - Devrait rediriger vers la page d'accueil

2. **Tester la persistance**:
   - Fermer l'application
   - Rouvrir
   - Devrait ouvrir directement sur la page d'accueil (session restaurée)

3. **Retirer le nettoyage forcé**:
   - Éditer `public/scripts/cleanup.js`
   - Supprimer le bloc "FORCING CLEANUP ON EVERY START"
   - Garder seulement le nettoyage des anciennes données

## 🆘 Besoin d'Aide?

Consulter: `Doc_login_page/DIAGNOSTIC_PROBLEME_ACTUEL.md`

---

**Action Immédiate**: Essayer l'Option 2 (Console DevTools) maintenant!
