# Guide de Reprise du Projet n8n - Pour Agent de Code

> Guide pratique pour un agent de code reprenant le projet AionUI avec n8n cloud

---

## 🎯 Objectif de ce Guide

Permettre à **un agent de code IA** de comprendre rapidement et complètement l'intégration n8n, sans avoir besoin de deviner ou d'explorer le code de manière désorganisée.

---

## 📚 Documentation Disponible

Tous les documents sont dans `g:\Aionui_client\Doc_rebranding_n8n\` :

| Document | Description | Priorité |
|----------|-------------|----------|
| **INDEX.md** | Table des matières et navigation | ⭐⭐⭐ |
| **README.md** | Introduction et vue d'ensemble | ⭐⭐⭐ |
| **ARCHITECTURE.md** | Architecture technique détaillée | ⭐⭐⭐ |
| **FLUX_REQUETES.md** | Diagrammes de flux complets | ⭐⭐⭐ |
| **PROBLEMES_RENCONTRES.md** | Historique des problèmes et solutions | ⭐⭐ |
| **GUIDE_REPRISE_PROJET.md** | Ce fichier | ⭐⭐⭐ |

---

## 🚀 Plan de Reprise en 5 Étapes

### Étape 1 : Comprendre le Contexte (15 minutes)

**Lire** :
1. `README.md` sections :
   - Contexte de la Migration
   - Architecture Générale
   - Flux d'une Requête n8n

**Résultat attendu** :
- ✅ Comprendre pourquoi la migration a eu lieu
- ✅ Connaître l'architecture avant/après
- ✅ Identifier les 3 couches principales (Frontend, Backend, n8n Cloud)

---

### Étape 2 : Étudier l'Architecture (30 minutes)

**Lire** :
1. `ARCHITECTURE.md` sections :
   - Vue d'Ensemble
   - Composants Détaillés
   - IPC Bridge Communication

**Ouvrir les fichiers** :
```bash
# Fichiers critiques à lire
src/renderer/pages/conversation/n8n/N8nSendBox.tsx
src/process/task/N8nAgentManager.ts
src/process/services/n8nService.ts
src/agent/n8n/n8nResponseParser.ts
```

**Résultat attendu** :
- ✅ Comprendre le rôle de chaque composant
- ✅ Savoir où se trouve quelle logique
- ✅ Comprendre la communication IPC

---

### Étape 3 : Suivre un Flux Complet (45 minutes)

**Lire** :
1. `FLUX_REQUETES.md` en entier
2. Suivre une requête étape par étape

**Tester manuellement** :
```bash
# 1. Démarrer l'application
npm start

# 2. Créer une conversation n8n

# 3. Envoyer un message
- [Command] = Programme de travail
- [Processus] = test
- [Nb de lignes] = 10

# 4. Observer les logs (F12 DevTools + Terminal)

# 5. Vérifier l'affichage des tables
```

**Résultat attendu** :
- ✅ Avoir vu un flux complet en action
- ✅ Comprendre le timing (1.5s workaround)
- ✅ Savoir lire les logs

---

### Étape 4 : Comprendre les Problèmes (30 minutes)

**Lire** :
1. `PROBLEMES_RENCONTRES.md` sections :
   - Problème #1 : ECONNREFUSED
   - Problème #2 : Réponses non affichées (IPC)
   - Problème #3 : Format incompatible

**Identifier** :
- ✅ Workarounds en place
- ✅ Limitations connues
- ✅ Points d'amélioration

**Résultat attendu** :
- ✅ Savoir quels sont les workarounds actifs
- ✅ Comprendre pourquoi ils existent
- ✅ Savoir quoi améliorer en priorité

---

### Étape 5 : Faire une Modification Test (1 heure)

**Objectif** : Changer un petit détail pour valider la compréhension

**Suggestions de modifications simples** :

#### Modification A : Changer le Placeholder
```typescript
// Fichier: src/renderer/pages/conversation/n8n/N8nSendBox.tsx
// Ligne ~103

