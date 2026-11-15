# Problèmes Rencontrés et Solutions - E-audit WebUI

Ce document recense les problèmes techniques rencontrés lors du déploiement WebUI et de la migration n8n cloud, avec leurs solutions détaillées.

---

## 1. Migration n8n : ECONNREFUSED localhost

### Symptôme

```
Error: connect ECONNREFUSED 127.0.0.1:5678
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)
Code: ECONNREFUSED
Errno: -4078
Syscall: connect
```

**Contexte** : Après migration vers n8n cloud, l'application tentait toujours de contacter `localhost:5678`

### Diagnostic

```bash
# Recherche de tous les endpoints localhost
npx grep-search "localhost:5678" "**/*.ts"
npx grep-search "localhost:3458" "**/*.ts"
```

**Fichiers concernés** :
1. `src/process/services/n8nService.ts` - 1 occurrence
2. `n8n-server-multi-workflow/n8n_script/claraApiService.ts` - 14 occurrences
3. `src/agent/n8n/n8n-server.ts` - 1 occurrence

### Solution

**Modification de tous les endpoints** :

```typescript
// AVANT
const N8N_CLOUD_URL = 'http://localhost:3458/webhook/template'

// APRÈS
const N8N_CLOUD_URL = 'https://5ociivmf.rpcl.app/webhook/template'
```

**Script de vérification** :

```bash
# Vérifier qu'aucun endpoint localhost ne reste
rg "localhost:(5678|3458)" --type ts
# Doit retourner 0 résultat
```

### Prévention

- Centraliser les URLs dans `src/config/n8n.config.ts`
- Utiliser des variables d'environnement

```typescript
// src/config/n8n.config.ts
export const N8N_CONFIG = {
  baseUrl: process.env.N8N_BASE_URL || 'https://5ociivmf.rpcl.app',
  webhookPath: '/webhook',
  timeout: 30000
}
```

---

## 2. WebUI : Page Blanche au Démarrage

### Symptôme

```bash
node start-webui.js
# Output:
WebUI started on port 25808
⚠ Vite dev server unavailable
   - Navigate to http://localhost:25808
```

**Comportement** : Page blanche, pas d'erreur console, mais Vite dev server non démarré

### Diagnostic

```bash
# Vérifier les processus
Get-Process | Where-Object {$_.ProcessName -match "node|electron"}

# Vérifier les ports
netstat -ano | findstr "25808"
netstat -ano | findstr "5173"   # Vite dev port
```

**Cause** : `start-webui.js` lance `electron-vite dev -- --webui` mais sans HMR

### Solution

**Option 1 : Utiliser npx directement (recommandé pour dev)**

```bash
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

**Option 2 : Utiliser build + production**

```bash
npm run package         # Build production
node start-webui.js     # Serve static files
```

**Option 3 : Modifier start-webui.js pour attendre Vite**

```javascript
// start-webui.js (amélioré)
const { spawn } = require('child_process')
const net = require('net')

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const socket = new net.Socket()
      socket.setTimeout(1000)
      socket.on('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Port ${port} not available after ${timeout}ms`))
        } else {
          setTimeout(check, 500)
        }
      })
      socket.connect(port, '127.0.0.1')
    }
    check()
  })
}

async function start() {
  console.log('Starting electron-vite...')
  const electron = spawn('npx', ['electron-vite', 'dev', '--', '--webui'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  })

  // Wait for Vite dev server
  try {
    await waitForPort(5173)
    console.log('✅ Vite dev server ready on http://localhost:5173')
    await waitForPort(25808)
    console.log('✅ WebUI ready on http://localhost:25808')
  } catch (error) {
    console.error('❌ Failed to start:', error.message)
    electron.kill()
    process.exit(1)
  }
}

start()
```

### Prévention

- Toujours vérifier que Vite démarre avant de signaler "ready"
- Logger les ports réellement écoutés
- Ajouter un health check endpoint

---

## 3. Normalisation Réponses n8n : 4 Formats Différents

### Symptôme

**Workflow returns data, but frontend displays nothing**

```typescript
// Console logs dans n8nService.ts
[n8nService] Raw n8n response: {
  tables: [
    {
      headers: ['Nom', 'Valeur'],
      rows: [['Item 1', 'Value 1']]
    }
  ],
  metadata: {timestamp: '2024-...'}
}

