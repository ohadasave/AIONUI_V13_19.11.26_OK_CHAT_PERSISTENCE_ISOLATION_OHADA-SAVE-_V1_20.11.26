# ✅ Documentation WebUI Complète - E-audit

## 📍 Localisation

Toute la documentation de déploiement WebUI et de reprise de projet se trouve dans :

```
g:\Aionui_client\Doc_Aionui_Web_Deploy\
```

## 📚 Documents Créés (8 fichiers)

| Document | Taille | Description | Temps Lecture |
|----------|--------|-------------|---------------|
| **INDEX.md** | 2.7 KB | Navigation centrale et index général | 5 min |
| **README.md** | 18.3 KB | Vue d'ensemble complète du projet | 30 min |
| **DEMARRAGE.md** | 14.8 KB | Commandes et procédures de démarrage | 20 min |
| **ARCHITECTURE.md** | 22.4 KB | Architecture technique détaillée | 45 min |
| **PROBLEMES_ET_SOLUTIONS.md** | 21.7 KB | 8 problèmes documentés avec solutions | 40 min |
| **GUIDE_REPRISE_PROJET.md** | 19.5 KB | Plan d'action en 5 phases pour reprise | 35 min |
| **CONFIGURATION.md** | 16.2 KB | Configuration système complète | 30 min |
| **POINTS_ATTENTION.md** | 19.8 KB | 19 pièges et points critiques | 35 min |
| **SYNTHESE_FINALE.md** | 7.5 KB | Synthèse de la documentation | 15 min |

**Total** : 142.9 KB | 99+ sections | ~4h35 de lecture

---

## 🎯 Démarrage Rapide

### Pour Lancer l'Application WebUI

```bash
# Ouvrir PowerShell dans g:\Aionui_client\

# Configurer mémoire Node.js
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Lancer en mode développement
npx electron-vite dev -- --webui
```

**Accès** : http://localhost:25808

**Credentials par défaut** : Créer un compte lors du premier accès

---

### Pour Reprendre le Projet (Agent de Code)

**Parcours Express (1h10)** :

1. **INDEX.md** (5 min) - Point d'entrée et navigation
2. **README.md** (30 min) - Contexte et vue d'ensemble
3. **DEMARRAGE.md** (20 min) - Lancer l'application
4. **GUIDE_REPRISE_PROJET.md** (15 min) - Plan d'action Phase 1-2

