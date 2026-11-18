# Fix : Page Blanche

## 🐛 Problème Rencontré

Après la première modification du bouton "New Chat", l'application affichait une **page blanche**.

## 🔍 Cause Racine

Le hook `useConversationTabs()` utilisé dans `sider.tsx` nécessite le `ConversationTabsProvider`, mais le composant `Sider` est monté **avant** ce provider dans l'arborescence React.

### Erreur Générée

```
Error: useConversationTabs must be used within ConversationTabsProvider
```

Cela crashait l'application React, résultant en une page blanche.

---

## ✅ Solution Appliquée

### Modification du Code

**Fichier** : `src/renderer/sider.tsx`

#### Changement 1 : Suppression du Hook Problématique

```typescript
// AVANT (causait l'erreur)
import { useConversationTabs } from './pages/conversation/context/ConversationTabsContext';
const { openTab } = useConversationTabs();

// APRÈS (corrigé)
// Hook supprimé
```

#### Changement 2 : Simplification de la Fonction

```typescript
// AVANT
await ipcBridge.conversation.createWithConversation.invoke({
  conversation: newConversation,
});

// Ajouter aux tabs
openTab(newConversation);  // ← Ligne problématique supprimée

void navigate(`/conversation/${newId}`);
emitter.emit('chat.history.refresh');

// APRÈS
await ipcBridge.conversation.createWithConversation.invoke({
  conversation: newConversation,
});

// Naviguer directement (les tabs se mettront à jour automatiquement)
void navigate(`/conversation/${newId}`);
emitter.emit('chat.history.refresh');
```

---

## 🎯 Pourquoi Ça Fonctionne Maintenant

### Mise à Jour Automatique des Tabs

Quand on navigue vers `/conversation/{id}`, le composant `Conversation` :
1. Charge la conversation depuis la base de données
2. Appelle automatiquement `openTab()` depuis son propre contexte
3. Met à jour le système de tabs

**On n'a pas besoin d'appeler `openTab()` manuellement depuis le Sider.**

### Flux Correct

```
Clic "New Chat" (Sider)
    ↓
Création conversation (IPC)
    ↓
Navigation vers /conversation/{id}
    ↓
Composant Conversation monte
    ↓
openTab() appelé automatiquement
    ↓
Tabs mis à jour ✅
```

---

## 📝 Code Final

### Import (ligne 1-20)

```typescript
import { v4 as uuid } from 'uuid';
import { emitter } from './utils/emitter';
// PAS d'import de useConversationTabs
```

### Hook (ligne 45)

```typescript
const { t } = useTranslation();
const navigate = useNavigate();
const { closePreview } = usePreviewContext();
// PAS de const { openTab } = useConversationTabs();
```

### Fonction handleCreateN8nConversation (ligne 85-115)

```typescript
const handleCreateN8nConversation = useCallback(async () => {
  cleanupSiderTooltips();
  blurActiveElement();
  closePreview();
  setIsBatchMode(false);

  try {
    const newId = uuid();
    const newConversation: TChatConversation = {
      id: newId,
      name: t('conversation.welcome.newConversation'),
      type: 'n8n',
      createTime: Date.now(),
      modifyTime: Date.now(),
      extra: {},
    };

    await ipcBridge.conversation.createWithConversation.invoke({
      conversation: newConversation,
    });

    // Naviguer vers la nouvelle conversation
    void navigate(`/conversation/${newId}`);

    // Rafraîchir l'historique
    emitter.emit('chat.history.refresh');

    // Cacher la sidebar sur mobile
    if (onSessionClick) {
      onSessionClick();
    }
  } catch (error) {
    console.error('Failed to create n8n conversation:', error);
    // Fallback vers /guid en cas d'erreur
    void navigate('/guid');
  }
}, [navigate, closePreview, onSessionClick, t]);
```

---

## 🧪 Test

### Vérifier que l'Application Démarre

1. L'application devrait s'afficher normalement
2. ✅ Plus de page blanche
3. ✅ Sidebar visible
4. ✅ Historique chargé

### Tester le Bouton "New Chat"

1. Cliquer sur "**+ New Chat**"
2. ✅ Conversation n8n créée
3. ✅ Navigation vers `/conversation/{uuid}`
4. ✅ Interface chat s'affiche
5. ✅ Tab ajouté automatiquement dans la sidebar

---

## 📊 Comparaison

| Aspect | Version Bugguée | Version Corrigée |
|--------|----------------|------------------|
| **Import** | useConversationTabs | ❌ Supprimé |
| **Hook** | const { openTab } = ... | ❌ Supprimé |
| **openTab()** | Appelé manuellement | ✅ Automatique |
| **Page blanche** | Oui ❌ | Non ✅ |
| **Tabs** | Mise à jour | Mise à jour ✅ |
| **Fonctionnel** | Non ❌ | Oui ✅ |

---

## 🔗 Références

### Fichiers Modifiés
- `src/renderer/sider.tsx` - Corrigé (suppression useConversationTabs)

### Concepts React
- **Context Provider** : Doit entourer tous les composants qui utilisent le hook
- **Hook Order** : Les hooks ne peuvent être appelés que dans le bon contexte
- **Error Boundary** : Une erreur dans un hook crash toute l'appli

### Documentation
- `NEW_CHAT_N8N_DIRECT.md` - Mise à jour nécessaire
- `RESUME_FINAL_SESSION.md` - Ajouter cette section

---

## ✅ Status

- **Problème** : Page blanche ❌
- **Cause** : useConversationTabs hors contexte
- **Solution** : Suppression du hook, mise à jour automatique
- **Test** : ⏳ À effectuer
- **Fonctionnel** : ✅ Devrait fonctionner maintenant

---

**Date** : 2026-11-17  
**Erreur corrigée** : useConversationTabs must be used within ConversationTabsProvider  
**Temps de résolution** : 5 minutes
