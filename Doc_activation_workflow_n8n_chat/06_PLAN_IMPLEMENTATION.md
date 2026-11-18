# Plan d'implémentation - Solution n8n workflow

## 🎯 Objectif

Appliquer les recommandations des 3 modèles Frontier pour résoudre les 3 symptômes :
1. ✅ Page d'accueil affiche "n8n Workflow" par défaut
2. ✅ Bouton "Envoyer" crée une conversation n8n
3. ✅ Pas de clic sur "ADMIN" requis

## 📊 Stratégie retenue

**Approche hybride** : Fusionner les meilleures pratiques des 3 modèles

| Élément | Source | Raison |
|---------|--------|--------|
| Migration de clé | Claude Opus | Compat ascendante, minimal |
| Type guard unifié | Claude Opus | DRY, type-safe |
| `try...finally` | Gemini Flash | Garantit fin du spinner |
| `platform: 'custom'` | Gemini Flash | Évite type check error |
| Script de purge | Gemini Flash | Reset total si besoin |

---

## 📝 Phase 1: Diagnostic (5 minutes)

### Étape 1.1: Vérifier config.json

```powershell
# Afficher la valeur actuelle
$configPath = "$env:APPDATA\E-audit\config.json"
Get-Content $configPath | Select-String "lastSelectedAgent"
```

**Résultat attendu** :
```json
"lastSelectedAgent": "custom:builtin-n8n-workflow"  // ❌ Ancienne valeur
```

ou

```json
"lastSelectedAgent": "gemini"  // ❌ Ancienne valeur
```

**Si la clé est absente ou vaut déjà `"n8n"`** → Passer à l'étape 1.2

### Étape 1.2: Vérifier le code compilé

```powershell
# Le build contient-il les modifications n8n ?
Select-String -Path "out\main\*.js" -Pattern "n8n-multi-workflow" -List
```

**Résultat attendu** :
```
out\main\index.js:12345:detected.push({backend:'n8n-multi-workflow'...
```

**Si aucun résultat** → Le build ne contient pas les modifications → Passer à Phase 4 (Rebuild)

### Étape 1.3: Vérifier les types TypeScript

```powershell
npx tsc --noEmit
```

**Résultat attendu** : `0 erreurs`

**Si erreurs de type sur `platform: 'n8n'`** → Appliquer le correctif `platform: 'custom'` (Phase 2)

---

## 🔧 Phase 2: Correctifs code (30 minutes)

### Étape 2.1: Modifier useGuidAgentSelection.ts

**Fichier** : `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts`

#### Modification A: Migration de clé (lignes ~194-222)

**AVANT** :
```typescript
const loadLastSelectedAgent = async () => {
  try {
    const savedAgentKey = await ConfigStorage.get('guid.lastSelectedAgent');
    if (cancelled || !savedAgentKey) return;

    const isInAvailable = availableAgents.some((agent) => {
      const key = agent.backend === 'custom' && agent.customAgentId 
        ? `custom:${agent.customAgentId}` 
        : agent.backend;
      return key === savedAgentKey;
    });

    if (isInAvailable) {
      _setSelectedAgentKey(savedAgentKey);
    }
  } catch (error) {
    console.error('Failed to load last selected agent:', error);
  }
};
```

**APRÈS** :
```typescript
const loadLastSelectedAgent = async () => {
  try {
    // Migration map: ancienne clé → nouvelle clé
    const LEGACY_AGENT_KEYS: Record<string, string> = {
      'custom:builtin-n8n-workflow': 'n8n',
      'custom:builtin-n8n-multi-workflow': 'n8n-multi-workflow',
    };

    const rawKey = await ConfigStorage.get('guid.lastSelectedAgent');
    if (cancelled || !rawKey) return;

    // Appliquer la migration si nécessaire
    const savedAgentKey = LEGACY_AGENT_KEYS[rawKey] ?? rawKey;

    const isInAvailable = availableAgents.some((agent) => {
      const key = agent.backend === 'custom' && agent.customAgentId 
        ? `custom:${agent.customAgentId}` 
        : agent.backend;
      return key === savedAgentKey;
    });

    if (isInAvailable) {
      _setSelectedAgentKey(savedAgentKey);
      
      // Persister la nouvelle clé si migration appliquée
      if (savedAgentKey !== rawKey) {
        void ConfigStorage.set('guid.lastSelectedAgent', savedAgentKey);
      }
    }
  } catch (error) {
    console.error('Failed to load last selected agent:', error);
  }
};
```

#### Modification B: Garantir disponibilité n8n (lignes ~419-430)

