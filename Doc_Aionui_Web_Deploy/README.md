# E-audit - Documentation WebUI Deployment

## 🎯 Introduction

E-audit est une application desktop basée sur Electron qui peut également être déployée en mode **WebUI** (interface web accessible via navigateur). Ce document présente le contexte, les objectifs et les technologies utilisées pour ce déploiement.

## 📖 Contexte du Projet

### Origine

L'application E-audit (anciennement AionUi) est un client d'interface chat multi-agents permettant d'interagir avec différents modèles d'IA et workflows n8n.

### Evolution

- **Version initiale** : Application Electron pure (mode desktop uniquement)
- **Version actuelle** : Application hybride supportant :
  - Mode Desktop (Electron natif)
  - Mode WebUI (navigateur web)

### Objectif du Mode WebUI

Permettre l'accès à l'application via un navigateur web sans installation locale, tout en conservant toutes les fonctionnalités principales.

## 🏗️ Architecture Générale

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────┐
│                   E-audit Application                │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
   ┌────▼────┐                        ┌────▼────┐
   │ Desktop │                        │  WebUI  │
   │  Mode   │                        │  Mode   │
   └────┬────┘                        └────┬────┘
        │                                   │
        │  Electron Window                  │  Browser Window
        │  + IPC Bridge                     │  + WebSocket
        │                                   │
        └──────────────┬────────────────────┘
                       │
              ┌────────▼─────────┐
              │  Main Process    │
              │  (Node.js)       │
              └────────┬─────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
   │Database │   │  n8n    │   │ Agents  │
   │ SQLite  │   │ Cloud   │   │ System  │
   └─────────┘   └─────────┘   └─────────┘
```

### Composants Principaux

#### 1. **Main Process (Process Principal)**
- Runtime : Node.js
- Responsabilités :
  - Gestion de la base de données SQLite
  - Communication avec n8n cloud
  - Gestion des agents IA
  - Serveur WebUI (Express)
  - Bridges IPC

#### 2. **Renderer Process (Interface)**
- Runtime : React 19 + TypeScript
- Responsabilités :
  - Interface utilisateur
  - Gestion de l'authentification
  - Communication avec le main process

#### 3. **WebUI Server**
- Framework : Express 5
- Port : 25808
- Fonctionnalités :
  - Servir l'interface React
  - API REST pour authentification
  - WebSocket pour temps réel
  - Proxy vers Vite en dev mode

## 🛠️ Technologies Utilisées

### Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19.1.0 | Framework UI |
| TypeScript | 5.8.3 | Typage statique |
| Arco Design | 2.66.1 | Composants UI |
| UnoCSS | 66.3.3 | Styling utilitaire |
| React Router | 7.8.0 | Routage SPA |

### Backend

| Technologie | Version | Usage |
|-------------|---------|-------|
| Electron | 37.3.1 | Runtime desktop |
| Node.js | 22+ | Runtime serveur |
| Express | 5.1.0 | Serveur HTTP |
| better-sqlite3 | 12.4.1 | Base de données |
| ws | 8.18.3 | WebSocket |

### Build & Dev Tools

| Technologie | Version | Usage |
|-------------|---------|-------|
| electron-vite | 5.0.0 | Build system |
| Vite | 6.4.1 | Dev server + HMR |
| Vitest | 4.0.18 | Tests unitaires |
| Playwright | 1.58.2 | Tests E2E |
| ESLint | 8.57.1 | Linting |
| Prettier | 3.6.2 | Formatage |

## 📦 Structure du Projet

```
G:/Aionui_client/
├── src/
│   ├── renderer/              # Frontend React
│   │   ├── pages/
│   │   │   ├── login/         # Page de connexion
│   │   │   ├── conversation/  # Interface chat
│   │   │   └── settings/      # Paramètres
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── router.tsx
│   │   └── index.tsx
│   ├── process/               # Backend Electron
│   │   ├── services/
│   │   │   └── n8nService.ts
│   │   ├── bridge/            # IPC bridges
│   │   ├── database/          # SQLite
│   │   └── task/              # Agent managers
│   ├── webserver/             # Serveur WebUI
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── middleware/
│   ├── common/                # Code partagé
│   │   ├── storage.ts         # ConfigStorage
│   │   └── ipcBridge.ts
│   └── preload.ts             # Preload script
├── public/
│   ├── index.html             # Template HTML
│   └── scripts/
│       └── cleanup.js         # Script nettoyage
├── out/                       # Build output
│   ├── main/                  # Main process compilé
│   ├── renderer/              # Frontend compilé
│   └── preload/               # Preload compilé
├── Doc_Aionui_Web_Deploy/     # Cette documentation
├── Doc_rebranding_n8n/        # Doc n8n cloud
├── Doc_login_page/            # Doc authentification
└── package.json               # Dependencies
```

## 🚀 Modes de Déploiement

### Mode 1 : Desktop (Electron)

```bash
# Démarrage
npm run start

# Build
npm run dist
```

**Caractéristiques** :
- Fenêtre Electron native
- Communication IPC directe
- Accès complet au système
- Login optionnel (désactivable)

### Mode 2 : WebUI Development

```bash
# Démarrage
npx electron-vite dev -- --webui
```

**Caractéristiques** :
- Accessible via navigateur (http://localhost:25808)
- Hot Module Replacement (HMR)
- Vite dev server (port 5173)
- Login obligatoire

### Mode 3 : WebUI Production

```bash
# Build
npm run package

