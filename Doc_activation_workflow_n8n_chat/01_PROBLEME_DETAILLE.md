# Problème d'activation des workflows n8n dans l'interface de chat

## 📋 Vue d'ensemble

**Version**: AionUi E-audit v1.8.25  
**Date**: 18 novembre 2026  
**Statut**: BLOQUÉ - Modifications committées mais non appliquées malgré multiples redémarrages

## 🎯 Objectif

Activer les assistants n8n sur la page d'accueil `/guid` et permettre l'envoi de messages vers les endpoints n8n sans dépendance au bouton Admin.

## ❌ Problèmes persistants

### Problème 1: Page d'accueil n'affiche pas les workflows n8n
**Symptôme**: La page `/guid` ne montre aucun assistant n8n même si activés dans les paramètres  
**Impact**: Impossible de sélectionner n8n comme assistant par défaut  
**Comportement attendu**: "n8n Workflow" sélectionné automatiquement au lancement  

### Problème 2: Bouton "Envoyer" ne fonctionne pas
**Symptôme**: Le bouton d'envoi tourne indéfiniment sans créer de conversation  
**Impact**: Impossible de démarrer une conversation n8n  
**Comportement attendu**: Navigation vers `/conversation/{id}` avec chat n8n actif  

### Problème 3: Dépendance anormale au bouton Admin
**Symptôme**: Il faut cliquer sur "ADMIN" pour que la zone d'accueil apparaisse avec l'option n8n  
**Impact**: Workflow utilisateur brisé - étape manuelle requise  
**Comportement attendu**: Accès direct sans clic sur Admin  

## 🔍 Cause racine identifiée

**Code compilé périmé**: Les fichiers dans `out/main/*.js` datent de 14h52, alors que les commits n8n datent de 13h25-13h45.

**Hypothèse principale**: Le hot reload de Vite ou le cache Electron empêchent l'application des changements malgré:
- 6 commits appliqués sur la branche main
- Nettoyage du cache Vite (`out/*`, `node_modules\.vite\*`)
- Multiples redémarrages de l'application
- 496 tests passés (dont 14 nouveaux tests pour n8n)

## 📊 Historique des tentatives

| Tentative | Action | Résultat |
|-----------|--------|----------|
| 1 | Modification des types + redémarrage | Échec - situation initiale |
| 2 | Ajout n8n à AcpDetector + redémarrage | Échec - situation initiale |
| 3 | Nettoyage cache Vite + rebuild | Échec - situation initiale |
| 4 | Workflow d'investigation (wf_20ce7fb91ade9ce1) | Échec - workflow failed |
| 5 | Kill processus + rebuild complet | En cours... |

## 🏗️ Architecture impliquée

### Stack technique
- **Frontend**: React 19 + TypeScript 5.8 (strict mode)
- **Build**: Electron 37 + electron-vite 5
- **Dev server**: http://localhost:5173/
- **Processus**: Main (Node.js) + Renderer (Chromium) + Worker

### Flux de données problématique

```
User clicks "Send" 
  ↓
GuidPage.tsx → useGuidSend.ts
  ↓
handleSend() vérifie selectedAgent === 'n8n'
  ↓
PROBLÈME: selectedAgent n'est jamais 'n8n'
  ↓
Aucune conversation créée
```

### Flux attendu

```
App start
  ↓
AcpDetector.initialize() ajoute n8n aux backends
  ↓
useGuidAgentSelection() récupère liste incluant n8n
  ↓
Défaut: selectedAgentKey = 'n8n' (ligne 133)
  ↓
GuidPage affiche "n8n Workflow" sélectionné
  ↓
User clicks "Send" → handleSend() crée conversation n8n
```

## 📁 Fichiers critiques modifiés

### 1. `src/types/acpTypes.ts` (commit ec247856)
**Rôle**: Définition des types de backends ACP  
**Modification**: Ajout de `'n8n' | 'n8n-multi-workflow'` au type `AcpBackendAll`

