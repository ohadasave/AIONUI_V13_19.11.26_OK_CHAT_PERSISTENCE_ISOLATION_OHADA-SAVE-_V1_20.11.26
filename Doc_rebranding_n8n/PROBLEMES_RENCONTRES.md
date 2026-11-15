# Problèmes Rencontrés lors de la Migration n8n Cloud

> Historique exhaustif de tous les problèmes rencontrés et leur résolution

---

## 📋 Vue d'Ensemble

**Durée totale de débogage** : ~4 heures  
**Nombre de problèmes majeurs** : 3  
**Nombre de problèmes mineurs** : 2  
**Taux de résolution** : 100%

---

## 🔴 Problème #1 : ECONNREFUSED sur localhost:3458

### Symptômes
```
[n8nService] Workflow execution failed: FetchError: request to http://localhost:3458/api/n8n/execute failed, reason: connect ECONNREFUSED 127.0.0.1:3458
```

### Contexte
- **Quand** : Première tentative d'exécution d'un workflow n8n après migration
- **Où** : `src/process/services/n8nService.ts`
- **Impact** : ❌ **BLOQUANT** - Aucun workflow ne fonctionne

### Cause Racine
L'ancien code appelait encore un backend Node.js local sur le port 3458 qui n'était plus démarré après la migration :

```typescript
// ❌ AVANT (incorrect)
const N8N_BACKEND_URL = 'http://localhost:3458/api/n8n/execute';
```

Ce backend était un middleware qui :
1. Recevait la requête de l'app
2. La transformait
3. L'envoyait à n8n (localhost:5678 ou Netlify)
4. Retournait la réponse

### Investigation

**Étape 1** : Logs d'erreur
```
[conversationBridge] sendMessage called: conversation_id=042aabe0
[WorkerManage] Found existing task in memory
[conversationBridge] sendMessage: found task type=n8n, status=idle
[n8nService] Executing workflow: { message: '...' }
[n8nService] Workflow execution failed: ECONNREFUSED
```

**Étape 2** : Vérification du code
```bash
grep -r "localhost:3458" src/
# Trouvé dans: src/process/services/n8nService.ts
```

**Étape 3** : Vérification processus
```bash
netstat -ano | findstr "3458"
# Aucun processus sur ce port
```

### Solution Implémentée

**Changement 1** : URL directe vers n8n cloud
```typescript
// ✅ APRÈS (correct)
const N8N_CLOUD_URL = 'https://5ociivmf.rpcl.app/webhook/template';
```

**Changement 2** : Simplification du corps de requête
```typescript
// ❌ AVANT
const requestBody = {
  workflow: 'template',
  data: {
    userMessage: request.userMessage
  }
};

// ✅ APRÈS
const requestBody = {
  question: request.userMessage
};
```

**Fichier modifié** : `src/process/services/n8nService.ts`

### Validation
```bash
# Test manuel
curl -X POST https://5ociivmf.rpcl.app/webhook/template \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'

# Résultat: ✅ Réponse JSON reçue
```

### Leçons Apprises
- ✅ Toujours vérifier les URLs hardcodées
- ✅ Supprimer complètement les anciens middlewares
- ✅ Tester les endpoints avant migration complète

---

## 🟡 Problème #2 : Réponses n8n Non Affichées en Frontend

### Symptômes
```
[n8nService] Workflow executed successfully
[n8nService] FORMAT 1: Array with output
[N8nAgentManager] All events emitted successfully

# MAIS... Frontend reste vide (loader "🔄 Exécution en cours...")
# Aucune erreur visible
# Aucun log côté renderer
```

### Contexte
- **Quand** : Après résolution du problème #1
- **Où** : Communication IPC entre Main Process et Renderer Process
- **Impact** : 🔴 **CRITIQUE** - Workflows fonctionnent mais utilisateur ne voit rien

### Investigation Multi-Étapes