// Frontend N8nResponseParser.tsx
console.log('Received response:', response)
// response = undefined
```

### Diagnostic

**Les 4 formats retournés par n8n** :

```typescript
// FORMAT 1 : Type explicite + content
{
  type: 'table',
  content: [...],
  metadata: {...}
}

// FORMAT 2 : Tables directes
{
  tables: [{headers: [...], rows: [...]}],
  metadata: {...}
}

// FORMAT 3 : Data wrapper
{
  data: {
    result: 'success',
    items: [...]
  }
}

// FORMAT 4 : Array direct
[
  {id: 1, name: 'Item 1'},
  {id: 2, name: 'Item 2'}
]
```

**Problème** : Le parser frontend attend un format fixe `{type, content, metadata}`

### Solution

**Ajout de `normalizeN8nResponse()` dans n8nService.ts**

```typescript
export interface N8nResponse {
  type: 'table' | 'text' | 'structured'
  content?: string
  data?: any
  tables?: Array<{
    headers?: string[]
    rows: any[]
  }>
  metadata?: Record<string, any>
}

function normalizeN8nResponse(result: any): N8nResponse {
  console.log('[n8nService] Normalizing response, type:', typeof result)

  // FORMAT 1: Already normalized
  if (result.type && result.content !== undefined) {
    console.log('[n8nService] Format 1 detected (type + content)')
    return {
      type: result.type,
      content: typeof result.content === 'string' ? result.content : undefined,
      data: typeof result.content !== 'string' ? result.content : undefined,
      metadata: result.metadata || {}
    }
  }

  // FORMAT 2: Tables array
  if (result.tables && Array.isArray(result.tables)) {
    console.log('[n8nService] Format 2 detected (tables array)')
    return {
      type: 'table',
      tables: result.tables,
      metadata: result.metadata || {}
    }
  }

  // FORMAT 3: Data wrapper
  if (result.data !== undefined) {
    console.log('[n8nService] Format 3 detected (data wrapper)')
    return {
      type: 'structured',
      data: result.data,
      metadata: result.metadata || {}
    }
  }

  // FORMAT 4: Direct array
  if (Array.isArray(result)) {
    console.log('[n8nService] Format 4 detected (direct array)')
    return {
      type: 'table',
      tables: [{
        headers: result.length > 0 ? Object.keys(result[0]) : [],
        rows: result
      }],
      metadata: {}
    }
  }

  // FALLBACK: Raw JSON
  console.warn('[n8nService] Unknown format, using text fallback')
  return {
    type: 'text',
    content: JSON.stringify(result, null, 2),
    metadata: {}
  }
}

export async function executeN8nWorkflow(
  request: N8nRequest
): Promise<N8nResponse> {
  const url = `${N8N_CLOUD_URL}?...`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

  const result = await response.json()
  console.log('[n8nService] Raw response:', result)

  const normalized = normalizeN8nResponse(result)
  console.log('[n8nService] Normalized response:', normalized)

  return normalized
}
```

**Frontend parser (N8nResponseParser.tsx)**

```typescript
export function N8nResponseParser({ response }: Props) {
  if (!response) return null

  // Handle normalized format
  if (response.type === 'table' && response.tables) {
    return <TableDisplay tables={response.tables} />
  }

  if (response.type === 'text' && response.content) {
    return <TextDisplay content={response.content} />
  }

  if (response.type === 'structured' && response.data) {
    return <StructuredDisplay data={response.data} />
  }

  return <pre>{JSON.stringify(response, null, 2)}</pre>
}
```

### Tests

```bash
# Tester chaque format
bun run test tests/unit/services/n8nService.test.ts

# Tester en live
# 1. Envoyer un workflow qui retourne FORMAT 2 (tables)
# 2. Vérifier dans console: "[n8nService] Format 2 detected"
# 3. Vérifier que les tables s'affichent
```

### Prévention

- Documenter les formats attendus dans n8n workflows
- Ajouter un schéma Zod pour validation

```typescript
import { z } from 'zod'

