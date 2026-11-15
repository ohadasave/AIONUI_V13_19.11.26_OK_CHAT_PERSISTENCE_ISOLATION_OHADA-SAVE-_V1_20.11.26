# Points d'Attention - E-audit WebUI

Ce document liste les pièges, limitations, et points critiques à surveiller lors du développement et de la maintenance du projet E-audit.

---

## 🚨 Points Critiques (Breaking Changes)

### 1. IPC Streams Non Fiables

**Problème** : Les streams IPC entre main et renderer ne fonctionnent pas de manière fiable.

```typescript
// ❌ NE FONCTIONNE PAS de manière fiable
ipcMain.handle('n8n:execute', async (event, request) => {
  const response = await n8nService.execute(request)
  
  // Stream ne remonte pas toujours au renderer
  event.sender.send('n8n:response', response)
  
  return response
})

// Renderer
window.electronAPI.on('n8n:response', (response) => {
  // ❌ Jamais appelé de manière fiable
  console.log('Stream received:', response)
})
```

**Solution actuelle** : Polling avec timeout

```typescript
// ✅ FONCTIONNE (workaround)
useEffect(() => {
  if (response && response.tables) {
    setTimeout(() => {
      updateMessageList()  // Force reload from DB
    }, 1500)
  }
}, [response, updateMessageList])
```

**⚠️ Conséquences** :
- Délai fixe de 1.5s avant affichage
- Peut manquer des updates rapides
- Pas de vrai temps réel

**✅ Solution permanente recommandée** :
- Implémenter polling intelligent (voir `GUIDE_REPRISE_PROJET.md` Phase 3.2)
- Ou WebSocket entre main et renderer
- Ou fixer l'IPC upstream (meilleur long terme)

---

### 2. Login Page en WebUI

**Problème** : La page de login s'affiche toujours en mode WebUI, même si `security.loginEnabled = false`

```typescript
// AuthContext.tsx (ligne ~85)
const refresh = async () => {
  const loginEnabled = ConfigStorage.get('security.loginEnabled')
  
  // ⚠️ Ce check bloque le skip login en WebUI
  if (!loginEnabled && isDesktopRuntime()) {
    // isDesktopRuntime() = false en WebUI
    setUser({ username: 'auto', isAuthenticated: true })
    return
  }
  
  // WebUI arrive toujours ici
  // → Page login affichée
}
```

**⚠️ Conséquences** :
- Utilisateur doit créer un compte manuellement
- Credentials stockés en localStorage (non chiffré)
- Expérience utilisateur dégradée

**✅ Solution recommandée** :
```typescript
// Retirer le check isDesktopRuntime()
if (!loginEnabled) {
  setUser({ username: 'auto', isAuthenticated: true })
  return
}
```

**OU** (plus sécurisé pour production) :

```typescript
// Forcer login en WebUI, skip uniquement en Desktop
if (isDesktopRuntime() && !loginEnabled) {
  setUser({ username: 'auto', isAuthenticated: true })
  return
}
```

---

### 3. Credentials en Clair dans localStorage

**Problème** : Les mots de passe sont stockés en clair dans `localStorage.eaudit_credentials`

```typescript
// LoginPage.tsx
const handleCreateAccount = async () => {
  localStorage.setItem('eaudit_credentials', JSON.stringify({
    username: newUsername,
    password: newPassword  // ⚠️ En clair
  }))
}
```

**⚠️ Risques** :
- N'importe qui avec accès DevTools peut lire les passwords
- Injection XSS pourrait voler les credentials
- Non conforme RGPD/OWASP pour production

**✅ Solution recommandée** :

```typescript
import bcrypt from 'bcryptjs'

const handleCreateAccount = async () => {
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  localStorage.setItem('eaudit_credentials', JSON.stringify({
    username: newUsername,
    password: hashedPassword
  }))
}

const handleLogin = async () => {
  const stored = localStorage.getItem('eaudit_credentials')
  const credentials = JSON.parse(stored)
  
  const isValid = await bcrypt.compare(password, credentials.password)
  if (!isValid || credentials.username !== username) {
    throw new Error('Invalid credentials')
  }
}
```

**🚫 INTERDIT en production** : Utiliser localStorage pour auth

**✅ Production** : Backend auth externe (OAuth2, JWT, etc.)

---

### 4. Script cleanup.js Trop Agressif

**Problème** : `public/scripts/cleanup.js` nettoyait tout le localStorage à chaque démarrage

```javascript
// ❌ ÉTAIT appelé à chaque load
function forceCleanup() {
  localStorage.clear()
  sessionStorage.clear()
  // Credentials perdus, session détruite
}

window.addEventListener('load', () => {
  forceCleanup()
})
```

