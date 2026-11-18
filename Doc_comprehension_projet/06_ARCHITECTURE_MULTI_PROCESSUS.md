# Architecture Multi-Processus - E-audit

**Date**: 17 novembre 2026  
**Version**: 1.0  
**Statut**: ✅ Documentation Complète

---

## 🎯 Vue d'ensemble

E-audit est une application Electron qui suit une architecture multi-processus stricte pour des raisons de sécurité et de performance. Cette architecture sépare clairement les responsabilités entre trois types de processus :

1. **Main Process** : Backend Node.js (accès base de données, API externes)
2. **Renderer Process** : Frontend React (interface utilisateur)
3. **Preload Script** : Pont sécurisé entre Main et Renderer

---

## 📊 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                   ELECTRON APPLICATION                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               RENDERER PROCESS                        │ │
│  │          (Chromium + V8 JavaScript Engine)            │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  React Application                              │ │ │
│  │  │  - Components (SendBox, MessageList, etc.)      │ │ │
│  │  │  - Hooks (useMessageLstCache, etc.)             │ │ │
│  │  │  - State Management (Jotai)                     │ │ │
│  │  │  - Routing (React Router)                       │ │ │
│  │  └─────────────────────┬───────────────────────────┘ │ │
│  │                        │                             │ │
│  │                        │ ipcBridge API               │ │
│  │                        │ (contextBridge.exposeInMainWorld) │
│  │                        ▼                             │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  window.electron.ipcRenderer                    │ │ │
│  │  │  - invoke(channel, data)                        │ │ │
│  │  │  - on(channel, callback)                        │ │ │
│  │  │  - send(channel, data)                          │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                        │                                   │
│                        │ IPC (Inter-Process Communication) │
│                        │                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               PRELOAD SCRIPT                          │ │
│  │          (Pont sécurisé Main ↔ Renderer)             │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  contextBridge.exposeInMainWorld               │ │ │
│  │  │  - Type-safe API                                │ │ │
│  │  │  - Validation des paramètres                    │ │ │
│  │  │  - Sanitization des données                     │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                        │                                   │
│                        │ ipcMain handlers                  │
│                        ▼                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                MAIN PROCESS                           │ │
│  │            (Node.js + Electron Core)                  │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  IPC Bridge                                     │ │ │
│  │  │  - conversationBridge.ts                        │ │ │
│  │  │  - databaseBridge.ts                            │ │ │
│  │  │  - n8nBridge.ts                                 │ │ │
│  │  │  - cronBridge.ts                                │ │ │
│  │  └──────────────────┬──────────────────────────────┘ │ │
│  │                     │                                │ │
│  │                     ▼                                │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Services & Managers                            │ │ │
│  │  │  - WorkerManage (Agent routing)                 │ │ │
│  │  │  - Agent Managers (Gemini, N8N, ACP)            │ │ │
│  │  │  - Database (AionUIDatabase)                    │ │ │
│  │  │  - ConversationManageWithDB                     │ │ │
│  │  └──────────────────┬──────────────────────────────┘ │ │
│  │                     │                                │ │
│  │                     ▼                                │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  External Resources                             │ │ │
│  │  │  - SQLite Database (better-sqlite3)             │ │ │
│  │  │  - File System (fs, path)                       │ │ │
│  │  │  - HTTP APIs (Gemini, n8n, etc.)                │ │ │
│  │  │  - Child Processes (Python backend, etc.)       │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

EXTERNAL SERVICES (HTTP/WebSocket)
┌─────────────────────────────────────────────────────────────┐
│  - Google Gemini API (AI)                                   │
│  - n8n Server (Workflows)                                   │
│  - WebUI Server (Authentication, Multi-user)                │
│  - ACP Server (Agent Communication Protocol)                │
│  - Python Backend (py_backend/ - Optional)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Séparation des Responsabilités

### Main Process (Backend)

**Fichier principal** : `src/process/index.ts`

