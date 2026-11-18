# Flux Complet d'un Message - E-audit

**Date**: 17 novembre 2026  
**Version**: 1.0  
**Statut**: ✅ Documentation Complète

---

## 🎯 Vue d'ensemble

Ce document décrit le cycle de vie complet d'un message dans E-audit, de la saisie utilisateur jusqu'à l'affichage persistant dans le chat, en passant par la base de données SQLite.

---

## 📊 Schéma d'Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. SendBox Component                                  │ │
│  │     - Saisie utilisateur                               │ │
│  │     - Validation                                       │ │
│  │     - Envoi via IPC                                    │ │
│  └──────────────────┬─────────────────────────────────────┘ │
│                     │                                        │
│                     │ ipcBridge.conversation.sendMessage     │
│                     ▼                                        │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ IPC Communication
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  2. WorkerManage                                       │ │
│  │     - Récupère la tâche (agent)                        │ │
│  │     - Routage selon le type                            │ │
│  └──────────────────┬─────────────────────────────────────┘ │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  3. Agent Manager (Gemini/ACP/N8N)                     │ │
│  │     - Traite le message                                │ │
│  │     - Appelle l'API externe                            │ │
│  │     - Génère la réponse                                │ │
│  └──────────────────┬─────────────────────────────────────┘ │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  4. ConversationManageWithDB                           │ │
│  │     - addMessage()                                     │ │
│  │     - Queue de sauvegarde (batch)                      │ │
│  │     - Timer 2s                                         │ │
│  └──────────────────┬─────────────────────────────────────┘ │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  5. AionUIDatabase                                     │ │
│  │     - INSERT INTO messages                             │ │
│  │     - Sérialisation JSON                               │ │
│  └──────────────────┬─────────────────────────────────────┘ │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  6. SQLite Database                                    │ │
│  │     - Persistance durable                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ Event: message:received
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  7. useMessageLstCache                                 │ │
│  │     - Écoute les events                                │ │
│  │     - Met à jour le state local                        │ │
│  └──────────────────┬─────────────────────────────────────┘ │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  8. MessageList Component                              │ │
│  │     - Affiche les messages                             │ │
│  │     - Rendu Markdown (tables, code, etc.)              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Étape par Étape : Envoi d'un Message Utilisateur

### Étape 1 : Saisie dans SendBox

**Fichier** : `src/renderer/components/sendbox.tsx`

```typescript
const SendBox: React.FC<SendBoxProps> = ({ conversationId, agentType }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    // 1. Validation
    if (!inputValue.trim()) {
      Message.warning('Please enter a message');
      return;
    }

    // 2. Créer l'ID du message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 3. Créer le message utilisateur (affichage immédiat)
    const userMessage: TMessage = {
      id: msgId,
      msg_id: msgId,
      conversation_id: conversationId,
      type: 'text',
      position: 'right',
      status: 'finish',
      content: {
        content: inputValue,
        type: 'text'
      },
      createdAt: Date.now()
    };

    // 4. Ajouter immédiatement dans l'UI (optimistic update)
    addOrUpdateMessage(userMessage);

    // 5. Clear input
    setInputValue('');
    setIsLoading(true);

    try {
      // 6. Envoyer via IPC au main process
      await ipcBridge.conversation.sendMessage.invoke({
        conversation_id: conversationId,
        input: inputValue,
        msg_id: msgId,
        files: [] // TODO: support de fichiers
      });

      setIsLoading(false);

    } catch (error) {
      console.error('[SendBox] Error sending message:', error);
      Message.error('Failed to send message');
      setIsLoading(false);

      // Marquer le message en erreur
      addOrUpdateMessage({
        ...userMessage,
        status: 'error'
      });
    }
  };

  return (
    <div className="sendbox">
      <Input.TextArea
        value={inputValue}
        onChange={(value) => setInputValue(value)}
        onPressEnter={(e) => {
          if (!e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type your message... (Shift+Enter for new line)"
        autoSize={{ minRows: 1, maxRows: 6 }}
      />
      <Button
        type="primary"
        icon={<IconSend />}
        onClick={handleSend}
        loading={isLoading}
      />
    </div>
  );
};
```