const N8nResponseSchema = z.object({
  type: z.enum(['table', 'text', 'structured']),
  content: z.string().optional(),
  data: z.any().optional(),
  tables: z.array(z.object({
    headers: z.array(z.string()).optional(),
    rows: z.array(z.any())
  })).optional(),
  metadata: z.record(z.any()).optional()
})
```

---

## 4. IPC Streams : Tables ne s'affichent pas immédiatement

### Symptôme

```typescript
// Backend: data saved to DB successfully
console.log('[n8nService] Response saved to database')

// Frontend: no update
console.log('[N8nSendBox] Waiting for response...')
// (nothing happens)
```

**Workaround actuel** : Reload forcé après 1.5s

### Diagnostic

**Test IPC streams** :

```typescript
// src/process/ipc/handlers.ts
ipcMain.handle('n8n:execute', async (event, request) => {
  const response = await n8nService.execute(request)
  
  // Tentative 1 : Stream via event.sender
  event.sender.send('n8n:response', response)
  
  // Tentative 2 : Stream via BrowserWindow
  BrowserWindow.getAllWindows()[0]?.webContents.send('n8n:response', response)
  
  return response
})

// src/renderer/hooks/useN8nWorkflow.ts
useEffect(() => {
  window.electronAPI.on('n8n:response', (response) => {
    console.log('Received stream:', response)
    // ❌ Jamais appelé
  })
}, [])
```

**Cause probable** : IPC streams pas reliés correctement entre main et renderer

### Solution Temporaire (Actuelle)

```typescript
// N8nSendBox.tsx
const [response, setResponse] = useState<N8nResponse | null>(null)

// Quand la réponse arrive
useEffect(() => {
  if (response && response.tables) {
    // Attendre 1.5s pour que le backend écrive en DB
    setTimeout(() => {
      updateMessageList()  // Force reload from database
    }, 1500)
  }
}, [response, updateMessageList])
```

**Pourquoi ça marche** :
1. Backend exécute workflow n8n ✅
2. Backend sauvegarde en DB ✅
3. Frontend ne reçoit pas le stream IPC ❌
4. Frontend attend 1.5s (sécurité pour l'écriture DB)
5. Frontend reload depuis la DB ✅

**Inconvénients** :
- Délai fixe de 1.5s (peut être trop long ou trop court)
- Perte d'updates rapides
- Pas de vrai temps réel

### Solution Permanente (À Implémenter)

**Option A : Polling intelligent**

```typescript
// N8nSendBox.tsx
const pollForResponse = async (requestId: string) => {
  const maxAttempts = 10
  const interval = 500  // 500ms

  for (let i = 0; i < maxAttempts; i++) {
    const messages = await window.electronAPI.db.getMessages({
      requestId
    })
    
    if (messages.length > 0 && messages[0].response) {
      updateMessageList()
      return
    }
    
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

// Après envoi
const requestId = uuid()
await window.electronAPI.n8n.execute({ ...request, requestId })
pollForResponse(requestId)
```

**Option B : WebSocket entre main et renderer**

```typescript
// src/process/ipc/websocket.ts
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 9999 })

wss.on('connection', (ws) => {
  n8nService.on('response', (response) => {
    ws.send(JSON.stringify({ type: 'n8n:response', data: response }))
  })
})

// src/renderer/hooks/useN8nWebSocket.ts
const ws = new WebSocket('ws://localhost:9999')

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data)
  if (type === 'n8n:response') {
    setResponse(data)
    updateMessageList()
  }
}
```

**Option C : Fixer l'IPC upstream (meilleur long terme)**

```typescript
// src/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  n8n: {
    execute: (request) => ipcRenderer.invoke('n8n:execute', request),
    
    // Ajouter listener explicite
    onResponse: (callback) => {
      ipcRenderer.on('n8n:response', (event, response) => {
        callback(response)
      })
    },
    
    // Cleanup
    removeResponseListener: () => {
      ipcRenderer.removeAllListeners('n8n:response')
    }
  }
})

// src/renderer/hooks/useN8nWorkflow.ts
useEffect(() => {
  const cleanup = window.electronAPI.n8n.onResponse((response) => {
    console.log('Stream received:', response)
    setResponse(response)
    updateMessageList()
  })
  
  return () => {
    window.electronAPI.n8n.removeResponseListener()
  }
}, [])
```

### Tests

```bash
# Test du workaround actuel
bun run test tests/integration/n8n-flow.test.ts

