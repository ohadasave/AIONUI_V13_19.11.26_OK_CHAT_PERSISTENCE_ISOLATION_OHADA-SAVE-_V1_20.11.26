# Configuration - E-audit WebUI

Ce document détaille toutes les configurations système, dépendances, ports, et variables d'environnement nécessaires au fonctionnement de E-audit.

---

## Configuration Système Requise

### Système d'Exploitation

```yaml
Supported:
  - Windows 10/11 (64-bit)
  - macOS 12+ (Intel & Apple Silicon)
  - Linux (Ubuntu 20.04+, Debian 11+)

Tested on:
  - Windows 11 Pro 23H2
  - PowerShell 7.4+
```

### Runtime

```yaml
Node.js:
  version: ">= 18.0.0"
  recommended: "20.11.0 LTS"
  max_old_space_size: 8192 MB

Bun:
  version: ">= 1.0.0"
  recommended: "1.1.40"
  purpose: "Package manager & test runner"

Git:
  version: ">= 2.30.0"
  purpose: "Version control"
```

### Installation Runtime

```bash
# Node.js
# Download from https://nodejs.org/
node --version  # Must be >= 18.0.0

# Bun
# Windows (PowerShell)
irm bun.sh/install.ps1 | iex

# macOS/Linux
curl -fsSL https://bun.sh/install | bash

bun --version  # Must be >= 1.0.0

# Git
# Download from https://git-scm.com/
git --version  # Must be >= 2.30.0
```

---

## Ports Utilisés

### Mode Desktop (Electron)

```yaml
Main Process:
  - Aucun port externe (IPC local uniquement)

DevTools:
  port: 9229
  protocol: "chrome-devtools://"
  access: "localhost only"
  usage: "Electron main process debugging"
```

### Mode WebUI

```yaml
HTTP Server:
  port: 25808
  protocol: "http"
  host: "0.0.0.0"
  url: "http://localhost:25808"
  usage: "WebUI access"

Vite Dev Server:
  port: 5173
  protocol: "http"
  host: "localhost"
  url: "http://localhost:5173"
  usage: "Hot Module Replacement (HMR)"
  note: "Dev mode only"

WebSocket (HMR):
  port: 24678
  protocol: "ws"
  usage: "Vite HMR WebSocket"
  note: "Dev mode only"
```

### Services Externes

```yaml
n8n Cloud:
  url: "https://5ociivmf.rpcl.app"
  endpoints:
    - "/webhook/template"
    - "/webhook/clara"
    - "/webhook/audit"
  protocol: "HTTPS"
  timeout: 30000 ms
  retry: 3 attempts
```

### Vérification des Ports

```bash
# Windows PowerShell
netstat -ano | findstr "25808"
netstat -ano | findstr "5173"
netstat -ano | findstr "24678"

# Si port occupé, kill le processus
$processId = (Get-NetTCPConnection -LocalPort 25808).OwningProcess
Stop-Process -Id $processId -Force

# macOS/Linux
lsof -i :25808
lsof -i :5173

# Kill process
kill -9 $(lsof -t -i:25808)
```

---

## Dépendances

### package.json - Dependencies

```json
{
  "dependencies": {
    "@arco-design/web-react": "^2.63.1",
    "@electron-toolkit/preload": "^3.0.1",
    "@electron-toolkit/utils": "^3.0.0",
    "electron-updater": "^6.3.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.26.2",
    "zod": "^3.23.8"
  }
}
```

**Notes** :
- `@arco-design/web-react` : UI component library
- `electron-updater` : Auto-update pour Desktop
- `react 19` : Dernière version stable
- `zod` : Validation de données

### package.json - DevDependencies

```json
{
  "devDependencies": {
    "@electron-toolkit/eslint-config-ts": "^2.0.0",
    "@electron-toolkit/tsconfig": "^1.0.1",
    "@types/node": "^22.7.5",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@typescript-eslint/eslint-plugin": "^8.8.1",
    "@typescript-eslint/parser": "^8.8.1",
    "@unocss/preset-attributify": "^0.66.0",
    "@unocss/preset-icons": "^0.66.0",
    "@unocss/preset-uno": "^0.66.0",
    "@vitejs/plugin-react": "^4.3.2",
    "@vitest/ui": "^4.0.1",
    "electron": "^37.0.0",
    "electron-builder": "^25.1.8",
    "electron-vite": "^5.0.0",
    "eslint": "^9.12.0",
    "eslint-plugin-react": "^7.37.1",
    "prettier": "^3.3.3",
    "typescript": "^5.8.0",
    "unocss": "^0.66.0",
    "vite": "^6.0.1",
    "vitest": "^4.0.1"
  }
}
```