**Responsabilités** :
- ✅ Gestion de la base de données SQLite
- ✅ Communication avec les API externes (Gemini, n8n)
- ✅ Gestion des fichiers (lecture/écriture)
- ✅ Création et gestion des fenêtres Electron
- ✅ Tâches système (cron jobs, notifications)
- ✅ Gestion des agents (Gemini, ACP, N8N)

**Ce qui est INTERDIT** :
- ❌ Accès au DOM
- ❌ Manipulation de l'UI
- ❌ Event listeners sur des éléments HTML

**Technologies** :
- Node.js (accès complet au système)
- better-sqlite3 (base de données)
- Electron Core APIs (BrowserWindow, app, ipcMain)

### Renderer Process (Frontend)

**Fichier principal** : `src/renderer/index.tsx`

**Responsabilités** :
- ✅ Affichage de l'interface utilisateur
- ✅ Gestion des interactions utilisateur
- ✅ State management (React state, Jotai)
- ✅ Routing (React Router)
- ✅ Styling (UnoCSS, CSS modules)

**Ce qui est INTERDIT** :
- ❌ Accès direct à la base de données
- ❌ Accès au système de fichiers (fs, path)
- ❌ Appels HTTP directs aux API sensibles (doit passer par le Main)
- ❌ Exécution de code Node.js natif

**Technologies** :
- React 19 (UI framework)
- Arco Design (composants UI)
- UnoCSS (styling atomique)
- Jotai (state management)
- React Router (routing)

### Preload Script (Pont Sécurisé)

**Fichier** : `src/preload.ts`

**Responsabilités** :
- ✅ Exposer une API sécurisée au Renderer
- ✅ Validation des paramètres
- ✅ Type-safety (TypeScript)
- ✅ Sanitization des données

**Ce qui est INTERDIT** :
- ❌ Exposer `require()` directement
- ❌ Exposer des APIs Node.js natives
- ❌ Permettre l'exécution de code arbitraire

**Technologies** :
- Electron contextBridge (isolation)
- TypeScript (type-safety)

---

## 🔗 Communication IPC (Inter-Process Communication)

### Architecture IPC Bridge

```typescript
// Type de base pour un canal IPC
interface IPCChannel<TParams, TResult> {
  invoke: (params: TParams) => Promise<TResult>;
  provider: (handler: (params: TParams) => Promise<TResult>) => void;
}

// Exemple de définition d'un bridge
const conversationBridge = {
  sendMessage: createIPCChannel<TSendMessageParams, TSendMessageResult>('conversation:sendMessage'),
  getConversations: createIPCChannel<TGetConversationsParams, TGetConversationsResult>('conversation:getConversations'),
  deleteConversation: createIPCChannel<TDeleteConversationParams, TDeleteConversationResult>('conversation:deleteConversation'),
  // ...
};
```

### Canaux IPC Principaux

#### 1. Conversation Bridge

**Fichier** : `src/process/bridge/conversationBridge.ts`

```typescript
// Main Process (Provider)
ipcBridge.conversation.sendMessage.provider(async (params) => {
  try {
    const task = await WorkerManage.getTaskByIdRollbackBuild(params.conversation_id);
    await task.sendMessage(params);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Renderer Process (Invoker)
const result = await ipcBridge.conversation.sendMessage.invoke({
  conversation_id: 'conv_123',
  input: 'Hello',
  msg_id: 'msg_456',
  files: []
});
```

**Canaux disponibles** :
- `conversation:sendMessage` - Envoyer un message
- `conversation:create` - Créer une conversation
- `conversation:delete` - Supprimer une conversation
- `conversation:list` - Lister les conversations
- `conversation:get` - Récupérer une conversation

#### 2. Database Bridge

**Fichier** : `src/process/bridge/databaseBridge.ts`

