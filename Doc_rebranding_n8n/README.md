# Migration n8n vers Cloud - Documentation Complète

> Guide exhaustif pour comprendre et reprendre le projet après migration n8n cloud

---

## 🎯 Contexte de la Migration

### Avant la Migration
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  AionUI App │────▶│ Backend Node │────▶│ n8n Local   │
│  (Electron) │     │ localhost    │     │ :5678       │
│             │     │ :3458        │     │ ou Netlify  │
└─────────────┘     └──────────────┘     └─────────────┘
```

**Problèmes** :
- ❌ Dépendance à un backend Node.js local
- ❌ Dépendance à n8n local ou Netlify Functions
- ❌ Architecture multi-couches complexe
- ❌ Points de défaillance multiples
- ❌ Configuration et maintenance complexes

### Après la Migration
```
┌─────────────┐
│  AionUI App │────▶ https://5ociivmf.rpcl.app/webhook/
│  (Electron) │       (n8n Cloud Direct)
└─────────────┘
```

**Avantages** :
- ✅ Architecture simplifiée (1 couche)
- ✅ Aucune dépendance locale
- ✅ Déploiement cloud fiable
- ✅ Scalabilité automatique
- ✅ Maintenance réduite

---

## 🏗️ Architecture Générale

### Composants Principaux

#### 1. **Frontend (Renderer Process)**
- **Localisation** : `src/renderer/pages/conversation/n8n/`
- **Rôle** : Interface utilisateur pour interactions n8n
- **Technologie** : React 19 + TypeScript
- **Composant principal** : `N8nSendBox.tsx`

#### 2. **Backend (Main Process)**
- **Localisation** : `src/process/services/` et `src/process/task/`
- **Rôle** : Logique métier et communication n8n
- **Technologie** : Node.js + Electron
- **Composants clés** :
  - `n8nService.ts` - Service HTTP vers n8n cloud
  - `N8nAgentManager.ts` - Gestionnaire de conversation

#### 3. **Parser & Transformers**
- **Localisation** : `src/agent/n8n/`
- **Rôle** : Normalisation et transformation des réponses
- **Composant** : `n8nResponseParser.ts`

#### 4. **Configuration Endpoints**
- **Localisation** : `n8n-server-multi-workflow/n8n_script/`
- **Fichier** : `claraApiService.ts`
- **Rôle** : Mapping des 14 workflows n8n

### Communication Inter-Process (IPC)

```typescript
┌─────────────────────────────────────────────────────┐
│                 Electron App                         │
├────────────────────┬────────────────────────────────┤
│  Renderer Process  │      Main Process              │
│  (Frontend React)  │      (Backend Node.js)         │
│                    │                                 │
│  N8nSendBox.tsx ──IPC──▶ N8nAgentManager.ts        │
│       ▲            │              │                  │
│       │            │              ▼                  │
│       │            │      n8nService.ts             │
│       │            │              │                  │
│       │            │              ▼                  │
│       └────IPC─────┤      [HTTP Request]            │
│  (responseStream)  │              │                  │
│                    │              ▼                  │
│                    │   https://5ociivmf.rpcl.app/   │
└────────────────────┴────────────────────────────────┘
```

---

## 🔄 Flux d'une Requête n8n

### Étape par Étape

#### 1. **Utilisateur envoie un message**
```typescript
// Fichier: N8nSendBox.tsx
const handleSend = async (content: string) => {
  // Crée un message placeholder
  addOrUpdateMessage({
    content: '🔄 Exécution en cours...',
    position: 'left'
  }, true);
  
  // Appelle le backend via IPC
  await ipcBridge.conversation.sendMessage.invoke({
    conversation_id,
    input: content,
    msg_id: assistant_msg_id
  });
}
```

#### 2. **Backend reçoit et route**
```typescript
// Fichier: conversationBridge.ts
ipcBridge.conversation.sendMessage.provider(async ({ conversation_id, input }) => {
  const task = await WorkerManage.getTaskByIdRollbackBuild(conversation_id);
  
  if (task.type === 'n8n') {
    await (task as N8nAgentManager).sendMessage({
      content: input,
      msg_id,
      user_msg_id
    });
  }
});
```

#### 3. **Agent Manager exécute**
```typescript
// Fichier: N8nAgentManager.ts
async execute(userMessage: string, msgId: string) {
  // Appelle n8n cloud
  const result = await executeN8nWorkflow({ userMessage });
  
  // Parse la réponse
  const markdown = parseN8nResponse(result.data);
  
  // Sauvegarde en DB
  addMessage(this.id, assistantMessage);
  
  // Émet événement IPC
  ipcBridge.conversation.responseStream.emit({
    type: 'message',
    conversation_id: this.id,
    msg_id: msgId,
    data: markdown
  });
}
```

#### 4. **Service n8n communique avec le cloud**
```typescript
// Fichier: n8nService.ts
export async function executeN8nWorkflow(request) {
  const response = await fetch('https://5ociivmf.rpcl.app/webhook/template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: request.userMessage })
  });
  
  const result = await response.json();
  
  // Normalise le format de réponse
  const normalized = normalizeN8nResponse(result);
  
  return { success: true, data: normalized };
}
```

#### 5. **Frontend reçoit et affiche**
```typescript
// Fichier: N8nSendBox.tsx
useEffect(() => {
  return ipcBridge.conversation.responseStream.on((message) => {
    if (message.type === 'message') {
      // Met à jour l'UI avec la réponse
      addOrUpdateMessage({
        id: message.msg_id,
        content: message.data
      });
    }
  });
}, [conversation_id]);

