# Flux des Requêtes n8n - Documentation Détaillée

> Diagrammes et explications exhaustives du parcours d'une requête n8n

---

## 🔄 Vue d'Ensemble du Flux

### Schéma Simplifié

```
User Input
   │
   ▼
[N8nSendBox.tsx] ──IPC──▶ [N8nAgentManager.ts] ──HTTP──▶ [n8n Cloud]
   │                            │                              │
   │                            │◀────JSON Response────────────┘
   │                            │
   │                            ├──▶ [n8nResponseParser.ts]
   │                            │
   │                            ├──▶ [Database Save]
   │                            │
   │◀────IPC Stream (skip)──────┤
   │                            │
   │◀────DB Reload (1.5s)───────┤
   │
   ▼
Display Tables
```

---

## 📝 Flux Détaillé Étape par Étape

### Phase 1 : Saisie Utilisateur

#### 1.1 User Input Component (`N8nSendBox.tsx`)

**Trigger** : Utilisateur tape un message et appuie sur Entrée

```typescript
// Fichier: src/renderer/pages/conversation/n8n/N8nSendBox.tsx

const handleSend = useCallback(async (content: string) => {
  // Validation
  if (!content.trim() || sending) return;
  
  // 1. Marquer comme "envoi en cours"
  setSending(true);
  
  // 2. Générer IDs uniques
  const assistant_msg_id = uuid();  // Pour la réponse assistant
  const user_msg_id = uuid();       // Pour le message utilisateur
  
  // 3. Créer placeholder immédiat
  addOrUpdateMessage({
    id: assistant_msg_id,
    msg_id: assistant_msg_id,
    type: 'text',
    position: 'left',  // Gauche = assistant
    conversation_id,
    content: {
      content: '🔄 Exécution en cours...',
    },
    createdAt: Date.now() + 1,
  } as TMessage, true);  // ← true = add (not update)
  
  // ... suite dans Phase 2
}, [conversation_id, sending]);
```

**État UI à ce stade** :
```
┌─────────────────────────────────────┐
│  N8n Conversation                   │
├─────────────────────────────────────┤
│                                     │
│  [User Message]    ────────────────▶│  (Message utilisateur, droite)
│                                     │
│◀─────  🔄 Exécution en cours...    │  (Placeholder, gauche)
│                                     │
└─────────────────────────────────────┘
```

---

### Phase 2 : Communication IPC vers Backend

#### 2.1 Envoi IPC (`N8nSendBox.tsx` → IPC Bridge)

```typescript
// Suite de handleSend()
try {
  // 4. Appel IPC vers le Main Process
  await ipcBridge.conversation.sendMessage.invoke({
    conversation_id: conversation_id,
    input: content,
    msg_id: assistant_msg_id,  // Pour la réponse
    user_msg_id: user_msg_id,  // Pour le message user
    files: [],
  });
  
  // ... suite dans Phase 6 (workaround)
} catch (error) {
  // Gestion d'erreur
}
```

**IPC Channel** : `'conversation.send.message'`

**Flux IPC** :
```
Renderer Process            Main Process
     │                           │
     ├─── invoke('conversation.send.message', {
     │        conversation_id,
     │        input,
     │        msg_id,
     │        user_msg_id
     │    })
     │                           │
     │                           ▼
     │                   [conversationBridge]
     │                    provider handler
```

---

#### 2.2 Réception Backend (`conversationBridge.ts`)

```typescript
// Fichier: src/process/bridge/conversationBridge.ts

ipcBridge.conversation.sendMessage.provider(async ({ 
  conversation_id, 
  input, 
  msg_id,
  user_msg_id,
  files 
}) => {
  console.log(`[conversationBridge] sendMessage called: conversation_id=${conversation_id}`);
  
  // 1. Récupérer la tâche (conversation)
  const task = await WorkerManage.getTaskByIdRollbackBuild(conversation_id);
  
  if (!task) {
    return { success: false, msg: 'Conversation not found' };
  }
  
  // 2. Router selon le type
  if (task.type === 'n8n') {
    // 3. Appeler le manager n8n
    await (task as N8nAgentManager).sendMessage({
      content: input,
      files: workspaceFiles,
      msg_id: msg_id,
      user_msg_id: user_msg_id
    });
    
    return { success: true };
  }
  
  // ... autres types (acp, gemini, etc.)
});
```