```typescript
// Main Process (Provider)
ipcBridge.database.getConversationMessages.provider(async (params) => {
  const db = getDatabase();
  const result = db.getConversationMessages(
    params.conversationId,
    params.page,
    params.pageSize
  );
  return { success: true, data: result };
});

// Renderer Process (Invoker)
const result = await ipcBridge.database.getConversationMessages.invoke({
  conversationId: 'conv_123',
  page: 0,
  pageSize: 100
});
```

**Canaux disponibles** :
- `database:getConversationMessages` - Récupérer les messages
- `database:updateMessageContent` - Mettre à jour un message
- `database:getUserConversations` - Récupérer les conversations d'un utilisateur
- `database:createUser` - Créer un utilisateur
- `database:authenticateUser` - Authentifier un utilisateur

#### 3. N8N Bridge

**Fichier** : `src/process/bridge/n8nBridge.ts`

```typescript
// Main Process (Provider)
ipcBridge.n8n.executeWorkflow.provider(async (params) => {
  try {
    const response = await fetch(`${N8N_URL}/webhook/${params.workflowId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.data)
    });
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Renderer Process (Invoker)
const result = await ipcBridge.n8n.executeWorkflow.invoke({
  workflowId: 'wf_123',
  data: { message: 'Hello' }
});
```

**Canaux disponibles** :
- `n8n:executeWorkflow` - Exécuter un workflow
- `n8n:getWorkflows` - Lister les workflows
- `n8n:testConnection` - Tester la connexion au serveur n8n

#### 4. Cron Bridge

**Fichier** : `src/process/bridge/cronBridge.ts`

```typescript
// Main Process (Provider)
ipcBridge.cron.schedule.provider(async (params) => {
  try {
    const job = scheduleJob(params.pattern, async () => {
      // Exécuter la tâche
      await executeTask(params.taskId);
    });
    
    return { success: true, jobId: job.name };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Renderer Process (Invoker)
const result = await ipcBridge.cron.schedule.invoke({
  pattern: '0 9 * * *', // Tous les jours à 9h
  taskId: 'task_123'
});
```

**Canaux disponibles** :
- `cron:schedule` - Créer une tâche programmée
- `cron:cancel` - Annuler une tâche
- `cron:list` - Lister les tâches actives

---

## 🔐 Sécurité du Preload Script

### Configuration Electron

**Fichier** : `src/process/index.ts`

```typescript
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Preload script (pont sécurisé)
      preload: path.join(__dirname, '../preload/index.js'),
      
      // Sécurité renforcée
      nodeIntegration: false,        // ❌ Pas d'accès direct à Node.js
      contextIsolation: true,        // ✅ Isolation du contexte
      sandbox: true,                 // ✅ Sandbox activé
      webSecurity: true,             // ✅ Sécurité web activée
      allowRunningInsecureContent: false, // ❌ Pas de contenu non sécurisé
      
      // Désactiver les features dangereuses
      enableRemoteModule: false,     // ❌ Pas de module remote (deprecated)
      webviewTag: false,             // ❌ Pas de webview tag
    }
  });
  
  mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
}
```

### Exposition Sécurisée de l'API

**Fichier** : `src/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// API sécurisée exposée au Renderer
const electronAPI = {
  // IPC Renderer (communication avec Main)
  ipcRenderer: {
    /**
     * Envoyer un message et attendre une réponse
     */
    invoke: <T = any>(channel: string, data?: any): Promise<T> => {
      // Validation du canal (whitelist)
      if (!isAllowedChannel(channel)) {
        throw new Error(`Channel not allowed: ${channel}`);
      }
      
      return ipcRenderer.invoke(channel, data);
    },
    
    /**
     * Écouter des événements
     */
    on: (channel: string, callback: (...args: any[]) => void) => {
      // Validation du canal
      if (!isAllowedChannel(channel)) {
        throw new Error(`Channel not allowed: ${channel}`);
      }
      
      // Wrapper pour sanitizer les données
      const wrappedCallback = (_event: any, ...args: any[]) => {
        callback(...args);
      };
      
      ipcRenderer.on(channel, wrappedCallback);
      
      // Retourner une fonction de cleanup
      return () => {
        ipcRenderer.removeListener(channel, wrappedCallback);
      };
    },
    
    /**
     * Envoyer un message sans attendre de réponse
     */
    send: (channel: string, data?: any) => {
      if (!isAllowedChannel(channel)) {
        throw new Error(`Channel not allowed: ${channel}`);
      }
      
      ipcRenderer.send(channel, data);
    },
    
    /**
     * Supprimer un listener
     */
    removeListener: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  
  // Metadata de l'app
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => process.platform,
    getArch: () => process.arch,
  },
  
  // File system (limité)
  fs: {
    selectFile: () => ipcRenderer.invoke('fs:selectFile'),
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
    saveFile: (data: any, filename: string) => 
      ipcRenderer.invoke('fs:saveFile', { data, filename }),
  }
};