// WORKAROUND: Recharge depuis DB après 1.5s
setTimeout(async () => {
  const messages = await ipcBridge.database.getConversationMessages.invoke({
    conversation_id,
    page: 0,
    pageSize: 10000
  });
  updateMessageList(() => messages);
}, 1500);
```

---

## 📦 Structure des Données

### Format de Requête vers n8n

```json
{
  "question": "- [Command] = Programme de travail\n- [Processus] = inventaire de caisse\n- [Nb de lignes] = 25"
}
```

### Formats de Réponse n8n (4 types)

#### FORMAT 1 : Array avec output (le plus courant)
```json
[{
  "output": "| Rubrique | Description |\n| --- | --- |\n| Etape de mission | Programme de travail |...",
  "status": "success",
  "tables_found": 2,
  "timestamp": "2026-11-15T16:30:00Z"
}]
```

#### FORMAT 2 : Object avec tables
```json
{
  "tables": [
    { "title": "Programme", "markdown": "..." }
  ],
  "status": "success",
  "tables_found": 2
}
```

#### FORMAT 3 : Output direct
```json
{
  "output": "| Rubrique | Description |...",
  "status": "success"
}
```

#### FORMAT 4 : Structure data
```json
{
  "data": {
    "Etape mission - Programme": [
      { "table_1": {...} }
    ]
  }
}
```

### Format Normalisé Interne

Après normalisation par `normalizeN8nResponse()` :

```typescript
{
  type: 'text' | 'tables' | 'structured_data' | 'unknown' | 'error',
  content?: string,        // Pour type='text'
  tables?: any[],          // Pour type='tables'
  data?: any,              // Pour type='structured_data'
  metadata: {
    status?: string,
    tables_found?: number,
    timestamp?: string,
    format: string
  }
}
```

---

## 🔧 Configuration des Endpoints

### Liste des 15 Workflows

| # | Workflow | Endpoint | Fichier |
|---|----------|----------|---------|
| 1 | Programme de travail | `/webhook/template` | `n8nService.ts` |
| 2 | Cartographie des risques | `/webhook/cartographie` | `claraApiService.ts` |
| 3 | Identification processus | `/webhook/identification` | `claraApiService.ts` |
| 4 | Questionnaire COSO | `/webhook/questionnaire-coso` | `claraApiService.ts` |
| 5 | Manuel d'organisation | `/webhook/manuel` | `claraApiService.ts` |
| 6 | Politiques entreprise | `/webhook/politiques` | `claraApiService.ts` |
| 7 | Diagramme de flux | `/webhook/diagramme-flux` | `claraApiService.ts` |
| 8 | Modèle rapport audit | `/webhook/rapport-audit` | `claraApiService.ts` |
| 9 | Programme de formation | `/webhook/formation` | `claraApiService.ts` |
| 10 | Proposition mission | `/webhook/proposition` | `claraApiService.ts` |
| 11 | Matrice risques | `/webhook/matrice-risques` | `claraApiService.ts` |
| 12 | Sondage Statistique | `/webhook/sondage` | `claraApiService.ts` |
| 13 | Grille séparation tâches | `/webhook/separation-taches` | `claraApiService.ts` |
| 14 | Référentiel contrôle | `/webhook/referentiel` | `claraApiService.ts` |
| 15 | Template principal | `/webhook/template` | `n8n-server.ts` |

### Modification d'un Endpoint

Pour modifier ou ajouter un endpoint :

```typescript
// Fichier: n8n-server-multi-workflow/n8n_script/claraApiService.ts

