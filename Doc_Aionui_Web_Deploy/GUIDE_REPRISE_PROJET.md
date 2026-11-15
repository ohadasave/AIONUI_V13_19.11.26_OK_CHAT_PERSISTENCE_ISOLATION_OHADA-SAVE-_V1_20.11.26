# Guide de Reprise du Projet - E-audit WebUI

Ce document fournit un plan d'action structuré pour un agent de code reprenant le projet E-audit WebUI.

---

## Phase 1 : Setup Initial (30 minutes)

### 1.1 Vérifier l'environnement

```bash
# 1. Vérifier Node.js (>= 18)
node --version
# Attendu: v18.x.x ou supérieur

# 2. Vérifier bun (>= 1.0)
bun --version
# Attendu: 1.x.x

# 3. Vérifier Git
git --version

# 4. Vérifier PowerShell (>= 7.0)
$PSVersionTable.PSVersion
```

### 1.2 Cloner et installer

```bash
# Cloner le repo (si pas déjà fait)
git clone <repo-url>
cd Aionui_client

# Installer les dépendances
bun install

# Vérifier que tout compile
bunx tsc --noEmit
# Doit retourner 0 erreur
```

### 1.3 Tester les commandes principales

```bash
# Test 1 : Desktop mode
npm start
# Attendu: Fenêtre Electron s'ouvre

# Test 2 : WebUI mode
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
# Attendu: 
# - WebUI started on http://localhost:25808
# - Vite dev server on http://localhost:5173

# Test 3 : Tests unitaires
bun run test
# Attendu: All tests pass

# Test 4 : Lint
bun run lint
# Attendu: No errors
```

### 1.4 Vérifier la connectivité n8n

```bash
# Test endpoint n8n cloud
curl https://5ociivmf.rpcl.app/webhook/template `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"query":"test"}'

# Attendu: Réponse JSON (pas d'erreur CORS ou ECONNREFUSED)
```

---

## Phase 2 : Compréhension de l'Architecture (1-2 heures)

### 2.1 Lire la documentation

**Ordre de lecture recommandé** :

1. `Doc_Aionui_Web_Deploy/README.md` - Vue d'ensemble
2. `Doc_Aionui_Web_Deploy/DEMARRAGE.md` - Commandes et procédures
3. `Doc_Aionui_Web_Deploy/ARCHITECTURE.md` - Architecture détaillée
4. `Doc_Aionui_Web_Deploy/PROBLEMES_ET_SOLUTIONS.md` - Problèmes connus
5. `AGENTS.md` - Conventions du projet

**Temps estimé** : 45-60 minutes

### 2.2 Explorer le code source

**Fichiers critiques à lire** (par ordre de priorité) :

```
Priority 1 (Must Read):
├── src/process/services/n8nService.ts        # Intégration n8n
├── src/renderer/context/AuthContext.tsx      # Authentification
├── src/renderer/pages/conversation/n8n/
│   ├── N8nSendBox.tsx                        # Input workflow
│   └── N8nResponseParser.tsx                 # Affichage réponses
├── src/preload.ts                            # Bridge IPC
└── electron.vite.config.ts                   # Config build

Priority 2 (Important):
├── src/process/main.ts                       # Entry point Electron
├── src/renderer/App.tsx                      # Composant racine
├── src/common/storage.ts                     # Configuration
├── public/scripts/cleanup.js                 # Cleanup localStorage
└── start-webui.js                            # Script WebUI

Priority 3 (Nice to Have):
├── src/worker/worker.ts                      # Worker process
├── src/renderer/pages/login/LoginPage.tsx   # Page login
├── tests/integration/n8n-flow.test.ts       # Tests intégration
└── vitest.config.ts                          # Config tests
```

**Commande pour explorer** :

```bash
# Lire un fichier spécifique
Get-Content src/process/services/n8nService.ts

# Chercher une fonction
rg "normalizeN8nResponse" --type ts

# Trouver tous les appels à une API
rg "window.electronAPI" --type tsx
```

### 2.3 Comprendre les flux de données

**Exercice pratique** :

1. **Tracer un workflow n8n de bout en bout** :

```
User input dans N8nSendBox
    ↓
onSend() appelé
    ↓
window.electronAPI.n8n.execute() (Desktop)
ou fetch('/api/n8n/execute') (WebUI)
    ↓
n8nService.executeN8nWorkflow()
    ↓
fetch('https://5ociivmf.rpcl.app/...')
    ↓
normalizeN8nResponse()
    ↓