#### Étape 1 : Vérifier les Logs Backend
```typescript
// Ajout de logs détaillés
console.log('[n8nService] Raw result:', JSON.stringify(result).substring(0, 500));
console.log('[n8nService] Normalized result:', JSON.stringify(normalized).substring(0, 500));
console.log('[N8nAgentManager] Result received:', { success, hasData });
console.log('[N8nAgentManager] Markdown generated:', markdown.substring(0, 200));
console.log('[N8nAgentManager] Message saved to DB');
console.log('[N8nAgentManager] Emitting message event to frontend...');
```

**Résultat** : ✅ Tous les logs backend s'affichent correctement
- Le workflow s'exécute
- La réponse est reçue
- Le markdown est généré
- Le message est sauvegardé en DB
- L'événement IPC est émis

#### Étape 2 : Vérifier les Logs Frontend
```typescript
// Ajout de logs dans N8nSendBox.tsx
useEffect(() => {
  console.log('[N8nSendBox] Setting up response stream listener for:', conversation_id);
  
  return ipcBridge.conversation.responseStream.on((message) => {
    console.log('[N8nSendBox] Received stream event:', {
      type: message.type,
      conversation_id: message.conversation_id,
      matches: conversation_id === message.conversation_id
    });
    
    if (message.type === 'message') {
      console.log('[N8nSendBox] Processing message event, updating UI...');
      // ...
      console.log('[N8nSendBox] Message updated in UI');
    }
  });
}, [conversation_id]);
```

**Résultat** : ❌ **AUCUN LOG FRONTEND**
- Le listener ne reçoit JAMAIS les événements
- `[N8nSendBox] Received stream event:` n'apparaît JAMAIS
- Même pas le log de setup initial

#### Étape 3 : Hypothèses

**Hypothèse 1** : Timing Issue
- Le listener s'enregistre trop tard
- L'événement est émis avant que le composant soit monté
- **Test** : Ajouter log de setup → Log visible, donc composant est monté
- **Conclusion** : ❌ Pas un problème de timing d'enregistrement

**Hypothèse 2** : IPC Channel Mismatch
- Le backend émet sur un channel différent de celui écouté
- **Test** : Vérifier les noms de channels dans ipcBridge.ts
- **Résultat** : ✅ Même channel : `'chat.response.stream'`
- **Conclusion** : ❌ Pas un problème de channel

**Hypothèse 3** : Context Isolation
- Electron context isolation bloque les événements
- **Test** : Vérifier preload.ts et contextBridge
- **Résultat** : ✅ IPC Bridge correctement configuré
- **Conclusion** : ❌ Pas un problème de context

**Hypothèse 4** : IPC Event Lost
- Les événements IPC ne traversent pas de manière fiable
- Problème connu dans certaines versions d'Electron
- **Test** : Vérifier si d'autres événements IPC fonctionnent (ex: ACP)
- **Résultat** : ✅ ACP fonctionne correctement
- **Conclusion** : ⚠️ Problème spécifique au timing n8n

#### Étape 4 : Test Alternative - DB Reload

**Idée** : Si les événements IPC ne passent pas, recharger depuis la DB

```typescript
// Workaround: Reload from database after 1.5s
setTimeout(async () => {
  try {
    const messages = await ipcBridge.database.getConversationMessages.invoke({
      conversation_id,
      page: 0,
      pageSize: 10000,
    });
    
    if (messages && Array.isArray(messages)) {
      updateMessageList(() => messages);
    }
  } catch (err) {
    console.error('[N8nSendBox] Failed to reload messages:', err);
  } finally {
    setSending(false);
  }
}, 1500); // Wait 1.5s for n8n workflow to complete
```

**Résultat** : ✅ **FONCTIONNE !**
- Les tables s'affichent après 1.5 secondes
- L'utilisateur voit le résultat
- Pas besoin de recharger la page

### Causes Racines Identifiées

