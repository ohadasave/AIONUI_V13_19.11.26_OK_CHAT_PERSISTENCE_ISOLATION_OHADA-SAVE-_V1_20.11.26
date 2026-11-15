# Documentation n8n Cloud Migration - Table des Matières

> Documentation exhaustive pour la reprise du projet par un agent de code

**Date de création**: 15 novembre 2026  
**Version du projet**: E-audit v1.8.25  
**Statut**: ✅ Migration terminée et fonctionnelle

---

## 📚 Structure de la Documentation

### 1. Vue d'ensemble
- **[README.md](./README.md)** - Introduction et contexte général
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture complète du système n8n

### 2. Technique
- **[FLUX_REQUETES.md](./FLUX_REQUETES.md)** - Diagrammes de flux des requêtes
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Documentation API complète
- **[CODE_REFERENCE.md](./CODE_REFERENCE.md)** - Référence des fichiers et fonctions clés

### 3. Problèmes & Solutions
- **[PROBLEMES_RENCONTRES.md](./PROBLEMES_RENCONTRES.md)** - Historique complet des problèmes
- **[SOLUTIONS_IMPLEMENTEES.md](./SOLUTIONS_IMPLEMENTEES.md)** - Solutions détaillées
- **[WORKAROUNDS.md](./WORKAROUNDS.md)** - Solutions temporaires et leurs raisons

### 4. Guide de reprise
- **[GUIDE_DEVELOPPEUR.md](./GUIDE_DEVELOPPEUR.md)** - Guide pour un nouveau développeur
- **[TESTS.md](./TESTS.md)** - Procédures de test et validation
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Guide de dépannage

### 5. Évolution future
- **[AMELIORATIONS.md](./AMELIORATIONS.md)** - Améliorations possibles
- **[ROADMAP.md](./ROADMAP.md)** - Feuille de route technique

---

## 🎯 Pour Démarrer Rapidement

Si vous êtes un **agent de code** reprenant ce projet :

1. **Lisez d'abord** : [README.md](./README.md) pour comprendre le contexte
2. **Étudiez** : [ARCHITECTURE.md](./ARCHITECTURE.md) pour l'architecture
3. **Consultez** : [FLUX_REQUETES.md](./FLUX_REQUETES.md) pour comprendre les flows
4. **Référez-vous à** : [CODE_REFERENCE.md](./CODE_REFERENCE.md) pour les détails d'implémentation
5. **En cas de problème** : [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 🔑 Informations Clés

### URLs Importantes
- **n8n Cloud Production** : `https://5ociivmf.rpcl.app/`
- **Endpoint principal** : `https://5ociivmf.rpcl.app/webhook/template`

### Fichiers Critiques
```
src/process/services/n8nService.ts          # Service principal n8n
src/process/task/N8nAgentManager.ts         # Gestionnaire d'agent n8n
src/agent/n8n/n8nResponseParser.ts          # Parser de réponses
src/renderer/pages/conversation/n8n/        # Interface utilisateur
n8n-server-multi-workflow/n8n_script/       # Configuration endpoints
```

### Commandes Essentielles
```bash
# Démarrer l'application desktop
npm start

# Démarrer le serveur WebUI
node start-webui.js

# Tests
npm run test

# Lint & Format
npm run lint:fix
npm run format
```

---

## 📊 État du Projet

| Composant | Statut | Notes |
|-----------|--------|-------|
| Migration endpoints | ✅ Terminé | 15/15 endpoints migrés |
| Service n8n | ✅ Fonctionnel | Normalisation des réponses OK |
| Agent Manager | ✅ Fonctionnel | Logs et IPC en place |
| Parser réponses | ✅ Fonctionnel | Support 4 formats |
| Frontend | ✅ Fonctionnel | Workaround DB reload |
| Tests | ⚠️ Partiel | À compléter |
| Documentation | ✅ Complet | Ce dossier |

---

## 🚨 Points d'Attention

### Issues Connues
1. **Événements IPC Stream** - Ne sont pas reçus de manière fiable (workaround en place)
2. **Encodage caractères** - Caractères spéciaux mal encodés dans les réponses n8n
3. **Délai fixe 1.5s** - Rechargement DB après délai fixe (non intelligent)

### Dépendances Critiques
- **Electron 37** - Multi-process architecture
- **React 19** - UI framework
- **IPC Bridge** - Communication inter-process
- **SQLite** - Stockage local des messages

---

## 📞 Support

Pour toute question ou problème :
- Consultez [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Vérifiez [PROBLEMES_RENCONTRES.md](./PROBLEMES_RENCONTRES.md)
- Référez-vous aux logs de l'application (console Electron F12)

---

## 📝 Changelog

### v1.0.0 - 15/11/2026
- ✅ Migration complète vers n8n cloud
- ✅ Suppression dépendances localhost
- ✅ Documentation exhaustive créée
- ✅ Workaround affichage frontend
- ✅ Normalisation formats réponses

---

**Navigation** : [Suivant: README.md →](./README.md)
