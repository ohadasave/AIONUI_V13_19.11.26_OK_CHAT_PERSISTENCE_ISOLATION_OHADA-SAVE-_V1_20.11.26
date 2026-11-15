# Architecture Détaillée - E-audit WebUI

## Vue d'Ensemble

E-audit est une application **Electron multi-process** avec une architecture hybride permettant deux modes de déploiement :

```
┌─────────────────────────────────────────────────────────────┐
│                      E-AUDIT APPLICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Desktop   │    │    WebUI     │    │   Worker     │   │
│  │    Mode     │    │     Mode     │    │   Process    │   │
│  │  (Electron) │    │  (Browser)   │    │  (Backend)   │   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│         │                    │                   │           │
│         └────────────────────┴───────────────────┘           │
│                              │                               │
│                    ┌─────────▼─────────┐                    │
│                    │   n8n Cloud API   │                    │
│                    │ 5ociivmf.rpcl.app │                    │
│                    └───────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Multi-Process (Desktop Mode)

### 1. Main Process (`src/process/`)

**Rôle** : Gestion de l'application Electron, IPC, services backend

```typescript
src/process/
├── main.ts                    // Entry point Electron
├── services/
│   ├── n8nService.ts         // Communication n8n cloud
│   ├── configService.ts      // Configuration centralisée
│   └── databaseService.ts    // SQLite local
├── ipc/
│   └── handlers.ts           // IPC handlers
└── windows/
    └── windowManager.ts      // Gestion fenêtres
```

**Responsabilités** :
- Création de `BrowserWindow`
- Gestion du cycle de vie de l'application
- Services backend (DB, n8n, fichiers)
- Communication IPC avec renderer
- Sécurité (CSP, isolation contexte)

### 2. Renderer Process (`src/renderer/`)

**Rôle** : Interface utilisateur React, logique frontend

```typescript
src/renderer/
├── App.tsx                   // Composant racine
├── pages/
│   ├── conversation/         // Interface chat principale
│   │   ├── ConversationPage.tsx
│   │   └── n8n/
│   │       ├── N8nSendBox.tsx      // Input + envoi workflow
│   │       └── N8nResponseParser.ts // Parse réponses n8n
│   ├── login/
│   │   └── LoginPage.tsx     // Page authentification
│   └── settings/
│       └── SecuritySettings.tsx
├── context/
│   ├── AuthContext.tsx       // Gestion auth (localStorage)
│   └── ConfigContext.tsx     // Configuration app
└── hooks/
    └── useN8nWorkflow.ts     // Hook intégration n8n
```

**Responsabilités** :
- Rendu UI (React + Arco Design + UnoCSS)
- Gestion état (Context API)
- Authentification (localStorage)
- Communication avec main process via IPC

### 3. Worker Process (`src/worker/`)

**Rôle** : Tâches longues, traitement asynchrone

```typescript
src/worker/
├── worker.ts                 // Entry point worker
└── tasks/
    ├── dataProcessing.ts
    └── fileImport.ts