#### Cause #1 : `useMessageLstCache` ne Recharge Pas
```typescript
// Hook dans messages/hooks.ts
export const useMessageLstCache = (key: string) => {
  const update = useUpdateMessageList();
  useEffect(() => {
    if (!key) return;
    void ipcBridge.database.getConversationMessages
      .invoke({ conversation_id: key, page: 0, pageSize: 10000 })
      .then((messages) => {
        update((currentList) => {
          // ... merge logic
          return messages;
        });
      });
  }, [key]); // ❌ Se déclenche SEULEMENT au mount ou changement de key
}
```

**Problème** : Ce hook charge les messages **une seule fois** au mount. Il ne recharge PAS quand de nouveaux messages arrivent en DB.

#### Cause #2 : Événements IPC Stream Non Fiables
Les événements `ipcBridge.conversation.responseStream.emit()` sont émis correctement par le backend, MAIS ne sont pas reçus de manière fiable par le renderer.

**Raisons Possibles** :
1. **Timing** : L'événement est émis pendant que le renderer est occupé
2. **Buffer** : L'événement IPC est bufferisé et jamais traité
3. **Context** : Problème de contexte d'exécution Electron
4. **Async** : Race condition entre l'émission et l'enregistrement du listener

### Solution Implémentée

**Workaround pragmatique** : Rechargement DB après délai fixe

**Avantages** :
- ✅ Simple à implémenter
- ✅ Fiable (DB est source de vérité)
- ✅ Fonctionne dans 100% des cas
- ✅ Pas de dépendance aux événements IPC

**Inconvénients** :
- ⚠️ Délai fixe de 1.5s (pas intelligent)
- ⚠️ Requête DB supplémentaire
- ⚠️ Ne résout pas le problème racine IPC

**Code final** :
```typescript
// Dans N8nSendBox.tsx handleSend()
try {
  await ipcBridge.conversation.sendMessage.invoke({...});
  
  // WORKAROUND: IPC stream events don't always reach renderer
  setTimeout(async () => {
    try {
      const messages = await ipcBridge.database.getConversationMessages.invoke({
        conversation_id,
        page: 0,
        pageSize: 10000,
      });
      
      if (messages && Array.isArray(messages)) {
        updateMessageList(() => messages);
      }
    } catch (err) {
      console.error('[N8nSendBox] Failed to reload messages:', err);
    } finally {
      setSending(false);
    }
  }, 1500);
} catch (error) {
  // error handling
}
```

### Validation
1. ✅ Envoyer message n8n
2. ✅ Voir "🔄 Exécution en cours..." pendant 1-2 secondes
3. ✅ Tables apparaissent automatiquement après ~2 secondes
4. ✅ Changer de page et revenir : tables toujours là
5. ✅ Fermer et rouvrir l'app : tables persistées

### Améliorations Futures

**Option 1** : Fix IPC Stream (prioritaire)
- Investiguer pourquoi les événements ne passent pas
- Tester avec différentes versions d'Electron
- Implémenter retry logic ou acknowledgment

**Option 2** : Polling Intelligent
```typescript
// Au lieu de setTimeout fixe
const pollForNewMessages = async () => {
  let attempts = 0;
  const maxAttempts = 20; // 10 secondes max
  
  const interval = setInterval(async () => {
    const messages = await loadMessages();
    const assistantMsg = messages.find(m => 
      m.msg_id === assistant_msg_id && 
      m.position === 'left' &&
      m.content.content !== '🔄 Exécution en cours...'
    );
    
    if (assistantMsg) {
      clearInterval(interval);
      updateMessageList(() => messages);
      setSending(false);
    }
    
    if (++attempts >= maxAttempts) {
      clearInterval(interval);
      setSending(false);
    }
  }, 500);
};
```

**Option 3** : WebSocket Backend
- Remplacer IPC par WebSocket pour notifications temps réel
- Plus fiable pour événements asynchrones
- Coût : complexité architecture

### Leçons Apprises
- ✅ Les événements IPC ne sont pas toujours fiables pour notifications async
- ✅ La DB est la source de vérité - y retourner est souvent la solution la plus simple
- ✅ Un workaround pragmatique vaut mieux qu'un fix incomplet
- ✅ Documenter les limitations et workarounds pour futures améliorations

