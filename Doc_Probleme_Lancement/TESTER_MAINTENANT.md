# 🧪 Tester Maintenant : Guide Rapide

## ✅ L'Application Redémarre

Le processus `npm run start` est en cours (Terminal ID: 2).  
L'application Electron devrait s'ouvrir dans quelques instants.

---

## 🎯 Tests Prioritaires

### Test 1 : Redirection au Démarrage ⭐⭐⭐

**Ce qui devrait se passer** :

1. L'application s'ouvre
2. **Vous avez un historique de chat** ?
   - ✅ Vous devriez arriver **directement sur votre dernier chat**
   - ✅ L'URL devrait être : `#/conversation/{id}`
   - ❌ Vous NE devriez PAS voir la page d'accueil avec le logo Ubuntu

**Si pas d'historique** :
- ✅ Vous verrez la page d'accueil (normal pour première utilisation)

---

### Test 2 : Bouton "New Chat" ⭐⭐⭐⭐⭐

**Ce qui devrait se passer** :

1. Cliquez sur le bouton **"+ New Chat"** dans la sidebar (à gauche)
2. **Immédiatement** :
   - ✅ Une nouvelle conversation **n8n** s'ouvre
   - ✅ L'URL change vers : `#/conversation/{nouvel-uuid}`
   - ✅ Vous voyez l'interface de chat avec :
     - Input de message en bas
     - Badge "n8n Workflow" visible
     - Possibilité de sélectionner un endpoint n8n
   - ✅ La conversation apparaît dans l'historique (sidebar gauche)

3. **Essayez d'envoyer un message test** :
   - Tapez un message dans l'input
   - Envoyez vers l'endpoint n8n
   - Le message devrait être traité

---

## ❌ Ce Qui Ne Devrait PLUS Se Passer

### Problème Résolu 1 : Page d'Accueil au Démarrage
- ❌ Vous NE devriez PLUS voir :
  - Logo Ubuntu
  - Texte "Automatisez vos activités, d'audit, risque et contrôle"
  - Interface de sélection d'agent

**Exception** : Si vous n'avez AUCUN historique de conversation, c'est normal de voir la page d'accueil.

### Problème Résolu 2 : "New Chat" → Page d'Accueil
- ❌ Cliquer sur "New Chat" NE devrait PLUS vous envoyer sur `/guid`
- ✅ Vous devriez arriver directement sur une conversation n8n prête

---

## 🐛 Si Ça Ne Marche Pas

### Symptôme 1 : Still Getting Welcome Page

**Au démarrage, je vois toujours la page d'accueil**

**Vérifications** :
1. Ouvrez DevTools (`F12`)
2. Console → Tapez :
   ```javascript
   localStorage.getItem('aionui_conversation_tabs')
   ```
3. **Si `null`** → Normal, vous n'avez pas d'historique
4. **Si une chaîne JSON** → Il y a un historique, ça devrait rediriger

**Solution temporaire** :
```javascript
// Créer un historique factice pour tester
localStorage.setItem('aionui_conversation_tabs', JSON.stringify({
  "openTabs": [{"id": "test-123", "name": "Test", "workspace": "", "type": "n8n"}],
  "activeTabId": "test-123"
}));
location.reload();
```

---

### Symptôme 2 : "New Chat" Goes to Welcome Page

**Cliquer sur "New Chat" m'envoie sur `/guid`**

**Cause possible** : Le code n'a pas été recompilé

**Solution** :
1. Vérifier que le terminal montre : "electron main process built successfully"
2. Si non, redémarrer : `Ctrl+C` puis `npm run start`
3. Attendre 10-15 secondes pour le build complet

---

### Symptôme 3 : Erreur "Failed to create n8n conversation"

**Console montre une erreur de création**

**Cause** : Problème SQLite (better-sqlite3)

**Comportement attendu** :
- L'application devrait faire un **fallback vers `/guid`**
- Vous devriez pouvoir créer la conversation manuellement

**Solution permanente** : Voir `probleme_base_sqlite/README.md`

---

## 📊 Résultat Attendu vs Réel

### Tableau de Validation

| Test | Attendu | Réel | Status |
|------|---------|------|--------|
| **Démarrage avec historique** | Dernier chat | ? | ⬜ |
| **Démarrage sans historique** | Page d'accueil | ? | ⬜ |
| **"New Chat"** | Conversation n8n | ? | ⬜ |
| **URL après "New Chat"** | `/conversation/{uuid}` | ? | ⬜ |
| **Interface n8n visible** | Oui | ? | ⬜ |
| **Endpoint n8n disponible** | Oui | ? | ⬜ |
| **Conversation dans historique** | Oui | ? | ⬜ |