# Test de la solution permanente (une fois implémentée)
bun run test tests/integration/n8n-realtime.test.ts
```

---

## 5. Authentication : Login Page s'affiche toujours en WebUI

### Symptôme

```
1. Start WebUI on http://localhost:25808
2. Navigate to app
3. ❌ Login page displayed even with security.loginEnabled = false
4. Create account (username: test, password: test123)
5. Login with same credentials
6. ❌ Error: "Nom d'utilisateur ou mot de passe incorrect"
```

### Diagnostic

**Code actuel (AuthContext.tsx)** :

```typescript
const refresh = async () => {
  const loginEnabled = ConfigStorage.get('security.loginEnabled')
  
  // ⚠️ Ce check ne s'applique qu'en Desktop mode
  if (!loginEnabled && isDesktopRuntime()) {
    console.log('[Auth] Login disabled in Desktop mode, auto-auth')
    setUser({ username: 'auto', isAuthenticated: true })
    return
  }
  
  // En WebUI, on arrive ici et loginEnabled n'est jamais checké
  const stored = localStorage.getItem('eaudit_logged_in')
  if (stored === 'true') {
    const username = localStorage.getItem('eaudit_username')
    setUser({ username: username || 'unknown', isAuthenticated: true })
  }
}

const login = async (username: string, password: string) => {
  const loginEnabled = ConfigStorage.get('security.loginEnabled')
  
  // ⚠️ Même problème ici
  if (!loginEnabled && isDesktopRuntime()) {
    setUser({ username, isAuthenticated: true })
    localStorage.setItem('eaudit_logged_in', 'true')
    localStorage.setItem('eaudit_username', username)
    return
  }
  
  // Validation credentials
  const stored = localStorage.getItem('eaudit_credentials')
  if (!stored) {
    throw new Error('No credentials found. Please create an account first.')
  }
  
  const credentials = JSON.parse(stored)
  if (credentials.username !== username || credentials.password !== password) {
    throw new Error('Invalid username or password')
  }
  
  // Success
  setUser({ username, isAuthenticated: true })
  localStorage.setItem('eaudit_logged_in', 'true')
  localStorage.setItem('eaudit_username', username)
}
```

**Fonction helper** :

```typescript
function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && 
         'electronAPI' in window &&
         window.electronAPI !== undefined
}
```

**En WebUI** : `isDesktopRuntime()` retourne `false` (pas d'`electronAPI` en browser)

### Cause Racine

Le check `!loginEnabled && isDesktopRuntime()` empêche le skip login en WebUI :

```
Desktop Mode:
  isDesktopRuntime() = true
  loginEnabled = false (default)
  ✅ Skip login

WebUI Mode:
  isDesktopRuntime() = false
  loginEnabled = false (default)
  ❌ isDesktopRuntime() bloque le skip
  → Page login s'affiche
```

### Solutions Possibles

**Option A : Retirer le check Desktop (plus permissif)**

```typescript
const refresh = async () => {
  const loginEnabled = ConfigStorage.get('security.loginEnabled')
  
  // Skip login si désactivé (Desktop ET WebUI)
  if (!loginEnabled) {
    console.log('[Auth] Login disabled, auto-auth')
    setUser({ username: 'auto', isAuthenticated: true })
    return
  }
  
  // Sinon, check localStorage
  const stored = localStorage.getItem('eaudit_logged_in')
  if (stored === 'true') {
    const username = localStorage.getItem('eaudit_username')
    setUser({ username: username || 'unknown', isAuthenticated: true })
  }
}
```

**Option B : Config séparée Desktop/WebUI**

```typescript
interface ConfigKeys {
  'security.loginEnabled.desktop'?: boolean
  'security.loginEnabled.webui'?: boolean
}