**AVANT** :
```typescript
const isMainAgentAvailable = useCallback(
  (agentType: string): boolean => {
    if (agentType === 'gemini') {
      return isGoogleAuth || (modelList != null && modelList.length > 0);
    }
    // n8n is always considered available (health check happens at conversation creation)
    if (agentType === 'n8n' || agentType === 'n8n-multi-workflow') {
      return true;
    }
    return availableAgents?.some((agent) => agent.backend === agentType) ?? false;
  },
  [modelList, availableAgents, isGoogleAuth]
);
```

**APRÈS** : (Aucune modification - déjà correct ✅)

---

### Étape 2.2: Modifier useGuidSend.ts

**Fichier** : `src/renderer/pages/guid/hooks/useGuidSend.ts`

#### Modification A: Type guard unifié (après les imports)

**AJOUTER** (en haut du fichier, après les imports) :
```typescript
// Type guard pour détecter n8n de manière unifiée
type N8nType = 'n8n' | 'n8n-multi-workflow';

const isN8nType = (value: string | undefined): value is N8nType => {
  return value === 'n8n' || value === 'n8n-multi-workflow';
};
```

#### Modification B: Branche n8n unique (lignes ~179-261)

**REMPLACER** les deux branches séparées (n8n path lignes 179-219 ET n8n-multi-workflow path lignes 221-261)

**PAR** :
```typescript
// === n8n path (unifié) ===
const n8nType: N8nType | undefined = 
  isN8nType(selectedAgent) ? selectedAgent :
  isN8nType(selectedAgentKey) ? selectedAgentKey :
  isPreset && isN8nType(finalEffectiveAgentType) ? finalEffectiveAgentType :
  undefined;

if (n8nType) {
  try {
    setLoading(true);

    // Utiliser 'custom' pour éviter le type check error sur 'n8n'
    const placeholderModel = {
      id: `${n8nType}-placeholder`,
      name: n8nType === 'n8n' ? 'n8n Workflow' : 'n8n Multi Workflow',
      useModel: n8nType,
      platform: 'custom' as const,  // ✅ Plus sûr que 'n8n' as const
      baseUrl: 'http://localhost:3458',
      apiKey: '',
    };

    const conversation = await ipcBridge.conversation.create.invoke({
      type: n8nType,
      name: input,
      model: placeholderModel,
      extra: {
        defaultFiles: files,
        workspace: finalWorkspace,
        customWorkspace: isCustomWorkspace,
        enabledSkills: isPreset ? enabledSkills : undefined,
        presetAssistantId: isPreset ? agentInfo?.customAgentId : undefined,
      },
    });

    if (!conversation || !conversation.id) {
      throw new Error(`Failed to create ${n8nType} conversation - conversation object is null or missing id`);
    }

    if (isCustomWorkspace) {
      closeAllTabs();
      updateWorkspaceTime(finalWorkspace);
      openTab(conversation);
    }

    emitter.emit('chat.history.refresh');

    const initialMessage = {
      input,
      files: files.length > 0 ? files : undefined,
    };
    sessionStorage.setItem(`n8n_initial_message_${conversation.id}`, JSON.stringify(initialMessage));

    await navigate(`/conversation/${conversation.id}`);
  } catch (error: unknown) {
    console.error(`Failed to create ${n8nType} conversation:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    Message.error(
      t('guid.n8nCreationFailed', {
        defaultValue: `Failed to create ${n8nType} conversation: ${errorMessage}`,
        type: n8nType,
        message: errorMessage,
      })
    );
  } finally {
    setLoading(false);  // ✅ Garantit que le spinner s'arrête
  }
  return;
}
```

**Différences clés** :
1. ✅ Une seule branche au lieu de deux (DRY)
2. ✅ `try...finally` avec `setLoading(false)` (garantit fin du spinner)
3. ✅ `platform: 'custom'` au lieu de `'n8n'`
4. ✅ Détection multi-sources (selectedAgent, selectedAgentKey, finalEffectiveAgentType)
5. ✅ Message d'erreur utilisateur avec `Message.error()`

---

### Étape 2.3: Vérifier les types dans acpTypes.ts

**Fichier** : `src/types/acpTypes.ts`

**Vérifier que** (lignes ~24-58) :
```typescript
export type AcpBackendAll =
  | 'claude'
  | 'gemini'
  | 'qwen'
  // ...
  | 'n8n'                    // ✅ Doit être présent
  | 'n8n-multi-workflow'     // ✅ Doit être présent
  | 'custom';