// AVANT
content: '🔄 Exécution en cours...',

// APRÈS
content: '⏳ Votre requête est en cours de traitement...',
```

#### Modification B : Ajouter un Log Custom
```typescript
// Fichier: src/process/services/n8nService.ts
// Dans executeN8nWorkflow(), après le fetch

console.log('[n8nService] 🎉 Custom log - Response received from n8n!');
console.log('[n8nService] Response size:', JSON.stringify(result).length, 'chars');
```

#### Modification C : Changer le Délai Workaround
```typescript
// Fichier: src/renderer/pages/conversation/n8n/N8nSendBox.tsx
// Ligne ~125

// AVANT
}, 1500);

// APRÈS
}, 2500);  // 2.5 secondes au lieu de 1.5
```

**Tester** :
```bash
# 1. Sauvegarder les modifications
# 2. L'app se recharge automatiquement (HMR)
# 3. Tester une requête n8n
# 4. Vérifier que la modification fonctionne
```

**Résultat attendu** :
- ✅ Modification réussie
- ✅ Comprendre le cycle edit-test-debug
- ✅ Confiance pour faire des modifications plus importantes

---

## 🔧 Tâches Courantes et Comment les Faire

### Tâche 1 : Ajouter un Nouveau Workflow n8n

**Scénario** : Vous voulez ajouter un workflow "Rapport Final" avec endpoint `/webhook/rapport-final`

**Fichiers à modifier** :
1. `n8n-server-multi-workflow/n8n_script/claraApiService.ts`

**Étapes** :
```typescript
// 1. Ajouter la constante d'URL
const N8N_RAPPORT_FINAL_URL = 'https://5ociivmf.rpcl.app/webhook/rapport-final';

// 2. Créer la fonction d'appel
export async function callN8nRapportFinal(data: {
  command: string;
  processus: string;
  periode: string;
}): Promise<ApiResponse> {
  const requestBody = {
    question: `- [Command] = ${data.command}\n- [Processus] = ${data.processus}\n- [Période] = ${data.periode}`
  };
  
  return callN8nWebhook(N8N_RAPPORT_FINAL_URL, requestBody);
}

// 3. Exporter la fonction
// (Ajouter dans les exports en bas du fichier)
```

**Tester** :
```bash
# Test direct de l'endpoint
curl -X POST https://5ociivmf.rpcl.app/webhook/rapport-final \
  -H "Content-Type: application/json" \
  -d '{"question": "- [Command] = Rapport Final\n- [Processus] = Audit complet\n- [Période] = 2026"}'
```

---

### Tâche 2 : Modifier le Format de Réponse

**Scénario** : n8n retourne un nouveau format `{result: {data: [...]}}`

**Fichier à modifier** :
1. `src/process/services/n8nService.ts`

**Étapes** :
```typescript
// Dans normalizeN8nResponse()

// Ajouter AVANT le "Unknown format":
// FORMAT 5: Result wrapper
if (result?.result?.data && Array.isArray(result.result.data)) {
  console.log('[n8nService] FORMAT 5: Result wrapper');
  return {
    type: 'structured_data',
    data: result.result.data,
    metadata: {
      format: 'result_wrapper',
      timestamp: new Date().toISOString(),
    },
  };
}
```

**Tester** :
```bash
# 1. Redémarrer l'app
npm start

# 2. Envoyer requête n8n

# 3. Vérifier les logs
[n8nService] FORMAT 5: Result wrapper  # ← Doit apparaître
```

---

### Tâche 3 : Fix le Problème IPC Stream

**Scénario** : Vous voulez supprimer le workaround DB reload et fix les événements IPC

**Diagnostic à faire d'abord** :
```typescript
// 1. Ajouter des logs plus détaillés dans N8nSendBox.tsx