**Points clés** :
- ✅ **Optimistic Update** : Le message utilisateur s'affiche immédiatement
- ✅ **Validation** : Vérification avant l'envoi
- ✅ **Gestion d'erreur** : Marque le message en erreur si l'envoi échoue
- ✅ **UX** : Shift+Enter pour nouvelle ligne, Enter pour envoyer

---

### Étape 2 : Routage dans WorkerManage

**Fichier** : `src/process/bridge/conversationBridge.ts`

```typescript
// IPC Bridge : conversation.sendMessage
ipcBridge.conversation.sendMessage.provider(async (params) => {
  try {
    console.log('[ConversationBridge] Sending message:', params);

    // 1. Récupérer la tâche (agent) associée à la conversation
    const task = await WorkerManage.getTaskByIdRollbackBuild(params.conversation_id);

    if (!task) {
      throw new Error('Conversation not found');
    }

    // 2. Déléguer au gestionnaire d'agent
    await task.sendMessage(params);

    return { success: true };

  } catch (error) {
    console.error('[ConversationBridge] Error:', error);
    return { success: false, error: String(error) };
  }
});
```

**Fichier** : `src/process/task/WorkerManage.ts`

```typescript
class WorkerManage {
  private static tasks = new Map<string, BaseAgentManager>();

  /**
   * Récupérer une tâche existante ou la créer
   */
  static async getTaskByIdRollbackBuild(conversationId: string): Promise<BaseAgentManager> {
    // 1. Vérifier le cache
    if (this.tasks.has(conversationId)) {
      return this.tasks.get(conversationId)!;
    }

    // 2. Charger la conversation depuis la DB
    const db = getDatabase();
    const conversation = db.getConversation(conversationId);

    if (!conversation.success || !conversation.data) {
      throw new Error('Conversation not found');
    }

    // 3. Créer l'agent approprié selon le type
    let agent: BaseAgentManager;

    switch (conversation.data.type) {
      case 'gemini':
        agent = new GeminiAgentManager(conversation.data);
        break;
      case 'acp':
        agent = new ACPAgentManager(conversation.data);
        break;
      case 'n8n':
        agent = new N8nAgentManager(conversation.data);
        break;
      case 'codex':
        agent = new CodexAgentManager(conversation.data);
        break;
      case 'openclaw-gateway':
        agent = new OpenClawAgentManager(conversation.data);
        break;
      case 'nanobot':
        agent = new NanobotAgentManager(conversation.data);
        break;
      default:
        throw new Error(`Unknown agent type: ${conversation.data.type}`);
    }

    // 4. Stocker dans le cache
    this.tasks.set(conversationId, agent);

    return agent;
  }
}
```

---

### Étape 3 : Traitement par l'Agent

**Exemple : Gemini Agent**

**Fichier** : `src/process/task/GeminiAgentManager.ts`

