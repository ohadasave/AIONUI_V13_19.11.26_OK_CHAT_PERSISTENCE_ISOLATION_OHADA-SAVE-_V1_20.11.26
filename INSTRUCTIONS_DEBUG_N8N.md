# Instructions de débogage - Problème n8n Chat

## Étape 1: Ouvrir DevTools

1. **Ouvrez E-audit** (l'application devrait être déjà ouverte)
2. **Appuyez sur F12** pour ouvrir Developer Tools
3. **Cliquez sur l'onglet "Console"**

## Étape 2: Copier les logs existants

Dans la console, cherchez tous les messages qui contiennent:
- `[useGuidAgentSelection]`
- `[useGuidSend]`
- `availableAgents`
- `selectedAgent`

**Copiez tous ces messages** et envoyez-les-moi.

## Étape 3: Exécuter les commandes de diagnostic

Copiez-collez ces commandes **UNE PAR UNE** dans la console et envoyez-moi le résultat de chacune:

### Commande 1: Vérifier l'objet window
```javascript
console.log('=== DIAGNOSTIC WINDOW ===');
console.log('availableAgents:', window.__availableAgents);
console.log('selectedAgent:', window.__selectedAgent);
console.log('currentUserId:', window.__currentUserId);
```

### Commande 2: Vérifier la config
```javascript
window.electron.ipcRenderer.invoke('config.get', 'guid.lastSelectedAgent')
  .then(key => console.log('Config guid.lastSelectedAgent:', key))
  .catch(err => console.error('Error reading config:', err));
```

### Commande 3: Vérifier le state React (si accessible)
```javascript
// Chercher le composant React dans le DOM
const guidInput = document.querySelector('[class*="guid"]');
if (guidInput) {
  console.log('GuidPage trouvé:', guidInput);
}
```

## Étape 4: Tester avec sélection manuelle

1. **Regardez le dropdown** en haut de la page (où il devrait y avoir "Sélectionner un assistant..." ou "n8n Workflow")
2. **Cliquez dessus** et sélectionnez manuellement "n8n Workflow" ou "n8n Multi Workflow"
3. **Tapez "OHOH!" ** dans le champ
4. **Cliquez sur Envoyer**
5. **Copiez les nouveaux messages** dans la console

## Étape 5: Vérifier les erreurs réseau

1. Dans DevTools, **cliquez sur l'onglet "Network"**
2. **Effacez les logs** (icône ⛔ en haut à gauche)
3. **Essayez d'envoyer le message** "OHOH!" à nouveau
4. **Observez** si des requêtes apparaissent
5. **Si erreur rouge**, cliquez dessus et copiez-moi les détails

## Étape 6: Vérifier les erreurs JavaScript

1. Dans DevTools, **cliquez sur l'onglet "Console"**
2. **Regardez** s'il y a des messages en rouge (erreurs)
3. **Copiez-moi toutes les erreurs** qui apparaissent quand vous essayez d'envoyer

## Ce que je recherche

Je dois savoir:
1. ✅ Est-ce que `availableAgents` contient bien un objet avec `backend: 'n8n'` ?
2. ✅ Est-ce que `selectedAgentKey` est `'n8n'` au démarrage ?
3. ✅ Est-ce que le dropdown affiche "n8n Workflow" ou "Sélectionner un assistant..." ?
4. ✅ Quand vous cliquez sur Envoyer, est-ce qu'une erreur apparaît dans la console ?
5. ✅ Est-ce que `config.json` contient une valeur pour `guid.lastSelectedAgent` ?

## Si vous voyez une erreur comme:

### "Cannot read property 'invoke' of undefined"
→ Problème IPC, le bridge n'est pas initialisé

### "selectedAgent is not 'n8n'"
→ Le hook ne sélectionne pas n8n par défaut

### "availableAgents is undefined"
→ Les agents n'ont pas été chargés

### "Failed to create n8n conversation"
→ Le backend n8n n'est pas disponible ou le serveur n8n ne tourne pas

---

**Envoyez-moi les résultats de TOUTES ces étapes** et je pourrai identifier exactement où est le problème.