**⚠️ Conséquences** :
- Logout forcé à chaque refresh
- Credentials perdus
- Mauvaise UX

**✅ Solution actuelle** : Le bloc est commenté

```javascript
// DÉSACTIVÉ : Ne plus forcer le cleanup
// window.addEventListener('load', () => {
//   forceCleanup()
// })
```

**⚠️ Attention** : Ne pas décommenter sans vérifier l'impact sur l'auth

---

### 5. Format de Réponse n8n Variable

**Problème** : n8n retourne 4 formats différents selon les workflows

```typescript
// FORMAT 1
{type: 'table', content: [...], metadata: {...}}

// FORMAT 2
{tables: [{headers: [...], rows: [...]}], metadata: {...}}

// FORMAT 3
{data: {...}}

// FORMAT 4
[{id: 1, name: 'Item'}]
```

**⚠️ Conséquences** :
- Frontend doit gérer tous les formats
- Risque de display bugs si nouveau format ajouté

**✅ Solution actuelle** : `normalizeN8nResponse()` dans `n8nService.ts`

```typescript
function normalizeN8nResponse(result: any): N8nResponse {
  if (result.type && result.content) return { /* FORMAT 1 */ }
  if (result.tables) return { /* FORMAT 2 */ }
  if (result.data) return { /* FORMAT 3 */ }
  if (Array.isArray(result)) return { /* FORMAT 4 */ }
  return { type: 'text', content: JSON.stringify(result) }
}
```

**⚠️ Attention** :
- Ajouter un nouveau format nécessite modification de `normalizeN8nResponse()`
- Tester avec tous les workflows n8n existants
- Documenter les nouveaux formats dans `ARCHITECTURE.md`

---

## ⚡ Pièges de Performance

### 6. Memory Leaks dans React

**Problème** : React 19 + Electron peut causer des memory leaks si mal utilisé

```typescript
// ❌ Memory leak
useEffect(() => {
  const interval = setInterval(() => {
    updateData()
  }, 1000)
  
  // Oubli de cleanup
}, [])

// ✅ Correct
useEffect(() => {
  const interval = setInterval(() => {
    updateData()
  }, 1000)
  
  return () => clearInterval(interval)
}, [])
```

**⚠️ Autres sources de leaks** :
- Event listeners non nettoyés
- WebSocket connections non fermées
- IPC listeners non supprimés

**✅ Checklist cleanup** :

```typescript
useEffect(() => {
  // Setup
  const subscription = api.subscribe(...)
  const listener = (data) => {...}
  window.electronAPI.on('event', listener)
  
  // Cleanup
  return () => {
    subscription.unsubscribe()
    window.electronAPI.removeListener('event', listener)
  }
}, [])
```

---

### 7. Build Out of Memory

**Problème** : Le build peut échouer avec `JavaScript heap out of memory`

```bash
npm run package
# Error: JavaScript heap out of memory
```

**✅ Solution** :

```bash
# Option 1 : Variable d'environnement
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Option 2 : .npmrc
echo "node-options=--max-old-space-size=8192" >> .npmrc

# Option 3 : Clean avant build
Remove-Item -Recurse -Force node_modules\.vite, out
npm run package
```

**⚠️ Attention** :
- Ne pas commit `.env` avec `NODE_OPTIONS` (utiliser `.env.example`)
- 8192 MB = 8 GB, vérifier que la machine a assez de RAM
- Si encore OOM, augmenter jusqu'à 16384 MB

---

### 8. HMR (Hot Module Replacement) Lent

**Problème** : HMR peut être lent sur gros projets

```bash
# Lancement initial : ~30-60s
npx electron-vite dev -- --webui
# Vite dev server starting...
# (long wait)
```

**✅ Optimisations** :

```typescript
// electron.vite.config.ts
export default defineConfig({
  renderer: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor'  // Chunk séparé pour node_modules
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@arco-design/web-react'
      ]
    }
  }
})
```

**⚠️ Attention** :
- Ne pas trop fragmenter les chunks (balance à trouver)
- `optimizeDeps.include` doit lister les grosses deps

---

## 🔐 Pièges de Sécurité

### 9. Context Isolation Désactivée par Erreur

**Problème** : Désactiver `contextIsolation` expose le renderer à Node.js APIs

```typescript
// ❌ DANGER
webPreferences: {
  nodeIntegration: true,        // ⚠️ Node.js dans renderer
  contextIsolation: false,      // ⚠️ Pas d'isolation
}
```

**⚠️ Risques** :
- Injection XSS peut exécuter du code Node.js
- Accès filesystem arbitraire
- Exécution de commandes système

**✅ Configuration sécurisée** :