```typescript
export type AcpBackendAll =
  | 'claude'
  // ... autres types
  | 'n8n'                    // ✅ AJOUTÉ
  | 'n8n-multi-workflow'     // ✅ AJOUTÉ
  | 'custom';
```

### 2. `src/agent/acp/AcpDetector.ts` (commit ec247856)
**Rôle**: Détection des backends ACP disponibles au démarrage  
**Modification**: Ajout de n8n comme backend built-in

```typescript
async initialize(): Promise<void> {
  // ... code existant ...
  
  // ✅ AJOUTÉ: Backends n8n (pas de CLI, services HTTP)
  detected.push({
    backend: 'n8n',
    name: 'n8n Workflow',
    cliPath: undefined,
  });
  detected.push({
    backend: 'n8n-multi-workflow',
    name: 'n8n Multi Workflow',
    cliPath: undefined,
  });
}
```

### 3. `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts` (commit ec247856)
**Rôle**: Gestion de la sélection d'assistant sur la page d'accueil  
**Modification**: Changement du défaut de `'custom:builtin-n8n-workflow'` vers `'n8n'`

```typescript
// AVANT (ligne 133):
const [selectedAgentKey, _setSelectedAgentKey] = useState<string>('custom:builtin-n8n-workflow');

// APRÈS (ligne 133):
const [selectedAgentKey, _setSelectedAgentKey] = useState<string>('n8n'); // ✅ MODIFIÉ
```

**Ajout**: Logique pour considérer n8n comme toujours disponible

```typescript
const isMainAgentAvailable = useCallback(
  (agentType: string): boolean => {
    if (agentType === 'gemini') {
      return isGoogleAuth || (modelList != null && modelList.length > 0);
    }
    // ✅ AJOUTÉ
    if (agentType === 'n8n' || agentType === 'n8n-multi-workflow') {
      return true; // Health check at conversation creation
    }
    return availableAgents?.some((agent) => agent.backend === agentType) ?? false;
  },
  [modelList, availableAgents, isGoogleAuth]
);
```

### 4. `src/renderer/pages/guid/hooks/useGuidSend.ts` (commit ec247856)
**Rôle**: Logique d'envoi de message et création de conversation  
**Modification**: Ajout des branches n8n et n8n-multi-workflow avec placeholder models

```typescript
// ✅ AJOUTÉ: Gestion du type selectedAgent 'n8n'
type GuidSendDeps = {
  selectedAgent: AcpBackend | 'custom' | 'n8n' | 'n8n-multi-workflow'; // Type élargi
  // ...
};

// ✅ AJOUTÉ: Branche n8n path (lignes 179-219)
if (selectedAgent === 'n8n' || (isPreset && finalEffectiveAgentType === 'n8n')) {
  const placeholderModel = currentModel || {
    id: 'n8n-placeholder',
    name: 'n8n',
    useModel: 'n8n-workflow',
    platform: 'n8n' as const,
    baseUrl: '',
    apiKey: '',
  };
  
  const conversation = await ipcBridge.conversation.create.invoke({
    type: 'n8n',
    name: input,
    model: placeholderModel,
    // ...
  });
  // ...
}

// ✅ AJOUTÉ: Branche n8n-multi-workflow path (lignes 221-261)
if (selectedAgent === 'n8n-multi-workflow' || (isPreset && finalEffectiveAgentType === 'n8n-multi-workflow')) {
  // ... code similaire avec placeholder adapté
}
```

## 🧪 Tests ajoutés (commit d38fb736)

14 nouveaux tests créés pour valider les modifications:

```typescript
// tests/unit/acp-detector.test.ts
describe('AcpDetector n8n backends', () => {
  it('should include n8n backend as built-in', async () => {
    // ...
  });
});

// tests/unit/use-guid-agent-selection.test.ts
describe('useGuidAgentSelection n8n support', () => {
  it('should default to n8n agent', () => {
    // ...
  });
});

// tests/unit/use-guid-send.test.ts
describe('useGuidSend n8n conversation creation', () => {
  it('should create n8n conversation with placeholder model', async () => {
    // ...
  });
});
```