Retour au renderer
    ↓
N8nResponseParser affiche les tables
```

2. **Tracer l'authentification** :

```
LoginPage.tsx : handleLogin()
    ↓
AuthContext.login(username, password)
    ↓
Check ConfigStorage.get('security.loginEnabled')
    ↓
if (!loginEnabled && isDesktopRuntime())
    → Skip validation (Desktop only)
else
    → Validate against localStorage.eaudit_credentials
    ↓
setUser({username, isAuthenticated: true})
    ↓
localStorage.setItem('eaudit_logged_in', 'true')
    ↓
Redirect to MainApp
```

---

## Phase 3 : Résolution des Problèmes Connus (2-4 heures)

### 3.1 Problème 1 : Login Page en WebUI

**Fichier** : `src/renderer/context/AuthContext.tsx`

**Diagnostic** :

```typescript
// Ligne ~85
if (!loginEnabled && isDesktopRuntime()) {
  // ❌ Ce check bloque le skip login en WebUI
  setUser({ username, isAuthenticated: true })
  return
}
```

**Solution recommandée** :

```typescript
// Option A : Skip login pour Desktop ET WebUI
if (!loginEnabled) {
  console.log('[Auth] Login disabled, auto-authenticating')
  setUser({ username: 'auto', isAuthenticated: true })
  return
}

// Option B : Config séparée Desktop/WebUI
const key = isDesktopRuntime() 
  ? 'security.loginEnabled.desktop'
  : 'security.loginEnabled.webui'
const loginEnabled = ConfigStorage.get(key)

// Option C : Forcer login en WebUI (plus sécurisé)
if (isDesktopRuntime() && !loginEnabled) {
  // Skip login uniquement en Desktop
  setUser({ username: 'auto', isAuthenticated: true })
  return
}
// WebUI : toujours valider credentials
```

**Tâches** :

1. Choisir l'option selon les besoins de sécurité
2. Modifier `AuthContext.tsx` (méthodes `refresh()` et `login()`)
3. Tester en Desktop : `npm start`
4. Tester en WebUI : `npx electron-vite dev -- --webui`
5. Vérifier qu'on peut accéder sans login (selon option choisie)

**Tests** :

```bash
# Test 1 : Desktop mode, login disabled
# Attendu: Direct access sans page login

# Test 2 : WebUI mode, login disabled
# Attendu: Selon option choisie

# Test 3 : WebUI mode, login enabled
# Attendu: Page login affichée
```

### 3.2 Problème 2 : IPC Streams

**Fichier** : `src/renderer/pages/conversation/n8n/N8nSendBox.tsx`

**Workaround actuel** :

```typescript
// Ligne ~450
useEffect(() => {
  if (response && response.tables) {
    setTimeout(() => {
      updateMessageList()  // Force reload after 1.5s
    }, 1500)
  }
}, [response, updateMessageList])
```

**Solution permanente** :

```typescript
// Option A : Polling intelligent
const pollForResponse = async (requestId: string) => {
  const maxAttempts = 10
  const interval = 500

  for (let i = 0; i < maxAttempts; i++) {
    const messages = await window.electronAPI.db.getMessages({ requestId })
    if (messages.length > 0 && messages[0].response) {
      updateMessageList()
      return
    }
    await sleep(interval)
  }
}

// Après envoi
const requestId = uuid()
await window.electronAPI.n8n.execute({ ...request, requestId })
pollForResponse(requestId)
```

**Tâches** :

1. Implémenter `pollForResponse()` dans `N8nSendBox.tsx`
2. Ajouter `requestId` au type `N8nRequest`
3. Modifier backend pour inclure `requestId` en DB
4. Tester avec différents workflows (rapides et lents)
5. Mesurer le délai d'affichage

**Tests** :

```bash
# Test 1 : Workflow rapide (< 500ms)
# Attendu: Affichage immédiat

# Test 2 : Workflow lent (> 2s)
# Attendu: Affichage après max 5s (10 attempts * 500ms)

# Test 3 : Workflow timeout
# Attendu: Message d'erreur après maxAttempts
```

### 3.3 Problème 3 : Credentials en clair

**Fichier** : `src/renderer/pages/login/LoginPage.tsx`

**Code actuel** :

```typescript
// Ligne ~120
const handleCreateAccount = async () => {
  localStorage.setItem('eaudit_credentials', JSON.stringify({
    username: newUsername,
    password: newPassword  // ⚠️ En clair
  }))
}
```

**Solution** :

```bash
# 1. Installer bcryptjs
bun add bcryptjs
bun add -D @types/bcryptjs
```

```typescript
// 2. Modifier LoginPage.tsx
import bcrypt from 'bcryptjs'

