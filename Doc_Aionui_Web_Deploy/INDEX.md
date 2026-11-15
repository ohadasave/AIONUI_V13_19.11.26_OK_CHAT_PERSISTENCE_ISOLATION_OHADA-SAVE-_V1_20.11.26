# Documentation - Déploiement WebUI E-audit

## 📚 Vue d'Ensemble

Ce dossier contient toute la documentation relative au déploiement de l'application E-audit en mode WebUI (navigateur web), incluant l'architecture, les procédures de démarrage, les problèmes rencontrés et leurs solutions.

## 📁 Structure de la Documentation

```
Doc_Aionui_Web_Deploy/
├── INDEX.md                          # Ce fichier - Index général
├── README.md                         # Introduction et contexte
├── ARCHITECTURE.md                   # Architecture technique du système
├── DEMARRAGE.md                      # Procédures de démarrage
├── PROBLEMES_ET_SOLUTIONS.md         # Historique des problèmes
├── GUIDE_REPRISE_PROJET.md           # Guide pour agent de code
├── CONFIGURATION.md                  # Configuration requise
└── POINTS_ATTENTION.md               # Points critiques à surveiller
```

## 🎯 Objectif

Documenter le processus complet de déploiement de l'application E-audit en mode WebUI avec :
- Architecture multi-processus (Electron + WebUI)
- Système d'authentification
- Intégration n8n cloud
- Points critiques pour la reprise du projet

## 📖 Documents Principaux

### 1. [README.md](./README.md) ✅
Introduction générale, contexte du projet, technologies utilisées
- Vue d'ensemble complète
- Stack technique
- Composants principaux
- Data flow

### 2. [ARCHITECTURE.md](./ARCHITECTURE.md) ✅
- Architecture technique multi-process
- Diagrammes de flux détaillés
- Mode Desktop vs WebUI
- Communication IPC et n8n
- Système d'authentification

### 3. [DEMARRAGE.md](./DEMARRAGE.md) ✅
- Quick start (3 commandes)
- Tous les scripts npm disponibles
- Modes de déploiement détaillés
- Procédures de build
- Troubleshooting complet

### 4. [PROBLEMES_ET_SOLUTIONS.md](./PROBLEMES_ET_SOLUTIONS.md) ✅
- 8 problèmes majeurs documentés
- Solutions détaillées avec code
- Workarounds temporaires
- Solutions permanentes recommandées
- Checklist dépannage général

### 5. [GUIDE_REPRISE_PROJET.md](./GUIDE_REPRISE_PROJET.md) ✅
- Plan d'action en 5 phases (10-16h)
- Checklist complète de reprise
- Fichiers critiques à lire en priorité
- Améliorations recommandées
- Scripts et outils de debug

### 6. [CONFIGURATION.md](./CONFIGURATION.md) ✅
- Configuration système requise
- Tous les ports utilisés
- Dépendances complètes
- Variables d'environnement
- Configuration TypeScript/ESLint/Prettier/Vitest

### 7. [POINTS_ATTENTION.md](./POINTS_ATTENTION.md) ✅
- 19 pièges documentés (Security, Performance, Tests, Network)
- Points critiques (breaking changes)
- Red flags (arrêter immédiatement)
- Checklist avant commit/release

### 8. [SYNTHESE_FINALE.md](./SYNTHESE_FINALE.md) ✅
- Vue d'ensemble de toute la documentation
- Statistiques complètes
- Chemins de lecture recommandés

### 9. [ARCHITECTURE_MULTI_UTILISATEUR.md](./ARCHITECTURE_MULTI_UTILISATEUR.md) ✅ 🆕
- **66 KB** - Analyse complète de l'architecture multi-utilisateur actuelle
- État des lieux : base SQLite, tables users/conversations/messages
- Isolation des données par `user_id` (déjà en place ✅)
- Roadmap transformation SaaS : gestion admin, rôles, blocage utilisateurs
- Migration v17 : ajout colonnes admin + table audit_log
- Exemples de code : endpoints admin, middlewares, interface frontend
- Estimation : 8-12 jours de développement

## 🚀 Démarrage Rapide

### Pour Lancer l'Application