const refresh = async () => {
  const isDesktop = isDesktopRuntime()
  const key = isDesktop 
    ? 'security.loginEnabled.desktop' 
    : 'security.loginEnabled.webui'
  
  const loginEnabled = ConfigStorage.get(key)
  
  if (!loginEnabled) {
    setUser({ username: 'auto', isAuthenticated: true })
    return
  }
  
  // Check credentials...
}
```

**Option C : Accepter login obligatoire en WebUI (plus sécurisé)**

```typescript
const refresh = async () => {
  const isDesktop = isDesktopRuntime()
  const loginEnabled = ConfigStorage.get('security.loginEnabled')
  
  // Desktop peut skip, WebUI toujours login
  if (isDesktop && !loginEnabled) {
    console.log('[Auth] Desktop mode, login disabled')
    setUser({ username: 'auto', isAuthenticated: true })
    return
  }
  
  // WebUI : toujours valider credentials
  const stored = localStorage.getItem('eaudit_logged_in')
  if (stored === 'true') {
    const username = localStorage.getItem('eaudit_username')
    setUser({ username: username || 'unknown', isAuthenticated: true })
  } else {
    // Redirect to login
    setUser(null)
  }
}
```

### Problème Secondaire : Création de Compte

**Code actuel (LoginPage.tsx)** :

```typescript
const handleCreateAccount = async () => {
  // Store credentials in localStorage
  localStorage.setItem('eaudit_credentials', JSON.stringify({
    username: newUsername,
    password: newPassword
  }))
  
  message.success('Account created! You can now login.')
  setShowCreateAccount(false)
}
```

**Problème** : Le mot de passe est stocké en clair dans localStorage ⚠️

**Solution (hashing)** :

```typescript
import bcrypt from 'bcryptjs'

const handleCreateAccount = async () => {
  // Hash password before storing
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  localStorage.setItem('eaudit_credentials', JSON.stringify({
    username: newUsername,
    password: hashedPassword
  }))
  
  message.success('Account created! You can now login.')
  setShowCreateAccount(false)
}

const handleLogin = async () => {
  const stored = localStorage.getItem('eaudit_credentials')
  if (!stored) throw new Error('No account found')
  
  const credentials = JSON.parse(stored)
  
  // Compare hashed password
  const isValid = await bcrypt.compare(password, credentials.password)
  if (!isValid || credentials.username !== username) {
    throw new Error('Invalid credentials')
  }
  
  // Success...
}
```

### Recommandation

**Pour tests/dev** : Option A (retirer check Desktop)

**Pour production** : Option C (login obligatoire WebUI) + backend auth externe

### Cleanup Script

**Problème initial** : `public/scripts/cleanup.js` appelait `forceCleanup()` à chaque démarrage

```javascript
function forceCleanup() {
  console.log('[Cleanup] Starting force cleanup...')
  
  // Clear all storage
  localStorage.clear()
  sessionStorage.clear()
  
  // Clear IndexedDB
  if (window.indexedDB) {
    window.indexedDB.databases().then(databases => {
      databases.forEach(db => {
        window.indexedDB.deleteDatabase(db.name)
      })
    })
  }
  
  console.log('[Cleanup] Force cleanup completed')
}

// ❌ Appelé à chaque refresh/reload
window.addEventListener('load', () => {
  forceCleanup()
})
```

**Impact** : Perte de session, logout forcé, credentials supprimés

**Solution** : Commenté le bloc

```javascript
// DÉSACTIVÉ : Ne plus forcer le cleanup à chaque démarrage
// window.addEventListener('load', () => {
//   forceCleanup()
// })
```

---

## 6. Build : Timeout et Memory Issues

### Symptôme

```bash
npm run package
# ... (long build)
# Error: JavaScript heap out of memory
```

### Solution

**1. Augmenter memory Node.js**

```bash
# .npmrc
node-options=--max-old-space-size=8192

# Ou variable d'environnement
$env:NODE_OPTIONS="--max-old-space-size=8192"
```

**2. Build incrémental**

```bash
# Clean avant build
Remove-Item -Recurse -Force node_modules\.vite, out