# Démarrage
node start-webui.js
```

**Caractéristiques** :
- Assets statiques pré-compilés
- Performance optimisée
- Pas de HMR
- Login obligatoire

## 🔐 Système d'Authentification

### Architecture

```
┌──────────────┐
│   Browser    │
└──────┬───────┘
       │ POST /login
       │ credentials
       ▼
┌──────────────────┐
│  AuthContext     │
│  (React)         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  localStorage    │
│  - credentials   │
│  - session       │
│  - username      │
└──────────────────┘
```

### Différences Mode Desktop vs WebUI

| Aspect | Desktop | WebUI |
|--------|---------|-------|
| Login par défaut | Désactivé | Activé |
| Stockage credentials | localStorage | localStorage |
| Validation | Local | Local |
| Session | 24h | 24h |
| Option désactivation | ✅ Oui | ❌ Non |

### Clés localStorage

```javascript
{
  "eaudit_credentials": "{\"username\":\"...\",\"password\":\"...\"}",
  "eaudit_logged_in": "true",
  "eaudit_login_time": "1736956800000",
  "eaudit_username": "SEKA"
}
```

## 🌐 Intégration n8n Cloud

### Architecture

```
┌──────────────┐
│   Frontend   │
└──────┬───────┘
       │ Ask workflow
       ▼
┌──────────────┐
│ n8nService   │
│ (Backend)    │
└──────┬───────┘
       │ HTTPS POST
       ▼
┌────────────────────────────┐
│  n8n Cloud                 │
│  https://5ociivmf.rpcl.app │
│  - 15 endpoints            │
└────────────────────────────┘
```

### Endpoints Migrés

Tous les endpoints n8n ont été migrés de `localhost:5678` vers `https://5ociivmf.rpcl.app/webhook/*`

Voir documentation complète : `Doc_rebranding_n8n/`

## 📊 Flux de Données

### Requête Utilisateur → n8n

```
1. User Input
   ↓
2. React Component (N8nSendBox)
   ↓
3. IPC Bridge / HTTP Request
   ↓
4. n8nService.executeN8nWorkflow()
   ↓
5. HTTPS → n8n Cloud
   ↓
6. Response Normalization
   ↓
7. n8nResponseParser
   ↓
8. Database Save
   ↓
9. Frontend Update (via IPC/WebSocket)
   ↓
10. Display Result
```

### Session Management

```
1. Login Form Submit
   ↓
2. AuthContext.login()
   ↓
3. Validate Credentials (localStorage)
   ↓
4. Store Session
   ↓
5. Redirect to App
   ↓
[24h timeout]
   ↓
6. Session Expired
   ↓
7. Redirect to Login
```

## 🎨 UI/UX

### Thèmes et Styles

- **Design System** : Arco Design
- **Colors** : Theme switcher (light/dark)
- **CSS** : UnoCSS (atomic CSS)
- **Responsive** : ✅ Oui
- **i18n** : Support multi-langues

### Pages Principales

1. **Login Page** (`/login`)
   - Connexion
   - Inscription
   - QR Code (mode WebUI)

2. **Home** (`/`)
   - Liste des conversations
   - Agents disponibles

3. **Chat** (`/conversation/:id`)
   - Interface de conversation
   - Historique messages
   - Outils (n8n, Clara, etc.)

4. **Settings** (`/settings`)
   - Sécurité
   - Thème
   - Agents
   - WebUI

## 🔧 Configuration Système

### Prérequis

- **Node.js** : 22+ (< 25)
- **npm** : 9+
- **Bun** : optionnel (pour certains scripts)
- **OS** : Windows, macOS, Linux
- **RAM** : 8GB minimum (NODE_OPTIONS=--max-old-space-size=8192)

### Ports Requis

| Port | Service | Modifiable |
|------|---------|------------|
| 25808 | WebUI Server | ✅ Oui |
| 5173 | Vite Dev | ✅ Oui |
| 9230 | Chrome DevTools | ✅ Oui |

### Variables d'Environnement

```bash
# Recommandé pour éviter les erreurs de mémoire
NODE_OPTIONS="--max-old-space-size=8192"

# Mode production (optionnel)
NODE_ENV="production"
```

## 📈 Performance

### Temps de Build

- **Development Start** : ~30-45 secondes
- **Full Build** : ~2-3 minutes
- **Hot Reload** : <1 seconde

### Optimisations

- ✅ Code splitting (React.lazy)
- ✅ Tree shaking (Vite)
- ✅ Minification (production)
- ⏳ Cache Vite (à améliorer)
- ⏳ Bundle size optimization

## 🔒 Sécurité

### Authentification

- Stockage local des credentials (à améliorer)
- Session timeout (24h)
- CSRF protection (mode WebUI)
- Rate limiting (login attempts)

### Points d'Attention

⚠️ **Credentials en clair** : En mode Desktop, les credentials sont stockés en clair dans localStorage (acceptable car local)

⚠️ **WebUI Production** : Implémenter HTTPS et authentification renforcée

⚠️ **CORS** : Configuré pour localhost uniquement

## 📞 Support

### Documentation Liée

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture détaillée
- [DEMARRAGE.md](./DEMARRAGE.md) - Procédures de démarrage
- [PROBLEMES_ET_SOLUTIONS.md](./PROBLEMES_ET_SOLUTIONS.md) - Dépannage
- [GUIDE_REPRISE_PROJET.md](./GUIDE_REPRISE_PROJET.md) - Guide pratique

### Ressources Externes

- Documentation Electron : https://www.electronjs.org
- Documentation Vite : https://vitejs.dev
- Documentation React Router : https://reactrouter.com
- Documentation Arco Design : https://arco.design

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026  
**Auteur** : Documentation générée automatiquement