**Decision Tree** :
```
conversation.sendMessage.invoke()
    │
    ▼
Get Task by ID
    │
    ├── type === 'n8n' ──────▶ N8nAgentManager.sendMessage()
    ├── type === 'acp' ──────▶ AcpAgentManager.sendMessage()
    ├── type === 'gemini' ───▶ GeminiAgentManager.sendMessage()
    └── ...
```

---

### Phase 3 : Traitement par N8nAgentManager

#### 3.1 Manager Reception (`N8nAgentManager.ts`)

```typescript
// Fichier: src/process/task/N8nAgentManager.ts

async sendMessage({ content, msg_id, user_msg_id }) {
  // 1. Forcer status "running"
  (this as any).status = 'running';
  
  // 2. Sauvegarder message utilisateur en DB
  const userMessage: TMessage = {
    id: user_msg_id || uuid(),
    msg_id: user_msg_id || msg_id,
    type: 'text',
    position: 'right',  // Droite = utilisateur
    conversation_id: this.id,
    content: {
      content: content,
    },
    createdAt: Date.now(),
  };
  addMessage(this.id, userMessage);
  
  // 3. Émettre event IPC "user_content" (pour UI real-time)
  ipcBridge.conversation.responseStream.emit({
    type: 'user_content',
    conversation_id: this.id,
    msg_id: userMessage.msg_id,
    data: content,
  });
  
  // 4. Exécuter le workflow
  await this.execute(content, msg_id);
}
```

**État DB à ce stade** :
```sql
-- Table messages
INSERT INTO messages VALUES (
  'user_msg_id_123',           -- id
  'user_msg_id_123',           -- msg_id
  'conversation_042aabe0',     -- conversation_id
  'text',                       -- type
  'right',                      -- position
  '{"content": "- [Command] = Programme...\n..."}',  -- content (JSON)
  1731682500000                -- created_at
);
```

---

#### 3.2 Workflow Execution (`N8nAgentManager.ts`)

```typescript
async execute(userMessage: string, msgId: string) {
  try {
    console.log('[N8nAgentManager] Executing workflow...');
    
    // 1. Appeler n8nService
    const result = await executeN8nWorkflow({ 
      userMessage: userMessage 
    });
    
    console.log('[N8nAgentManager] Result received:', {
      success: result.success,
      hasData: !!result.data
    });
    
    if (result.success && result.data) {
      // Suite dans Phase 4
    } else {
      // Gestion erreur
    }
  } catch (error) {
    // Gestion erreur
  }
}
```

---

### Phase 4 : Appel HTTP vers n8n Cloud

#### 4.1 HTTP Request (`n8nService.ts`)

```typescript
// Fichier: src/process/services/n8nService.ts

export async function executeN8nWorkflow(
  request: N8nExecuteRequest
): Promise<N8nExecuteResponse> {
  
  console.log('[n8nService] Executing workflow:', {
    message: request.userMessage.substring(0, 100)
  });
  
  // 1. Préparer le body
  const requestBody = {
    question: request.userMessage
  };
  
  // 2. Appel HTTP POST
  const response = await fetch(N8N_CLOUD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  // 3. Vérifier status
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // 4. Parser JSON
  const result = await response.json();
  console.log('[n8nService] Workflow executed successfully');
  console.log('[n8nService] Raw result:', JSON.stringify(result).substring(0, 500));
  
  // Suite dans Phase 5
}
```

**HTTP Request détails** :
```http
POST /webhook/template HTTP/1.1
Host: 5ociivmf.rpcl.app
Content-Type: application/json
Accept: application/json
Content-Length: 156

{
  "question": "- [Command] = Programme de travail\n- [Processus] = inventaire de caisse\n- [Nb de lignes] = 25"
}
```

**HTTP Response (FORMAT 1)** :
```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 5432

[{
  "output": "| Rubrique | Description |\n| --- | --- |\n| Etape de mission | Programme de travail |\n...",
  "status": "success",
  "tables_found": 2,
  "timestamp": "2026-11-15T16:30:00Z"
}]
```