```bash
# Mode développement WebUI
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

**URL d'accès** : http://localhost:25808

### Pour Résoudre un Problème

1. Consultez [PROBLEMES_ET_SOLUTIONS.md](./PROBLEMES_ET_SOLUTIONS.md)
2. Vérifiez les logs dans la console du navigateur (F12)
3. Consultez les logs du serveur dans le terminal

### Pour Reprendre le Projet

1. Lisez [README.md](./README.md) - Contexte (10 min)
2. Lisez [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture (30 min)
3. Lisez [GUIDE_REPRISE_PROJET.md](./GUIDE_REPRISE_PROJET.md) - Guide pratique (20 min)
4. Testez le démarrage selon [DEMARRAGE.md](./DEMARRAGE.md) (10 min)

**Temps total estimé** : 1h10

## 📊 État du Projet

**Version** : 1.8.25  
**Dernière mise à jour** : Novembre 2026  
**Statut** : ✅ Fonctionnel en mode WebUI

### Fonctionnalités Opérationnelles

- ✅ Serveur WebUI actif (port 25808)
- ✅ Système d'authentification WebUI
- ✅ Intégration n8n cloud (https://5ociivmf.rpcl.app/)
- ✅ Base de données SQLite
- ✅ 10 agents détectés
- ✅ Hot Module Replacement (HMR)

### Fonctionnalités en Développement

- ⏳ Login désactivé par défaut (Desktop uniquement)
- ⏳ Validation credentials améliorée
- ⏳ Mode production WebUI

## 🔑 Informations Clés

### Ports Utilisés

| Service | Port | URL |
|---------|------|-----|
| WebUI Server | 25808 | http://localhost:25808 |
| Vite Dev Server | 5173 | http://localhost:5173 |
| Chrome DevTools | 9230 | http://127.0.0.1:9230 |
| n8n Cloud | 443 | https://5ociivmf.rpcl.app/ |

### Technologies Principales

- **Frontend** : React 19, TypeScript 5.8, Arco Design 2, UnoCSS
- **Backend** : Electron 37, Node.js 22+
- **Build** : electron-vite 5, Vite 6
- **Test** : Vitest 4, Playwright
- **Database** : SQLite (better-sqlite3)
- **Runtime** : Bun (optionnel), Node.js

### Fichiers Critiques

```
src/
├── renderer/
│   ├── context/AuthContext.tsx          # Authentification
│   ├── pages/login/LoginPage.tsx        # Page de login
│   └── router.tsx                       # Routage React
├── process/
│   ├── services/n8nService.ts           # Service n8n
│   └── bridge/                          # Communication IPC
├── common/
│   └── storage.ts                       # ConfigStorage
└── webserver/
    └── index.ts                         # Serveur WebUI
```

## 🆘 Support et Dépannage

### Logs Importants

```bash
# Console navigateur (F12)
[AuthContext] Desktop mode - ...
[WebUI] Serving renderer from: ...
[ViteProxy] Error proxying ...

# Terminal serveur
[WebUI] started / WebUI 已启动: http://localhost:25808
[ACP] Detection completed in Xms, found Y agents
```

### Commandes de Diagnostic

```bash
# Vérifier les processus
Get-Process -Name "node", "electron" | Format-Table

# Nettoyer le cache
Remove-Item -Recurse -Force node_modules\.vite, out

# Rebuild complet
npm run package
```

### Contacts et Ressources

- **Documentation projet** : `AGENTS.md`
- **Documentation n8n** : `Doc_rebranding_n8n/`
- **Documentation login** : `Doc_login_page/`
- **Guide branding** : `BRANDING_E_AUDIT.md`

## 📝 Historique des Modifications

### Novembre 2026
- ✅ Migration n8n vers cloud (https://5ociivmf.rpcl.app/)
- ✅ Fix page de login blanche (Vite proxy)
- ✅ Fix authentification et validation credentials
- ✅ Désactivation nettoyage forcé localStorage
- ✅ Création documentation complète

### Points à Améliorer

- 🔄 Optimiser le temps de build (actuellement ~2-3 min)
- 🔄 Implémenter tests E2E pour WebUI
- 🔄 Améliorer gestion du cache Vite
- 🔄 Documenter procédure de production build

## 🔗 Liens Utiles

- Repository GitHub : (à définir)
- Documentation Electron : https://www.electronjs.org/docs
- Documentation Vite : https://vitejs.dev/
- Documentation React Router : https://reactrouter.com/

---

**Auteur** : Documentation créée automatiquement  
**Date** : Novembre 2026  
**Version** : 1.0