useEffect(() => {
  console.log('[N8nSendBox] 🔧 DEBUG: Registering listener');
  console.log('[N8nSendBox] conversation_id:', conversation_id);
  console.log('[N8nSendBox] ipcBridge:', !!ipcBridge);
  console.log('[N8nSendBox] responseStream:', !!ipcBridge.conversation?.responseStream);
  
  const unsubscribe = ipcBridge.conversation.responseStream.on((message) => {
    console.log('[N8nSendBox] 🔧 DEBUG: Event received!', {
      type: message.type,
      conversation_id: message.conversation_id,
      my_conversation_id: conversation_id,
      matches: message.conversation_id === conversation_id
    });
    
    // ... rest of handler
  });
  
  console.log('[N8nSendBox] 🔧 DEBUG: Listener registered, unsubscribe:', !!unsubscribe);
  
  return unsubscribe;
}, [conversation_id]);
```

**Hypothèses à tester** :
1. **Timing** : Le listener s'enregistre-t-il avant l'émission ?
2. **Channel** : Le channel est-il le bon ?
3. **Context** : Y a-t-il un problème de contexte Electron ?
4. **Async** : Y a-t-il une race condition ?

**Test A : Delay l'émission** :
```typescript
// Dans N8nAgentManager.ts, ajouter un délai
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
ipcBridge.conversation.responseStream.emit({...});
```

**Test B : Acknowledgment** :
```typescript
// Ajouter un système d'acknowledgment
// Backend attend confirmation du frontend avant de continuer
```

**Test C : Alternative IPC** :
```typescript
// Essayer un autre channel IPC
ipcBridge.conversation.n8nResponse.emit({...});
// et écouter sur n8nResponse au lieu de responseStream
```

---

### Tâche 4 : Améliorer le Workaround DB Reload

**Scénario** : Remplacer le setTimeout fixe par un polling intelligent

**Fichier à modifier** :
1. `src/renderer/pages/conversation/n8n/N8nSendBox.tsx`

**Code amélioré** :
```typescript
// Remplacer le setTimeout fixe par:

// Polling intelligent avec détection du message
const pollForResponse = async () => {
  let attempts = 0;
  const maxAttempts = 30; // 15 secondes max (30 * 500ms)
  
  const poll = async () => {
    try {
      const messages = await ipcBridge.database.getConversationMessages.invoke({
        conversation_id,
        page: 0,
        pageSize: 100, // Seulement les 100 derniers
      });
      
      // Chercher notre message de réponse
      const responseMessage = messages.find(m =>
        m.msg_id === assistant_msg_id &&
        m.position === 'left' &&
        m.content?.content !== '🔄 Exécution en cours...'
      );
      
      if (responseMessage) {
        // ✅ Message trouvé !
        console.log('[N8nSendBox] Response found after', attempts * 500, 'ms');
        updateMessageList(() => messages);
        setSending(false);
        return true;
      }
      
      // Pas encore trouvé, continuer
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 500);
      } else {
        // Timeout
        console.warn('[N8nSendBox] Polling timeout after', maxAttempts * 500, 'ms');
        setSending(false);
      }
    } catch (err) {
      console.error('[N8nSendBox] Polling error:', err);
      setSending(false);
    }
  };
  
  // Démarrer après un court délai initial
  setTimeout(poll, 1000);
};

// Lancer le polling
pollForResponse();
```

**Avantages** :
- ✅ Détecte la réponse dès qu'elle arrive (500ms de granularité)
- ✅ Timeout automatique après 15s
- ✅ Moins de latence perçue
- ✅ Logs avec timing précis

---

### Tâche 5 : Ajouter des Tests Automatisés

**Scénario** : Ajouter des tests pour `normalizeN8nResponse()`

**Créer** : `src/process/services/__tests__/n8nService.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeN8nResponse } from '../n8nService';