```typescript
webPreferences: {
  nodeIntegration: false,       // ✅ Pas de Node.js
  contextIsolation: true,       // ✅ Isolation
  sandbox: true,                // ✅ Sandbox
  webSecurity: true,            // ✅ Web security
  preload: path.join(__dirname, 'preload.js')
}
```

**⚠️ NE JAMAIS** :
- Exposer `require()` au renderer
- Exposer `process` au renderer
- Exposer `fs`, `child_process`, etc.

---

### 10. CSP (Content Security Policy) Trop Permissive

**Problème** : Une CSP mal configurée n'offre aucune protection

```typescript
// ❌ Trop permissif
'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval'"
```

**✅ Configuration stricte** :

```typescript
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self'",  // Pas d'inline scripts
  "style-src 'self' 'unsafe-inline'",  // Arco Design nécessite inline styles
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://5ociivmf.rpcl.app"  // n8n cloud uniquement
].join('; ')
```

**⚠️ Attention** :
- Arco Design nécessite `'unsafe-inline'` pour styles
- Si nouvel endpoint externe, l'ajouter à `connect-src`
- Tester après chaque changement CSP

---

### 11. Credentials Hardcodés

**Problème** : Credentials hardcodés dans le code source

```typescript
// ❌ DANGER
const N8N_API_KEY = 'sk-proj-abc123...'
const DB_PASSWORD = 'MyP@ssw0rd'
```

**✅ Solution** :

```typescript
// Utiliser variables d'environnement
const N8N_API_KEY = process.env.N8N_API_KEY
const DB_PASSWORD = process.env.DB_PASSWORD

// Ou ConfigStorage
const apiKey = ConfigStorage.get('n8n.apiKey')
```

**⚠️ NE JAMAIS** :
- Commit `.env` ou `.env.local`
- Commit credentials dans le code
- Logger les credentials (même en dev)

---

## 🧪 Pièges de Tests

### 12. Tests Ignorant les Erreurs

**Problème** : Tests qui passent même si le code a des erreurs

```typescript
// ❌ Test trop permissif
test('should execute workflow', async () => {
  const result = await executeN8nWorkflow({query: 'test'})
  expect(result).toBeDefined()  // Trop vague
})

// ✅ Test strict
test('should execute workflow', async () => {
  const result = await executeN8nWorkflow({query: 'test'})
  expect(result).toEqual({
    type: 'table',
    tables: expect.arrayContaining([
      expect.objectContaining({
        rows: expect.any(Array)
      })
    ]),
    metadata: expect.any(Object)
  })
})
```

**⚠️ Attention** :
- Ne pas tester uniquement `toBeDefined()` ou `toBeTruthy()`
- Valider la structure complète de la réponse
- Tester les cas d'erreur

---

### 13. Tests Dépendants de l'Ordre d'Exécution

**Problème** : Tests qui passent individuellement mais échouent en groupe

```typescript
// ❌ Test avec side effects
test('create user', async () => {
  await createUser({username: 'test'})
})

test('get user', async () => {
  const user = await getUser('test')  // Dépend du test précédent
  expect(user.username).toBe('test')
})

// ✅ Tests indépendants
test('create user', async () => {
  const user = await createUser({username: 'test1'})
  expect(user.username).toBe('test1')
  
  // Cleanup
  await deleteUser('test1')
})

test('get user', async () => {
  await createUser({username: 'test2'})
  const user = await getUser('test2')
  expect(user.username).toBe('test2')
  
  // Cleanup
  await deleteUser('test2')
})
```

**⚠️ Checklist** :
- Chaque test doit être indépendant
- Utiliser `beforeEach` et `afterEach` pour setup/cleanup
- Ne jamais assumer l'ordre d'exécution

---

## 🌐 Pièges Network

### 14. CORS Errors avec n8n Cloud

**Problème** : Erreurs CORS si mal configuré

```
Access to fetch at 'https://5ociivmf.rpcl.app/webhook/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**✅ Solution actuelle** : n8n cloud a déjà CORS activé, pas besoin de proxy Vite

```typescript
// ❌ NE PAS faire ça (si n8n cloud a déjà CORS)
server: {
  proxy: {
    '/api/n8n': {
      target: 'https://5ociivmf.rpcl.app',
      changeOrigin: true
    }
  }
}
```

**⚠️ Si CORS vraiment nécessaire** :

```typescript
// src/process/main.ts
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

### 15. Timeout trop Court

**Problème** : Requêtes n8n timeout avant la fin du workflow

```typescript
// ❌ Timeout trop court
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000)  // 5s
})
```

**✅ Timeout adapté** :

```typescript
// Workflow rapide : 10s
// Workflow normal : 30s (défaut)
// Workflow lourd : 60s

const timeout = request.expectedDuration || 30000

const response = await fetch(url, {
  signal: AbortSignal.timeout(timeout)
})
```

