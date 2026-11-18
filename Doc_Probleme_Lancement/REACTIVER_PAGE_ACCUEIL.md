# Comment Réactiver la Page d'Accueil

## 🔄 Guide Rapide

Si vous souhaitez restaurer l'affichage de la page d'accueil au démarrage, voici les options disponibles.

---

## Option 1 : Modification du Code (Permanent)

### Étapes

1. Ouvrir le fichier : `src/renderer/router.tsx`

2. Localiser la ligne 91 (dans la fonction `PanelRoute`) :
```typescript
<Route index element={<Navigate to={getDefaultRoute()} replace />} />
```

3. Remplacer par :
```typescript
<Route index element={<Navigate to='/guid' replace />} />
```

4. Redémarrer l'application

### Résultat
✅ La page d'accueil s'affiche systématiquement au démarrage

---

## Option 2 : Configuration Utilisateur (Recommandé)

Cette option nécessite une modification du code pour ajouter un paramètre de configuration.

### Étape 1 : Ajouter le Paramètre

Dans `src/renderer/router.tsx`, modifier la fonction `getDefaultRoute()` :

```typescript
const getDefaultRoute = () => {
  // Vérifier le paramètre utilisateur
  const skipWelcome = localStorage.getItem('user_skip_welcome_page');
  
  // Si l'utilisateur a désactivé le skip, toujours afficher /guid
  if (skipWelcome === 'false') {
    return '/guid';
  }
  
  // Comportement actuel (redirection vers dernier chat)
  try {
    const tabsData = localStorage.getItem(STORAGE_KEYS.CONVERSATION_TABS);
    if (tabsData) {
      const parsed = JSON.parse(tabsData);
      if (parsed.activeTabId && typeof parsed.activeTabId === 'string') {
        return `/conversation/${parsed.activeTabId}`;
      }
      if (Array.isArray(parsed.openTabs) && parsed.openTabs.length > 0) {
        return `/conversation/${parsed.openTabs[0].id}`;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  
  return '/guid';
};
```

### Étape 2 : Ajouter l'Interface Utilisateur

Ajouter un toggle dans les paramètres (par exemple dans `DisplaySettings.tsx`) :

```typescript
import { Switch } from '@arco-design/web-react';

// Dans le composant
const [skipWelcomePage, setSkipWelcomePage] = useState(
  localStorage.getItem('user_skip_welcome_page') !== 'false'
);

const handleToggleChange = (checked: boolean) => {
  setSkipWelcomePage(checked);
  localStorage.setItem('user_skip_welcome_page', checked ? 'true' : 'false');
};

// Dans le JSX
<div className="setting-item">
  <div className="setting-label">
    {t('settings.skipWelcomePage')}
    <div className="setting-description">
      {t('settings.skipWelcomePageDesc')}
    </div>
  </div>
  <Switch checked={skipWelcomePage} onChange={handleToggleChange} />
</div>
```

### Étape 3 : Ajouter les Traductions

Dans `src/renderer/i18n/locales/en-US/settings.json` :
```json
{
  "skipWelcomePage": "Skip Welcome Page",
  "skipWelcomePageDesc": "Redirect to last conversation on startup instead of showing welcome page"
}
```

Dans `src/renderer/i18n/locales/fr-FR/settings.json` :
```json
{
  "skipWelcomePage": "Ignorer la page d'accueil",
  "skipWelcomePageDesc": "Rediriger vers la dernière conversation au démarrage au lieu d'afficher la page d'accueil"
}
```

### Résultat
✅ L'utilisateur peut activer/désactiver le comportement depuis les paramètres

---

## Option 3 : Via Console Développeur (Temporaire)

Pour tester rapidement sans modifier le code :

### Activer la Page d'Accueil
1. Ouvrir les DevTools (`F12`)
2. Aller dans la Console
3. Exécuter :
```javascript
localStorage.setItem('user_skip_welcome_page', 'false');
```
4. Recharger l'application (`Ctrl+R`)

### Désactiver la Page d'Accueil
```javascript
localStorage.setItem('user_skip_welcome_page', 'true');
```

### Réinitialiser (comportement par défaut)
```javascript
localStorage.removeItem('user_skip_welcome_page');
```

---

## Comparaison des Options

| Option | Difficulté | Réversible | Configuration | Recommandé pour |
|--------|-----------|-----------|---------------|-----------------|
| **1. Modification Code** | ⭐ Facile | ❌ Non | - | Test rapide |
| **2. Configuration UI** | ⭐⭐⭐ Complexe | ✅ Oui | ✅ Oui | Production |
| **3. Console Dev** | ⭐⭐ Moyen | ✅ Oui | - | Debug |

---

## 🧪 Vérification

Après avoir réactivé la page d'accueil, vérifier que :

1. **Au démarrage** : L'URL est `/#/guid`
2. **Affichage** : Le logo E-audit et le titre s'affichent
3. **Fonctionnalités** : Sélection d'agent, input, assistants fonctionnent
4. **Navigation** : Cliquer sur un chat dans l'historique fonctionne

---

## 📝 Notes

- L'**Option 2** est la plus professionnelle mais nécessite plus de développement
- L'**Option 1** convient pour un rollback rapide
- L'**Option 3** est parfaite pour tester sans modifier le code

---

**Dernière mise à jour** : 2026-11-17