**Résultat**: 496/496 tests passés ✅

## 🔧 Configuration

### Chemins importants
```
Projet:       g:\Aionui_client
Database:     C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db
Config:       C:\Users\LEADER\AppData\Roaming\E-audit\config.json
Dev server:   http://localhost:5173/
```

### Configuration n8n dans config.json
```json
{
  "acp": {
    "customAgents": [
      {
        "id": "builtin-n8n-workflow",
        "name": "n8n Workflow",
        "enabled": true,  // ✅ Activé
        "isPreset": true,
        "presetAgentType": "n8n"
      },
      {
        "id": "builtin-n8n-multi-workflow",
        "name": "n8n Multi Workflow",
        "enabled": true,  // ✅ Activé
        "isPreset": true,
        "presetAgentType": "n8n-multi-workflow"
      }
    ]
  }
}
```

## 🚨 Points de blocage

### 1. Hot Reload ne fonctionne pas
Les modifications TypeScript ne sont pas reflétées dans le code compilé malgré:
- `electron-vite dev` en mode watch
- Compilations réussies (logs: "✓ built in Xs")
- Aucune erreur de build

### 2. Cache Electron persistant
Hypothèse: Electron cache l'ancien code au niveau:
- `AppData/Roaming/E-audit/*` (données d'application)
- `out/main/index.js` (code compilé)
- Processus Electron/Node toujours en mémoire

### 3. Incohérence entre source et compiled
```bash
# Source (vérifié avec git show ec247856)
selectedAgentKey = 'n8n'  ✅

# Compiled (hypothèse non vérifiée)
selectedAgentKey = 'custom:builtin-n8n-workflow'  ❌
```

## 📈 Prochaines étapes suggérées

### Option A: Build production complet
```powershell
npm run build
npm run preview
```

### Option B: Inspection du code compilé
```powershell
Select-String -Path "out\main\*.js" -Pattern "n8n-multi-workflow"
Get-Content "out\main\index.js" | Select-String -Pattern "selectedAgentKey"
```

### Option C: Nettoyage agressif
```powershell
# Arrêt de tous les processus
taskkill /F /IM electron.exe
taskkill /F /IM node.exe

# Nettoyage total
Remove-Item -Recurse -Force out\*, node_modules\.vite\*, dist\*
Remove-Item -Force "$env:APPDATA\E-audit\*" -ErrorAction SilentlyContinue

# Rebuild from scratch
npm run start
```

### Option D: Vérification runtime
Ouvrir DevTools (F12) dans l'application et exécuter:
```javascript
console.log('Selected agent:', selectedAgentKey);
console.log('Available agents:', availableAgents);
```

## 📚 Commits pertinents

| Commit | Date | Description |
|--------|------|-------------|
| ec247856 | 13h25 | feat(n8n): add n8n backend types and detector integration |
| d38fb736 | 13h45 | test(n8n): add comprehensive tests for n8n integration |
| 72daf8a7 | Antérieur | feat(n8n): enable n8n workflows by default |
| c5dd81c3 | Antérieur | feat(n8n): add n8n-multi-workflow to enabled defaults |
| 006033af | Antérieur | feat(n8n): force-enable n8n assistants via migration script |

## 🆘 Questions pour les experts Frontier

1. **Pourquoi le hot reload Vite ne s'applique-t-il pas après un build réussi ?**
2. **Où Electron peut-il cacher du code compilé persistant ?**
3. **Comment forcer un rebuild complet sans cache résiduel ?**
4. **Y a-t-il une meilleure façon d'ajouter un nouveau backend à AcpBackendAll ?**
5. **Le type union `AcpBackend | 'custom' | 'n8n' | 'n8n-multi-workflow'` est-il correct ?**

---

**Dernière mise à jour**: 18/11/2026 16:01