**Notes** :
- `electron ^37.0.0` : Version majeure Electron
- `electron-vite ^5.0.0` : Build tool principal
- `typescript ^5.8.0` : Strict mode enabled
- `vitest ^4.0.0` : Test framework
- `unocss ^0.66.0` : Atomic CSS engine

### Installation

```bash
# Installation complète
bun install

# Installation sans cache (si problème)
bun install --force

# Installation production only
bun install --production

# Vérifier les dépendances obsolètes
bun outdated

# Mettre à jour toutes les dépendances (DANGER)
bun update
```

---

## Variables d'Environnement

### Fichier `.env.local`

**Localisation** : `g:\Aionui_client\.env.local` (git-ignored)

```bash
# n8n Configuration
N8N_BASE_URL=https://5ociivmf.rpcl.app
N8N_WEBHOOK_PATH=/webhook
N8N_TIMEOUT=30000

# Electron Configuration
ELECTRON_IS_DEV=1
ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Vite Configuration
VITE_DEV_SERVER_PORT=5173
VITE_DEV_SERVER_HOST=localhost

# WebUI Configuration
WEBUI_PORT=25808
WEBUI_HOST=0.0.0.0

# Logging
LOG_LEVEL=info
LOG_FILE=logs/combined.log

# Security (dev only)
DISABLE_AUTH=false
```

### Variables Système (PowerShell)

```bash
# Memory allocation pour Node.js
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Debugging
$env:DEBUG="electron:*"
$env:ELECTRON_ENABLE_LOGGING=1

# Development mode
$env:NODE_ENV="development"

# Production mode
$env:NODE_ENV="production"
```

### Charger les Variables

```bash
# PowerShell
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
  }
}

# Ou utiliser dotenv (recommandé)
# Dans le code :
import { config } from 'dotenv'
config({ path: '.env.local' })
```

---

## Configuration TypeScript

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@process/*": ["src/process/*"],
      "@renderer/*": ["src/renderer/*"],
      "@worker/*": ["src/worker/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out", "dist"]
}
```

**Options importantes** :
- `strict: true` - Mode strict TypeScript (mandatory)
- `noEmit: true` - Pas d'émission de JS (Vite gère ça)
- `paths` - Alias de chemins
- `jsx: react-jsx` - Nouveau JSX transform (React 19)

### Vérification TypeScript

```bash
# Check sans émission de fichiers
bunx tsc --noEmit

# Check avec watch mode
bunx tsc --noEmit --watch

# Check un seul fichier
bunx tsc --noEmit src/process/services/n8nService.ts
```

---

## Configuration ESLint

### .eslintrc.json

```json
{
  "extends": [
    "@electron-toolkit/eslint-config-ts",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { "argsIgnorePattern": "^_" }
    ],
    "react/prop-types": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

**Règles importantes** :
- Paramètres non utilisés : préfixer avec `_`
- Console.log : warning (sauf warn/error)
- PropTypes : désactivé (TypeScript suffit)

### Linting

```bash
# Lint tout le projet
bun run lint

# Lint + auto-fix
bun run lint:fix

# Lint un fichier spécifique
bunx eslint src/process/services/n8nService.ts
```

---

## Configuration Prettier

### .prettierrc.json

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid"
}
```

**Règles importantes** :
- Pas de point-virgule
- Quotes simples
- Pas de trailing comma
- Largeur max 100 caractères

### Formatting

```bash
# Format tout le projet
bun run format

# Check sans modifier
bunx prettier --check "src/**/*.{ts,tsx}"

# Format un fichier
bunx prettier --write src/process/services/n8nService.ts
```

---

## Configuration Vitest

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/process/**/*.ts',
        'src/renderer/**/*.{ts,tsx}',
        'src/worker/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/out/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@process': resolve(__dirname, './src/process'),
      '@renderer': resolve(__dirname, './src/renderer'),
      '@worker': resolve(__dirname, './src/worker')
    }
  }
})
```

**Environnements** :
- `node` : Pour tests backend (main process, services)
- `jsdom` : Pour tests frontend (React components)

**Fichiers par environnement** :
- `*.test.ts` → `node` environment
- `*.dom.test.ts` → `jsdom` environment

### Tests

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage
bun run test:coverage

# Specific test
bun run test tests/unit/services/n8nService.test.ts

# UI mode
bun run test:ui
```

---

## Configuration electron-vite

### electron.vite.config.ts

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

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
        '@process': resolve(__dirname, 'src/process'),
        '@worker': resolve(__dirname, 'src/worker')
      }
    },
    plugins: [react(), UnoCSS()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    server: {
      port: 5173,
      host: 'localhost'
    }
  }
})
```

### Build