**Puis tester** :
```bash
# Test 1 : Desktop mode
npm start

# Test 2 : WebUI mode
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

---

## 📖 Contenu Principal

### 1. Architecture Multi-Process

**Desktop Mode** : Electron (Main + Renderer + Worker + Preload)

**WebUI Mode** : Express HTTP Server (port 25808) + Vite Dev (port 5173)

**Communication** : IPC (Desktop) ou HTTP REST (WebUI)

**Voir** : `Doc_Aionui_Web_Deploy/ARCHITECTURE.md`

---

### 2. Système d'Authentification

**Storage** : localStorage (⚠️ credentials en clair actuellement)

**Flow** :
1. LoginPage.tsx → Formulaire
2. AuthContext.login() → Validation
3. localStorage.eaudit_credentials → Stockage
4. Redirect vers MainApp

**Problème connu** : Login page s'affiche toujours en WebUI (même si `loginEnabled = false`)

**Voir** : `Doc_Aionui_Web_Deploy/PROBLEMES_ET_SOLUTIONS.md` Section 5

---

### 3. Intégration n8n Cloud

**URL** : https://5ociivmf.rpcl.app/

**Endpoints migrés** : 16 (src/process/services/n8nService.ts + claraApiService.ts)

**Response Formats** : 4 formats différents normalisés par `normalizeN8nResponse()`

**Voir** : `Doc_Aionui_Web_Deploy/ARCHITECTURE.md` Section "Flux n8n"

---

### 4. Problèmes Connus

**8 problèmes majeurs documentés** :

1. ✅ Migration n8n ECONNREFUSED (résolu)
2. ✅ WebUI page blanche (résolu)
3. ✅ Normalisation réponses n8n (résolu)
4. ⏳ IPC Streams unreliable (workaround en place : polling 1.5s)
5. ⏳ Login page en WebUI (workaround : créer compte manuellement)
6. ✅ Build memory issues (résolu : max-old-space-size=8192)
7. ✅ Vite Proxy CORS (n/a : n8n cloud a déjà CORS)
8. ✅ Cache HMR (procédure de nettoyage documentée)

**Voir** : `Doc_Aionui_Web_Deploy/PROBLEMES_ET_SOLUTIONS.md`

---

### 5. Configuration Requise

**Système** :
- Node.js >= 18.0.0
- Bun >= 1.0.0 (optionnel)
- Git >= 2.30.0
- PowerShell >= 7.0 (Windows)

**Ports** :
- 25808 : WebUI Server
- 5173 : Vite Dev Server
- 24678 : Vite HMR WebSocket

**Voir** : `Doc_Aionui_Web_Deploy/CONFIGURATION.md`

---

### 6. Points d'Attention Critiques

**🚨 5 Points Critiques** :
1. IPC Streams non fiables
2. Login page en WebUI
3. Credentials en clair dans localStorage
4. Script cleanup.js (désactivé)
5. Format réponse n8n variable

**🚫 9 Red Flags** (arrêter immédiatement si détecté) :
- Context isolation désactivée
- Node.js activé dans renderer
- Credentials hardcodés
- Eval de code arbitraire
- SQL injection possible
- Cleanup localStorage au load
- Timeout > 10 minutes
- Loop infini potentiel

**Voir** : `Doc_Aionui_Web_Deploy/POINTS_ATTENTION.md`

---

## 🔧 Dépannage Rapide

### Problème : Page blanche au démarrage WebUI

```bash
# 1. Vérifier que Vite démarre
# Dans les logs, chercher : "Vite dev server on http://localhost:5173"

# 2. Si absent, clean cache
Remove-Item -Recurse -Force node_modules\.vite, out

# 3. Relancer
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx electron-vite dev -- --webui
```

---

### Problème : Login page s'affiche alors qu'elle devrait être désactivée

**Cause** : Check `isDesktopRuntime()` dans `AuthContext.tsx` bloque le skip en WebUI

**Solution temporaire** : Créer un compte manuellement

**Solution permanente** : Voir `Doc_Aionui_Web_Deploy/GUIDE_REPRISE_PROJET.md` Phase 3.1

---

### Problème : Tables n8n ne s'affichent pas

**Cause** : IPC streams non fiables

**Workaround actuel** : Timeout de 1.5s puis reload DB

**Solution permanente** : Polling intelligent (voir `Doc_Aionui_Web_Deploy/GUIDE_REPRISE_PROJET.md` Phase 3.2)

---

### Problème : Build échoue avec "out of memory"

```bash
# Augmenter mémoire Node.js
$env:NODE_OPTIONS="--max-old-space-size=8192"

# Clean avant build
Remove-Item -Recurse -Force node_modules\.vite, out