**Marquez ✅ ou ❌ pour chaque ligne après test**

---

## 🔍 Inspecter le Comportement

### Vérifier la Redirection au Démarrage

1. Ouvrir DevTools (`F12`)
2. Onglet **Console**
3. Recharger (`Ctrl+R`)
4. Observer l'URL dans la barre d'adresse

**Résultat attendu** :
- Si historique : `file:///...#/conversation/{id}`
- Si pas d'historique : `file:///...#/guid`

### Vérifier la Création de Conversation

1. Cliquer sur "New Chat"
2. Ouvrir DevTools (`F12`) → Console
3. Chercher les logs :
   - ✅ Pas d'erreur rouge
   - ✅ Navigation vers `/conversation/{uuid}`

4. Onglet **Application** → **Local Storage**
5. Chercher la clé : `aionui_conversation_tabs`
6. Vérifier que `openTabs` contient votre nouvelle conversation

---

## 📝 Reporter les Résultats

### Si Tout Fonctionne ✅

Excellent ! La modification est un succès. Vous pouvez :
- Continuer à utiliser l'application normalement
- Profiter du workflow optimisé
- Tester avec différents endpoints n8n

### Si Problème ❌

1. **Capturer** :
   - Screenshot de l'écran
   - Logs de la console DevTools (F12)
   - Contenu de `localStorage` (clé `aionui_conversation_tabs`)

2. **Documenter** :
   - Quel test a échoué ?
   - Quel était le comportement observé ?
   - Y a-t-il des erreurs dans la console ?

3. **Informer** :
   - Créer un fichier : `Doc_Probleme_Lancement/PROBLEME_{date}.md`
   - Inclure tous les détails ci-dessus

---

## 🚀 Commandes Utiles

### Redémarrer l'Application
```bash
# Dans le terminal
Ctrl+C  # Arrêter
npm run start  # Relancer
```

### Réinitialiser le localStorage (DevTools Console)
```javascript
// Supprimer l'historique des tabs
localStorage.removeItem('aionui_conversation_tabs');

// Ou tout supprimer
localStorage.clear();

// Recharger
location.reload();
```

### Vérifier l'Historique (DevTools Console)
```javascript
// Voir le contenu des tabs
console.log(JSON.parse(localStorage.getItem('aionui_conversation_tabs')));

// Voir toutes les clés localStorage
Object.keys(localStorage).forEach(key => {
  console.log(key, localStorage.getItem(key));
});
```

---

## ⏱️ Temps Estimé

- **Test 1** (Redirection démarrage) : 30 secondes
- **Test 2** (Bouton "New Chat") : 1 minute
- **Vérifications** (DevTools) : 2 minutes
- **Total** : < 5 minutes

---

## 🎯 Critères de Succès

### Succès Total ✅

- ✅ Démarrage → Dernier chat (si historique)
- ✅ "New Chat" → Conversation n8n immédiate
- ✅ Interface n8n fonctionnelle
- ✅ Endpoint disponible
- ✅ Pas d'erreur console
- ✅ Workflow fluide

### Succès Partiel ⚠️

- ✅ Au moins un des deux tests fonctionne
- ⚠️ Quelques erreurs mineures (better-sqlite3)
- ✅ Fallback vers `/guid` opérationnel

### Échec ❌

- ❌ Aucune redirection
- ❌ "New Chat" ne fonctionne pas
- ❌ Erreurs bloquantes
- ❌ Application crash

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Consulter** :
   - `Doc_Probleme_Lancement/DESACTIVATION_PAGE_ACCUEIL.md`
   - `Doc_Probleme_Lancement/NEW_CHAT_N8N_DIRECT.md`
   - `Doc_Probleme_Lancement/00_INDEX_DOCUMENTATION.md`

2. **Rollback rapide** (si nécessaire) :
   - Voir `Doc_Probleme_Lancement/REACTIVER_PAGE_ACCUEIL.md`

3. **Documenter** le problème pour analyse future

---

## 🎉 Prêt à Tester !

**L'application devrait être ouverte maintenant.**  
**Cliquez sur "New Chat" et observez la différence !** 🚀

---

**Date** : 2026-11-17  
**Version testée** : E-audit v1.8.25  
**Modifications** : Router + Sider (2 fichiers)