**⚠️ Attention** :
- Ne pas mettre de timeout > 2 minutes (risque de hang)
- Logger les timeouts pour détecter les workflows lents
- Implémenter retry logic (voir `GUIDE_REPRISE_PROJET.md`)

---

## 📦 Pièges de Packaging

### 16. Dependencies en devDependencies par Erreur

**Problème** : Une dépendance nécessaire en runtime est dans `devDependencies`

```json
{
  "devDependencies": {
    "react": "^19.0.0"  // ❌ Doit être dans dependencies
  }
}
```

**⚠️ Conséquences** :
- App crash en production (`Cannot find module 'react'`)
- Build marche en dev mais pas en prod

**✅ Règle** :

```json
{
  "dependencies": {
    // Tout ce qui est importé dans le code runtime
    "react": "^19.0.0",
    "@arco-design/web-react": "^2.63.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    // Outils de build, tests, lint uniquement
    "@types/react": "^18.3.11",
    "vitest": "^4.0.1",
    "eslint": "^9.12.0"
  }
}
```

---

### 17. Assets Non Inclus dans le Build

**Problème** : Fichiers statiques manquants dans le package final

```typescript
// ❌ Référence absolue
const iconPath = 'G:\\Aionui_client\\public\\icon.png'

// ✅ Référence relative au build
const iconPath = path.join(__dirname, '../renderer/assets/icon.png')
```

**⚠️ Checklist assets** :
- Images dans `public/` → copiées dans `out/renderer/`
- Fonts dans `src/renderer/assets/fonts/` → bundlées
- Icons dans `build/` → inclus dans l'installateur

---

## 🔄 Pièges Git

### 18. Commits avec Code Non Formaté

**Problème** : Code non formaté merge dans main

**✅ Solution** : Husky pre-commit hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

bun run lint
bun run format
bunx tsc --noEmit
bun run test
```

**⚠️ Attention** :
- Hook peut être lent (tests)
- Possibilité de skip avec `--no-verify` (à éviter)

---

### 19. Fichiers Sensibles Commités

**Problème** : `.env.local` ou credentials commités par erreur

**✅ Prévention** :

```bash
# Vérifier avant commit
git status --ignored

# Si déjà commité, retirer de l'historique
git rm --cached .env.local
git commit -m "Remove .env.local from history"
```

**⚠️ Si credentials déjà pushés** :
1. Révoquer immédiatement les credentials
2. Générer de nouveaux credentials
3. Nettoyer l'historique Git (git filter-branch)
4. Force push (si repo privé)

---

## 📝 Checklist Points d'Attention

Avant chaque commit/release :

```markdown
## Security ✅
- [ ] Pas de credentials hardcodés
- [ ] CSP configurée strictement
- [ ] Context isolation activée
- [ ] Credentials chiffrés (si localStorage)

## Performance ✅
- [ ] Pas de memory leaks (useEffect cleanup)
- [ ] Build memory < 8GB
- [ ] HMR < 60s au démarrage

## Code Quality ✅
- [ ] TypeScript 0 errors
- [ ] ESLint 0 errors
- [ ] Prettier formatting appliqué
- [ ] Tests coverage > 70%

## Network ✅
- [ ] n8n endpoints à jour
- [ ] Timeout adapté (30s par défaut)
- [ ] Retry logic implémenté
- [ ] CORS géré

## Dependencies ✅
- [ ] Dependencies vs devDependencies correct
- [ ] Pas de dépendances obsolètes
- [ ] Assets inclus dans build

## Documentation ✅
- [ ] README.md à jour
- [ ] CHANGELOG.md mis à jour
- [ ] Problèmes documentés
```

---

## 🚨 Red Flags (Arrêter Immédiatement)

Si vous voyez ça dans le code, **ARRÊTER** et corriger :

```typescript
// 🚨 Context isolation désactivée
webPreferences: { contextIsolation: false }

// 🚨 Node.js activé dans renderer
webPreferences: { nodeIntegration: true }

// 🚨 Credentials hardcodés
const API_KEY = 'sk-proj-abc123...'

// 🚨 Eval de code arbitraire
eval(userInput)

// 🚨 SQL injection possible
db.query(`SELECT * FROM users WHERE username = '${username}'`)

// 🚨 Cleanup localStorage au load
window.addEventListener('load', () => localStorage.clear())

// 🚨 Timeout de 10 minutes
setTimeout(() => {...}, 600000)

// 🚨 Loop infini potentiel
while (true) { await fetchData() }
```

---

## Ressources

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

**Note** : Ce document est maintenu à jour au fur et à mesure que de nouveaux pièges sont découverts. N'hésitez pas à y ajouter vos propres découvertes.