---

### Phase 5 : Normalisation et Parsing

#### 5.1 Format Normalization (`n8nService.ts`)

```typescript
// Suite de executeN8nWorkflow()

// 5. Normaliser le format
const normalized = normalizeN8nResponse(result);
console.log('[n8nService] Normalized result:', 
  JSON.stringify(normalized).substring(0, 500)
);

return {
  success: true,
  data: normalized,
};
```

**Transformation FORMAT 1** :
```typescript
// INPUT (raw n8n)
[{
  "output": "| Rubrique | Description |\n...",
  "status": "success",
  "tables_found": 2,
  "timestamp": "2026-11-15T16:30:00Z"
}]

// OUTPUT (normalized)
{
  type: 'text',
  content: "| Rubrique | Description |\n...",
  metadata: {
    status: "success",
    tables_found: 2,
    timestamp: "2026-11-15T16:30:00Z",
    format: "array_output"
  }
}
```

**Detection de Format** :
```typescript
function normalizeN8nResponse(result: any): any {
  // ✅ FORMAT 1: Array with output
  if (Array.isArray(result) && result[0]?.output) {
    console.log('[n8nService] FORMAT 1: Array with output');
    return {
      type: 'text',
      content: String(result[0].output || ''),
      metadata: { ... }
    };
  }
  
  // ✅ FORMAT 2: Object with tables
  if (result?.tables && Array.isArray(result.tables)) {
    console.log('[n8nService] FORMAT 2: Object with tables');
    return {
      type: 'tables',
      tables: result.tables,
      metadata: { ... }
    };
  }
  
  // ✅ FORMAT 3: Direct output
  if (result?.output && typeof result.output === 'string') {
    console.log('[n8nService] FORMAT 3: Direct output');
    return {
      type: 'text',
      content: result.output,
      metadata: { ... }
    };
  }
  
  // ✅ FORMAT 4: Data structure
  if (result?.data) {
    console.log('[n8nService] FORMAT 4: Programme with data');
    return {
      type: 'structured_data',
      data: result.data,
      metadata: { ... }
    };
  }
  
  // ❌ Unknown
  console.warn('[n8nService] Unknown format');
  return {
    type: 'unknown',
    raw: result,
    metadata: { format: 'unknown_fallback' }
  };
}
```

---

#### 5.2 Markdown Parsing (`n8nResponseParser.ts`)

```typescript
// Retour dans N8nAgentManager.execute()

// 6. Parser vers markdown
const markdown = parseN8nResponse(result.data);
console.log('[N8nAgentManager] Markdown generated:', 
  markdown.substring(0, 200)
);
```

**Parser Logic** :
```typescript
// Fichier: src/agent/n8n/n8nResponseParser.ts

export function parseN8nResponse(data: any): string {
  console.log('[n8nResponseParser] Parsing data type:', 
    data?.type, 'hasContent:', !!data?.content
  );
  
  if (!data) {
    return '❌ Erreur: Aucune donnée reçue';
  }
  
  switch (data.type) {
    case 'structured_data':
      // Conversion complexe avec détection de tables
      return convertStructuredDataToMarkdown(data.data);
      
    case 'text':
      // Déjà en markdown, retour direct
      return data.content || '';
      
    case 'tables':
      // Joindre les tables avec séparateurs
      return data.tables
        .map((t: any) => t?.markdown || '')
        .filter((c: string) => c.trim() !== '')
        .join('\n\n---\n\n');
        
    case 'unknown':
      // Afficher JSON brut
      return `**Format non reconnu**\n\n\`\`\`json\n${JSON.stringify(data.raw, null, 2)}\n\`\`\``;
      
    case 'error':
      return `❌ ${data.error}`;
      
    default:
      return `**Format inattendu**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
}
```

**Exemple Markdown Généré** :
```markdown
| Rubrique | Description |
| --- | --- |
| Etape de mission | Programme de travail |
| Norme | 13.6 Programme de travail |
| Méthode | Méthode des risques par les tâches clés |
| Reference | Prg-001 |

### 📑 Programme de Travail - Contrôles Audit

| no | tâches clés | Point de controle | Risque | contrôle audit | Document |
| --- | --- | --- | --- | --- | --- |
| 1 | Préparer le brouillard de caisse | ... | ... | ... | ... |
| 2 | Vérifier les espèces | ... | ... | ... | ... |
...
```

