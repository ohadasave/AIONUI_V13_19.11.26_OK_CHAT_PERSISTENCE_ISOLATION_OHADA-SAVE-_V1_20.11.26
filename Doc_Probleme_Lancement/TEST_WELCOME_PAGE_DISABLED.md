# Test : Désactivation Page d'Accueil

## 🧪 Plan de Test

### Test 1 : Utilisateur avec Historique (Principal)

**Objectif** : Vérifier que l'utilisateur est redirigé vers son dernier chat

#### Étapes
1. Ouvrir les DevTools (`F12`)
2. Console → Exécuter :
   ```javascript
   // Créer un historique de tabs simulé
   localStorage.setItem('aionui_conversation_tabs', JSON.stringify({
     "openTabs": [
       {
         "id": "test-conv-123",
         "name": "Test Conversation",
         "workspace": "/test/workspace",
         "type": "gemini"
       }
     ],
     "activeTabId": "test-conv-123"
   }));
   ```
3. Recharger l'application (`Ctrl+R`)
4. Observer l'URL

#### Résultat Attendu
✅ **URL** : `/#/conversation/test-conv-123`  
❌ **PAS** : `/#/guid`

---

### Test 2 : Nouvel Utilisateur (Fallback)

**Objectif** : Vérifier que la page d'accueil s'affiche quand il n'y a pas d'historique

#### Étapes
1. Ouvrir les DevTools (`F12`)
2. Console → Exécuter :
   ```javascript
   // Supprimer l'historique
   localStorage.removeItem('aionui_conversation_tabs');
   ```
3. Recharger l'application (`Ctrl+R`)
4. Observer l'URL et l'affichage

#### Résultat Attendu
✅ **URL** : `/#/guid`  
✅ **Affichage** : Page d'accueil avec logo E-audit et titre  
✅ **Texte** : "Automatisez vos activités, d'audit, risque et contrôle"

---

### Test 3 : localStorage Corrompu (Robustesse)

**Objectif** : Vérifier que l'application gère les erreurs gracieusement

#### Étapes
1. Ouvrir les DevTools (`F12`)
2. Console → Exécuter :
   ```javascript
   // Créer un JSON invalide
   localStorage.setItem('aionui_conversation_tabs', 'INVALID_JSON{{{');
   ```
3. Recharger l'application (`Ctrl+R`)
4. Observer l'URL et les erreurs console

#### Résultat Attendu
✅ **URL** : `/#/guid` (fallback)  
✅ **Console** : Aucune erreur JavaScript bloquante  
✅ **Affichage** : Page d'accueil normale

---

### Test 4 : Plusieurs Tabs, Active Invalide

**Objectif** : Vérifier la logique de fallback vers le premier tab

#### Étapes
1. Ouvrir les DevTools (`F12`)
2. Console → Exécuter :
   ```javascript
   // Tabs avec activeId invalide
   localStorage.setItem('aionui_conversation_tabs', JSON.stringify({
     "openTabs": [
       {"id": "conv-111", "name": "Chat 1", "workspace": "/ws1", "type": "gemini"},
       {"id": "conv-222", "name": "Chat 2", "workspace": "/ws2", "type": "acp"}
     ],
     "activeTabId": "INVALID_ID_999"
   }));
   ```
3. Recharger l'application (`Ctrl+R`)
4. Observer l'URL

#### Résultat Attendu
✅ **URL** : `/#/conversation/conv-111` (premier tab de la liste)

---

### Test 5 : Accès Manuel à `/guid`

**Objectif** : Vérifier que la page d'accueil reste accessible

#### Étapes
1. Dans l'application en cours d'exécution
2. Modifier l'URL manuellement : `/#/guid`
3. Appuyer sur `Entrée`
4. Observer l'affichage

#### Résultat Attendu
✅ **URL** : `/#/guid`  
✅ **Affichage** : Page d'accueil complète  
✅ **Fonctionnalités** : Input, sélection agent, assistants fonctionnent

---

### Test 6 : Navigation Normale

**Objectif** : Vérifier qu'aucune régression n'affecte la navigation

#### Étapes
1. Depuis n'importe quelle page
2. Cliquer sur "Nouveau chat" ou créer une conversation
3. Observer le comportement

#### Résultat Attendu
✅ **Navigation** : Fonctionne normalement  
✅ **Tabs** : Se créent et s'activent correctement  
✅ **localStorage** : `activeTabId` mis à jour automatiquement

---

## 🔧 Commandes Utiles (DevTools)

### Inspecter l'État Actuel
```javascript
// Voir le contenu de conversation_tabs
const tabs = localStorage.getItem('aionui_conversation_tabs');
console.log('Tabs:', tabs ? JSON.parse(tabs) : 'Vide');
```

### Simuler un Utilisateur avec Historique
```javascript
localStorage.setItem('aionui_conversation_tabs', JSON.stringify({
  "openTabs": [
    {"id": "audit-2026-q4", "name": "Audit Q4 2026", "workspace": "/projects/audit", "type": "gemini"}
  ],
  "activeTabId": "audit-2026-q4"
}));
location.reload();
```

### Simuler un Nouvel Utilisateur
```javascript
localStorage.removeItem('aionui_conversation_tabs');
location.reload();
```

### Réinitialiser Complètement
```javascript
// Supprimer TOUTES les données localStorage
localStorage.clear();
location.reload();
```

---

## 📋 Checklist de Validation

Cocher après avoir testé chaque scénario :

- [ ] ✅ Test 1 : Redirection vers dernier chat
- [ ] ✅ Test 2 : Page d'accueil pour nouvel utilisateur
- [ ] ✅ Test 3 : Gestion erreur JSON corrompu
- [ ] ✅ Test 4 : Fallback vers premier tab
- [ ] ✅ Test 5 : Accès manuel `/guid` fonctionne
- [ ] ✅ Test 6 : Navigation normale sans régression

---

## 🐛 Problèmes Connus

### Problème Non-Lié : better-sqlite3
```
Error: Could not locate the bindings file
```

**Status** : ⚠️ Existant avant cette modification  
**Impact** : Aucun sur la redirection (problème base de données)  
**Solution** : Réinstaller better-sqlite3 ou recompiler le module natif

---

## ✅ Validation Finale

Une fois tous les tests passés :

1. **Marquer les checkboxes** ci-dessus
2. **Documenter** toute anomalie trouvée
3. **Valider** avec utilisateur final
4. **Déployer** en production si tout fonctionne

---

**Dernière mise à jour** : 2026-11-17  
**Testé sur** : E-audit v1.8.25 (Electron 37)