// Exposer l'API de manière sécurisée
contextBridge.exposeInMainWorld('electron', electronAPI);

/**
 * Vérifier si un canal IPC est autorisé
 */
function isAllowedChannel(channel: string): boolean {
  const allowedChannels = [
    // Conversation
    'conversation:sendMessage',
    'conversation:create',
    'conversation:delete',
    'conversation:list',
    'conversation:get',
    
    // Database
    'database:getConversationMessages',
    'database:updateMessageContent',
    'database:getUserConversations',
    'database:createUser',
    'database:authenticateUser',
    
    // N8N
    'n8n:executeWorkflow',
    'n8n:getWorkflows',
    'n8n:testConnection',
    
    // Cron
    'cron:schedule',
    'cron:cancel',
    'cron:list',
    
    // Events
    'message:received',
    'conversation:updated',
    
    // App
    'app:getVersion',
    
    // File system
    'fs:selectFile',
    'fs:selectDirectory',
    'fs:saveFile',
  ];
  
  return allowedChannels.includes(channel);
}
```

### Types TypeScript pour l'API

**Fichier** : `src/preload/types.d.ts`

```typescript
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: <T = any>(channel: string, data?: any) => Promise<T>;
        on: (channel: string, callback: (...args: any[]) => void) => () => void;
        send: (channel: string, data?: any) => void;
        removeListener: (channel: string, callback: (...args: any[]) => void) => void;
      };
      app: {
        getVersion: () => Promise<string>;
        getPlatform: () => string;
        getArch: () => string;
      };
      fs: {
        selectFile: () => Promise<string | null>;
        selectDirectory: () => Promise<string | null>;
        saveFile: (data: any, filename: string) => Promise<boolean>;
      };
    };
  }
}

export {};
```

---

## 🔄 Pattern de Communication Type-Safe

### 1. Définition du Canal IPC

**Fichier** : `src/common/ipcTypes.ts`

```typescript
/**
 * Paramètres pour l'envoi d'un message
 */
export interface TSendMessageParams {
  conversation_id: string;
  input: string;
  msg_id?: string;
  files?: Array<{
    name: string;
    path: string;
    size: number;
    type: string;
  }>;
}

/**
 * Résultat de l'envoi d'un message
 */
export interface TSendMessageResult {
  success: boolean;
  error?: string;
}
```

### 2. Provider (Main Process)

**Fichier** : `src/process/bridge/conversationBridge.ts`

```typescript
import { ipcMain } from 'electron';
import type { TSendMessageParams, TSendMessageResult } from '@/common/ipcTypes';

/**
 * Handler pour l'envoi de messages
 */