```typescript
class GeminiAgentManager extends BaseAgentManager {
  async sendMessage(params: TSendMessageParams): Promise<void> {
    try {
      const conversationId = params.conversation_id;

      // 1. Créer le message utilisateur en DB
      const userMessage: TMessage = {
        id: params.msg_id || `msg_${Date.now()}`,
        msg_id: params.msg_id,
        conversation_id: conversationId,
        type: 'text',
        position: 'right',
        status: 'finish',
        content: {
          content: params.input,
          type: 'text'
        },
        createdAt: Date.now()
      };

      await addMessage(userMessage);

      // 2. Créer le message de réponse (placeholder)
      const responseId = `msg_${Date.now()}_response`;
      const responseMessage: TMessage = {
        id: responseId,
        conversation_id: conversationId,
        type: 'text',
        position: 'left',
        status: 'work', // En cours
        content: {
          content: '',
          type: 'text'
        },
        createdAt: Date.now()
      };

      await addMessage(responseMessage);

      // 3. Préparer l'historique des messages
      const db = getDatabase();
      const history = db.getConversationMessages(conversationId, 0, 100);

      const chatHistory = history.data
        ?.filter((msg) => msg.status === 'finish')
        .map((msg) => ({
          role: msg.position === 'right' ? 'user' : 'model',
          parts: [{ text: msg.content.content }]
        }));

      // 4. Appeler l'API Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: this.conversation.model.modelId,
        systemInstruction: this.conversation.extra.systemInstruction
      });

      const chat = model.startChat({
        history: chatHistory
      });

      // 5. Streaming de la réponse
      const result = await chat.sendMessageStream(params.input);

      let fullResponse = '';

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;

        // Mise à jour en temps réel
        responseMessage.content.content = fullResponse;
        responseMessage.status = 'work';
        await addOrUpdateMessage(responseMessage, false);
      }

      // 6. Finaliser le message
      responseMessage.status = 'finish';
      await addOrUpdateMessage(responseMessage, false);

      console.log('[GeminiAgent] ✅ Message sent successfully');

    } catch (error) {
      console.error('[GeminiAgent] ❌ Error:', error);

      // Message d'erreur
      const errorMessage: TMessage = {
        id: `msg_${Date.now()}_error`,
        conversation_id: params.conversation_id,
        type: 'text',
        position: 'center',
        status: 'error',
        content: {
          content: `Error: ${error.message}`,
          type: 'text'
        },
        createdAt: Date.now()
      };

      await addMessage(errorMessage);
    }
  }
}
```

**Exemple : N8N Agent (avec tableau)**

**Fichier** : `src/process/task/N8nAgentManager.ts`

```typescript
class N8nAgentManager extends BaseAgentManager {
  async sendMessage(params: TSendMessageParams): Promise<void> {
    try {
      const conversationId = params.conversation_id;
      const n8nData = this.conversation.extra.n8nData;

      if (!n8nData?.webhook) {
        throw new Error('No webhook configured');
      }

      // 1. Sauvegarder le message utilisateur
      const userMessage: TMessage = {
        id: params.msg_id || `msg_${Date.now()}`,
        conversation_id: conversationId,
        type: 'text',
        position: 'right',
        status: 'finish',
        content: {
          content: params.input,
          type: 'text'
        },
        createdAt: Date.now()
      };

      await addMessage(userMessage);

      // 2. Appeler le webhook n8n
      const response = await fetch(n8nData.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: params.input,
          conversationId,
          userId: this.conversation.userId
        })
      });

      const data = await response.json();

      // 3. Parser la réponse (détection automatique de tableau)
      const content = this.parseResponse(data);

      // 4. Créer le message de réponse
      const responseMessage: TMessage = {
        id: `msg_${Date.now()}_response`,
        conversation_id: conversationId,
        type: 'text',
        position: 'left',
        status: 'finish',
        content: {
          content,
          type: 'text',
          n8nData: {
            workflowId: n8nData.workflowId,
            executionId: data.executionId || 'unknown',
            webhook: n8nData.webhook
          }
        },
        createdAt: Date.now()
      };

      await addMessage(responseMessage);

      console.log('[N8nAgent] ✅ Message sent successfully');

    } catch (error) {
      console.error('[N8nAgent] ❌ Error:', error);
      this.sendErrorMessage(error.message);
    }
  }

  /**
   * Parser la réponse n8n et détecter les tableaux
   */
  private parseResponse(data: any): string {
    // Détection de tableau dans data.table
    if (data.table && Array.isArray(data.table) && data.table.length > 0) {
      return this.arrayToMarkdownTable(data.table);
    }

    // Détection de tableau dans data.data
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return this.arrayToMarkdownTable(data.data);
    }

    // Array direct
    if (Array.isArray(data) && data.length > 0) {
      return this.arrayToMarkdownTable(data);
    }

    // Texte simple
    if (typeof data === 'string') {
      return data;
    }

    // JSON formaté en fallback
    return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
  }

  /**
   * Convertir un array en tableau Markdown
   */
  private arrayToMarkdownTable(data: any[]): string {
    if (data.length === 0) return '';

    // Colonnes
    const columns = Object.keys(data[0]);

    // En-tête
    const header = `| ${columns.join(' | ')} |`;
    const separator = `| ${columns.map(() => '---').join(' | ')} |`;

    // Lignes
    const rows = data.map(row => {
      const cells = columns.map(col => {
        const value = row[col];
        // Échapper les pipes
        return String(value ?? '').replace(/\|/g, '\\|');
      });
      return `| ${cells.join(' | ')} |`;
    });

    return '\n' + [header, separator, ...rows].join('\n') + '\n';
  }
}
```