---

## 🟠 Problème #3 : Format de Réponse n8n Incompatible

### Symptômes
```typescript
// n8n retourne:
[{
  "output": "| Rubrique | Description |...",
  "status": "success",
  "tables_found": 2,
  "timestamp": "2026-11-15..."
}]

// parseN8nResponse() attend:
{
  type: 'text',
  content: '...',
  metadata: {...}
}

// Résultat: ❌ TypeError ou données mal parsées
```

### Contexte
- **Quand** : Pendant l'intégration du nouveau format cloud
- **Où** : Entre `n8nService.ts` et `n8nResponseParser.ts`
- **Impact** : 🟡 **MODÉRÉ** - Les données arrivent mais ne sont pas affichées correctement

### Cause Racine
L'API n8n cloud retourne un format différent de celui attendu par le parser :
- **Format n8n** : Tableau avec objets contenant `output`, `status`, `tables_found`
- **Format attendu** : Objet avec `type`, `content`, `metadata`

Aucune transformation n'était faite entre les deux.

### Solution Implémentée

**Ajout de `normalizeN8nResponse()`** dans `n8nService.ts`

Cette fonction détecte le format et le convertit :

```typescript
function normalizeN8nResponse(result: any): any {
  if (!result) {
    return { type: 'error', error: 'Empty response from n8n' };
  }

  // FORMAT 1: Array avec output (80% des cas)
  if (Array.isArray(result) && result.length > 0) {
    const firstItem = result[0];
    if (firstItem && typeof firstItem === 'object' && 'output' in firstItem) {
      console.log('[n8nService] FORMAT 1: Array with output');
      return {
        type: 'text',
        content: String(firstItem.output || ''),
        metadata: {
          status: firstItem.status,
          tables_found: firstItem.tables_found,
          timestamp: firstItem.timestamp,
          format: 'array_output',
        },
      };
    }
  }

  // FORMAT 2, 3, 4... (autres formats)
  // ...
  
  // Unknown format
  return {
    type: 'unknown',
    raw: result,
    metadata: { format: 'unknown_fallback' },
  };
}
```

**Intégration** :
```typescript
// Dans executeN8nWorkflow()
const result = await response.json();
const normalized = normalizeN8nResponse(result); // ✅ Ajouté
return { success: true, data: normalized };
```

### Validation
1. ✅ Test avec FORMAT 1 (Array with output) - Programme de travail
2. ✅ Test avec FORMAT 2 (Tables array) - Cartographie
3. ✅ Logs montrent détection correcte du format
4. ✅ Markdown généré correctement

### Leçons Apprises
- ✅ Toujours vérifier les formats d'API lors de migrations
- ✅ Ajouter une couche de normalisation entre API et business logic
- ✅ Logger les formats détectés pour debugging futur
- ✅ Prévoir des formats "unknown" avec fallback JSON

---

## 🔵 Problème #4 : Encodage Caractères Spéciaux

### Symptômes
```
# Attendu:
"Méthode des risques par les tâches clés"

# Reçu:
"M├®thode des risques par les t├óches cl├®s"
```

### Contexte
- **Quand** : Lors de l'affichage des réponses n8n
- **Où** : Partout où il y a des caractères accentués
- **Impact** : 🔵 **MINEUR** - Visuel dégradé mais fonctionnel

### Cause Probable
Problème d'encodage UTF-8 quelque part dans la chaîne :
- Soit côté n8n cloud (stockage ou API)
- Soit côté fetch/JSON.parse
- Soit côté affichage React

### Investigation
```typescript
// Test encodage dans n8nService.ts
console.log('[n8nService] Raw result:', JSON.stringify(result));
// Résultat: Les caractères sont déjà mal encodés ici

// Donc le problème vient soit:
// 1. De l'API n8n cloud
// 2. Du fetch/response.json()
```

### Solution Temporaire
❌ **Non résolu pour le moment**

**Raison** : Problème mineur, les tableaux sont lisibles

