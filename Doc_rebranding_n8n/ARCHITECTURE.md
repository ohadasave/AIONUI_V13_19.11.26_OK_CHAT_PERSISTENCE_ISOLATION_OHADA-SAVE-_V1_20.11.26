# Architecture n8n Cloud - Documentation Technique

> Architecture détaillée du système n8n après migration cloud

---

## 📐 Vue d'Ensemble

### Architecture Multi-Process Electron

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron App                              │
├──────────────────────────┬──────────────────────────────────────┤
│   Renderer Process       │        Main Process                   │
│   (Chromium/Blink)       │        (Node.js)                     │
│                          │                                       │
│  ┌───────────────────┐   │   ┌───────────────────────────────┐ │
│  │   React UI        │   │   │   N8nAgentManager            │ │
│  │  ┌─────────────┐  │   │   │   ┌─────────────────────┐   │ │
│  │  │ N8nSendBox  │◄─┼───IPC──┤   │ execute()          │   │ │
│  │  │             │  │   │   │   │ sendMessage()       │   │ │
│  │  │ - Input     │  │   │   │   └────────┬────────────┘   │ │
│  │  │ - Display   │  │   │   │            │                 │ │
│  │  │ - Listeners │  │   │   │   ┌────────▼────────────┐   │ │
│  │  └─────────────┘  │   │   │   │  n8nService.ts      │   │ │
│  │                    │   │   │   │                      │   │ │
│  │  MessageList       │   │   │   │  executeN8nWorkflow()│  │ │
│  │  ┌─────────────┐  │   │   │   │  normalizeResponse() │  │ │
│  │  │ Markdown    │  │   │   │   └────────┬────────────┘   │ │
│  │  │ Tables      │  │   │   │            │                 │ │
│  │  │ Rendering   │  │   │   │            │ HTTP POST       │ │
│  │  └─────────────┘  │   │   │            ▼                 │ │
│  │                    │   │   │   ┌──────────────────────┐  │ │
│  │  useTableEnhancer  │   │   │   │  n8n Cloud Platform │  │ │
│  │  Context Menu      │   │   │   │  5ociivmf.rpcl.app  │  │ │
│  └───────────────────┘   │   │   └──────────────────────┘  │ │
│                          │   │                               │ │
│  ┌───────────────────┐   │   │   ┌─────────────────────┐   │ │
│  │ IPC Bridge        │   │   │   │ Database (SQLite)   │   │ │
│  │ - responseStream  │◄──┼───IPC─▶│ - Messages          │   │ │
│  │ - sendMessage     │   │   │   │ - Conversations     │   │ │
│  └───────────────────┘   │   │   └─────────────────────┘   │ │
└──────────────────────────┴──────────────────────────────────────┘
                                  │
                                  │ HTTPS
                                  ▼
                    ┌────────────────────────────┐
                    │   n8n Cloud Platform       │
                    │   https://5ociivmf.rpcl    │
                    │                            │
                    │   15 Workflow Endpoints    │
                    └────────────────────────────┘
```

---

## 🏗️ Composants Détaillés

### 1. Renderer Process (Frontend)

#### Composant Principal : N8nSendBox.tsx

**Localisation** : `src/renderer/pages/conversation/n8n/N8nSendBox.tsx`

**Responsabilités** :
- Gestion de l'input utilisateur
- Affichage du placeholder pendant l'exécution
- Écoute des événements IPC
- **Workaround** : Rechargement DB après 1.5s

**Hooks Utilisés** :
```typescript
const addOrUpdateMessage = useAddOrUpdateMessage();
const updateMessageList = useUpdateMessageList();
const [sending, setSending] = useState(false);
const [input, setInput] = useState('');
```

**Flux d'Événements** :
```typescript
// 1. User Input
handleSend(content) 
  ↓
// 2. Create Placeholder
addOrUpdateMessage({
  content: '🔄 Exécution en cours...',
  position: 'left'
}, true)
  ↓
// 3. Send to Backend
ipcBridge.conversation.sendMessage.invoke({...})
  ↓