---

### Phase 6 : Sauvegarde et Notification

#### 6.1 Database Save (`N8nAgentManager.ts`)

```typescript
// Suite de execute()

// 7. Sauvegarder message assistant en DB
const assistantMessage: TMessage = {
  id: uuid(),
  msg_id: msgId,
  type: 'text',
  position: 'left',  // Gauche = assistant
  conversation_id: this.id,
  content: {
    content: markdown,  // ← Le markdown complet
  },
  createdAt: Date.now(),
};
addMessage(this.id, assistantMessage);
console.log('[N8nAgentManager] Message saved to DB');
```

**État DB Final** :
```sql
-- Table messages (2 entrées)
-- 1. Message utilisateur
INSERT INTO messages VALUES (..., 'right', ...);

-- 2. Message assistant (réponse n8n)
INSERT INTO messages VALUES (
  'msg_id_789',
  'msg_id_789',
  'conversation_042aabe0',
  'text',
  'left',  -- ← assistant
  '{"content": "| Rubrique | Description |\n..."}',  -- ← markdown complet
  1731682503000
);
```

---

#### 6.2 IPC Stream Emission (`N8nAgentManager.ts`)

```typescript
// 8. Émettre événement IPC "message"
console.log('[N8nAgentManager] Emitting message event to frontend...');
ipcBridge.conversation.responseStream.emit({
  type: 'message',
  conversation_id: this.id,
  msg_id: msgId,
  data: markdown,  // ← Markdown complet
});

// 9. Émettre événement IPC "finish"
console.log('[N8nAgentManager] Emitting finish event...');
ipcBridge.conversation.responseStream.emit({
  type: 'finish',
  conversation_id: this.id,
  msg_id: msgId,
  data: null,
});

console.log('[N8nAgentManager] All events emitted successfully');
```

**IPC Events Émis** :
```typescript
// Event 1: Message avec contenu
{
  type: 'message',
  conversation_id: 'conversation_042aabe0',
  msg_id: 'msg_id_789',
  data: "| Rubrique | Description |\n| --- | --- |\n..."  // Long markdown
}

// Event 2: Fin de traitement
{
  type: 'finish',
  conversation_id: 'conversation_042aabe0',
  msg_id: 'msg_id_789',
  data: null
}
```

---

### Phase 7 : Réception Frontend (Théorique)

#### 7.1 IPC Listener (`N8nSendBox.tsx`)

**Ce qui DEVRAIT se passer** :
```typescript
// Fichier: src/renderer/pages/conversation/n8n/N8nSendBox.tsx

useEffect(() => {
  console.log('[N8nSendBox] Setting up listener for:', conversation_id);
  
  return ipcBridge.conversation.responseStream.on((message) => {
    console.log('[N8nSendBox] Received event:', message.type);
    
    if (conversation_id !== message.conversation_id) {
      return;  // Pas pour nous
    }
    
    if (message.type === 'message') {
      console.log('[N8nSendBox] Updating UI with message');
      
      // Mettre à jour le message placeholder
      addOrUpdateMessage({
        id: message.msg_id,
        msg_id: message.msg_id,
        type: 'text',
        position: 'left',
        conversation_id,
        content: {
          content: message.data,  // ← Markdown reçu
        },
        createdAt: Date.now(),
      } as TMessage);  // ← false = update (not add)
      
      console.log('[N8nSendBox] UI updated');
    }
    
    if (message.type === 'finish') {
      console.log('[N8nSendBox] Stopping loading');
      setSending(false);
    }
  });
}, [conversation_id, addOrUpdateMessage]);
```

**Ce qui SE PASSE réellement** :
```
❌ Aucun log '[N8nSendBox] Received event'
❌ Le listener ne reçoit JAMAIS les événements
❌ L'UI reste sur "🔄 Exécution en cours..."
```