---

### Étape 4 : Sauvegarde dans ConversationManageWithDB

**Fichier** : `src/process/message.ts`

```typescript
/**
 * Système de gestion des messages avec persistance DB
 */
class ConversationManageWithDB {
  private stack: Array<['insert' | 'accumulate', TMessage]> = [];
  private timer: NodeJS.Timeout | null = null;
  private conversationId: string;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
  }

  /**
   * Ajouter un message à la queue de sauvegarde
   */
  sync(type: 'insert' | 'accumulate', message: TMessage): void {
    console.log('[ConversationManageDB] Queuing message:', message.id, type);

    // Ajouter à la stack
    this.stack.push([type, message]);

    // Annuler le timer précédent
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Nouveau timer de 2 secondes (batch)
    this.timer = setTimeout(() => {
      this.save2DataBase();
    }, 2000);
  }

  /**
   * Sauvegarder tous les messages de la stack en DB
   */
  private save2DataBase(): void {
    if (this.stack.length === 0) return;

    console.log('[ConversationManageDB] Saving batch:', this.stack.length, 'messages');

    const db = getDatabase();

    try {
      // Transaction pour toutes les opérations
      db.transaction(() => {
        this.stack.forEach(([type, message]) => {
          if (type === 'insert') {
            // Nouveau message
            const row = messageToRow(message);
            db.prepare(`
              INSERT INTO messages (
                id, conversation_id, msg_id, type, 
                content, position, status, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              row.id,
              row.conversation_id,
              row.msg_id,
              row.type,
              row.content,
              row.position,
              row.status,
              row.created_at
            );

          } else if (type === 'accumulate') {
            // Mise à jour de message existant
            const row = messageToRow(message);
            db.prepare(`
              UPDATE messages 
              SET content = ?, status = ?
              WHERE id = ?
            `).run(row.content, row.status, row.id);
          }
        });
      })();

      console.log('[ConversationManageDB] ✅ Batch saved successfully');

      // Mettre à jour la date de modification de la conversation
      const now = Date.now();
      db.prepare(`
        UPDATE conversations 
        SET updated_at = ? 
        WHERE id = ?
      `).run(now, this.conversationId);

    } catch (error) {
      console.error('[ConversationManageDB] ❌ Save error:', error);
    } finally {
      // Clear la stack
      this.stack = [];
      this.timer = null;
    }
  }

  /**
   * Force la sauvegarde immédiate
   */
  forceFlush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.save2DataBase();
  }
}

// Cache des instances par conversation
const conversationManagers = new Map<string, ConversationManageWithDB>();

/**
 * Obtenir le gestionnaire pour une conversation
 */
function getConversationManager(conversationId: string): ConversationManageWithDB {
  if (!conversationManagers.has(conversationId)) {
    conversationManagers.set(conversationId, new ConversationManageWithDB(conversationId));
  }
  return conversationManagers.get(conversationId)!;
}

/**
 * Ajouter un message (API publique)
 */
export async function addMessage(message: TMessage): Promise<void> {
  const manager = getConversationManager(message.conversation_id);
  manager.sync('insert', message);
}

/**
 * Mettre à jour un message (API publique)
 */