```bash
# Development build
npx electron-vite build

# Production build
npm run package

# Build with clean
Remove-Item -Recurse -Force out
npx electron-vite build
```

---

## Configuration electron-builder

### electron-builder.yml

```yaml
appId: com.aionui.eaudit
productName: E-audit
directories:
  output: dist
  buildResources: build

win:
  target:
    - nsis
  icon: build/icon.ico
  artifactName: ${productName}-${version}-${arch}.${ext}

mac:
  target:
    - dmg
  icon: build/icon.icns
  category: public.app-category.productivity

linux:
  target:
    - AppImage
    - deb
  icon: build/icon.png
  category: Utility

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### Packaging

```bash
# Windows
npm run package

# macOS
npm run package:mac

# Linux
npm run package:linux

# All platforms (si disponible)
npm run package:all
```

---

## Configuration UnoCSS

### uno.config.ts

```typescript
import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true
    })
  ],
  shortcuts: [
    {
      'btn': 'px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600',
      'card': 'p-4 rounded shadow bg-white'
    }
  ],
  theme: {
    colors: {
      primary: '#165DFF',
      success: '#00B42A',
      warning: '#FF7D00',
      danger: '#F53F3F'
    }
  }
})
```

---

## Configuration Git

### .gitignore

```gitignore
# Dependencies
node_modules/
bun.lockb

# Build outputs
out/
dist/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo

# Electron
electron-builder.env

# Test
coverage/
.nyc_output/

# Cache
.cache/
.vite/
.eslintcache
```

### .gitattributes

```gitattributes
* text=auto eol=lf
*.{cmd,[cC][mM][dD]} text eol=crlf
*.{bat,[bB][aA][tT]} text eol=crlf
```

---

## Configuration de Sécurité

### Content Security Policy (CSP)

```typescript
// src/process/main.ts
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://5ociivmf.rpcl.app"
      ].join('; ')
    }
  })
})
```

### Context Isolation

```typescript
// src/process/windows/windowManager.ts
webPreferences: {
  nodeIntegration: false,       // ❌ No Node.js in renderer
  contextIsolation: true,       // ✅ Isolate context
  sandbox: true,                // ✅ Sandbox renderer
  webSecurity: true,            // ✅ Web security
  preload: path.join(__dirname, '../preload/index.js')
}
```

---

## Checklist Configuration

Avant de démarrer le projet, vérifier :

```markdown
## System Configuration ✅
- [ ] Node.js >= 18.0.0 installed
- [ ] Bun >= 1.0.0 installed
- [ ] Git >= 2.30.0 installed
- [ ] PowerShell >= 7.0 (Windows)

## Project Configuration ✅
- [ ] Dependencies installed (`bun install`)
- [ ] .env.local created (from .env.example)
- [ ] TypeScript compiles (`bunx tsc --noEmit`)
- [ ] ESLint passes (`bun run lint`)
- [ ] Prettier formatted (`bun run format`)
- [ ] Tests pass (`bun run test`)

## Ports Configuration ✅
- [ ] Port 25808 available (WebUI)
- [ ] Port 5173 available (Vite dev)
- [ ] Port 24678 available (Vite HMR)

## External Services ✅
- [ ] n8n cloud reachable (https://5ociivmf.rpcl.app)
- [ ] Webhooks configured
- [ ] API keys valid (if any)

## Security Configuration ✅
- [ ] CSP configured
- [ ] Context isolation enabled
- [ ] No credentials hardcoded
- [ ] .env.local in .gitignore
```

---

## Résolution de Problèmes de Configuration

### Problème : TypeScript Errors

```bash
# Clean TypeScript cache
Remove-Item -Recurse -Force node_modules/.cache
bunx tsc --noEmit

# Rebuild node_modules/@types
Remove-Item -Recurse -Force node_modules/@types
bun install
```

### Problème : ESLint Errors

```bash
# Clear ESLint cache
Remove-Item .eslintcache
bun run lint:fix
```

### Problème : Port Already in Use

```bash
# Find process
$processId = (Get-NetTCPConnection -LocalPort 25808).OwningProcess

# Kill process
Stop-Process -Id $processId -Force

# Restart
npx electron-vite dev -- --webui
```

### Problème : Build Fails (Memory)

```bash
# Increase Node.js memory
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Or edit .npmrc
echo "node-options=--max-old-space-size=8192" >> .npmrc

# Rebuild
npm run package
```

---

## Références

- [Electron Configuration](https://www.electronjs.org/docs/latest/tutorial/quick-start)
- [electron-vite Configuration](https://electron-vite.org/config/)
- [Vite Configuration](https://vitejs.dev/config/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Vitest Configuration](https://vitest.dev/config/)
- [UnoCSS Configuration](https://unocss.dev/guide/config-file)