const handleCreateAccount = async () => {
  // Hash password
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  localStorage.setItem('eaudit_credentials', JSON.stringify({
    username: newUsername,
    password: hashedPassword
  }))
  
  message.success('Account created!')
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
  
  // Success
  await auth.login(username, password)
}
```

**Tâches** :

1. Installer bcryptjs
2. Modifier `handleCreateAccount()`
3. Modifier `handleLogin()`
4. Tester création + login
5. Vérifier que l'ancien format (clair) est migré automatiquement

**Tests** :

```bash
# Test 1 : Créer nouveau compte
# Vérifier localStorage: password doit être un hash bcrypt

# Test 2 : Login avec compte créé
# Attendu: Success

# Test 3 : Login avec mauvais password
# Attendu: Error "Invalid credentials"
```

---

## Phase 4 : Améliorations Recommandées (4-8 heures)

### 4.1 Centraliser la configuration n8n

**Créer** : `src/config/n8n.config.ts`

```typescript
export const N8N_CONFIG = {
  baseUrl: process.env.N8N_BASE_URL || 'https://5ociivmf.rpcl.app',
  webhookPath: '/webhook',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
}

export function buildN8nUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${N8N_CONFIG.baseUrl}${N8N_CONFIG.webhookPath}/${endpoint}`)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }
  
  return url.toString()
}
```

**Modifier** : `src/process/services/n8nService.ts`

```typescript
import { N8N_CONFIG, buildN8nUrl } from '@/config/n8n.config'

export async function executeN8nWorkflow(request: N8nRequest): Promise<N8nResponse> {
  const url = buildN8nUrl('template', {
    query: request.query,
    // ... autres params
  })
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(N8N_CONFIG.timeout)
  })
  
  // ... reste du code
}
```

### 4.2 Ajouter validation Zod

**Installer** :

```bash
bun add zod
```

**Créer** : `src/types/n8n.schema.ts`

```typescript
import { z } from 'zod'

export const N8nRequestSchema = z.object({
  query: z.string().min(1),
  workflowId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const N8nResponseSchema = z.object({
  type: z.enum(['table', 'text', 'structured']),
  content: z.string().optional(),
  data: z.any().optional(),
  tables: z.array(z.object({
    headers: z.array(z.string()).optional(),
    rows: z.array(z.any())
  })).optional(),
  metadata: z.record(z.any()).optional()
})

export type N8nRequest = z.infer<typeof N8nRequestSchema>
export type N8nResponse = z.infer<typeof N8nResponseSchema>
```

**Utiliser dans n8nService** :

```typescript
import { N8nRequestSchema, N8nResponseSchema } from '@/types/n8n.schema'

export async function executeN8nWorkflow(request: N8nRequest): Promise<N8nResponse> {
  // Validate input
  const validatedRequest = N8nRequestSchema.parse(request)
  
  // Execute...
  const result = await fetch(...)
  const data = await result.json()
  
  // Validate output
  const normalized = normalizeN8nResponse(data)
  return N8nResponseSchema.parse(normalized)
}
```

### 4.3 Ajouter retry logic

**Créer** : `src/utils/retry.ts`

```typescript
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number
    delay?: number
    backoff?: number
  } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000, backoff = 2 } = options
  
  let lastError: Error
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (i < attempts - 1) {
        const waitTime = delay * Math.pow(backoff, i)
        console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  throw lastError!
}
```

**Utiliser dans n8nService** :

```typescript
import { retry } from '@/utils/retry'

export async function executeN8nWorkflow(request: N8nRequest): Promise<N8nResponse> {
  return retry(
    async () => {
      const response = await fetch(url, {...})
      
      if (!response.ok) {
        throw new Error(`n8n request failed: ${response.status}`)
      }
      
      const result = await response.json()
      return normalizeN8nResponse(result)
    },
    { attempts: 3, delay: 1000, backoff: 2 }
  )
}
```

### 4.4 Ajouter logging structuré

**Installer** :

```bash
bun add winston
```

**Créer** : `src/utils/logger.ts`

```typescript
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}
```

**Utiliser** :

```typescript
import { logger } from '@/utils/logger'

export async function executeN8nWorkflow(request: N8nRequest): Promise<N8nResponse> {
  logger.info('Executing n8n workflow', { request })
  
  try {
    const response = await fetch(...)
    logger.info('n8n workflow executed successfully', { response })
    return normalizeN8nResponse(response)
  } catch (error) {
    logger.error('n8n workflow execution failed', { error, request })
    throw error
  }
}
```