```

**ET** dans `ACP_BACKENDS_ALL` (lignes ~220-238) :
```typescript
n8n: {
  id: 'n8n',
  name: 'n8n Workflow',
  cliCommand: undefined,  // ✅ Pas de CLI
  authRequired: false,
  enabled: true,
  supportsStreaming: false,
},
'n8n-multi-workflow': {
  id: 'n8n-multi-workflow',
  name: 'n8n Multi Workflow',
  cliCommand: undefined,  // ✅ Pas de CLI
  authRequired: false,
  enabled: true,
  supportsStreaming: false,
},
```

**Si déjà présent** : ✅ Aucune modification nécessaire

---

## 🧪 Phase 3: Tests (15 minutes)

### Étape 3.1: Formater le code

```powershell
bun run lint:fix
```

**Résultat attendu** : Prettier reformate les fichiers modifiés

### Étape 3.2: Vérifier les types

```powershell
npx tsc --noEmit
```

**Résultat attendu** : `0 erreurs`

**Si erreurs** :
- Sur `platform: 'custom'` → Vérifier que `TProviderWithModel` accepte `'custom'`
- Sur `N8nType` → Vérifier l'import de `AcpBackendAll`

### Étape 3.3: Lancer les tests unitaires

```powershell
bun run test
```

**Résultat attendu** : `496/496 tests passants` (ou plus si nouveaux tests ajoutés)

**Si échecs** :
- Vérifier les mocks de `ConfigStorage.get('guid.lastSelectedAgent')`
- Vérifier que les tests n'attendent pas l'ancienne clé `'custom:builtin-n8n-workflow'`

---

## 🚀 Phase 4: Rebuild & Test runtime (10 minutes)

### Étape 4.1: Arrêter tous les processus

```powershell
# Tuer TOUS les processus Electron et Node
Get-Process | Where-Object { $_.ProcessName -match 'electron|E-audit|node' } | Stop-Process -Force

# Vérifier qu'il ne reste rien
Get-Process | Where-Object { $_.ProcessName -match 'electron|E-audit' }
```

**Résultat attendu** : Aucun processus affiché

### Étape 4.2: Purger les caches

```powershell
# Supprimer les dossiers de build
Remove-Item -Recurse -Force out\* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.vite\* -ErrorAction SilentlyContinue

# Optionnel: Purger le cache Electron (si problèmes persistent)
Remove-Item -Recurse -Force "$env:APPDATA\E-audit\Cache\*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\E-audit\Code Cache\*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\E-audit\GPUCache\*" -ErrorAction SilentlyContinue
```

### Étape 4.3: (Optionnel) Reset config.json manuellement

**Si vous voulez forcer la sélection de n8n** :

```powershell
$configPath = "$env:APPDATA\E-audit\config.json"