export async function addOrUpdateMessage(message: TMessage, flush = false): Promise<void> {
  const manager = getConversationManager(message.conversation_id);
  manager.sync('accumulate', message);

  if (flush) {
    manager.forceFlush();
  }
}
```

**Points clés** :
- ✅ **Batch Processing** : Les messages sont groupés sur 2 secondes
- ✅ **Transaction SQLite** : Toutes les opérations sont atomiques
- ✅ **Cache** : Une instance par conversation pour éviter les collisions
- ✅ **Force Flush** : Possibilité de forcer la sauvegarde immédiate

---

### Étape 5 : Persistance SQLite

**Fichier** : `src/process/database/index.ts`

```typescript
class AionUIDatabase {
  /**
   * Insérer un nouveau message
   */
  insertMessage(message: TMessage): IQueryResult<void> {
    try {
      const row = messageToRow(message);

      this.db.prepare(`
        INSERT INTO messages (
          id, conversation_id, msg_id, type, 
          content, position, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.id,
        row.conversation_id,
        row.msg_id,
        row.type,
        row.content, // JSON stringifié
        row.position,
        row.status,
        row.created_at
      );

      console.log('[Database] ✅ Message inserted:', row.id);

      return { success: true };

    } catch (error: any) {
      console.error('[Database] ❌ Insert error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mettre à jour un message existant
   */
  updateMessage(messageId: string, message: TMessage): IQueryResult<void> {
    try {
      const row = messageToRow(message);

      const result = this.db.prepare(`
        UPDATE messages 
        SET content = ?, status = ?
        WHERE id = ?
      `).run(row.content, row.status, messageId);

      if (result.changes === 0) {
        console.warn('[Database] ⚠️ No message updated:', messageId);
        return { success: false, error: 'Message not found' };
      }

      console.log('[Database] ✅ Message updated:', messageId);

      return { success: true };

    } catch (error: any) {
      console.error('[Database] ❌ Update error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupérer les messages d'une conversation
   */
  getConversationMessages(
    conversationId: string,
    page = 0,
    pageSize = 100
  ): IPaginatedResult<TMessage> {
    try {
      // Récupérer les messages avec pagination
      const rows = this.db.prepare(`
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `).all(conversationId, pageSize, page * pageSize) as IMessageRow[];

      // Compter le total
      const totalRow = this.db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
      `).get(conversationId) as { count: number };

      const total = totalRow.count;

      // Convertir en objets TMessage
      const messages = rows.map(rowToMessage);

      return {
        data: messages,
        total,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < total
      };

    } catch (error: any) {
      console.error('[Database] ❌ Get messages error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }
  }
}
```

---

### Étape 6 : Notification du Renderer

**Fichier** : `src/process/task/BaseAgentManager.ts`

```typescript
abstract class BaseAgentManager {
  /**
   * Notifier le renderer d'un nouveau message
   */
  protected notifyRenderer(message: TMessage): void {
    // Émettre un event via IPC
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      window.webContents.send('message:received', {
        conversationId: message.conversation_id,
        message
      });
    });
  }
}
```

---

### Étape 7 : Réception et Mise à Jour de l'UI

**Fichier** : `src/renderer/messages/hooks.ts`

```typescript
/**
 * Hook pour charger et écouter les messages d'une conversation
 */
