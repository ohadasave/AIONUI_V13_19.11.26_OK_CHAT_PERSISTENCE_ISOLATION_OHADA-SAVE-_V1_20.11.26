# 🐛 Debug : Bouton "New Chat" Ne Répond Pas

## 📅 Date : 2026-11-17

## 🔍 Problème Observé

**Symptôme** : Clic sur le bouton "New Chat" ne produit aucune action visible

### Comportement Attendu
1. Clic sur "New Chat"
2. Conversation n8n créée
3. Navigation vers `/conversation/{uuid}`
4. Interface chat s'affiche

### Comportement Réel
❌ Rien ne se passe après le clic

---

## 🔧 Actions de Debug Ajoutées

### Logs Console Ajoutés

```typescript
const handleCreateN8nConversation = useCallback(async () => {
  console.log('[NEW CHAT] Button clicked');  // Point 1
  
  const newId = uuid();
  console.log('[NEW CHAT] Generated ID:', newId);  // Point 2
  
  console.log('[NEW CHAT] Creating conversation:', newConversation);  // Point 3
  
  await ipcBridge.conversation.createWithConversation.invoke({
    conversation: newConversation,
  });
  
  console.log('[NEW CHAT] Conversation created, navigating');  // Point 4
  
  void navigate(`/conversation/${newId}`);
}, [navigate, closePreview, onSessionClick, t]);
```

---

## 🧪 Tests à Effectuer

### Test 1 : Vérifier que l'Événement Se Déclenche

1. **Ouvrir DevTools** (`F12`)
2. **Onglet Console**
3. **Cliquer sur "New Chat"**
4. **Observer** :
   - ✅ Si vous voyez `[NEW CHAT] Button clicked` → L'événement fonctionne
   - ❌ Si rien n'apparaît → Le clic n'est pas capturé

---

### Test 2 : Identifier l'Étape Qui Bloque

**Scénarios possibles** :

#### Scénario A : Aucun Log
```
(Rien dans la console)
```
**Cause** : L'événement `onClick` ne se déclenche pas
**Solutions possibles** :
- Vérifier que le bouton n'est pas disabled
- Vérifier que le bouton est cliquable (pas de overlay)
- Vérifier les styles CSS (pointer-events)

---

#### Scénario B : Log 1 Seulement
```
[NEW CHAT] Button clicked
```
**Cause** : Erreur immédiate dans la fonction
**Solutions possibles** :
- Problème avec `uuid()`
- Problème avec `t()` (traduction)
- Problème avec `closePreview()`

---

#### Scénario C : Logs 1-3 Mais Pas 4
```
[NEW CHAT] Button clicked
[NEW CHAT] Generated ID: abc-123
[NEW CHAT] Creating conversation: {id: "abc-123", ...}
```
**Cause** : `ipcBridge.conversation.createWithConversation` échoue
**Raison probable** : **Erreur better-sqlite3** (base de données non fonctionnelle)

**Solution** : L'erreur devrait être catchée et rediriger vers `/guid`

---

#### Scénario D : Tous les Logs
```
[NEW CHAT] Button clicked
[NEW CHAT] Generated ID: abc-123
[NEW CHAT] Creating conversation: {id: "abc-123", ...}
[NEW CHAT] Conversation created, navigating to: /conversation/abc-123
```
**Cause** : La navigation `navigate()` ne fonctionne pas
**Solutions possibles** :
- Problème de routing React Router
- Composant Conversation ne se monte pas
- Erreur dans le composant Conversation

---

## 🔍 Diagnostic Approfondi

### Vérifier l'Erreur better-sqlite3

Si `ipcBridge.conversation.createWithConversation` échoue à cause de SQLite :

1. **Dans DevTools Console**, chercher :
   ```
   [NEW CHAT] Failed to create n8n conversation: Error: Could not locate the bindings file
   ```

2. **Si présent** : C'est le problème SQLite qui bloque
   
3. **Solution temporaire** : Modifier le code pour ne PAS créer la conversation en DB :

```typescript
// VERSION SANS DB (pour tester)
const handleCreateN8nConversation = useCallback(async () => {
  console.log('[NEW CHAT] Direct navigation to /guid');
  void navigate('/guid');
}, [navigate]);
```

---

### Vérifier le Routing

Si la navigation semble fonctionner mais rien ne s'affiche :

1. **Ouvrir DevTools** → Onglet **Application** → **Local Storage**
2. Chercher la clé `aionui_conversation_tabs`
3. Vérifier si une conversation a été ajoutée

---

## 🎯 Solutions Possibles

### Solution 1 : Bypass SQLite (Temporaire)

Si le problème est SQLite, créer la conversation côté client sans passer par IPC :

```typescript
const handleCreateN8nConversation = useCallback(async () => {
  const newId = uuid();
  
  // Ne PAS créer en base, juste naviguer
  void navigate('/guid', {
    state: {
      autoCreate: true,
      type: 'n8n',
      id: newId
    }
  });
}, [navigate]);
```

Puis modifier `GuidPage.tsx` pour gérer l'auto-création.

---

### Solution 2 : Fallback Immédiat

Si la création échoue systématiquement, fallback directement vers `/guid` :

```typescript
const handleCreateN8nConversation = useCallback(async () => {
  try {
    // Tentative création
    await ipcBridge.conversation.createWithConversation.invoke({...});
    void navigate(`/conversation/${newId}`);
  } catch {
    // Fallback immédiat
    console.warn('[NEW CHAT] SQLite unavailable, using /guid');
    void navigate('/guid', { state: { preferN8n: true } });
  }
}, [navigate, t]);
```

---

### Solution 3 : Réparer better-sqlite3 (Permanent)

Voir `probleme_base_sqlite/README.md` pour réparer définitivement :

```bash
# Dans le terminal
cd g:\Aionui_client
npm rebuild better-sqlite3 --build-from-source
```

---

## 📊 Tableau de Debug

| Étape | Log Attendu | Si Absent |
|-------|-------------|-----------|
| 1. Clic capturé | `[NEW CHAT] Button clicked` | Problème événement |
| 2. UUID généré | `Generated ID: abc-123` | Problème uuid() |
| 3. Conversation créée | `Creating conversation: {...}` | Problème objet |
| 4. IPC appelé | (pas de log ici) | Crash probable |
| 5. Navigation | `navigating to: /conversation/...` | Problème IPC |
| 6. Erreur | `Failed to create...` | Erreur catchée |
| 7. Fallback | `Fallback to /guid` | Fallback exécuté |

---

## 🚀 Prochaines Étapes

### Maintenant

1. **Relancer l'application** (build en cours)
2. **Ouvrir DevTools** (`F12`)
3. **Cliquer sur "New Chat"**
4. **Lire les logs console**
5. **Identifier le scénario** (A, B, C ou D ci-dessus)

### Si Scénario C (Échec IPC)

C'est probablement à cause de **better-sqlite3**. Options :

- **Court terme** : Utiliser Solution 1 ou 2 (bypass SQLite)
- **Long terme** : Réparer SQLite avec Solution 3

### Si Autre Scénario

Reporter les logs exacts dans un nouveau fichier pour diagnostic approfondi.

---

## 📝 Instructions de Test

```
1. Attendre que l'app s'ouvre (~30 secondes)
2. F12 pour ouvrir DevTools
3. Onglet Console
4. Cliquer sur "New Chat"
5. Copier TOUS les logs
6. Partager les logs
```

---

**Fichier** : `src/renderer/sider.tsx` (modifié avec logs)  
**Status** : ⏳ En attente de redémarrage et test  
**Objectif** : Identifier l'étape exacte qui bloque
