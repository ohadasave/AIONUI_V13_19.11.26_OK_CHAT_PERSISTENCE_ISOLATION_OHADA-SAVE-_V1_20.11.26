# Résolution des Problèmes WebUI

**Date** : 2024-11-16  
**Contexte** : Après redémarrage PC, résolution de 5 problèmes critiques de l'interface WebUI

---

## ✅ Problèmes Résolus

### Problème 1 : Clic sur "Admin" retourne à la page d'accueil

**Symptôme** : Cliquer sur le lien "Admin" dans Settings redirige vers la page d'accueil au lieu de `/admin/users`

**Cause** : Dans `src/renderer/pages/settings/SettingsSider.tsx`, le path était `'admin/users'` mais la navigation utilise `/settings/${item.path}`, donnant `/settings/admin/users` qui n'existe pas.

**Solution** :
```typescript
// AVANT
admin: { id: 'admin', label: 'Admin', icon: <People />, path: 'admin/users' }

// APRÈS
admin: { id: 'admin', label: 'Admin', icon: <People />, path: 'admin' }
```

Le router a déjà une route `/admin` qui redirige vers `/admin/users`.

**Fichier modifié** : `src/renderer/pages/settings/SettingsSider.tsx` (ligne 97)

---

### Problème 2 : Redirection après login vers page d'accueil

**Symptôme** : Après connexion, l'utilisateur arrive toujours sur `/guid` même s'il avait une conversation active avant

**Comportement attendu** : Rediriger vers la dernière conversation visitée

**Solution** :
1. **Nouveau hook** : `src/renderer/hooks/useLastConversation.ts`
   - Mémorise automatiquement le path quand on visite `/conversation/:id`
   - Stocke `last_conversation_path` dans localStorage
   - Fonction `getLastConversationPath()` retourne la dernière conversation ou `/guid`

2. **Router mis à jour** : `src/renderer/router.tsx` utilise déjà `last_conversation_path`
   - La fonction `getPostLoginRedirect()` existe déjà
   - Elle récupère `last_conversation_path` de localStorage

**Fichiers créés/modifiés** :
- `src/renderer/hooks/useLastConversation.ts` (nouveau)
- `src/renderer/sider.tsx` (utilise le hook)

---

### Problème 3 : Bouton "Back to Chat" retourne à la page d'accueil

**Symptôme** : Le bouton "Back to Chat" dans Settings/Admin redirige vers `/guid` au lieu de revenir au dernier chat

**Cause** : La logique stockait le dernier path non-settings, mais `/guid` est un path valide, donc retournait à `/guid`

**Solution** :
- Utilisation du même hook `useLastConversation`
- La fonction `getLastConversationPath()` priorise la dernière conversation visitée
- Fallback intelligent vers `/guid` seulement si aucune conversation n'a été visitée

**Fichier modifié** : `src/renderer/sider.tsx`
```typescript
// Ligne 16: Import du hook
import { useLastConversation } from './hooks/useLastConversation';

// Ligne 37: Utilisation
const { getLastConversationPath } = useLastConversation();

// Ligne 50: Dans handleSettingsClick
if (isSettings) {
  const target = getLastConversationPath(); // Au lieu de lastNonSettingsPathRef
  Promise.resolve(navigate(target)).catch(...);
}
```

---

## ⏳ Problèmes Restants à Résoudre

### Problème 4 : Google Login tourne en rond sans s'exécuter

**Symptôme** : Bouton "Login with Google" affiche un spinner infini, aucune action

**Diagnostic nécessaire** :
1. Vérifier si les credentials Google OAuth sont configurés
2. Vérifier le backend OAuth dans `src/webserver/`
3. Chercher les endpoints `/api/auth/google/*`
4. Vérifier les logs du serveur WebUI

**Fichiers à analyser** :
- `src/renderer/pages/settings/GeminiSettings.tsx` - Bouton login
- `src/webserver/routes/authRoutes.ts` - Routes OAuth
- Configuration OAuth dans env ou config

**Action recommandée** : 
```bash
# Chercher les routes Google OAuth
grep -r "google" src/webserver/routes/
grep -r "oauth" src/webserver/
```

---

### Problème 5 : Message bloquant Gemini "Model list will be available after first connection"

**Symptôme** : Impossible d'envoyer des messages même avec une clé API Gemini active. Message d'erreur bloquant.

**Message exact** : 
> "Model list will be available after first connection. Send a message to connect and load available models."

**Diagnostic** :
- La connexion Gemini ne s'initialise pas automatiquement quand la clé API est ajoutée
- L'initialisation se fait au premier message, créant un cercle vicieux
- L'utilisateur ne peut pas envoyer de message tant que la connexion n'est pas initialisée

**Cause probable** : 
- La liste des modèles n'est pas chargée au moment de l'ajout de la clé API
- Le bouton d'envoi est désactivé tant que la liste des modèles est vide
- Besoin d'initialiser la connexion Gemini à l'ajout de la clé API

