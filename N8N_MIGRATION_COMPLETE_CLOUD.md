# 🎉 Migration n8n Complète vers le Cloud

**Date** : Novembre 2026  
**Plateforme** : `https://5ociivmf.rpcl.app/`  
**Statut** : ✅ TERMINÉ

---

## 📋 Résumé

Tous les endpoints n8n du projet E-audit ont été migrés vers la nouvelle plateforme cloud n8n. Plus aucun endpoint localhost ou Netlify n'est utilisé. Tous les workflows pointent désormais directement vers `https://5ociivmf.rpcl.app/`.

---

## 🔄 Fichiers Modifiés

### 1. **claraApiService.ts** (Principal)
**Chemin** : `n8n-server-multi-workflow/n8n_script/claraApiService.ts`

**Modifications** :
- ✅ **14 endpoints** mis à jour vers la nouvelle URL

#### Détail des endpoints :

| Case | Workflow | Ancienne URL | Nouvelle URL |
|------|----------|-------------|--------------|
| Default | Template | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/template` |
| 2 | Integration Windows | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/integration_windows` |
| 3 | N8n Doc | `https://fpb7ab9h.rpcl.app/...` | `https://5ociivmf.rpcl.app/webhook/n8n_doc` |
| 4 | HTML Processor | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/htlm_processor` |
| 6 | Algorithme | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/algorithme` |
| 7 | Visualisation | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/visualisation` |
| 9 | Integration Document | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/integration_document` |
| 10 | Integration Database | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/integration_database` |
| CIA | Integration CIA | `https://j17rkv4c.rpcld.cc/...` | `https://5ociivmf.rpcl.app/webhook/integration_cia` |
| 11 | CIA Cours | `http://localhost:5678/...` | `https://5ociivmf.rpcl.app/webhook/cia_cours_gemini` |
| 12 | CIA QCM | `http://localhost:5678/...` | `https://5ociivmf.rpcl.app/webhook/qcm_cia_gemini` |
| 13 | Méthodologie | `http://localhost:5678/...` | `https://5ociivmf.rpcl.app/webhook/cia_methodo_gemini` |
| 14 | CIA Synthèse | `http://localhost:5678/...` | `https://5ociivmf.rpcl.app/webhook/synthese_cia_gemini` |
| 15 | Guide | `http://localhost:5678/...` | `https://5ociivmf.rpcl.app/webhook/guide_gemini` |

### 2. **n8n-server.ts** (Serveur intermédiaire)
**Chemin** : `src/agent/n8n/n8n-server.ts`

**Modifications** :
```typescript
// Avant
const N8N_ENDPOINT = 'http://localhost:5678/webhook/template';

// Après
const N8N_ENDPOINT = 'https://5ociivmf.rpcl.app/webhook/template';
```

---

## 🎯 Architecture Actuelle

### Flux des Requêtes

```
┌─────────────────────────────────────────────────────────────┐
│  E-audit Desktop (Electron)                                 │
│  - Frontend React                                           │
│  - User Input                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  claraApiService.ts (Router)                                │
│  - Analyse le message utilisateur                           │
│  - Sélectionne le workflow approprié (switch-case)          │
│  - Détermine l'endpoint n8n                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  🌐 https://5ociivmf.rpcl.app/webhook/*                     │
│  - Plateforme n8n Cloud                                     │
│  - 14 workflows différents                                  │
│  - Traitement des requêtes                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Response Parser                                            │
│  - normalizeN8nResponse()                                   │
│  - Gestion des formats multiples                            │
│  - Conversion Markdown                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  UI Rendering                                               │
│  - Affichage dans le chat                                   │
│  - Tables / Accordéons / Markdown                           │
└─────────────────────────────────────────────────────────────┘
```

### Ancienne vs Nouvelle Architecture

#### ❌ Ancienne (Supprimée)
```
App → claraApiService → Netlify Function → n8n localhost:5678
```

#### ✅ Nouvelle (Actuelle)
```
App → claraApiService → n8n Cloud (5ociivmf.rpcl.app)
```

**Avantages** :
- ✅ Plus de dépendance à Netlify
- ✅ Plus besoin de serveur n8n local
- ✅ Architecture simplifiée
- ✅ Meilleure scalabilité
- ✅ Maintenance facilitée

---

## 📊 Workflows n8n Disponibles

### 1. **Template** (Défaut)
- **Endpoint** : `/webhook/template`
- **Usage** : Workflow standard, utilisé par défaut
- **Triggers** : Messages ne correspondant à aucun autre cas

### 2. **Integration Windows**
- **Endpoint** : `/webhook/integration_windows`
- **Usage** : Intégrations système Windows
- **Triggers** : Messages contenant `[Integration]`

### 3. **N8n Doc**
- **Endpoint** : `/webhook/n8n_doc`
- **Usage** : Documentation n8n
- **Triggers** : Messages contenant `n8n_doc`

### 4. **HTML Processor**
- **Endpoint** : `/webhook/htlm_processor`
- **Usage** : Traitement HTML
- **Triggers** : Messages contenant `Htlm_processor`

### 5. **Algorithme**
- **Endpoint** : `/webhook/algorithme`
- **Usage** : Génération d'algorithmes
- **Triggers** : Messages contenant `Algorithme`

### 6. **Visualisation**
- **Endpoint** : `/webhook/visualisation`
- **Usage** : Création de visualisations
- **Triggers** : Messages contenant `Visualisation`

### 7. **Integration Document**
- **Endpoint** : `/webhook/integration_document`
- **Usage** : Traitement de documents
- **Triggers** : Messages contenant `Document`