**Raisons (hypothèses)** :
1. Timing : Événement émis trop tôt/tard
2. Buffer : Événement IPC bufferisé et perdu
3. Context : Problème de contexte Electron
4. Async : Race condition

---

### Phase 8 : Workaround DB Reload

#### 8.1 Timer-Based Reload (`N8nSendBox.tsx`)

```typescript
// Retour dans handleSend(), après l'invoke IPC

// WORKAROUND: Les événements IPC ne passent pas
// → Recharger depuis la DB après 1.5s
setTimeout(async () => {
  console.log('[N8nSendBox] Reloading messages from DB (workaround)');
  
  try {
    // 1. Charger TOUS les messages de la conversation
    const messages = await ipcBridge.database.getConversationMessages.invoke({
      conversation_id: conversation_id,
      page: 0,
      pageSize: 10000,  // Tout charger
    });
    
    console.log('[N8nSendBox] Loaded', messages.length, 'messages from DB');
    
    // 2. Remplacer complètement la liste des messages
    if (messages && Array.isArray(messages)) {
      updateMessageList(() => messages);
      console.log('[N8nSendBox] Message list updated');
    }
  } catch (err) {
    console.error('[N8nSendBox] Failed to reload:', err);
  } finally {
    // 3. Arrêter le spinner
    setSending(false);
  }
}, 1500);  // ← Délai fixe 1.5 secondes
```

**Timeline du Workaround** :
```
T=0ms     User clicks Send
T=50ms    Placeholder appears ("🔄 Exécution en cours...")
T=100ms   IPC invoke sent to backend
T=500ms   n8n HTTP request sent
T=2500ms  n8n response received (2 secondes)
T=2600ms  Markdown generated and saved to DB
T=2700ms  IPC events emitted (lost)
T=1500ms  ← setTimeout fires (BEFORE response!)
T=1600ms  DB reload #1 (no new message yet)
T=3000ms  ← setTimeout would fire again IF retriggered
T=3100ms  DB reload #2 (message is there!)
          ✅ Tables appear!
```

**Problème du Délai Fixe** :
- Si n8n répond en < 1.5s : Reload trop tôt, rien à afficher
- Si n8n répond en > 1.5s : Reload trop tôt, reload encore après
- Actuellement : Fonctionne car n8n prend ~2-3s

---

### Phase 9 : Rendu Final

#### 9.1 Message List Update

```typescript
// Le updateMessageList() déclenche un re-render de MessageList
// MessageList contient tous les messages de la conversation

// Hooks de MessageList
useMessageLstCache(conversation_id);  // ← Charge initialement
// updateMessageList() remplace la liste entière

// Résultat:
// - Messages utilisateur (droite)
// - Messages assistant (gauche)
//   ↳ Markdown
//      ↳ Tables HTML
//         ↳ useTableEnhancer
//            ↳ Context menu, save, etc.
```

#### 9.2 Markdown Rendering

```typescript
// Composant Markdown.tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
  rehypePlugins={[rehypeRaw, rehypeKatex]}
  components={{
    table: ({ node, ...props }) => (
      <table className="claraverse-table" {...props} />
    ),
    // ... autres composants
  }}
>
  {markdown}  // ← Le markdown parsé de n8n
</ReactMarkdown>
```

**Rendu HTML Final** :
```html
<div class="message left">
  <div class="markdown-content">
    <table class="claraverse-table">
      <thead>
        <tr>
          <th>Rubrique</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Etape de mission</strong></td>
          <td>Programme de travail</td>
        </tr>
        <!-- ... plus de lignes -->
      </tbody>
    </table>
    
    <h3>📑 Programme de Travail - Contrôles Audit</h3>
    
    <table class="claraverse-table">
      <!-- ... grande table de données -->
    </table>
  </div>
</div>
```

#### 9.3 Table Enhancement

```typescript
// Hook useTableEnhancer détecte les nouvelles tables
useTableEnhancer();  // Ajoute:
// - Tri des colonnes
// - Recherche
// - Export CSV
// - Context menu (clic droit)
// - Scroll horizontal
// - Persistance état
```

---

## ⏱️ Timeline Complète