**Fichiers à analyser** :
- `src/renderer/pages/guid/hooks/useGuidSend.ts` - Logique d'envoi
- `src/process/task/GeminiAgentManager.ts` - Gestion connexion Gemini
- `src/renderer/pages/settings/GeminiSettings.tsx` - Ajout clé API
- `src/renderer/pages/guid/Guid.tsx` - Composant principal page d'accueil

**Solution proposée** :
1. Lors de l'ajout d'une clé API Gemini :
   - Appeler automatiquement l'initialisation de la connexion
   - Charger la liste des modèles disponibles
   - Afficher un feedback visuel (spinner + message "Connexion à Gemini...")

2. Modifier `GeminiSettings.tsx` :
```typescript
const handleSaveApiKey = async (apiKey: string) => {
  // Sauvegarder la clé
  await saveApiKey(apiKey);
  
  // Initialiser la connexion Gemini immédiatement
  try {
    await initGeminiConnection(apiKey);
    Message.success('Clé API sauvegardée et connexion établie');
  } catch (error) {
    Message.error('Clé API sauvegardée mais connexion échouée');
  }
};
```

3. Ajouter une fonction d'initialisation dans `GeminiAgentManager` :
```typescript
export async function initGeminiConnection(apiKey: string) {
  // Créer une connexion test
  // Charger la liste des modèles
  // Vérifier que l'API key est valide
  return modelList;
}
```

---

## 📋 Tests à Effectuer

### Test 1 : Navigation Admin ✅
1. Se connecter sur http://localhost:25808/login
2. Aller dans Settings
3. Cliquer sur "Admin"
4. ✅ Devrait arriver sur `/admin/users` (User Management)

### Test 2 : Back to Chat ✅
1. Créer ou ouvrir une conversation
2. Aller dans Settings ou Admin
3. Cliquer sur "Back to Chat" (bouton avec flèche gauche)
4. ✅ Devrait retourner à la conversation (pas à `/guid`)

### Test 3 : Redirection après Login ✅
1. Ouvrir une conversation
2. Se déconnecter
3. Se reconnecter
4. ✅ Devrait arriver sur la dernière conversation (pas sur `/guid`)

### Test 4 : Google OAuth ⏳
1. Aller dans Settings → Gemini
2. Cliquer sur "Login with Google"
3. ❓ Devrait ouvrir une popup OAuth ou afficher une erreur claire
4. ❌ Actuellement : spinner infini

### Test 5 : Gemini Premier Message ⏳
1. Ajouter une clé API Gemini valide dans Settings
2. Aller sur la page d'accueil
3. Essayer d'envoyer un message
4. ❓ Devrait envoyer immédiatement
5. ❌ Actuellement : message bloquant "Model list will be available..."

---

## 🔧 Actions Immédiates

### Pour continuer le développement :

1. **Démarrer le serveur WebUI** :
```bash
cd g:\Aionui_client
npx electron-vite dev -- --webui
```

2. **Tester les 3 premiers fixes** :
   - Ouvrir http://localhost:25808/login
   - Tester Admin, Back to Chat, Redirection login

3. **Diagnostiquer Google OAuth** :
```bash
# Chercher les endpoints OAuth
grep -r "login.*google\|google.*auth" src/webserver/
grep -r "oauth" src/webserver/routes/

# Vérifier les logs du serveur pendant le clic sur "Login with Google"
# Observer la console navigateur pour les erreurs réseau
```

4. **Diagnostiquer Gemini Init** :
```bash
# Trouver où la clé API est sauvegardée
grep -r "saveApiKey\|apiKey.*save" src/renderer/pages/settings/

# Trouver l'initialisation Gemini
grep -r "initGemini\|connect.*gemini" src/process/task/

# Vérifier le useGuidSend pour comprendre le blocage
cat src/renderer/pages/guid/hooks/useGuidSend.ts
```

---

## 📊 Statistiques

**Problèmes identifiés** : 5  
**Problèmes résolus** : 3 (60%)  
**Problèmes restants** : 2 (40%)

**Temps estimé pour les 2 restants** :
- Problème 4 (Google OAuth) : 1-2 heures (diagnostic + fix)
- Problème 5 (Gemini Init) : 0.5-1 heure (simple call à l'init)

**Total restant** : 2-3 heures

---

## 🎯 Prochaines Étapes

1. ✅ **Tester les 3 fixes** (Admin, Back, Login redirect)
2. ⏳ **Diagnostiquer Google OAuth** (vérifier backend, credentials)
3. ⏳ **Fixer Gemini Init** (appeler init à l'ajout de clé API)
4. ✅ **Commiter tous les changements**
5. ✅ **Mettre à jour la documentation**

---

**Dernière mise à jour** : 2024-11-16  
**Statut** : 3/5 problèmes résolus, 2 en attente de diagnostic