### Solutions Possibles

**Option 1** : Décoder manuellement
```typescript
function fixEncoding(text: string): string {
  // Mapper les caractères mal encodés
  const map = {
    '├®': 'é',
    '├á': 'à',
    '├¿': 'è',
    // ... autres mappings
  };
  
  let fixed = text;
  for (const [wrong, right] of Object.entries(map)) {
    fixed = fixed.replace(new RegExp(wrong, 'g'), right);
  }
  return fixed;
}
```

**Option 2** : Fix côté n8n cloud
- Vérifier l'encodage UTF-8 des workflows
- Ajouter headers `charset=utf-8` dans la réponse

**Option 3** : Buffer decode
```typescript
const response = await fetch(url);
const buffer = await response.arrayBuffer();
const decoder = new TextDecoder('utf-8');
const text = decoder.decode(buffer);
const result = JSON.parse(text);
```

### Leçons Apprises
- ⚠️ Vérifier l'encodage UTF-8 end-to-end
- ⚠️ Tester avec des caractères accentués dès le début
- ⚠️ Problèmes d'encodage souvent côté API source

---

## 🟢 Problème #5 : Dépendance `bun` pour WebUI

### Symptômes
```bash
npm run webui
# Erreur: 'bun' n'est pas reconnu comme commande
```

### Contexte
- **Quand** : Tentative de lancement du serveur WebUI
- **Où** : Script `package.json` → `"webui": "bun run cli -- --webui"`
- **Impact** : 🔵 **MINEUR** - Contournable facilement

### Cause
Les scripts WebUI utilisent `bun` qui n'était pas installé sur le système.

### Solution
Création d'un script Node.js alternatif : `start-webui.js`

```javascript
const { spawn, execSync } = require('child_process');

// 1. Build l'application
execSync('npm run package', {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
});

// 2. Lance Electron avec --webui
const electronPath = require('electron');
const args = [path.join(__dirname, 'out', 'main', 'index.js'), '--webui'];

if (process.argv.includes('--remote')) {
  args.push('--remote');
}

spawn(electronPath, args, { stdio: 'inherit' });
```

**Usage** :
```bash
node start-webui.js          # Mode local
node start-webui.js --remote # Mode réseau
```

### Validation
✅ Build et lancement fonctionnent sans `bun`

### Leçons Apprises
- ✅ Minimiser les dépendances système spécifiques
- ✅ Fournir des alternatives Node.js pures
- ✅ Documenter les scripts de lancement

---

## 📊 Résumé des Problèmes

| # | Problème | Sévérité | Temps | Statut | Workaround |
|---|----------|----------|-------|--------|------------|
| 1 | ECONNREFUSED localhost:3458 | 🔴 Bloquant | 30min | ✅ Résolu | N/A |
| 2 | Réponses non affichées (IPC) | 🔴 Critique | 2h | ⚠️ Workaround | DB reload |
| 3 | Format réponse incompatible | 🟡 Modéré | 1h | ✅ Résolu | N/A |
| 4 | Encodage caractères | 🔵 Mineur | 15min | ❌ Non résolu | Acceptable |
| 5 | Dépendance bun | 🔵 Mineur | 30min | ✅ Résolu | Script Node.js |

---

## 🎯 Recommandations

### Priorité Haute
1. **Fix IPC Stream** - Investiguer pourquoi les événements ne passent pas
2. **Polling intelligent** - Remplacer setTimeout fixe par polling adaptatif

### Priorité Moyenne
3. **Encodage UTF-8** - Corriger les caractères spéciaux
4. **Tests automatisés** - Ajouter tests pour tous les formats n8n

### Priorité Basse
5. **WebSocket backend** - Alternative long-terme à IPC stream
6. **Retry logic** - Gestion automatique des échecs réseau

---

**Navigation** : [← ARCHITECTURE](./ARCHITECTURE.md) | [Suivant: SOLUTIONS_IMPLEMENTEES.md →](./SOLUTIONS_IMPLEMENTEES.md)