```

**Responsabilités** :
- Traitement de données lourdes
- Import/export de fichiers
- Calculs intensifs
- Ne bloque pas l'UI

### 4. Preload Script (`src/preload.ts`)

**Rôle** : Bridge sécurisé entre main et renderer

```typescript
// src/preload.ts
const api = {
  n8n: {
    execute: (request) => ipcRenderer.invoke('n8n:execute', request),
    getHistory: () => ipcRenderer.invoke('n8n:getHistory')
  },
  config: {
    get: (key) => ipcRenderer.invoke('config:get', key),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
```

**Sécurité** :
- `contextIsolation: true`
- `nodeIntegration: false`
- Exposition sélective d'API via `contextBridge`

## Architecture WebUI (Browser Mode)

### Mode WebUI vs Desktop

```
Desktop Mode                      WebUI Mode
┌──────────────┐                 ┌──────────────┐
│ BrowserWindow│                 │   Browser    │
│   (Electron) │                 │  (Chrome/FF) │
└──────┬───────┘                 └──────┬───────┘
       │ IPC                            │ HTTP
       │                                │
┌──────▼───────┐                 ┌──────▼───────┐
│ Main Process │                 │ Express HTTP │
│   (Node.js)  │                 │    Server    │
└──────────────┘                 └──────────────┘
       │                                │
       └────────────┬───────────────────┘
                    │
             ┌──────▼───────┐
             │   Services   │
             │  (n8n, DB)   │
             └──────────────┘
```

### Serveur HTTP WebUI

```typescript
// server/webui.ts (simplifié)
const app = express()
const server = http.createServer(app)

// Static files (frontend build)
app.use(express.static('out/renderer'))

// API endpoints
app.post('/api/n8n/execute', async (req, res) => {
  const result = await n8nService.execute(req.body)
  res.json(result)
})

server.listen(25808)
```

**Différences clés** :
- **Desktop** : IPC `ipcRenderer.invoke()`
- **WebUI** : HTTP `fetch('/api/...')`
- **Auth** : localStorage dans les deux cas
- **Services** : Partagés entre les deux modes

### Démarrage WebUI

```bash
# Option 1 : Développement (HMR, logs détaillés)
npx electron-vite dev -- --webui

# Option 2 : Production (build optimisé)
node start-webui.js

# Option 3 : Build puis start
npm run package
node start-webui.js
```

**Fichier `start-webui.js`** :
```javascript
const { spawn } = require('child_process')
const path = require('path')

// Lance electron-vite avec flag --webui
const electron = spawn('npx', ['electron-vite', 'dev', '--', '--webui'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
})
```

## Flux de Communication n8n

### 1. Architecture n8n

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           N8nSendBox.tsx                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │   │
│  │  │  Textarea  │  │   Button   │  │ attachments  │  │   │
│  │  └────────────┘  └────────────┘  └──────────────┘  │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ onSend()                          │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   DESKTOP MODE                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ window.electronAPI.n8n.execute(request)               │  │
│  └─────────────────────┬─────────────────────────────────┘  │
│                        │ IPC                                │
│  ┌─────────────────────▼─────────────────────────────────┐  │
│  │ Main Process: n8nService.executeN8nWorkflow()         │  │
│  └─────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEBUI MODE                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ fetch('http://localhost:25808/api/n8n/execute')       │  │
│  └─────────────────────┬─────────────────────────────────┘  │
│                        │ HTTP POST                           │
│  ┌─────────────────────▼─────────────────────────────────┐  │
│  │ Express: app.post('/api/n8n/execute')                 │  │
│  │   ├─> n8nService.executeN8nWorkflow()                 │  │
│  └─────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              N8N SERVICE (n8nService.ts)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ async executeN8nWorkflow(request: N8nRequest)         │  │
│  │ {                                                     │  │
│  │   const url = 'https://5ociivmf.rpcl.app/webhook/...'│  │
│  │   const response = await fetch(url, {                │  │
│  │     method: 'POST',                                  │  │
│  │     body: JSON.stringify(request)                    │  │
│  │   })                                                 │  │
│  │   const result = await response.json()               │  │
│  │   return normalizeN8nResponse(result)                │  │
│  │ }                                                     │  │
│  └─────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              N8N CLOUD API                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ https://5ociivmf.rpcl.app/webhook/template            │  │
│  │                                                       │  │
│  │ Workflows actifs :                                    │  │
│  │  • TEMPLATE - Template generation                    │  │
│  │  • CLARA - Clara API integration                     │  │
│  │  • AUDIT - Audit workflows                           │  │
│  │  • DATA - Data processing                            │  │
│  └─────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │ JSON Response
                         ▼
┌─────────────────────────────────────────────────────────────┐
│       RESPONSE NORMALIZATION (normalizeN8nResponse)          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Detect format:                                        │  │
│  │  FORMAT 1: {type, content, metadata}                 │  │
│  │  FORMAT 2: {tables: [...], metadata: {...}}          │  │
│  │  FORMAT 3: {data: {...}}                             │  │
│  │  FORMAT 4: Direct array [...]                        │  │
│  │                                                       │  │
│  │ Normalize to:                                        │  │
│  │  {                                                    │  │
│  │    type: 'table' | 'text' | 'structured',           │  │
│  │    content?: string,                                 │  │
│  │    data?: any,                                       │  │
│  │    tables?: Table[],                                 │  │
│  │    metadata?: {...}                                  │  │
│  │  }                                                    │  │
│  └─────────────────────┬─────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         FRONTEND DISPLAY (N8nResponseParser.tsx)             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ if (response.type === 'table') {                      │  │
│  │   return <TableDisplay tables={response.tables} />    │  │
│  │ }                                                     │  │
│  │ if (response.type === 'text') {                       │  │
│  │   return <TextDisplay content={response.content} />   │  │
│  │ }                                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Normalisation des Réponses n8n

**Problème** : n8n retourne 4 formats différents selon les workflows

**Solution** : `normalizeN8nResponse()` dans `n8nService.ts`

```typescript
function normalizeN8nResponse(result: any): N8nResponse {
  // FORMAT 1: {type: 'table', content: [...], metadata: {...}}
  if (result.type && result.content) {
    return {
      type: result.type,
      content: typeof result.content === 'string' ? result.content : undefined,
      data: typeof result.content !== 'string' ? result.content : undefined,
      metadata: result.metadata
    }
  }

  // FORMAT 2: {tables: [...], metadata: {...}}
  if (result.tables && Array.isArray(result.tables)) {
    return {
      type: 'table',
      tables: result.tables,
      metadata: result.metadata
    }
  }

  // FORMAT 3: {data: {...}}
  if (result.data) {
    return {
      type: 'structured',
      data: result.data,
      metadata: result.metadata
    }
  }

  // FORMAT 4: Direct array [...]
  if (Array.isArray(result)) {
    return {
      type: 'table',
      tables: [{ rows: result }],
      metadata: {}
    }
  }

  // Fallback
  return {
    type: 'text',
    content: JSON.stringify(result, null, 2)
  }
}
```

### 3. Endpoints n8n Migrés

**Anciens endpoints** : `http://localhost:5678/webhook/...`

**Nouveaux endpoints** : `https://5ociivmf.rpcl.app/webhook/...`

**Fichiers modifiés** :
1. `src/process/services/n8nService.ts` (1 endpoint)
2. `n8n-server-multi-workflow/n8n_script/claraApiService.ts` (14 endpoints)
3. `src/agent/n8n/n8n-server.ts` (1 endpoint)

**Total** : 16 endpoints migrés

## Système d'Authentification

### Architecture Auth

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  1. LOGIN PAGE (LoginPage.tsx)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Input: username, password                             │  │
│  │ Button: "Se connecter"                                │  │
│  └─────────────────────┬─────────────────────────────────┘  │
│                        │ onClick                             │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. AUTH CONTEXT (AuthContext.tsx)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ const login = async (username, password) => {         │  │
│  │   // Check loginEnabled flag                          │  │
│  │   const loginEnabled = ConfigStorage.get(             │  │
│  │     'security.loginEnabled'                           │  │
│  │   )                                                   │  │
│  │                                                       │  │
│  │   if (!loginEnabled && isDesktopRuntime()) {         │  │
│  │     // Skip validation in Desktop mode               │  │
│  │     setUser({username, isAuthenticated: true})       │  │
│  │     return                                           │  │
│  │   }                                                   │  │
│  │                                                       │  │
│  │   // Validate credentials from localStorage          │  │
│  │   const stored = localStorage.getItem(               │  │
│  │     'eaudit_credentials'                             │  │
│  │   )                                                   │  │
│  │   const creds = JSON.parse(stored)                   │  │
│  │                                                       │  │
│  │   if (creds.username !== username ||                 │  │
│  │       creds.password !== password) {                 │  │
│  │     throw new Error('Invalid credentials')           │  │
│  │   }                                                   │  │
│  │                                                       │  │
│  │   // Store session                                   │  │
│  │   localStorage.setItem('eaudit_logged_in', 'true')   │  │
│  │   localStorage.setItem('eaudit_username', username)  │  │
│  │   setUser({username, isAuthenticated: true})         │  │
│  │ }                                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. LOCALSTORAGE (Browser Storage)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Keys stored:                                          │  │
│  │  • eaudit_credentials:                                │  │
│  │    {username: 'xxx', password: 'yyy'}                │  │
│  │  • eaudit_logged_in: 'true'                           │  │
│  │  • eaudit_login_time: '2024-...'                      │  │
│  │  • eaudit_username: 'xxx'                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. CONFIG STORAGE (storage.ts)                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ interface ConfigKeys {                                │  │
│  │   'security.loginEnabled'?: boolean                   │  │
│  │   // ... other keys                                   │  │
│  │ }                                                     │  │
│  │                                                       │  │
│  │ Default: undefined (treated as false)                │  │
│  │ Set to true in SecuritySettings to enforce login     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Problème Persistant : Login toujours affiché en WebUI

**Diagnostic** :

```typescript
// Dans AuthContext.tsx
const loginEnabled = ConfigStorage.get('security.loginEnabled')

if (!loginEnabled && isDesktopRuntime()) {
  // ✅ Fonctionne en Desktop mode
  // ❌ Ne fonctionne PAS en WebUI mode (isDesktopRuntime() = false)
  setUser({ username: 'auto', isAuthenticated: true })
  return
}
```

**Raison** :
- Le check `isDesktopRuntime()` retourne `false` en WebUI
- Donc le code de skip login n'est jamais exécuté en mode browser
- La page login s'affiche toujours

**Solutions possibles** :

```typescript
// Option A : Étendre le check au WebUI
if (!loginEnabled) {  // Remove && isDesktopRuntime()
  setUser({ username: 'auto', isAuthenticated: true })
  return
}

// Option B : Accepter que WebUI nécessite toujours login
// (plus sécurisé pour une app web exposée)
```

### Script cleanup.js

**Problème initial** : `forceCleanup()` supprimait localStorage à chaque démarrage

**Solution** : Commenté le bloc `forceCleanup()` dans `public/scripts/cleanup.js`

```javascript
// DÉSACTIVÉ : Ne plus forcer le nettoyage à chaque démarrage
// function forceCleanup() {
//   localStorage.clear()
//   sessionStorage.clear()
//   console.log('[Cleanup] Force cleanup completed')
// }
```

## Gestion des Données

### Base de Données SQLite

```
src/process/database/
├── schema.sql              // Schéma tables
├── migrations/             // Migrations versionnées
└── databaseService.ts      // Service accès DB
```

**Tables principales** :
- `users` - Comptes utilisateurs
- `audits` - Audits créés
- `templates` - Templates de rapports
- `conversations` - Historique chat n8n
- `settings` - Configuration app

### IPC Streams (Problème Connu)

**Symptôme** : Les streams IPC ne remontent pas toujours au renderer

**Workaround** : `setTimeout()` + reload forcé dans `N8nSendBox.tsx`

```typescript
// N8nSendBox.tsx (ligne ~450)
useEffect(() => {
  if (response && response.tables) {
    // Workaround : Attendre 1.5s puis recharger la DB
    setTimeout(() => {
      updateMessageList()  // Force reload from DB
    }, 1500)
  }
}, [response, updateMessageList])
```

**Pourquoi ça marche** :
- La réponse n8n est bien stockée en DB via le service
- Le renderer ne reçoit pas le stream IPC
- Après 1.5s, on force un reload depuis la DB
- Les tables s'affichent correctement

**Impact** :
- Délai de 1.5s avant affichage
- Peut manquer des updates rapides
- Solution temporaire en attendant fix IPC upstream

## Build et Bundling

### electron-vite

Configuration : `electron.vite.config.ts`

```typescript
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/process/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@process': resolve(__dirname, 'src/process')
      }
    },
    plugins: [react()]
  }
})
```

### Output Structure

```
out/
├── main/               // Main process bundle
│   └── index.js
├── preload/            // Preload script
│   └── index.js
└── renderer/           // Frontend bundle
    ├── index.html
    ├── assets/
    │   ├── index-[hash].js
    │   └── index-[hash].css
    └── ...
```

### Memory Configuration

```bash
# .npmrc
node-options=--max-old-space-size=8192

# Alternative : variable d'environnement
$env:NODE_OPTIONS="--max-old-space-size=8192"
```

## Sécurité

### Content Security Policy

```typescript
// src/process/main.ts
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self' https://5ociivmf.rpcl.app"
      ]
    }
  })
})
```

### Context Isolation

```typescript
// src/process/windows/windowManager.ts
webPreferences: {
  nodeIntegration: false,        // ❌ Pas de Node.js dans renderer
  contextIsolation: true,        // ✅ Isolation contexte
  sandbox: true,                 // ✅ Sandbox renderer
  preload: path.join(__dirname, 'preload.js')
}
```

### Credentials Storage

**Desktop** : Peut utiliser `electron-store` avec chiffrement OS

**WebUI** : localStorage (⚠️ non chiffré, limité aux tests)

**Production** : Utiliser backend auth externe (OAuth2, JWT)

## Performance

### Optimisations

1. **Code splitting** : `React.lazy()` pour routes
2. **Memoization** : `React.memo()`, `useMemo()`, `useCallback()`
3. **Virtual scrolling** : `react-window` pour grandes listes
4. **Bundle analysis** : `rollup-plugin-visualizer`

### Monitoring

```typescript
// src/renderer/utils/performance.ts
export const measureRender = (componentName: string) => {
  performance.mark(`${componentName}-start`)
  return () => {
    performance.mark(`${componentName}-end`)
    performance.measure(
      componentName,
      `${componentName}-start`,
      `${componentName}-end`
    )
  }
}
```

## Tests

### Structure

```
tests/
├── unit/                  // Tests unitaires (Vitest)
│   ├── services/
│   │   └── n8nService.test.ts
│   └── utils/
├── integration/           // Tests d'intégration
│   └── n8n-flow.test.ts
└── e2e/                   // Tests E2E (Playwright)
    └── login.spec.ts
```

### Configuration Vitest

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',  // ou 'jsdom' pour tests DOM
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.spec.ts']
    }
  }
})
```

## Diagrammes Complémentaires

### Cycle de Vie Application

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│ main.ts loaded   │
│ - Create window  │
│ - Init services  │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐     ┌───────────────┐
│ Renderer ready   │────▶│ Auth check    │
│ - Load React     │     │ - localStorage│
└────┬─────────────┘     └───┬───────────┘
     │                        │
     │                        ▼
     │                   ┌─────────────┐
     │                   │ Login page? │
     │                   └──┬───────┬──┘
     │                      │ YES   │ NO
     │                      ▼       ▼
     │                   Login   MainApp
     │                      │       │
     └──────────────────────┴───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ App running   │
                    └───────────────┘
```

### État Application

```
AuthContext:
  - user: {username, isAuthenticated}
  - login(username, password)
  - logout()
  - refresh()

ConfigContext:
  - settings: {...}
  - updateSetting(key, value)
  - getSetting(key)

N8nContext:
  - activeWorkflow: string | null
  - history: Message[]
  - execute(request)
  - clearHistory()
```

## Références

- [Electron Docs](https://www.electronjs.org/docs)
- [electron-vite](https://electron-vite.org/)
- [n8n Webhook Docs](https://docs.n8n.io/integrations/webhooks/)
- [React 19](https://react.dev/)
- [Arco Design](https://arco.design/)

---

**Note** : Cette architecture est celle de la version actuelle (novembre 2026). Pour les évolutions futures, consulter les ADR (Architecture Decision Records) dans `docs/adr/`.
