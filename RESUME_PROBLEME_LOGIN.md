# Résumé du problème de login

## Situation actuelle

1. ✅ Page de login créée (`src/renderer/pages/login/LoginPage.tsx`)
2. ✅ Option de sécurité créée (Settings → Sécurité)
3. ✅ AuthContext modifié pour vérifier `security.loginEnabled`
4. ❌ **PROBLÈME**: La page d'accueil s'affiche au lieu de la page de login

## Cause probable

L'AuthContext lit `security.loginEnabled` de manière asynchrone, mais le code continue avant d'avoir la réponse. Résultat : l'utilisateur est authentifié automatiquement avant que la vérification soit terminée.

## Solution

### Option 1: Désactiver temporairement le login automatique

Modifiez `src/renderer/context/AuthContext.tsx` ligne ~75 :

```typescript
const refresh = useCallback(async () => {
  if (isDesktopRuntime) {
    // TEMPORAIRE: Toujours demander le login en mode desktop
    setStatus('unauthenticated');
    setUser(null);
    setReady(true);
    return;
  }
  // ... reste du code
}, []);
```

Cela forcera TOUJOURS l'affichage de la page de login en mode desktop.

### Option 2: Utiliser un flag de démarrage

Ajoutez un paramètre de ligne de commande pour forcer le login :

```bash
# Dans package.json, modifier le script start
"start": "electron-vite dev --login-required"
```

Puis dans AuthContext, vérifier ce flag.

### Option 3: Supprimer manuellement la session

Ouvrez le dossier de données utilisateur et supprimez le fichier de configuration :

**Windows**: `%APPDATA%\E-audit\`
**macOS**: `~/Library/Application Support/E-audit/`
**Linux**: `~/.config/E-audit/`

Supprimez tous les fichiers dans ce dossier, puis relancez l'application.

## Test rapide

Pour tester si la page de login fonctionne, tapez dans la barre d'URL du navigateur (DevTools) :

```
#/login
```

Puis appuyez sur Entrée. La page de login devrait s'afficher.

## Prochaines étapes

1. Implémenter l'Option 1 (la plus simple)
2. Tester que la page de login s'affiche
3. Tester la connexion
4. Réactiver la vérification de `security.loginEnabled` une fois que tout fonctionne