# Rebuild
npm run package
```

---

## 🚀 Prochaines Étapes Recommandées

### Court Terme (1 semaine)

1. **Résoudre login en WebUI** (2h)
   - Fichier : `src/renderer/context/AuthContext.tsx`
   - Action : Retirer check `isDesktopRuntime()`

2. **Implémenter polling intelligent** (3h)
   - Fichier : `src/renderer/pages/conversation/n8n/N8nSendBox.tsx`
   - Action : Remplacer `setTimeout(1500ms)` par `pollForResponse()`

3. **Ajouter hashing bcrypt** (2h)
   - Fichier : `src/renderer/pages/login/LoginPage.tsx`
   - Action : Hash password avant storage

**Total** : 7 heures

---

### Moyen Terme (1 mois)

4. **Centraliser config n8n** (4h)
5. **Ajouter validation Zod** (3h)
6. **Ajouter retry logic** (3h)
7. **Ajouter logging Winston** (4h)

**Total** : 14 heures

---

### Long Terme (3 mois)

8. **Tests E2E Playwright** (8h)
9. **Optimiser build** (6h)
10. **Sécuriser production** (12h)

**Total** : 26 heures

---

## 📊 Statut du Projet

**Version** : 1.8.25

**Date de documentation** : Novembre 2026

**Fonctionnalités Opérationnelles** :
- ✅ Desktop mode (Electron)
- ✅ WebUI mode (HTTP Server)
- ✅ Système d'authentification (localStorage)
- ✅ Intégration n8n cloud (16 endpoints)
- ✅ Base de données SQLite
- ✅ Hot Module Replacement (HMR)

**Problèmes Connus** :
- ⏳ Login page en WebUI (workaround)
- ⏳ IPC streams unreliable (workaround)
- ⚠️ Credentials en clair (dev only)

**Tests** :
- ✅ Tests unitaires (Vitest)
- ⏳ Tests intégration (partiels)
- ❌ Tests E2E (à créer)

---

## 📞 Support

### Documentation Interne

- **WebUI Deploy** : `Doc_Aionui_Web_Deploy/`
- **n8n Migration** : `Doc_rebranding_n8n/`
- **Login System** : `Doc_login_page/`
- **Conventions** : `AGENTS.md`

### Logs

```bash
# Navigateur (F12)
Console → [AuthContext], [WebUI], [ViteProxy]

# Terminal
[WebUI] started / WebUI 已启动
[ACP] Detection completed
```

### Commandes Diagnostic

```bash
# Processes
Get-Process -Name "node", "electron" | Format-Table

# Ports
netstat -ano | findstr "25808"
netstat -ano | findstr "5173"

# Clean
Remove-Item -Recurse -Force node_modules\.vite, out

# Tests
bun run test

# Lint
bun run lint:fix
```

---

## ✅ Checklist de Vérification

Avant de considérer la documentation comme complète :

### Documentation ✅
- [x] INDEX.md créé (navigation)
- [x] README.md créé (vue d'ensemble)
- [x] DEMARRAGE.md créé (commandes)
- [x] ARCHITECTURE.md créé (architecture)
- [x] PROBLEMES_ET_SOLUTIONS.md créé (8 problèmes)
- [x] GUIDE_REPRISE_PROJET.md créé (5 phases)
- [x] CONFIGURATION.md créé (système)
- [x] POINTS_ATTENTION.md créé (19 pièges)
- [x] SYNTHESE_FINALE.md créé (récap)

### Contenu ✅
- [x] Architecture multi-process documentée
- [x] Mode Desktop vs WebUI expliqué
- [x] Système d'authentification détaillé
- [x] Intégration n8n cloud complète
- [x] 8 problèmes documentés avec solutions
- [x] Plan de reprise en 5 phases
- [x] Configuration système complète
- [x] 19 pièges identifiés avec checklist

### Qualité ✅
- [x] Code examples complets
- [x] Diagrammes de flux
- [x] Commandes testées
- [x] Temps de lecture estimés
- [x] Parcours de lecture recommandés
- [x] Liens internes et externes
- [x] Checklist et red flags

---

## 🎉 Conclusion

**Documentation WebUI E-audit : COMPLÈTE** ✅

**142.9 KB de documentation** couvrant :
- Architecture complète
- Procédures de démarrage
- Problèmes et solutions
- Guide de reprise projet
- Configuration système
- Points d'attention critiques

**Pour un agent reprenant le projet** :
1. Commencer par `Doc_Aionui_Web_Deploy/INDEX.md`
2. Suivre le parcours express (1h10)
3. Tester le démarrage
4. Approfondir selon besoin

**Tous les fichiers dans** : `g:\Aionui_client\Doc_Aionui_Web_Deploy\`

---

**Documentation créée le** : Novembre 2026  
**Version** : 1.0  
**Statut** : ✅ Prête pour handoff