// 4. WORKAROUND: Reload from DB after 1.5s
setTimeout(() => {
  const messages = await ipcBridge.database.getConversationMessages.invoke(...)
  updateMessageList(() => messages)
}, 1500)
```

#### Composant d'Affichage : MessageList

**Localisation** : `src/renderer/messages/MessageList.tsx`

**Rôle** :
- Affiche la liste des messages
- Rendu markdown via `Markdown.tsx`
- Gestion du scroll automatique
- Support des tables Claraverse

**Hooks de Persistance** :
```typescript
useMessageLstCache(conversation_id);  // Charge les messages au mount
useTableEnhancer();                   // Améliore les tables HTML
useTablePersistence();                // Sauvegarde l'état des tables
```

---

### 2. Main Process (Backend)

#### Service : n8nService.ts

**Localisation** : `src/process/services/n8nService.ts`

**URL de Base** :
```typescript
const N8N_CLOUD_URL = 'https://5ociivmf.rpcl.app/webhook/template';
```

**Fonction Principale** :
```typescript
export async function executeN8nWorkflow(
  request: N8nExecuteRequest
): Promise<N8nExecuteResponse> {
  
  // 1. Préparer le body
  const requestBody = {
    question: request.userMessage
  };
  
  // 2. Appel HTTP
  const response = await fetch(N8N_CLOUD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  // 3. Parser JSON
  const result = await response.json();
  
  // 4. Normaliser
  const normalized = normalizeN8nResponse(result);
  
  // 5. Retourner
  return {
    success: true,
    data: normalized,
  };
}
```

**Normalisation des Réponses** :
```typescript
function normalizeN8nResponse(result: any): any {
  // FORMAT 1: Array avec output (80% des cas)
  if (Array.isArray(result) && result[0]?.output) {
    return {
      type: 'text',
      content: String(result[0].output || ''),
      metadata: {
        status: result[0].status,
        tables_found: result[0].tables_found,
        timestamp: result[0].timestamp,
        format: 'array_output',
      },
    };
  }
  
  // FORMAT 2: Object avec tables
  if (result?.tables && Array.isArray(result.tables)) {
    return {
      type: 'tables',
      tables: result.tables,
      metadata: {
        status: result.status,
        tables_found: result.tables.length,
        format: 'tables_array',
      },
    };
  }
  
  // FORMAT 3: Direct output
  if (result?.output && typeof result.output === 'string') {
    return {
      type: 'text',
      content: result.output,
      metadata: {
        format: 'direct_output',
      },
    };
  }
  
  // FORMAT 4: Data structure
  if (result?.data) {
    return {
      type: 'structured_data',
      data: result.data,
      metadata: {
        format: 'programme_travail_data',
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  // Unknown
  return {
    type: 'unknown',
    raw: result,
    metadata: {
      format: 'unknown_fallback',
    },
  };
}
```

#### Agent Manager : N8nAgentManager.ts

**Localisation** : `src/process/task/N8nAgentManager.ts`

**Classe** :
```typescript
export class N8nAgentManager {
  public readonly type = 'n8n';
  public readonly id: string;
  public readonly workspace: string;
  public readonly status = 'idle';
  private conversation: TChatConversation;
  
  constructor(conversation: TChatConversation) {
    this.id = conversation.id;
    this.conversation = conversation;
    this.workspace = conversation.extra?.workspace || '';
  }
  
  async sendMessage({ content, msg_id, user_msg_id }) {
    // 1. Sauvegarder message utilisateur
    addMessage(this.id, userMessage);
    
    // 2. Émettre event user_content
    ipcBridge.conversation.responseStream.emit({
      type: 'user_content',
      conversation_id: this.id,
      msg_id: user_msg_id,
      data: content,
    });
    
    // 3. Exécuter workflow
    await this.execute(content, msg_id);
  }
  
  async execute(userMessage: string, msgId: string) {
    try {
      // 1. Appeler n8n
      const result = await executeN8nWorkflow({ userMessage });
      
      if (result.success && result.data) {
        // 2. Parser vers markdown
        const markdown = parseN8nResponse(result.data);
        
        // 3. Sauvegarder en DB
        addMessage(this.id, {
          id: uuid(),
          msg_id: msgId,
          type: 'text',
          position: 'left',
          conversation_id: this.id,
          content: { content: markdown },
          createdAt: Date.now(),
        });
        
        // 4. Émettre event IPC
        ipcBridge.conversation.responseStream.emit({
          type: 'message',
          conversation_id: this.id,
          msg_id: msgId,
          data: markdown,
        });
        
        // 5. Émettre finish
        ipcBridge.conversation.responseStream.emit({
          type: 'finish',
          conversation_id: this.id,
          msg_id: msgId,
          data: null,
        });
      }
    } catch (error) {
      // Gestion erreur
    }
  }
}
```

---

### 3. Parser & Transformers

#### Parser : n8nResponseParser.ts

**Localisation** : `src/agent/n8n/n8nResponseParser.ts`

**Fonction Principale** :
```typescript
export function parseN8nResponse(data: any): string {
  if (!data) {
    return '❌ Erreur: Aucune donnée reçue';
  }
  
  switch (data.type) {
    case 'structured_data':
      return convertStructuredDataToMarkdown(data.data);
      
    case 'text':
      return data.content || '';
      
    case 'tables':
      return data.tables
        .map((table: any) => table?.markdown || '')
        .filter((content: string) => content.trim() !== '')
        .join('\n\n---\n\n');
        
    case 'unknown':
      return `**Format non reconnu**\n\n\`\`\`json\n${JSON.stringify(data.raw, null, 2)}\n\`\`\``;
      
    case 'error':
      return `❌ ${data.error}`;
      
    default:
      return `**Format inattendu**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
}
```

**Conversion Markdown** :
```typescript
function convertStructuredDataToMarkdown(data: any): string {
  let markdown = '';
  
  // 1. Trouver clé principale
  const mainKey = Object.keys(data).find(key => 
    key.toLowerCase().includes('etape') || 
    key.toLowerCase().includes('mission')
  ) || Object.keys(data)[0];
  
  const mainData = data[mainKey];
  
  // 2. Parcourir les tables
  mainData.forEach((tableObj: any) => {
    const tableKey = Object.keys(tableObj)[0];
    const tableData = tableObj[tableKey];
    const tableType = detectTableType(tableKey, tableData);
    
    // 3. Convertir selon le type
    switch (tableType) {
      case 'header':
        markdown += convertHeaderTableToMarkdown(tableData);
        break;
        
      case 'data_array':
        const title = generateTableTitle(tableKey, tableData);
        markdown += convertArrayTableToMarkdown(title, tableData);
        break;
        
      case 'download':
        markdown += convertDownloadTableToMarkdown(tableData);
        break;
        
      default:
        markdown += convertGenericStructureToMarkdown({ [tableKey]: tableData });
    }
  });
  
  return markdown;
}
```

---

### 4. IPC Bridge Communication

#### Bridge : ipcBridge

**Localisation** : `src/common/ipcBridge.ts`

**Channels Utilisés** :
```typescript
export const conversation = {
  // Envoi de message
  sendMessage: bridge.buildProvider<IBridgeResponse, ISendMessageParams>('conversation.send.message'),
  
  // Stream de réponses
  responseStream: bridge.buildEmitter<IResponseMessage>('chat.response.stream'),
  
  // Création conversation
  create: bridge.buildProvider<TChatConversation, IConversationCreateParams>('conversation.create'),
};

export const database = {
  // Récupération messages
  getConversationMessages: bridge.buildProvider<TMessage[], { conversation_id: string; page: number; pageSize: number }>('database.get-conversation-messages'),
};
```

**Types de Messages Stream** :
```typescript
interface IResponseMessage {
  type: 'user_content' | 'message' | 'error' | 'finish';
  conversation_id: string;
  msg_id: string;
  data: string | null;
}
```

**Flux IPC** :
```
Renderer ──sendMessage──▶ Main Process
                             │
                             ▼
                        N8nAgentManager
                             │
                             ▼
                        n8nService
                             │
                             ▼
                        n8n Cloud
                             │
                             ▼
                        Parse Response
                             │
                             ▼
                        Save to DB
                             │
                             ▼
Main Process ──responseStream──▶ Renderer
```

---

### 5. Stockage (SQLite)

#### Base de Données

**Localisation** : `src/process/database/`

**Tables Pertinentes** :
```sql
-- Conversations
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,  -- 'n8n' pour conversations n8n
  extra TEXT, -- JSON avec workspace, backend, etc.
  created_at INTEGER,
  updated_at INTEGER
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  msg_id TEXT,
  conversation_id TEXT,
  type TEXT,          -- 'text' pour messages n8n
  position TEXT,      -- 'left' (assistant) ou 'right' (user)
  content TEXT,       -- JSON avec { content: "markdown..." }
  created_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

**Opérations** :
```typescript
// Sauvegarder message
export function addMessage(conversation_id: string, message: TMessage) {
  const db = getDatabase();
  db.insertMessage(message);
}

// Récupérer messages
export async function getConversationMessages(
  conversation_id: string,
  page: number,
  pageSize: number
): Promise<TMessage[]> {
  const db = getDatabase();
  return db.getMessages(conversation_id, page, pageSize);
}
```

---

## 🔄 Séquence Complète

### Diagramme de Séquence

```
User          N8nSendBox      IPC Bridge     N8nAgentMgr    n8nService     n8n Cloud      Database
 │                │               │               │              │              │             │
 │──Input────────▶│               │               │              │              │             │
 │                │               │               │              │              │             │
 │                │──Placeholder──▶MessageList    │              │              │             │
 │                │               │               │              │              │             │
 │                │──sendMessage─▶│               │              │              │             │
 │                │               │──invoke──────▶│              │              │             │
 │                │               │               │──execute────▶│              │             │
 │                │               │               │              │──POST───────▶│             │
 │                │               │               │              │              │             │
 │                │               │               │              │◀─Response────│             │
 │                │               │               │              │              │             │
 │                │               │               │◀─data────────│              │             │
 │                │               │               │              │              │             │
 │                │               │               │──save───────────────────────────────────▶│
 │                │               │               │              │              │             │
 │                │◀─emit─────────│◀─stream──────│              │              │             │
 │                │  (message)    │               │              │              │             │
 │                │               │               │              │              │             │
 │◀──Display──────│               │               │              │              │             │
 │                │               │               │              │              │             │
 │                │──WORKAROUND───────────────────────────────────────────────────────────▶│
 │                │  (reload DB after 1.5s)       │              │              │             │
 │                │◀─messages─────────────────────────────────────────────────────────────────│
 │                │               │               │              │              │             │
 │◀──Update───────│               │               │              │              │             │
 │   (final)      │               │               │              │              │             │
```

---

## 🛠️ Points Techniques Importants

### 1. Electron Multi-Process

**Context Isolation** : Activé
- Renderer ne peut pas accéder directement à Node.js
- Communication via `contextBridge` dans `preload.ts`

**IPC Security** :
- Validation des messages
- Pas d'exécution de code depuis le renderer
- Sanitization des données

### 2. React State Management

**Hooks Personnalisés** :
- `useMessageLstCache()` - Cache des messages
- `useAddOrUpdateMessage()` - Mise à jour optimisée
- `useUpdateMessageList()` - Remplacement liste complète

**Problème Connu** :
- `useMessageLstCache()` ne recharge pas automatiquement
- **Solution** : Workaround avec `setTimeout` + reload DB

### 3. TypeScript & Types

**Types Principaux** :
```typescript
// Message
type TMessage = {
  id: string;
  msg_id: string;
  type: 'text' | 'tool_call' | ...;
  position: 'left' | 'right';
  conversation_id: string;
  content: {
    content: string;
  };
  createdAt: number;
};

// Conversation
type TChatConversation = {
  id: string;
  name: string;
  type: 'n8n' | 'acp' | 'gemini' | ...;
  extra?: {
    workspace?: string;
    backend?: string;
  };
};

// n8n Request
type N8nExecuteRequest = {
  userMessage: string;
  attachments?: any[];
};

// n8n Response
type N8nExecuteResponse = {
  success: boolean;
  data?: any;
  error?: string;
  errorType?: string;
};
```

### 4. Performance

**Optimisations** :
- Batch des mises à jour messages (`setTimeout` dans hooks)
- Index DB pour lookups rapides (msg_id, conversation_id)
- Lazy loading des conversations
- Code splitting React (vendor chunks)

**Métriques** :
- Temps réponse n8n : 2-5 secondes
- Affichage frontend : + 1.5s (workaround)
- Total user perception : 3.5-6.5 secondes

---

**Navigation** : [← README](./README.md) | [Suivant: FLUX_REQUETES.md →](./FLUX_REQUETES.md)