describe('n8nService - normalizeN8nResponse', () => {
  it('should handle FORMAT 1: Array with output', () => {
    const input = [{
      output: "| Rubrique | Description |\n...",
      status: "success",
      tables_found: 2,
      timestamp: "2026-11-15T16:30:00Z"
    }];
    
    const result = normalizeN8nResponse(input);
    
    expect(result.type).toBe('text');
    expect(result.content).toContain('Rubrique');
    expect(result.metadata.format).toBe('array_output');
    expect(result.metadata.status).toBe('success');
  });
  
  it('should handle FORMAT 2: Object with tables', () => {
    const input = {
      tables: [
        { title: "Table 1", markdown: "..." },
        { title: "Table 2", markdown: "..." }
      ],
      status: "success",
      tables_found: 2
    };
    
    const result = normalizeN8nResponse(input);
    
    expect(result.type).toBe('tables');
    expect(result.tables).toHaveLength(2);
    expect(result.metadata.format).toBe('tables_array');
  });
  
  it('should handle empty/null response', () => {
    const result = normalizeN8nResponse(null);
    
    expect(result.type).toBe('error');
    expect(result.error).toContain('Empty response');
  });
  
  it('should handle unknown format', () => {
    const input = {
      weird_format: true,
      data: "something"
    };
    
    const result = normalizeN8nResponse(input);
    
    expect(result.type).toBe('unknown');
    expect(result.raw).toEqual(input);
  });
});
```

**Lancer les tests** :
```bash
npm run test src/process/services/__tests__/n8nService.test.ts
```

---

## 🐛 Debugging Guide

### Problème : "Les tables n'apparaissent pas"

**Checklist** :
1. ✅ Vérifier que n8n cloud répond
   ```bash
   curl -X POST https://5ociivmf.rpcl.app/webhook/template \
     -H "Content-Type: application/json" \
     -d '{"question": "test"}'
   ```

2. ✅ Vérifier les logs backend (terminal npm start)
   - `[n8nService] Workflow executed successfully` doit apparaître
   - `[N8nAgentManager] Message saved to DB` doit apparaître

3. ✅ Vérifier les logs frontend (DevTools F12)
   - `[N8nSendBox] Reloading messages from DB` doit apparaître
   - `[N8nSendBox] Loaded X messages` doit apparaître

4. ✅ Vérifier la DB
   ```typescript
   // Dans DevTools Console
   await window.electron.ipcRenderer.invoke('db:get-messages', {
     conversation_id: 'VOTRE_CONVERSATION_ID'
   })
   ```

5. ✅ Vérifier le délai workaround
   - Si n8n prend > 1.5s, augmenter le timeout

---

### Problème : "ECONNREFUSED"

**Cause** : URL n8n incorrecte ou service n8n down

**Fix** :
```bash
# 1. Vérifier l'URL dans n8nService.ts
grep "N8N_CLOUD_URL" src/process/services/n8nService.ts
# Doit être: https://5ociivmf.rpcl.app/webhook/template

# 2. Tester l'endpoint
curl https://5ociivmf.rpcl.app/webhook/template
# Doit retourner quelque chose (pas 404)

# 3. Vérifier firewall/proxy
```

---

### Problème : "Format non reconnu"

**Cause** : n8n retourne un nouveau format non supporté

**Fix** :
```typescript
// 1. Capturer le format exact
// Dans n8nService.ts
console.log('[n8nService] RAW FULL RESPONSE:', JSON.stringify(result, null, 2));

// 2. Ajouter support dans normalizeN8nResponse()
// Voir Tâche 2 ci-dessus

