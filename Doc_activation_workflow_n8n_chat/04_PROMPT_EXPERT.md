# Prompt de consultation pour expert Frontier Model

## 🎯 Contexte

Je développe **AionUi E-audit v1.8.25**, une application Electron (React 19 + TypeScript 5.8) qui intègre plusieurs assistants IA. J'essaie d'ajouter le support des workflows **n8n** mais malgré 6 commits validés et tests passants (496/496), les modifications ne s'appliquent pas après redémarrage.

## ❌ Problème actuel

**Symptôme 1**: La page d'accueil `/guid` n'affiche pas "n8n Workflow" comme assistant sélectionné par défaut  
**Symptôme 2**: Le bouton "Envoyer" tourne indéfiniment sans créer de conversation n8n  
**Symptôme 3**: Il faut cliquer sur "ADMIN" pour que la liste des assistants apparaisse

**Hypothèse**: Le code compilé dans `out/main/*.js` est périmé (daté de 14h52) alors que les commits datent de 13h25-13h45. Le hot reload Vite ou le cache Electron empêchent l'application des changements.

## 📁 Fichiers fournis

Je vous joins 3 fichiers TypeScript critiques (voir `03_TOP_3_FICHIERS.md`) :

1. **useGuidSend.ts** - Logique d'envoi de message (où le bug se manifeste)
2. **useGuidAgentSelection.ts** - Gestion de la sélection d'assistant (état initial)
3. **acpTypes.ts** - Définitions de types pour les backends ACP

Vous trouverez également :
- `01_PROBLEME_DETAILLE.md` - Description exhaustive du problème
- `02_ARCHITECTURE.md` - Architecture complète du système

## 🔍 Questions spécifiques

### Question 1: Analyse du flux de données
En examinant `useGuidAgentSelection.ts` et `useGuidSend.ts`, pouvez-vous identifier **pourquoi `selectedAgent` n'est jamais égal à `'n8n'`** malgré l'état initial `selectedAgentKey = 'n8n'` (ligne 133) ?

Vérifiez particulièrement :
- La dérivation `selectedAgent` depuis `selectedAgentKey` (ligne 225)
- La transformation `selectedAgentKey.startsWith('custom:')` 
- Le hook `useMemo` pour `selectedAgentInfo`

### Question 2: Type union et narrowing
Le type `AcpBackendAll` dans `acpTypes.ts` inclut maintenant `'n8n' | 'n8n-multi-workflow'`. 

Est-ce que l'ajout de ces valeurs :
```typescript
export type AcpBackendAll =
  | 'claude'
  | 'gemini'
  // ...
  | 'n8n'                    // ✅ Ajouté
  | 'n8n-multi-workflow'     // ✅ Ajouté
  | 'custom';
```

Est suffisant pour que :
```typescript
// Dans useGuidSend.ts
selectedAgent: AcpBackend | 'custom' | 'n8n' | 'n8n-multi-workflow';
```

Soit correctement typé ? Ou faut-il ajuster autre chose ?

### Question 3: Condition de branche
Dans `useGuidSend.ts`, la branche n8n (lignes 179-219) commence par :

```typescript
if (selectedAgent === 'n8n' || (isPreset && finalEffectiveAgentType === 'n8n')) {
  // ... code de création de conversation n8n
}
```

Cette condition est-elle correcte ? Ou faut-il plutôt :
- Vérifier `selectedAgentKey === 'n8n'` ?
- Comparer `selectedAgent === 'n8n' as AcpBackend` ?
- Ajouter un type guard `isN8nBackend()` ?

### Question 4: Placeholder model
Le placeholder model n8n est défini comme suit :

```typescript
const placeholderModel = currentModel || {
  id: 'n8n-placeholder',
  name: 'n8n',
  useModel: 'n8n-workflow',
  platform: 'n8n' as const,
  baseUrl: '',
  apiKey: '',
};
```

Est-ce que ce format est valide pour passer le type check de `conversation.create.invoke()` ? Faut-il ajuster la structure ou les champs ?

### Question 5: Hot reload Electron
Pourquoi les modifications du **Main Process** (AcpDetector.ts) ne s'appliquent-elles pas après un rebuild avec `electron-vite dev` ?

Y a-t-il une configuration spécifique dans `electron-vite.config.ts` ou un cache Electron persistant à nettoyer ?

## 💡 Demandes de solutions

### Solution attendue #1: Correction du code
Si vous identifiez une erreur dans le code fourni, merci de :
1. Indiquer le fichier et la ligne exacte
2. Expliquer le problème (type incorrect, logique fausse, etc.)
3. Fournir le code corrigé complet pour cette section

**Format souhaité**:
```typescript
// FICHIER: src/renderer/pages/guid/hooks/useGuidSend.ts
// LIGNE: 179
// PROBLÈME: selectedAgent ne peut jamais être 'n8n' car...

// ❌ CODE ACTUEL (INCORRECT)
if (selectedAgent === 'n8n') {
  // ...
}

// ✅ CODE CORRIGÉ
if (selectedAgentKey === 'n8n' || selectedAgent === 'n8n') {
  // ...
}

// EXPLICATION: ...
```