// 1. Ajouter la constante d'URL
const N8N_NOUVEAU_WORKFLOW_URL = 'https://5ociivmf.rpcl.app/webhook/nouveau-workflow';

// 2. Créer la fonction d'appel
export async function callN8nNouveauWorkflow(data: {
  command: string;
  processus: string;
  nb_lignes: number;
}): Promise<ApiResponse> {
  const requestBody = {
    question: `- [Command] = ${data.command}\n- [Processus] = ${data.processus}\n- [Nb de lignes] = ${data.nb_lignes}`
  };
  
  return callN8nWebhook(N8N_NOUVEAU_WORKFLOW_URL, requestBody);
}
```

---

## 🧪 Tests et Validation

### Tests Manuels

```bash
# 1. Tester un endpoint directement
curl -X POST https://5ociivmf.rpcl.app/webhook/template \
  -H "Content-Type: application/json" \
  -d '{"question": "- [Command] = Programme de travail\n- [Processus] = test\n- [Nb de lignes] = 10"}'

# 2. Lancer l'application
npm start

# 3. Créer une conversation n8n
# 4. Envoyer un message
# 5. Vérifier l'affichage des tables
```

### Tests Automatisés

```bash
# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Coverage
npm run test:coverage
```

---

## 📝 Logs et Debugging

### Activer les Logs

Les logs sont déjà activés dans le code :

```typescript
// Backend (Main Process)
console.log('[n8nService] ...')
console.log('[N8nAgentManager] ...')

// Frontend (Renderer Process)
console.log('[N8nSendBox] ...')
console.log('[n8nResponseParser] ...')
```

### Consulter les Logs

1. **Console Electron (Main Process)**
   - Terminal où vous avez lancé `npm start`
   
2. **Console DevTools (Renderer Process)**
   - Ouvrir DevTools : `F12` ou `Ctrl+Shift+I`
   - Onglet Console
   - Filtrer par `[n8n` ou `[N8n`

### Logs Typiques d'une Requête Réussie

```
[conversationBridge] sendMessage called: conversation_id=abc123, msg_id=xyz789
[n8nService] Executing workflow: { message: '...' }
[n8nService] Workflow executed successfully
[n8nService] Raw result: [{"output":"..."}]
[n8nService] FORMAT 1: Array with output
[n8nService] Normalized result: {"type":"text","content":"..."}
[N8nAgentManager] Result received: { success: true, hasData: true }
[n8nResponseParser] Parsing data type: text hasContent: true
[N8nAgentManager] Markdown generated: | Rubrique | Description |...
[N8nAgentManager] Message saved to DB
[N8nAgentManager] Emitting message event to frontend...
[N8nAgentManager] All events emitted successfully
```

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js >= 22 < 25
- npm ou bun
- Git

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd Aionui_client

# Installer les dépendances
npm install

# Démarrer en mode développement
npm start
```

### Premier Test n8n

1. Lancer l'application : `npm start`
2. Créer une nouvelle conversation n8n
3. Envoyer : `- [Command] = Programme de travail\n- [Processus] = test\n- [Nb de lignes] = 10`
4. Vérifier que les tables s'affichent après ~2 secondes

---

## 📚 Ressources Additionnelles

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture détaillée
- **[FLUX_REQUETES.md](./FLUX_REQUETES.md)** - Diagrammes de flux
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Référence API complète
- **[CODE_REFERENCE.md](./CODE_REFERENCE.md)** - Référence code
- **[PROBLEMES_RENCONTRES.md](./PROBLEMES_RENCONTRES.md)** - Historique problèmes
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Guide dépannage

---

**Navigation** : [← Retour Index](./INDEX.md) | [Suivant: ARCHITECTURE.md →](./ARCHITECTURE.md)