// 3. Tester
```

---

## 📊 Métriques & Performance

### Temps de Réponse Typiques

| Étape | Temps | Optimisable ? |
|-------|-------|---------------|
| User input → IPC | 50ms | ❌ Non |
| IPC → n8n HTTP | 100ms | ❌ Non |
| n8n processing | 2-5s | ⚠️ Côté n8n |
| HTTP → Parse | 100ms | ✅ Oui (cache) |
| Parse → DB save | 50ms | ❌ Non |
| Workaround delay | 1.5s | ✅ Oui (polling) |
| DB → Render | 100ms | ✅ Oui (React) |
| **TOTAL** | **4-7s** | - |

### Points d'Optimisation

1. **Remplacer workaround par IPC fix** : -1s
2. **Cache des réponses n8n** : -2s (pour requêtes identiques)
3. **Polling intelligent** : -500ms (détection plus rapide)
4. **React memo sur tables** : -100ms (moins de re-renders)

---

## 🎓 Ressources Complémentaires

### Documentation Externe
- **Electron IPC** : https://www.electronjs.org/docs/latest/api/ipc-main
- **React Hooks** : https://react.dev/reference/react
- **n8n Webhooks** : https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **TypeScript** : https://www.typescriptlang.org/docs/

### Fichiers Clés du Projet
```
src/
├── renderer/                    # Frontend (React)
│   ├── pages/conversation/n8n/
│   │   ├── N8nSendBox.tsx      # 🔑 Input utilisateur
│   │   └── N8nChat.tsx         # Container
│   ├── messages/
│   │   └── MessageList.tsx     # Affichage messages
│   └── components/
│       └── Markdown.tsx        # Rendu markdown
├── process/                     # Backend (Node.js)
│   ├── services/
│   │   └── n8nService.ts       # 🔑 HTTP vers n8n
│   ├── task/
│   │   └── N8nAgentManager.ts  # 🔑 Gestionnaire
│   └── bridge/
│       └── conversationBridge.ts  # IPC router
├── agent/n8n/
│   └── n8nResponseParser.ts    # 🔑 Parser markdown
└── common/
    └── ipcBridge.ts            # IPC definitions

n8n-server-multi-workflow/
└── n8n_script/
    └── claraApiService.ts      # 🔑 Endpoints config
```

---

## ✅ Checklist de Reprise Complète

Cochez au fur et à mesure :

### Compréhension
- [ ] Lu README.md
- [ ] Lu ARCHITECTURE.md
- [ ] Lu FLUX_REQUETES.md
- [ ] Lu PROBLEMES_RENCONTRES.md
- [ ] Compris les 3 couches (Frontend, Backend, n8n)
- [ ] Compris le workaround DB reload
- [ ] Identifié les 5 fichiers critiques

### Pratique
- [ ] Démarré l'application avec succès
- [ ] Envoyé une requête n8n et vu les tables
- [ ] Ouvert DevTools et vu les logs frontend
- [ ] Consulté les logs backend dans le terminal
- [ ] Fait une modification test
- [ ] Test réussi

### Autonomie
- [ ] Capable d'ajouter un workflow
- [ ] Capable de modifier un format de réponse
- [ ] Capable de debugger un problème
- [ ] Capable d'améliorer le workaround
- [ ] Capable d'ajouter des tests

---

## 🆘 Besoin d'Aide ?

Si vous êtes bloqué :

1. **Relire** la section pertinente de la documentation
2. **Vérifier** les logs (frontend ET backend)
3. **Tester** l'endpoint n8n directement avec curl
4. **Consulter** PROBLEMES_RENCONTRES.md pour voir si c'est un problème connu
5. **Ajouter** des logs détaillés pour tracer le flux

---

## 🎉 Vous êtes Prêt !

Si vous avez coché toute la checklist, vous êtes maintenant autonome sur l'intégration n8n de ce projet.

**Prochaines étapes suggérées** :
1. Fix le problème IPC Stream (supprimer le workaround)
2. Ajouter des tests automatisés
3. Optimiser les performances (cache, polling)
4. Améliorer l'UX (indicateurs de progression)

Bon code ! 🚀

---

**Navigation** : [← Index](./INDEX.md)