### 8. **Integration Database**
- **Endpoint** : `/webhook/integration_database`
- **Usage** : Opérations sur base de données
- **Triggers** : Messages contenant `Database`

### 9. **Integration CIA**
- **Endpoint** : `/webhook/integration_cia`
- **Usage** : CIA générique
- **Triggers** : Messages contenant `CIA` (sans autre spécificité)

### 10. **CIA Cours**
- **Endpoint** : `/webhook/cia_cours_gemini`
- **Usage** : Génération de cours CIA
- **Triggers** : Messages contenant `CIA` + `Cours`

### 11. **CIA QCM**
- **Endpoint** : `/webhook/qcm_cia_gemini`
- **Usage** : Génération de QCM CIA
- **Triggers** : Messages contenant `CIA` + `QCM` ou `Question`

### 12. **Méthodologie**
- **Endpoint** : `/webhook/cia_methodo_gemini`
- **Usage** : Méthodologie CIA
- **Triggers** : Messages contenant `Methodologie` ou `Methodo`

### 13. **CIA Synthèse**
- **Endpoint** : `/webhook/synthese_cia_gemini`
- **Usage** : Synthèse CIA
- **Triggers** : Messages contenant `CIA` + `Synthèse`

### 14. **Guide**
- **Endpoint** : `/webhook/guide_gemini`
- **Usage** : Guides utilisateur
- **Triggers** : Messages contenant `Guide`

---

## 🔧 Configuration Technique

### Timeout
```typescript
private n8nTimeout = 10 * 60 * 1000; // 10 minutes
```

### Headers
```typescript
headers: {
  'Content-Type': 'application/json',
  Accept: 'application/json',
}
```

### Méthode
```typescript
method: 'POST'
```

---

## ✅ Tests et Validation

### Test Manuel
```bash
curl -X POST https://5ociivmf.rpcl.app/webhook/template \
  -H "Content-Type: application/json" \
  -d '{"question": "Test de connexion"}'
```

### Vérifications Effectuées
- ✅ Compilation TypeScript sans erreurs critiques liées à la migration
- ✅ Formatage Prettier appliqué
- ✅ Application Electron redémarrée avec succès
- ✅ Tous les endpoints pointent vers la nouvelle plateforme

---

## 🚀 Prochaines Étapes

### Pour Tester la Migration

1. **Ouvrir l'application E-audit**
2. **Tester chaque workflow** :
   - Envoyer un message "Test" (workflow template)
   - Envoyer "[Integration] test" (integration_windows)
   - Envoyer "n8n_doc test" (n8n_doc)
   - Envoyer "CIA Cours test" (cia_cours_gemini)
   - Etc.

3. **Vérifier les réponses** :
   - Les workflows doivent répondre
   - Les formats doivent être correctement parsés
   - Les tables doivent s'afficher correctement

### Si Problèmes

1. **Vérifier la plateforme n8n** :
   - URL : `https://5ociivmf.rpcl.app/`
   - Les workflows sont-ils actifs ?
   - Les webhooks sont-ils publiés ?

2. **Vérifier les logs** :
   - Ouvrir DevTools (F12) dans l'application
   - Regarder les logs console
   - Vérifier les erreurs réseau

3. **Tester individuellement** :
   - Tester chaque endpoint avec curl
   - Identifier quel workflow pose problème

---

## 📝 Notes Importantes

### Anciens Endpoints (À NE PLUS UTILISER)
- ❌ `http://localhost:5678/*` - Serveur n8n local
- ❌ `https://j17rkv4c.rpcld.cc/*` - Ancienne plateforme
- ❌ `https://fpb7ab9h.rpcl.app/*` - Ancienne plateforme
- ❌ Netlify Functions - Plus utilisé

### Nouveau Standard
- ✅ `https://5ociivmf.rpcl.app/webhook/*` - UNIQUE plateforme

### Sentinelles Internes (Non HTTP)
Ces cas spéciaux n'appellent PAS n8n :
- `SENTINEL_DATABASE` - Affiche un lien vers formulaire
- `SENTINEL_NOTIFICATION` - Affiche une notification locale

---

## 👨‍💻 Maintenance

### Pour Ajouter un Nouveau Workflow

1. **Créer le workflow sur n8n Cloud** (`https://5ociivmf.rpcl.app/`)
2. **Récupérer l'URL du webhook** (ex: `/webhook/nouveau_workflow`)
3. **Ajouter un case dans `claraApiService.ts`** :
   ```typescript
   case "nouveau":
     console.log("🔀 Router → Case X : nouveau_workflow");
     return "https://5ociivmf.rpcl.app/webhook/nouveau_workflow";
   ```
4. **Ajouter la détection dans le routeKey** :
   ```typescript
   else if (msg.includes("Nouveau")) {
     routeKey = "nouveau";
   }
   ```

### Pour Modifier une URL
Modifier directement dans `claraApiService.ts` dans le switch-case correspondant.

---

## 🎯 Checklist de Déploiement

- [x] Modifier tous les endpoints dans `claraApiService.ts`
- [x] Modifier l'endpoint dans `n8n-server.ts`
- [x] Appliquer le formatage Prettier
- [x] Vérifier la compilation TypeScript
- [x] Redémarrer l'application
- [x] Créer la documentation
- [ ] Tester tous les workflows
- [ ] Vérifier les performances
- [ ] Monitoring en production

---

**Migration effectuée avec succès ! 🎉**

L'application E-audit utilise désormais exclusivement la plateforme n8n cloud `https://5ociivmf.rpcl.app/` pour tous ses workflows.