# Build
npm run package
```

**3. Parallélisation (si multi-core)**

```typescript
// electron.vite.config.ts
export default defineConfig({
  build: {
    minify: 'esbuild',  // Plus rapide que terser
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
```

---

## 7. Vite Proxy : CORS Errors

### Symptôme (si proxy utilisé)

```
Access to fetch at 'https://5ociivmf.rpcl.app/webhook/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

### Solution

**Ne PAS utiliser de proxy Vite** (n8n cloud a déjà CORS activé)

```typescript
// electron.vite.config.ts (section renderer)
export default defineConfig({
  renderer: {
    server: {
      // ❌ NE PAS faire ça si n8n cloud a CORS
      // proxy: {
      //   '/api/n8n': {
      //     target: 'https://5ociivmf.rpcl.app',
      //     changeOrigin: true,
      //     rewrite: (path) => path.replace(/^\/api\/n8n/, '')
      //   }
      // }
    }
  }
})
```

**Si CORS vraiment nécessaire** (unlikely) :

```typescript
// src/process/main.ts
session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  callback({
    requestHeaders: {
      ...details.requestHeaders,
      'Origin': 'https://5ociivmf.rpcl.app'
    }
  })
})

session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Access-Control-Allow-Origin': ['*'],
      'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
      'Access-Control-Allow-Headers': ['Content-Type']
    }
  })
})
```

---

## 8. Cache et HMR : Changements pas pris en compte

### Symptôme

```
1. Modify AuthContext.tsx
2. Save file
3. Reload WebUI
4. ❌ Old code still running
```

### Solution

**1. Clear Vite cache**

```bash
Remove-Item -Recurse -Force node_modules\.vite
```

**2. Clear out/ folder**

```bash
Remove-Item -Recurse -Force out
```

**3. Clear browser cache**

```
Chrome DevTools → Network tab → "Disable cache" (checked)
Ctrl+Shift+R (hard reload)
```

**4. Clear localStorage (si auth persist)**

```javascript
// Console browser
localStorage.clear()
sessionStorage.clear()
location.reload()
```

**5. Restart dev server**

```bash
# Stop current process
Ctrl+C

# Clear + restart
Remove-Item -Recurse -Force node_modules\.vite, out
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

---

## Checklist Dépannage Général

Quand un problème survient, suivre cette checklist :

```bash
# 1. Vérifier les logs
Get-Content -Tail 50 logs/main.log
Get-Content -Tail 50 logs/renderer.log

# 2. Vérifier les processus
Get-Process | Where-Object {$_.ProcessName -match "node|electron"}

# 3. Vérifier les ports
netstat -ano | findstr "25808"
netstat -ano | findstr "5173"

# 4. Clean cache
Remove-Item -Recurse -Force node_modules\.vite, out

# 5. Clean dependencies (si vraiment nécessaire)
Remove-Item -Recurse -Force node_modules
bun install

# 6. Rebuild TypeScript
bunx tsc --noEmit

# 7. Run tests
bun run test

# 8. Check n8n cloud
curl https://5ociivmf.rpcl.app/webhook/template

# 9. Restart fresh
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

---

## ✅ Problème Résolu : Login Page en WebUI

### Problème 9 : Login Page en WebUI (RÉSOLU)

**Statut** : ✅ **RÉSOLU** (Novembre 2026)

**Problème initial** : Page de login s'affichait toujours en WebUI même avec `security.loginEnabled = false`

**Cause racine** : Deux problèmes combinés :
1. **Frontend** : `AuthContext.tsx` checkait `isDesktopRuntime()` avant de skip login
2. **Backend** : `WebSocketManager.ts` rejetait toutes connexions sans token (code 1008)

**Solutions implémentées** :

**Fix 1 - Frontend (AuthContext.tsx)** :
```typescript
// AVANT (bloquait WebUI)
if (!loginEnabled && isDesktopRuntime()) {
  setUser({ username: 'auto', isAuthenticated: true })
  return
}

// APRÈS (fonctionne Desktop ET WebUI)
if (loginEnabled === false || loginEnabled === undefined) {
  console.log('[AuthContext] Login disabled, auto-authenticating')
  setUser({ id: 'desktop-user', username: 'local' })
  setStatus('authenticated')
  setReady(true)
  return
}
```

**Fix 2 - Backend (WebSocketManager.ts)** :
```typescript
private async validateConnection(ws: WebSocket, token: string | null): Promise<boolean> {
  // Check if login is enabled
  const loginEnabled = await this.getLoginEnabled()
  
  if (loginEnabled === false || loginEnabled === undefined) {
    // Login disabled: accept connection without token
    console.log('[WebSocketManager] Login disabled, accepting connection without token')
    return true
  }
  
  // Login enabled: validate token as before
  if (!token) {
    ws.close(WEBSOCKET_CONFIG.CLOSE_CODES.POLICY_VIOLATION, 'No token provided')
    return false
  }
  // ... existing validation
}
```

**Commits** :
- Frontend : `f9678b28`
- Backend : (workflow `fix-websocket-auth-bypass`)

**Vérification** :
```bash
# Start WebUI
npx electron-vite dev -- --webui

# Navigate to http://localhost:25808
# ✅ Page principale s'affiche directement (pas de /login)
# ✅ Console montre :
#    [WebSocketManager] Login disabled, accepting connection without token
#    [AuthContext] Login disabled, auto-authenticating
```

---

## Problèmes Connus Non Résolus

### 2. IPC Streams

**Statut** : Workaround en place (setTimeout 1.5s)

**Impact** : Léger délai avant affichage des tables

**Solution permanente** : Voir section 4

### 3. Credentials en clair dans localStorage

**Statut** : Non résolu (OK pour dev, ⚠️ pour prod)

**Workaround** : N'utiliser WebUI qu'en environnement local

**Solution permanente** : Hashing bcrypt + backend auth

---

## Ressources Utiles

- **Electron IPC** : https://www.electronjs.org/docs/latest/api/ipc-main
- **Vite HMR** : https://vitejs.dev/guide/api-hmr.html
- **n8n Webhooks** : https://docs.n8n.io/integrations/webhooks/
- **React Context** : https://react.dev/reference/react/useContext
- **localStorage Security** : https://owasp.org/www-community/vulnerabilities/HTML5_Local_Storage

---

**Note** : Ce document est mis à jour au fur et à mesure que de nouveaux problèmes sont découverts et résolus.


---

## 9. Problème Page de Login WebUI ❌ → ✅ RÉSOLU

### Symptôme

**Contexte** : En mode WebUI, après authentification réussie, la page reste blanche et le lien de login réapparaît : `http://localhost:25808/login`

**Console navigateur** :
```
[AuthContext] Desktop mode - skipping auth
[WebSocket] Connection rejected by server (policy violation), redirecting to login
WebSocket connection failed: CloseEvent { code: 1008, reason: "Unauthorized" }
```

**Console serveur** :
```
[WebSocketManager] validateConnection: no token, rejecting connection
[WebSocket] Client connection closed (unauthorized)
```

### Diagnostic

**Deux problèmes distincts** :

#### Problème A : Frontend (AuthContext.tsx)

**Code buggy** :
```typescript
// src/renderer/context/AuthContext.tsx (ligne ~85)
async function refresh() {
  if (loginEnabled === false || loginEnabled === undefined) {
    setIsLogin(true); // ❌ Toujours true, même en WebUI
    return;
  }

  // Cette partie n'était jamais atteinte en WebUI
  if (isDesktopRuntime()) {
    setIsLogin(true);
    return;
  }

  // Vérification du token JWT...
}
```

**Pourquoi ça bug ?** :
- `loginEnabled` est `false` par défaut (Desktop mode)
- En WebUI, on veut `loginEnabled = true`, mais le code retournait avant de vérifier `isDesktopRuntime()`
- Résultat : WebUI était traité comme Desktop, pas de vérification JWT

#### Problème B : Backend (WebSocketManager.ts)

**Code buggy** :
```typescript
// src/webserver/websocket/WebSocketManager.ts (ligne ~180)
private validateConnection(ws: WebSocket, req: IncomingMessage): boolean {
  const token = this.extractTokenFromRequest(req);
  
  if (!token) {
    ws.close(1008, 'Unauthorized'); // ❌ Reject TOUTES les connexions sans token
    return false;
  }
  
  // Vérification du token...
}
```

**Pourquoi ça bug ?** :
- Le serveur WebSocket rejetait TOUTES les connexions sans token
- En mode WebUI avec `loginEnabled = false`, les connexions doivent être acceptées sans token
- Résultat : WebSocket fermé avec code 1008, redirection vers `/login`

### Solution A : Frontend

**Fichier modifié** : `src/renderer/context/AuthContext.tsx`

**Commit** : `f9678b28`

**Changement** :
```typescript
async function refresh() {
  // ✅ Vérifier isDesktopRuntime() EN PREMIER
  if (isDesktopRuntime()) {
    setIsLogin(true);
    return;
  }

  // ✅ Ensuite vérifier loginEnabled (pour WebUI)
  if (loginEnabled === false || loginEnabled === undefined) {
    setIsLogin(true);
    return;
  }

  // Vérification du token JWT (uniquement en WebUI avec login activé)
  try {
    const response = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${Cookies.get(CONFIG.SESSION_COOKIE)}` },
    });
    
    if (response.ok) {
      setIsLogin(true);
    } else {
      navigateToLogin();
    }
  } catch (error) {
    navigateToLogin();
  }
}
```

**Workflow** : `fix-webui-login-skip`  
**Durée** : 15 minutes

### Solution B : Backend

**Fichier modifié** : `src/webserver/websocket/WebSocketManager.ts`

**Changements** :

1. **Ajout de la méthode `getLoginEnabled()`** :
```typescript
private getLoginEnabled(): boolean {
  try {
    const configData = ProcessConfig.getSync();
    return configData?.security?.loginEnabled ?? false;
  } catch (error) {
    console.warn('[WebSocketManager] Failed to read loginEnabled, defaulting to false');
    return false;
  }
}
```

2. **Modification de `validateConnection()`** :
```typescript
private validateConnection(ws: WebSocket, req: IncomingMessage): boolean {
  const loginEnabled = this.getLoginEnabled();

  // ✅ Si loginEnabled = false, accepter la connexion sans token
  if (!loginEnabled) {
    return true;
  }

  // ✅ Si loginEnabled = true, exiger un token valide
  const token = this.extractTokenFromRequest(req);
  if (!token) {
    console.warn('[WebSocketManager] validateConnection: no token, rejecting connection');
    ws.close(1008, 'Unauthorized');
    return false;
  }

  // Vérifier le token avec AuthService...
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    console.warn('[WebSocketManager] validateConnection: invalid token');
    ws.close(1008, 'Unauthorized');
    return false;
  }

  return true;
}
```

**Workflow** : `fix-websocket-auth-bypass`  
**Durée** : 25 minutes

### Vérification

**Procédure de test** :

1. **Nettoyer le cache** :
```powershell
Remove-Item -Recurse -Force node_modules\.vite, out
```

2. **Redémarrer le serveur WebUI** :
```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