### Solution attendue #2: Build & cache
Si le problème vient du système de build ou du cache, merci de :
1. Identifier les fichiers/dossiers cachés concernés
2. Fournir la commande PowerShell exacte pour nettoyer
3. Expliquer le mécanisme de cache problématique

**Format souhaité**:
```powershell
# Arrêt des processus
taskkill /F /IM electron.exe /IM node.exe

# Nettoyage des caches
Remove-Item -Recurse -Force out\*, node_modules\.vite\*, dist\*
Remove-Item -Force "$env:APPDATA\E-audit\GPUCache\*" -ErrorAction SilentlyContinue

# Rebuild from scratch
npm run start
```

### Solution attendue #3: Architecture alternative
Si l'approche actuelle est fondamentalement incorrecte, merci de :
1. Expliquer pourquoi elle ne peut pas fonctionner
2. Proposer une architecture alternative
3. Fournir un exemple d'implémentation

**Format souhaité**:
```markdown
## Problème architectural

L'approche actuelle (ajout de 'n8n' à AcpBackendAll) est incorrecte car...

## Solution alternative

Au lieu de traiter n8n comme un backend ACP, il faut...

## Code exemple

[code TypeScript complet]
```

## 🧪 Tests à valider

Si vous proposez une solution, assurez-vous qu'elle passe ces tests :

```typescript
// Test 1: selectedAgentKey initial
const { result } = renderHook(() => useGuidAgentSelection({...}));
expect(result.current.selectedAgentKey).toBe('n8n'); // ✅ Doit passer

// Test 2: selectedAgent dérivé
expect(result.current.selectedAgent).toBe('n8n'); // ❌ Actuellement échoue

// Test 3: handleSend crée conversation n8n
await act(async () => {
  await result.current.handleSend();
});
expect(mockCreate).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'n8n' })
); // ❌ Actuellement échoue
```

## 📊 Contraintes du projet

- **TypeScript strict mode**: Activé (pas de `any`, tous les types doivent être explicites)
- **React 19**: Functional components uniquement, hooks modernes
- **Electron 37**: Multi-process (Main + Renderer + Worker)
- **Prettier**: Formatage strict requis avant commit
- **Tests**: Vitest 4, tous les tests doivent passer (actuellement 496/496)

## 🔗 Architecture actuelle (synthèse)

```
App start
  ↓
AcpDetector.initialize()
  ├─ Scan CLI tools (claude, qwen, etc.)
  ├─ Add built-in: gemini, n8n, n8n-multi-workflow
  └─ Store in detectedAgents[]
  ↓
GuidPage.tsx mounts
  ↓
useGuidAgentSelection() hook
  ├─ IPC: getAvailableAgents() → detectedAgents[]
  ├─ useState: selectedAgentKey = 'n8n'  ✅
  └─ Derive: selectedAgent (problème ici ? ❌)
  ↓
User clicks "Envoyer"
  ↓
useGuidSend.handleSend()
  ├─ Check: selectedAgent === 'n8n' ?  ❌ Toujours false
  ├─ Branche ACP par défaut (INCORRECT)
  └─ Échec de création de conversation
```

## 📝 Informations additionnelles

**Commandes de build testées** :
```powershell
# Tentative 1: Restart normal
npm run start

# Tentative 2: Clear Vite cache
Remove-Item -Recurse -Force node_modules\.vite\*, out\*
npm run start

# Tentative 3: Kill processes + rebuild
taskkill /F /IM electron.exe /IM node.exe
npm run start

# Tentative 4: Production build
npm run build
npm run preview
```

**Résultat**: Aucune des tentatives n'a appliqué les modifications

**Fichiers de configuration pertinents** :
- `electron-vite.config.ts` (config de build)
- `vite.config.ts` (config renderer)
- `tsconfig.json` (TypeScript strict mode)
- `vitest.config.ts` (config tests)

## 🎯 Résultat attendu

À la fin de votre analyse, je dois pouvoir :

1. ✅ Identifier la cause racine exacte (code, type, ou build)
2. ✅ Appliquer le correctif fourni (code + commandes)
3. ✅ Vérifier que les 3 symptômes sont résolus :
   - Page d'accueil affiche "n8n Workflow" par défaut
   - Bouton "Envoyer" crée une conversation n8n
   - Pas de dépendance au clic sur "ADMIN"

## 📎 Fichiers joints

Les fichiers source complets sont disponibles dans le même dossier :

- `useGuidSend.ts` (412 lignes)
- `useGuidAgentSelection.ts` (520 lignes)
- `acpTypes.ts` (600+ lignes)
- `AcpDetector.ts` (contexte supplémentaire)
- `GuidPage.tsx` (contexte supplémentaire)

---

**Merci de votre expertise ! 🙏**

Je suis bloqué depuis plusieurs heures sur ce problème et votre aide sera précieuse pour débloquer le développement.

---

**Dernière mise à jour**: 18/11/2026 16:30