```
│ User Input
├─ 0ms ─────────────────────────────────────────┐
│                                                │
│ Frontend: Create placeholder                   │
├─ 50ms ────────────────────────────────────────┤
│                                                │
│ IPC: Send to backend                           │
├─ 100ms ───────────────────────────────────────┤
│                                                │
│ Backend: Route to N8nAgentManager              │
├─ 150ms ───────────────────────────────────────┤
│                                                │
│ Backend: Save user message to DB               │
├─ 200ms ───────────────────────────────────────┤
│                                                │
│ Backend: HTTP POST to n8n cloud                │
├─ 500ms ───────────────────────────────────────┤
│                                                │
│ ... n8n processing ...                         │
│                                                │
├─ 2500ms ──────────────────────────────────────┤
│                                                │
│ Backend: Receive n8n response                  │
├─ 2600ms ──────────────────────────────────────┤
│                                                │
│ Backend: Normalize format                      │
├─ 2650ms ──────────────────────────────────────┤
│                                                │
│ Backend: Parse to markdown                     │
├─ 2700ms ──────────────────────────────────────┤
│                                                │
│ Backend: Save to DB                            │
├─ 2750ms ──────────────────────────────────────┤
│                                                │
│ Backend: Emit IPC events (lost)                │
├─ 2800ms ──────────────────────────────────────┤
│                                                │
│ Frontend: setTimeout fires (1500ms after send) │
├─ 1500ms ──────────────────────────────────────┤
│                                                │
│ Frontend: First DB reload (too early)          │
├─ 1600ms ──────────────────────────────────────┤
│                                                │
│ Frontend: Second setTimeout (if retriggered)   │
├─ 3000ms ──────────────────────────────────────┤
│                                                │
│ Frontend: Reload DB, message found!            │
├─ 3100ms ──────────────────────────────────────┤
│                                                │
│ Frontend: Render markdown tables               │
├─ 3200ms ──────────────────────────────────────┤
│                                                │
│ ✅ User sees tables                            │
└─ 3300ms ──────────────────────────────────────┘
```

**Total Temps Perçu** : 3.3 secondes
- n8n processing : 2 secondes
- Backend processing : 0.5 secondes
- Workaround delay : 0.8 secondes (overlap)

---

## 🔍 Points Clés pour un Agent de Code

### 1. Fichiers à Modifier pour Changer le Flux

**Ajouter un workflow** :
- `n8n-server-multi-workflow/n8n_script/claraApiService.ts` (endpoint URL)

**Modifier le format de réponse** :
- `src/process/services/n8nService.ts` (normalizeN8nResponse)
- `src/agent/n8n/n8nResponseParser.ts` (parseN8nResponse)

**Changer l'affichage** :
- `src/renderer/pages/conversation/n8n/N8nSendBox.tsx` (UI)
- `src/renderer/components/Markdown.tsx` (rendu markdown)

**Fix IPC Stream** :
- `src/renderer/pages/conversation/n8n/N8nSendBox.tsx` (listener)
- `src/process/task/N8nAgentManager.ts` (emitter)
- `src/common/ipcBridge.ts` (bridge definition)

### 2. Variables Critiques

```typescript
// URLs
N8N_CLOUD_URL = 'https://5ociivmf.rpcl.app/webhook/template'

// IDs
conversation_id  // Unique par conversation
msg_id          // Unique par message
user_msg_id     // Unique pour message user

// Channels IPC
'conversation.send.message'     // Invoke
'chat.response.stream'          // Emit
'database.get-conversation-messages'  // Query

// Délais
1500ms  // Workaround timeout
2-5s    // n8n response time moyenne
```

### 3. Debugging Quick Reference

```typescript
// Backend logs (Main Process terminal)
'[n8nService]'
'[N8nAgentManager]'
'[conversationBridge]'

// Frontend logs (DevTools F12)
'[N8nSendBox]'
'[n8nResponseParser]'

// DB inspection
SELECT * FROM messages WHERE conversation_id = 'xxx' ORDER BY created_at DESC;

// Test endpoint direct
curl -X POST https://5ociivmf.rpcl.app/webhook/template \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

---

**Navigation** : [← ARCHITECTURE](./ARCHITECTURE.md) | [Suivant: CODE_REFERENCE.md →](./CODE_REFERENCE.md)