3. **Ouvrir le navigateur** : http://localhost:25808

4. **Vérifier les logs** :
```
Console navigateur (F12) :
[AuthContext] Desktop mode - skipping auth               ❌ (ne devrait plus apparaître)
[AuthContext] Login disabled - skipping auth             ✅ (devrait apparaître)
[WebSocket] Connected successfully                       ✅

Console serveur :
[WebSocketManager] validateConnection: loginEnabled=false, accepting without token  ✅
[WebSocket] Client connected                             ✅
```

5. **Vérifier le comportement** :
   - Page ne redirige PAS vers `/login` ✅
   - WebSocket reste connecté ✅
   - Application fonctionne normalement ✅

### Résumé

**Cause racine** : Logique d'authentification mal ordonnée dans le frontend + backend ne tenant pas compte du mode WebUI sans login

**Deux fixes nécessaires** :
1. **Frontend** : Vérifier `isDesktopRuntime()` AVANT `loginEnabled`
2. **Backend** : Autoriser les connexions WebSocket sans token quand `loginEnabled = false`

**Impact** :
- Mode Desktop : aucun changement, fonctionne toujours
- Mode WebUI avec login désactivé : fonctionne maintenant ✅
- Mode WebUI avec login activé : toujours sécurisé avec JWT

**Commits** :
- Frontend : `f9678b28` (AuthContext.tsx)
- Backend : (WebSocketManager.ts)

**Test final** : ✅ Page s'affiche correctement, WebSocket connecté, aucune redirection vers `/login`

**Notes** :
- Ces modifications n'affectent PAS le mode Desktop
- La sécurité est préservée : quand `loginEnabled = true`, JWT reste obligatoire
- Pas besoin de rebuild, HMR + restart suffisent

---
