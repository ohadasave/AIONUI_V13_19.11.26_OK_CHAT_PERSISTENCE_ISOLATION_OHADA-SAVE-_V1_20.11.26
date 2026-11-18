# Test du Debug Panel - New Chat

## 🎯 Objectif

Vérifier si le bouton "New Chat" fonctionne en capturant les logs via le **Debug Panel** intégré au frontend.

## 📍 Localisation du Debug Panel

Un **bouton flottant rouge** devrait apparaître en **bas à droite** de l'interface :
- Texte du bouton : `🐛`
- Position : coin inférieur droit, au-dessus de tous les autres éléments

## 🔬 Procédure de Test

### Étape 1 : Ouvrir le Debug Panel
1. Cliquer sur le bouton `🐛` en bas à droite
2. Une modale devrait s'ouvrir avec le titre **"Console Logs (Debug)"**
3. Cette modale affiche tous les `console.log()`, `console.warn()`, `console.error()`

### Étape 2 : Tester le bouton "New Chat"
1. **AVANT** de cliquer sur "New Chat", ouvrir le Debug Panel pour voir les logs en temps réel
2. Cliquer sur le bouton **"New Chat"** dans la barre latérale
3. Observer immédiatement les logs dans le Debug Panel

### Étape 3 : Analyser les logs attendus

**Si le bouton fonctionne**, vous devriez voir ces logs dans l'ordre :

```
[NEW CHAT] Button clicked
[NEW CHAT] Generated ID: <un UUID>
[NEW CHAT] Creating conversation
[NEW CHAT] Conversation created, navigating to: /conversation/<UUID>
```

**Si le bouton ne fonctionne PAS**, vous verrez :
- **RIEN** = le clic n'est pas capturé (problème d'événement)
- `[NEW CHAT] Failed to create: <erreur>` = échec de création
- `[NEW CHAT] Fallback to /guid` = la création a échoué, redirection vers la page d'accueil

## 🐛 Diagnostics possibles

### Cas 1 : Aucun log n'apparaît
**Problème** : Le `onClick` du bouton n'est pas déclenché

**Causes possibles** :
- Un autre élément capture le clic (z-index, overlay)
- Le bouton est désactivé par CSS (`pointer-events: none`)
- Le handler `handleCreateN8nConversation` n'est pas bien attaché

**Solution** : Inspecter le DOM pour vérifier les `pointer-events` et la hiérarchie des éléments

---

### Cas 2 : Log "[NEW CHAT] Button clicked" mais rien après
**Problème** : La fonction démarre mais crash avant de logger "Generated ID"

**Causes possibles** :
- Erreur synchrone dans `nanoid()` ou avant
- Exception non capturée dans le try/catch

**Solution** : Ajouter un `console.log` **immédiatement** après `const handleCreateN8nConversation = async () => {`

---

### Cas 3 : Log "[NEW CHAT] Failed to create: <erreur>"
**Problème** : `ipcBridge.conversation.create()` échoue

**Causes possibles** :
- Base de données SQLite corrompue
- Better-sqlite3 binding manquant (déjà connu, mais non bloquant normalement)
- Problème de permissions d'écriture

**Solution** : Vérifier le message d'erreur exact, puis contourner SQLite en naviguant directement vers `/guid` avec state

---

### Cas 4 : Log "Conversation created" mais pas de navigation
**Problème** : `navigate()` ne fonctionne pas

**Causes possibles** :
- `useNavigate()` retourne une fonction invalide
- React Router n'est pas monté correctement

**Solution** : Remplacer par `window.location.href = '/conversation/' + newId`

---

## 📋 Checklist de Test

- [ ] Le bouton `🐛` est visible en bas à droite
- [ ] Cliquer sur `🐛` ouvre la modale de debug
- [ ] Cliquer sur "New Chat" génère des logs
- [ ] Si logs présents : noter le message d'erreur exact
- [ ] Si aucun log : vérifier que le Debug Panel capture bien d'autres `console.log()`

## 🔄 Actions selon le résultat

### ✅ Si logs "[NEW CHAT] Button clicked" apparaissent
→ **Le bouton fonctionne**, mais il y a un problème dans la création/navigation
→ Fournir le message d'erreur exact pour diagnostic

### ❌ Si aucun log n'apparaît
→ **Le clic n'est pas capturé**
→ Vérifier si d'autres boutons génèrent des logs (test de contrôle)
→ Si le Debug Panel ne capte RIEN du tout, il y a un problème avec le Panel lui-même

### ⚠️ Si le Debug Panel n'apparaît pas du tout
→ Le composant `DebugPanel.tsx` n'est pas monté
→ Vérifier que `<DebugPanel />` est bien dans `layout.tsx`

---

## 📝 Rapport à fournir

Merci de communiquer :

1. **Le Debug Panel est-il visible ?** (Oui/Non)
2. **Quels logs apparaissent lors du clic sur "New Chat" ?** (Copier-coller exact)
3. **Si aucun log : d'autres actions génèrent-elles des logs dans le Panel ?**

---

**Fichiers modifiés pour ce test** :
- `src/renderer/components/DebugPanel.tsx` (créé)
- `src/renderer/layout.tsx` (ajout de `<DebugPanel />`)
- `src/renderer/sider.tsx` (logs `[NEW CHAT]` ajoutés)