### 4.5 Ajouter tests E2E

**Installer** :

```bash
bun add -D @playwright/test
```

**Créer** : `tests/e2e/webui-login.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('WebUI Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:25808')
  })

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Connexion')
  })

  test('should create account and login', async ({ page }) => {
    // Click "Créer un compte"
    await page.click('text=Créer un compte')
    
    // Fill form
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button:has-text("Créer")')
    
    // Should show success message
    await expect(page.locator('.arco-message-success')).toBeVisible()
    
    // Login with created account
    await page.fill('input[name="username"]', 'testuser')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button:has-text("Se connecter")')
    
    // Should redirect to main app
    await expect(page).toHaveURL(/\/conversation/)
  })

  test('should reject invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'invalid')
    await page.fill('input[name="password"]', 'wrong')
    await page.click('button:has-text("Se connecter")')
    
    await expect(page.locator('.arco-message-error')).toBeVisible()
  })
})
```

**Lancer les tests** :

```bash
# Start WebUI
npx electron-vite dev -- --webui

# In another terminal
bunx playwright test
```

---

## Phase 5 : Documentation et Handoff (2 heures)

### 5.1 Mettre à jour la documentation

**Après chaque modification** :

1. Mettre à jour `PROBLEMES_ET_SOLUTIONS.md` si un problème est résolu
2. Mettre à jour `ARCHITECTURE.md` si l'architecture change
3. Ajouter une entrée dans `CHANGELOG.md` (créer si absent)

**Format CHANGELOG** :

```markdown
# Changelog

## [Unreleased]

### Fixed
- Login page now skips in WebUI when loginEnabled = false
- IPC streams replaced with polling (500ms interval, 10 attempts max)
- Credentials now hashed with bcrypt before storage

### Added
- Centralized n8n configuration in `src/config/n8n.config.ts`
- Zod validation for n8n requests/responses
- Retry logic with exponential backoff
- Structured logging with Winston
- E2E tests with Playwright

### Changed
- Removed `isDesktopRuntime()` check from login skip logic
- Replaced `setTimeout(1500ms)` with intelligent polling
```

### 5.2 Créer un README pour l'agent suivant

**Créer** : `HANDOFF.md`

```markdown
# Project Handoff - E-audit WebUI

## Current Status

### ✅ Completed
- n8n cloud migration (16 endpoints → https://5ociivmf.rpcl.app/)
- Response normalization (4 formats supported)
- WebUI deployment (port 25808)
- Desktop mode (Electron)
- Basic authentication (localStorage)

### ⚠️ Known Issues
1. **Login page shows in WebUI** (workaround: create account)
2. **IPC streams unreliable** (workaround: polling)
3. **Credentials stored in clear** (⚠️ dev only)

### 🚧 In Progress
- Nothing currently

### 📋 Backlog
- Fix login skip in WebUI mode
- Implement proper IPC streams
- Add bcrypt hashing for passwords
- Centralize n8n configuration
- Add Zod validation
- Add retry logic
- Add structured logging
- Add E2E tests

## Quick Start

```bash
# Desktop mode
npm start

# WebUI mode
npx electron-vite dev -- --webui

# Tests
bun run test

# Lint
bun run lint:fix
```

## Key Files

- `src/process/services/n8nService.ts` - n8n integration
- `src/renderer/context/AuthContext.tsx` - Authentication
- `src/renderer/pages/conversation/n8n/N8nSendBox.tsx` - Workflow input
- `Doc_Aionui_Web_Deploy/` - Complete documentation

## Next Steps

See `Doc_Aionui_Web_Deploy/GUIDE_REPRISE_PROJET.md` Phase 3 and 4.

## Contact

[Previous developer contact info]
```

### 5.3 Code Review Checklist

Avant de passer le projet à l'agent suivant :