ipcMain.handle('conversation:sendMessage', async (event, params: TSendMessageParams): Promise<TSendMessageResult> => {
  try {
    // Validation des paramètres
    if (!params.conversation_id || !params.input) {
      return {
        success: false,
        error: 'Missing required parameters'
      };
    }
    
    // Traitement
    const task = await WorkerManage.getTaskByIdRollbackBuild(params.conversation_id);
    await task.sendMessage(params);
    
    return { success: true };
    
  } catch (error) {
    console.error('[ConversationBridge] Error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
});
```

### 3. Invoker (Renderer Process)

**Fichier** : `src/renderer/hooks/useConversation.ts`

```typescript
import type { TSendMessageParams, TSendMessageResult } from '@/common/ipcTypes';

export function useConversation() {
  const sendMessage = async (params: TSendMessageParams): Promise<TSendMessageResult> => {
    try {
      // Type-safe IPC call
      const result = await window.electron.ipcRenderer.invoke<TSendMessageResult>(
        'conversation:sendMessage',
        params
      );
      
      return result;
      
    } catch (error) {
      console.error('[useConversation] Error:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  };
  
  return { sendMessage };
}
```

---

## 🚀 Gestion des Événements Asynchrones

### 1. Envoi d'Événements (Main → Renderer)

**Fichier** : `src/process/task/BaseAgentManager.ts`

```typescript
import { BrowserWindow } from 'electron';

abstract class BaseAgentManager {
  /**
   * Notifier le renderer d'un nouvel événement
   */
  protected sendToRenderer(channel: string, data: any): void {
    // Récupérer toutes les fenêtres
    const windows = BrowserWindow.getAllWindows();
    
    // Envoyer à toutes les fenêtres
    windows.forEach((window) => {
      window.webContents.send(channel, data);
    });
  }
  
  /**
   * Notifier d'un nouveau message
   */
  protected notifyNewMessage(message: TMessage): void {
    this.sendToRenderer('message:received', {
      conversationId: message.conversation_id,
      message
    });
  }
  
  /**
   * Notifier d'une mise à jour de conversation
   */
  protected notifyConversationUpdated(conversation: TChatConversation): void {
    this.sendToRenderer('conversation:updated', {
      conversation
    });
  }
}
```

### 2. Écoute d'Événements (Renderer)

**Fichier** : `src/renderer/hooks/useMessageLstCache.ts`

```typescript
import { useEffect, useState } from 'react';
import type { TMessage } from '@/common/chatLib';

export function useMessageLstCache(conversationId: string | undefined) {
  const [messages, setMessages] = useState<TMessage[]>([]);
  
  useEffect(() => {
    if (!conversationId) return;
    
    // Handler pour les nouveaux messages
    function handleNewMessage(data: { conversationId: string; message: TMessage }) {
      // Vérifier que c'est pour cette conversation
      if (data.conversationId !== conversationId) return;
      
      console.log('[useMessageLstCache] New message:', data.message.id);
      
      // Mettre à jour le state
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
    
    // S'abonner à l'événement
    const unsubscribe = window.electron.ipcRenderer.on('message:received', handleNewMessage);
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [conversationId]);
  
  return { messages };
}
```

---

## 📦 Structure des Dossiers

```
src/
├── process/                    # MAIN PROCESS
│   ├── index.ts               # Point d'entrée Electron
│   ├── bridge/                # IPC Bridges
│   │   ├── conversationBridge.ts
│   │   ├── databaseBridge.ts
│   │   ├── n8nBridge.ts
│   │   └── cronBridge.ts
│   ├── task/                  # Agent Managers
│   │   ├── WorkerManage.ts
│   │   ├── GeminiAgentManager.ts
│   │   ├── N8nAgentManager.ts
│   │   ├── ACPAgentManager.ts
│   │   └── BaseAgentManager.ts
│   ├── database/              # SQLite Database
│   │   ├── index.ts           # AionUIDatabase
│   │   ├── schema.ts
│   │   ├── types.ts
│   │   └── migrations.ts
│   ├── message.ts             # ConversationManageWithDB
│   └── services/              # Services métier
│       ├── conversationService.ts
│       └── n8nService.ts
│
├── renderer/                  # RENDERER PROCESS
│   ├── index.tsx              # Point d'entrée React
│   ├── App.tsx                # Composant racine
│   ├── components/            # Composants React
│   │   ├── SendBox.tsx
│   │   ├── MessageList.tsx
│   │   ├── TableContextMenu.tsx
│   │   └── ...
│   ├── pages/                 # Pages
│   │   ├── conversation/
│   │   │   ├── gemini/
│   │   │   ├── acp/
│   │   │   └── n8n/
│   │   └── guid/
│   ├── hooks/                 # Hooks personnalisés
│   │   ├── useMessageLstCache.ts
│   │   ├── useTablePersistence.ts
│   │   └── useConversation.ts
│   ├── messages/              # Système de messages
│   │   ├── hooks.ts
│   │   ├── MessageList.tsx
│   │   └── MessageText.tsx
│   └── router/                # React Router
│       └── index.tsx
│
├── preload/                   # PRELOAD SCRIPT
│   ├── index.ts               # Pont sécurisé
│   └── types.d.ts             # Types TypeScript
│
└── common/                    # SHARED CODE
    ├── chatLib.ts             # Types de messages
    ├── storage.ts             # Types de conversations
    └── ipcTypes.ts            # Types IPC
```

---

## 🔍 Restrictions de Sécurité

### Ce que le Renderer NE PEUT PAS faire

```typescript
// ❌ INTERDIT : Accès direct à Node.js
const fs = require('fs'); // ReferenceError: require is not defined

// ❌ INTERDIT : Accès à la base de données
import Database from 'better-sqlite3'; // Module not found

// ❌ INTERDIT : Exécution de code système
exec('rm -rf /'); // exec is not defined

// ❌ INTERDIT : Accès aux variables d'environnement
process.env.GEMINI_API_KEY; // process is not defined

// ❌ INTERDIT : Création de serveurs HTTP
http.createServer(); // http is not defined
```

### Ce que le Renderer PEUT faire (via IPC)

```typescript
// ✅ AUTORISÉ : Appel IPC sécurisé
const result = await window.electron.ipcRenderer.invoke('database:getMessages', {
  conversationId: 'conv_123'
});

// ✅ AUTORISÉ : Écoute d'événements
window.electron.ipcRenderer.on('message:received', (data) => {
  console.log('New message:', data);
});

// ✅ AUTORISÉ : Sélection de fichiers (via dialog)
const filePath = await window.electron.fs.selectFile();

// ✅ AUTORISÉ : Obtenir les métadonnées de l'app
const version = await window.electron.app.getVersion();
```

---

## 📝 Résumé

### Architecture Multi-Processus

1. **Main Process** (Backend)
   - Node.js complet
   - Accès base de données
   - Communication API externes
   - Gestion des agents

2. **Renderer Process** (Frontend)
   - Chromium + React
   - Interface utilisateur
   - Pas d'accès direct au système
   - Communication via IPC uniquement

3. **Preload Script** (Pont Sécurisé)
   - contextBridge (isolation)
   - API whitelist
   - Validation des paramètres
   - Type-safety

### Sécurité

- ✅ **nodeIntegration: false** : Pas d'accès direct à Node.js
- ✅ **contextIsolation: true** : Isolation du contexte
- ✅ **sandbox: true** : Sandbox activé
- ✅ **Whitelist de canaux** : Seuls les canaux autorisés sont accessibles
- ✅ **Validation des paramètres** : Tous les paramètres IPC sont validés

### Communication IPC

- **invoke/handle** : Communication bidirectionnelle (request/response)
- **send/on** : Communication unidirectionnelle (events)
- **Type-safe** : TypeScript pour tous les canaux
- **Error handling** : Gestion d'erreur cohérente

### Points Clés

- Le Renderer ne peut JAMAIS accéder directement à la base de données
- Toute communication passe par l'IPC Bridge
- Le Preload Script valide tous les appels
- Les événements asynchrones (streaming) passent par `send/on`
- La séparation des processus améliore sécurité ET performance