export function useMessageLstCache(conversationId: string | undefined) {
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les messages depuis la DB au montage
  useEffect(() => {
    if (!conversationId) return;

    async function loadMessages() {
      setLoading(true);
      try {
        const result = await ipcBridge.database.getConversationMessages.invoke({
          conversationId,
          page: 0,
          pageSize: 1000
        });

        if (result.success && result.data) {
          setMessages(result.data);
        }
      } catch (error) {
        console.error('[useMessageLstCache] Load error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [conversationId]);

  // Écouter les nouveaux messages via IPC
  useEffect(() => {
    if (!conversationId) return;

    function handleNewMessage(event: any, data: { conversationId: string; message: TMessage }) {
      // Vérifier que c'est pour cette conversation
      if (data.conversationId !== conversationId) return;

      console.log('[useMessageLstCache] New message received:', data.message.id);

      // Ajouter ou mettre à jour le message
      setMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === data.message.id);

        if (index >= 0) {
          // Mise à jour
          const updated = [...prev];
          updated[index] = data.message;
          return updated;
        } else {
          // Ajout
          return [...prev, data.message];
        }
      });
    }

    // S'abonner à l'event
    window.electron.ipcRenderer.on('message:received', handleNewMessage);

    // Nettoyage
    return () => {
      window.electron.ipcRenderer.removeListener('message:received', handleNewMessage);
    };
  }, [conversationId]);

  return { messages, loading };
}

/**
 * Hook pour ajouter/mettre à jour un message localement
 */
export function useAddOrUpdateMessage() {
  const [messageList, setMessageList] = useAtom(messageListAtom);

  return useCallback((message: TMessage) => {
    setMessageList((prev) => {
      const index = prev.findIndex((msg) => msg.id === message.id);

      if (index >= 0) {
        // Mise à jour
        const updated = [...prev];
        updated[index] = message;
        return updated;
      } else {
        // Ajout
        return [...prev, message];
      }
    });
  }, [setMessageList]);
}
```

---

### Étape 8 : Affichage dans MessageList

**Fichier** : `src/renderer/messages/MessageList.tsx`

```typescript
const MessageList: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const { messages, loading } = useMessageLstCache(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

const MessageItem: React.FC<{ message: TMessage }> = ({ message }) => {
  const isUser = message.position === 'right';
  const isSystem = message.position === 'center';

  return (
    <div
      className={`message-item ${isUser ? 'user' : 'assistant'} ${isSystem ? 'system' : ''}`}
      data-message-id={message.id}
    >
      {!isUser && !isSystem && (
        <Avatar size={32}>
          <IconRobot />
        </Avatar>
      )}

      <div className="message-content">
        {/* Rendu Markdown avec support des tableaux */}
        <MessageText content={message.content.content} />

        {/* Statut */}
        {message.status === 'work' && <Spin size="small" />}
        {message.status === 'error' && <Tag color="red">Error</Tag>}
      </div>

      {isUser && (
        <Avatar size={32}>
          <IconUser />
        </Avatar>
      )}
    </div>
  );
};
```

**Fichier** : `src/renderer/messages/MessageText.tsx`

```typescript
const MessageText: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="markdown-shadow-body">
      {/* Utilisation de react-markdown avec support des tableaux */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // GitHub Flavored Markdown (tableaux)
        components={{
          table: ({ node, ...props }) => (
            <table className="markdown-table" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
```

---

## ⚡ Optimisations Clés

### 1. Optimistic Update

Le message utilisateur s'affiche **immédiatement** sans attendre la réponse de l'API :

```typescript
// Afficher tout de suite
addOrUpdateMessage(userMessage);

// Puis envoyer en arrière-plan
await ipcBridge.conversation.sendMessage.invoke(...);
```

**Avantages** :
- ✅ UX fluide (pas de latence perçue)
- ✅ Feedback instantané
- ✅ L'utilisateur peut continuer à taper

### 2. Batch Processing (Queue)

Les messages sont groupés sur 2 secondes avant sauvegarde :

```typescript
// Timer de 2s
this.timer = setTimeout(() => {
  this.save2DataBase();
}, 2000);
```

**Avantages** :
- ✅ Réduit les écritures DB (performance)
- ✅ Une seule transaction pour plusieurs messages
- ✅ Moins de locks sur le fichier SQLite

### 3. Streaming de Réponse

Les réponses longues s'affichent progressivement :

```typescript
for await (const chunk of result.stream) {
  fullResponse += chunk.text();
  
  // Mise à jour en temps réel
  responseMessage.content.content = fullResponse;
  await addOrUpdateMessage(responseMessage, false);
}
```

**Avantages** :
- ✅ L'utilisateur voit la réponse apparaître
- ✅ Meilleure perception de la vitesse
- ✅ Possibilité d'arrêter le streaming

### 4. Cache des Managers

Une instance d'agent par conversation :

```typescript
const conversationManagers = new Map<string, ConversationManageWithDB>();
```

**Avantages** :
- ✅ Évite de recréer les agents
- ✅ Préserve l'état (historique, config)
- ✅ Meilleures performances

### 5. Index SQLite

Les requêtes utilisent les index pour performance :

```sql
CREATE INDEX idx_messages_conversation_created 
ON messages(conversation_id, created_at);
```

**Avantages** :
- ✅ Récupération rapide des messages d'une conversation
- ✅ Tri chronologique optimisé
- ✅ Pagination efficace

---

## 📊 Flux Complet (Récapitulatif)

```
1. Utilisateur tape "Hello" dans SendBox
   ↓
2. Message créé avec ID unique (msg_1738838400000_abc)
   ↓
3. Optimistic Update : affichage immédiat dans l'UI
   ↓
4. IPC: ipcBridge.conversation.sendMessage.invoke()
   ↓
5. WorkerManage récupère l'agent approprié (Gemini/ACP/N8N)
   ↓
6. Agent traite le message :
   - Gemini → API Google
   - N8N → Webhook n8n
   - ACP → Serveur ACP
   ↓
7. Agent génère la réponse (avec streaming si supporté)
   ↓
8. addMessage() ajoute à la queue de sauvegarde
   ↓
9. Timer 2s → ConversationManageWithDB.save2DataBase()
   ↓
10. Transaction SQLite : INSERT INTO messages
    ↓
11. Event IPC: window.webContents.send('message:received')
    ↓
12. useMessageLstCache écoute l'event
    ↓
13. setMessages() met à jour le state React
    ↓
14. MessageList re-render avec le nouveau message
    ↓
15. MessageText affiche le Markdown (tableaux, code, etc.)
```

---

## 🔄 Gestion des Cas d'Erreur

### 1. Échec d'Envoi IPC

```typescript
try {
  await ipcBridge.conversation.sendMessage.invoke(...);
} catch (error) {
  // Marquer le message en erreur
  addOrUpdateMessage({
    ...userMessage,
    status: 'error'
  });
  
  Message.error('Failed to send message');
}
```

### 2. Erreur Agent (API externe)

```typescript
try {
  const response = await fetch(apiUrl, ...);
  // ...
} catch (error) {
  // Message d'erreur visible dans le chat
  const errorMessage: TMessage = {
    id: `msg_${Date.now()}_error`,
    conversation_id: conversationId,
    type: 'text',
    position: 'center',
    status: 'error',
    content: {
      content: `❌ Error: ${error.message}`,
      type: 'text'
    },
    createdAt: Date.now()
  };
  
  await addMessage(errorMessage);
}
```

### 3. Échec de Sauvegarde DB

```typescript
try {
  db.prepare('INSERT INTO messages ...').run(...);
} catch (error) {
  console.error('[Database] ❌ Save error:', error);
  
  // Log l'erreur mais ne bloque pas l'UI
  // Les messages restent en mémoire
  
  // TODO: Retry logic avec backoff exponentiel
}
```

---

## 📝 Résumé

### Flux Principal
1. **SendBox** → Saisie utilisateur
2. **IPC Bridge** → Communication inter-process
3. **Agent Manager** → Traitement (Gemini/N8N/ACP)
4. **ConversationManageWithDB** → Queue de sauvegarde (batch 2s)
5. **SQLite** → Persistance durable
6. **IPC Event** → Notification renderer
7. **useMessageLstCache** → Mise à jour state React
8. **MessageList** → Affichage UI

### Optimisations
- ✅ **Optimistic Update** : Affichage immédiat
- ✅ **Batch Processing** : Groupe les écritures DB
- ✅ **Streaming** : Affichage progressif des réponses
- ✅ **Cache** : Réutilisation des instances d'agents
- ✅ **Index SQL** : Requêtes rapides

### Points Clés
- Le message utilisateur est sauvegardé **avant** la réponse de l'agent
- Le message de réponse commence avec `status: 'work'` puis passe à `'finish'`
- Les tableaux N8N sont automatiquement convertis en Markdown
- Tous les messages passent par le même système de persistance
- La base de données est la source de vérité (rechargement depuis DB au montage)