```markdown
## Code Quality Checklist

### ✅ Tests
- [ ] All unit tests pass (`bun run test`)
- [ ] Integration tests pass
- [ ] E2E tests pass (if implemented)
- [ ] Coverage > 70% (if measured)

### ✅ Code Style
- [ ] No ESLint errors (`bun run lint`)
- [ ] Prettier formatting applied (`bun run format`)
- [ ] No TypeScript errors (`bunx tsc --noEmit`)

### ✅ Functionality
- [ ] Desktop mode works (npm start)
- [ ] WebUI mode works (npx electron-vite dev -- --webui)
- [ ] n8n workflows execute successfully
- [ ] Tables display correctly
- [ ] Login/logout works (even if page shows)

### ✅ Documentation
- [ ] All new files documented
- [ ] All functions have JSDoc comments
- [ ] README.md up to date
- [ ] CHANGELOG.md updated
- [ ] HANDOFF.md created

### ✅ Security
- [ ] No credentials hardcoded
- [ ] No API keys in source code
- [ ] .env.local in .gitignore
- [ ] localStorage access controlled

### ✅ Performance
- [ ] No memory leaks (tested with DevTools)
- [ ] Build completes < 5min
- [ ] WebUI starts < 10s
- [ ] Workflow response < 3s

### ✅ Git
- [ ] All changes committed
- [ ] Commit messages follow conventions
- [ ] No large files in repo (> 10MB)
- [ ] Branch up to date with main
```

---

## Checklist Complète de Reprise

```markdown
## Agent Takeover Checklist

### Phase 1: Setup (30min) ✅
- [ ] Environment verified (Node, bun, Git, PowerShell)
- [ ] Dependencies installed (`bun install`)
- [ ] TypeScript compiles (`bunx tsc --noEmit`)
- [ ] Desktop mode starts (`npm start`)
- [ ] WebUI mode starts (`npx electron-vite dev -- --webui`)
- [ ] Tests pass (`bun run test`)
- [ ] n8n cloud reachable (`curl https://5ociivmf.rpcl.app/...`)

### Phase 2: Understanding (1-2h) ✅
- [ ] Read README.md
- [ ] Read DEMARRAGE.md
- [ ] Read ARCHITECTURE.md
- [ ] Read PROBLEMES_ET_SOLUTIONS.md
- [ ] Read AGENTS.md
- [ ] Explored critical files (n8nService.ts, AuthContext.tsx, etc.)
- [ ] Traced n8n workflow flow
- [ ] Traced authentication flow

### Phase 3: Fix Known Issues (2-4h) 🚧
- [ ] Fixed login page in WebUI
- [ ] Implemented polling instead of setTimeout
- [ ] Added bcrypt hashing for credentials
- [ ] Tested all fixes

### Phase 4: Improvements (4-8h) 📋
- [ ] Centralized n8n config
- [ ] Added Zod validation
- [ ] Added retry logic
- [ ] Added structured logging
- [ ] Added E2E tests
- [ ] All improvements tested

### Phase 5: Handoff (2h) 📝
- [ ] Updated documentation
- [ ] Created CHANGELOG.md
- [ ] Created HANDOFF.md
- [ ] Completed code review checklist
- [ ] All changes committed
- [ ] PR created (if applicable)
```

**Temps total estimé** : 10-16 heures

---

## Ressources Additionnelles

### Documentation Externe

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-vite Documentation](https://electron-vite.org/)
- [React 19 Documentation](https://react.dev/)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/webhooks/)
- [Arco Design Components](https://arco.design/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

### Outils de Debug

```bash
# Electron DevTools
Ctrl+Shift+I (dans l'app Desktop)

# React DevTools
# Installer l'extension Chrome
# https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

# Network inspector
# Chrome DevTools → Network tab

# Console logs
Get-Content -Tail 50 logs/main.log
Get-Content -Tail 50 logs/renderer.log
Get-Content -Tail 50 logs/error.log

# Process monitoring
Get-Process | Where-Object {$_.ProcessName -match "node|electron"}

# Port monitoring
netstat -ano | findstr "25808"
netstat -ano | findstr "5173"
```

### Scripts Utiles

```bash
# Clean everything
Remove-Item -Recurse -Force node_modules, node_modules\.vite, out, dist, logs

# Fresh install
bun install
bunx tsc --noEmit
bun run test

# Start from scratch
Remove-Item -Recurse -Force node_modules\.vite, out
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui

# Check for outdated dependencies
bun outdated

# Update dependencies (caution)
bun update
```

---

## Support et Contact

**Documentation** :
- Folder: `Doc_Aionui_Web_Deploy/`
- Index: `Doc_Aionui_Web_Deploy/INDEX.md`

**Code** :
- Main repo: `g:\Aionui_client\`
- n8n scripts: `n8n-server-multi-workflow/n8n_script/`

**Logs** :
- Main process: `logs/main.log`
- Renderer: `logs/renderer.log`
- Errors: `logs/error.log`

---

**Bonne chance pour la reprise du projet !** 🚀