if (Test-Path $configPath) {
  $json = Get-Content $configPath -Raw | ConvertFrom-Json
  if (-not $json.guid) { $json | Add-Member -NotePropertyName "guid" -NotePropertyValue @{} }
  $json.guid.lastSelectedAgent = "n8n"
  $json | ConvertTo-Json -Depth 10 | Set-Content $configPath
  Write-Host "✅ config.json mis à jour: lastSelectedAgent = 'n8n'" -ForegroundColor Green
}
```

**Alternative simple** : Supprimer la clé pour forcer le défaut du `useState`

```powershell
$configPath = "$env:APPDATA\E-audit\config.json"
$json = Get-Content $configPath -Raw | ConvertFrom-Json
$json.guid.PSObject.Properties.Remove('lastSelectedAgent')
$json | ConvertTo-Json -Depth 10 | Set-Content $configPath
```

### Étape 4.4: Rebuild et lancer

```powershell
npm run start
```

**Attendez** : 30-60 secondes pour la compilation complète

**Vérifiez dans les logs** :
```
✓ built in Xs
electron main process built successfully
starting electron app...
```

---

## ✅ Phase 5: Validation (5 minutes)

### Checklist de validation fonctionnelle

| Test | Procédure | Résultat attendu | Statut |
|------|-----------|------------------|--------|
| **1. Page d'accueil** | Lancer l'app | "n8n Workflow" sélectionné par défaut | [ ] |
| **2. Liste des assistants** | Observer la page `/guid` | Au moins n8n visible dans la liste | [ ] |
| **3. Bouton "Envoyer"** | Taper "Bonjour" + cliquer Envoyer | Navigation vers `/conversation/{id}` en < 2s | [ ] |
| **4. Conversation créée** | Vérifier la page conversation | Chat n8n actif, message initial affiché | [ ] |
| **5. Pas de clic Admin** | Tester sans cliquer sur ADMIN | Toutes les étapes 1-4 fonctionnent | [ ] |

### Checklist technique

| Test | Commande | Résultat attendu | Statut |
|------|----------|------------------|--------|
| **Types** | `npx tsc --noEmit` | 0 erreurs | [ ] |
| **Tests** | `bun run test` | 496/496 passants | [ ] |
| **Build** | `Select-String -Path "out\main\*.js" -Pattern "n8n-multi-workflow"` | Patterns trouvés | [ ] |
| **Config** | `Get-Content "$env:APPDATA\E-audit\config.json" \| Select-String "lastSelectedAgent"` | `"lastSelectedAgent": "n8n"` | [ ] |

---

## 🐛 Debugging si échec

### Si symptôme 1 persiste (pas de n8n par défaut)

1. **Ouvrir DevTools** (F12) dans l'application
2. **Exécuter dans la console** :
   ```javascript
   console.log('Selected agent key:', selectedAgentKey);
   console.log('Selected agent:', selectedAgent);
   console.log('Available agents:', availableAgents);
   ```
3. **Analyser** :
   - Si `selectedAgentKey !== 'n8n'` → Config.json toujours incorrect
   - Si `availableAgents` est vide → AcpDetector pas exécuté
   - Si `availableAgents` ne contient pas `{ backend: 'n8n' }` → Build Main Process périmé

### Si symptôme 2 persiste (bouton tourne)

1. **Ouvrir DevTools** (F12) → Onglet Network
2. **Cliquer sur Envoyer**
3. **Observer** :
   - Si aucune requête IPC → `handleSend()` pas appelé
   - Si requête IPC en attente infinie → Backend n8n pas démarré (port 3458)
   - Si erreur 404/500 → Endpoint n8n incorrect

4. **Vérifier le backend n8n** :
   ```powershell
   # Le service n8n est-il actif ?
   Get-NetTCPConnection -LocalPort 3458 -ErrorAction SilentlyContinue
   ```

### Si symptôme 3 persiste (clic Admin requis)

1. **Vérifier** `GuidPage.tsx` :
   ```typescript
   // Chercher un rendu conditionnel lié à availableAgents
   {availableAgents === undefined ? <Skeleton /> : <AgentList />}
   ```

2. **Ajouter un log** dans `useGuidAgentSelection` :
   ```typescript
   useEffect(() => {
     console.log('[Guid] Available agents loaded:', availableAgents);
   }, [availableAgents]);
   ```

3. **Si le log n'apparaît jamais** → IPC bridge ne fonctionne pas
4. **Si le log montre `[]`** → AcpDetector retourne une liste vide

---

## 📦 Phase 6: Commit final (5 minutes)

### Étape 6.1: Vérifier l'état Git

```bash
git status
git diff src/renderer/pages/guid/hooks/useGuidAgentSelection.ts
git diff src/renderer/pages/guid/hooks/useGuidSend.ts
```

### Étape 6.2: Commit atomique

```bash
git add src/renderer/pages/guid/hooks/useGuidAgentSelection.ts
git add src/renderer/pages/guid/hooks/useGuidSend.ts

git commit -m "fix(n8n): apply Frontier models solution for workflow activation

- Migrate legacy agent key (custom:builtin-n8n-workflow → n8n)
- Add unified type guard isN8nType() to detect n8n agents
- Replace duplicate branches with single n8n path
- Add try...finally to guarantee spinner stops
- Use platform: 'custom' instead of 'n8n' for type safety

Resolves: #XXX (remplacer par numéro d'issue si existant)

Co-authored-by: Claude Opus (Anthropic)
Co-authored-by: Claude Sonnet (Anthropic)
Co-authored-by: Gemini Flash (Google)"
```

### Étape 6.3: Push

```bash
git push origin main
```

---

## 🎉 Résultat final attendu

Après application complète de ce plan :

1. ✅ Au lancement : Page `/guid` affiche "n8n Workflow" sélectionné
2. ✅ Clic "Envoyer" : Navigation immédiate vers `/conversation/{id}`
3. ✅ Aucun clic sur "ADMIN" requis
4. ✅ Les 496 tests passent
5. ✅ TypeScript compile sans erreur
6. ✅ Compat ascendante : Utilisateurs avec ancien config.json migrés automatiquement

---

## ⏱️ Temps total estimé

| Phase | Durée | Cumulé |
|-------|-------|--------|
| Phase 1: Diagnostic | 5 min | 5 min |
| Phase 2: Correctifs code | 30 min | 35 min |
| Phase 3: Tests | 15 min | 50 min |
| Phase 4: Rebuild & Test | 10 min | 60 min |
| Phase 5: Validation | 5 min | 65 min |
| Phase 6: Commit | 5 min | **70 min** |

**Total : ~1h10** pour résolution complète et validée.

---

**Prochaine étape** : Commencer par Phase 1 → Diagnostic

**Dernière mise à jour** : 18/11/2026 17:05
