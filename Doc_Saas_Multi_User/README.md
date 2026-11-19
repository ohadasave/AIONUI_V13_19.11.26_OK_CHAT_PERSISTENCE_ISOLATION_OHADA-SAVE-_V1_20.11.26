# Documentation - Isolation Multi-Utilisateur SaaS

**Projet**: E-audit / AionUi  
**Version**: v19  
**Objectif**: Empêcher les fuites de données entre utilisateurs dans un environnement multi-tenant

---

## 📚 Vue d'ensemble

Ce dossier contient toute la documentation relative à l'implémentation de l'isolation multi-utilisateur, une fonctionnalité de sécurité critique pour le déploiement SaaS d'E-audit.

### Problème résolu

**AVANT** : Utilisateur Bob pouvait voir les conversations d'Alice
```
Alice login → Crée conversation "Projet confidentiel A"
Alice logout
Bob login → Voit toutes les conversations (dont celle d'Alice) ❌
```

**APRÈS** : Chaque utilisateur voit uniquement ses propres données
```
Alice login → Crée conversation "Projet confidentiel A"
Alice logout
Bob login → Voit seulement ses propres conversations ✅
```

---

## 📄 Documents disponibles

| Document | Description | Statut |
|----------|-------------|--------|
| **README.md** | **Ce fichier** - Vue d'ensemble et guide de navigation | - |
| **STATUS_ISOLATION_V19.md** | **Statut global** - Progression 60%, todo list, prochaines étapes | 🟡 À jour |
| **MEMO_REGRESSION_N8N_GUIDPAGE.md** | **Incident résolu** - userId manquant dans création conversations | ✅ Résolu |
| **COMMIT_READY.md** | **Guide commit** - Fichiers à committer, commandes, vérifications | ✅ Prêt |

---

## 🎯 Démarrage rapide

### Pour comprendre le statut actuel

1. **Lire en premier** : `STATUS_ISOLATION_V19.md`
   - Vue d'ensemble de la progression (60% complet)
   - Liste des fichiers modifiés
   - Checklist de validation
   - Prochaines actions

### Pour committer les changements

2. **Suivre** : `COMMIT_READY.md`
   - Liste des fichiers à committer
   - Message de commit pré-rédigé
   - Vérifications avant commit
   - Commandes git complètes

### Pour comprendre un incident spécifique

3. **Consulter** : `MEMO_REGRESSION_N8N_GUIDPAGE.md`
   - Diagnostic détaillé du problème
   - Cause racine et solution
   - Leçons apprises
   - Validation effectuée

---

## 🏗️ Architecture de l'isolation

### Principe : Defense-in-depth (7 couches)

```
┌─────────────────────────────────────────┐
│ Layer 7: Audit Logs                     │ (Futur)
├─────────────────────────────────────────┤
│ Layer 6: Multi-Account Storage          │ (Futur)
├─────────────────────────────────────────┤
│ Layer 5: Owner Verification             │ (Futur)
├─────────────────────────────────────────┤
│ Layer 4: Type Safety (userId required)  │ ❌ TODO
├─────────────────────────────────────────┤
│ Layer 3: Frontend (useAuth everywhere)  │ 🟡 33%
├─────────────────────────────────────────┤
│ Layer 2: IPC Bridge (fail-closed)       │ ✅ 100%
├─────────────────────────────────────────┤
│ Layer 1: Database (no fallback)         │ ✅ 100%
└─────────────────────────────────────────┘
```

### Flux de données sécurisé

```
User login
    ↓
AuthContext fournit user.id
    ↓
Frontend utilise useAuth() pour obtenir userId
    ↓
Frontend envoie userId dans tous les appels IPC
    ↓
Backend vérifie userId présent (fail-closed)
    ↓
Database filtre par userId (no fallback)
    ↓
User voit seulement ses données ✅
```

---

## 🔧 Changements techniques

### Backend (✅ 100% terminé)

| Fichier | Changement principal |
|---------|---------------------|
| `database/index.ts` | `getUserConversations(userId: string)` - required, pas de fallback |
| `databaseBridge.ts` | Bloque si `!userId`, retourne `[]` (fail-closed) |
| `conversationBridge.ts` | Attend `params.userId` lors de création conversation |
| `initStorage.ts` | Health check utilise SQL direct (pas d'appel unsafe) |

### Frontend (🟡 33% terminé)

| Fichier | Changement principal | Statut |
|---------|---------------------|--------|
| `ChatHistory.tsx` | `useAuth()` au lieu de `window.__currentUserId` | ✅ OK |
| `GuidPage.tsx` + hooks | `useAuth()` + `userId` dans create | ✅ OK |
| `ConversationTabs.tsx` | `useAuth()` au lieu de `window.__currentUserId` | ❌ TODO |
| `workspace/index.tsx` | `useAuth()` au lieu de `window.__currentUserId` | ❌ TODO |

### Types (❌ 0% terminé)

| Fichier | Changement principal | Statut |
|---------|---------------------|--------|
| `ipcBridge.ts` | `userId: string` (required, pas optional) | ❌ TODO |

---

## 🧪 Tests

### Tests manuels effectués ✅

- [x] Login Alice → voir seulement conversations Alice
- [x] Logout → login Bob → voir seulement conversations Bob
- [x] Refresh page → isolation préservée
- [x] ChatHistory vide après logout
- [x] Création conversation n8n depuis `/guid`

### Tests manuels en attente

- [ ] Créer conversation Gemini depuis `/guid`
- [ ] Créer conversation OpenClaw depuis `/guid`
- [ ] Créer conversation Nanobot depuis `/guid`
- [ ] Créer conversation ACP depuis `/guid`
- [ ] Tentative accès conversation autre user (devrait échouer)

### Tests automatisés (E2E) ❌ Pas encore

```typescript
// Exemple de test E2E souhaité
describe('Multi-User Isolation', () => {
  it('Alice cannot see Bob conversations', async () => {
    await loginAs('alice');
    await createConversation('Alice secret');
    await logout();
    
    await loginAs('bob');
    const conversations = await getConversations();
    expect(conversations).not.toContainText('Alice secret');
  });
});
```

---

## 📊 Métriques

### Progression

- **Phase 1 (Backend)** : 100% ✅
- **Phase 2 (Frontend)** : 33% 🟡
- **Phase 3 (Types)** : 0% ❌
- **Global** : 60% 🟡

### Code

- **Fichiers modifiés** : 6 / 10 critiques
- **Lignes ajoutées** : ~150
- **Lignes supprimées** : ~50

### Temps

- **Phase 1** : 6h (incidents inclus)
- **Phase 2** : 0.5h (en cours)
- **Total** : 6.5h

---

## 🐛 Incidents résolus

### 1. Better SQLite3 bindings

**Symptôme** : `Could not locate the bindings file`  
**Solution** : `npx @electron/rebuild -f -w better-sqlite3 -o better-sqlite3`  
**Référence** : `Doc_activation_workflow_n8n_chat/08_INCIDENT_BETTER_SQLITE3.md`

### 2. Regression n8n après isolation

**Symptôme** : Impossible de créer conversations depuis `/guid`  
**Cause** : Frontend n'envoyait pas `userId` dans `conversation.create.invoke()`  
**Solution** : Ajouter `useAuth()` + passer `userId` (5 types de conversations)  
**Référence** : `MEMO_REGRESSION_N8N_GUIDPAGE.md`

---

## 🔄 Prochaines étapes

### Court terme (cette semaine)

1. ✅ **Committer Commit 3** (GuidPage + hooks)
2. **Compléter Phase 2** :
   - Modifier `ConversationTabs.tsx`
   - Modifier `workspace/index.tsx`
   - Tester cycle complet

3. **Phase 3 : Type Safety** :
   - Modifier `ipcBridge.ts` : userId required
   - Compiler et vérifier erreurs
   - Fixer appelants manquants

### Moyen terme (semaine prochaine)

4. **Phase 4 : Owner Verification** :
   - Vérifier ownership dans conversationBridge
   - Protéger update, delete, get messages

5. **Tests E2E** :
   - Suite de tests Playwright
   - Automatiser scénarios Alice/Bob

### Long terme (mois prochain)

6. **Phase 5 : Multi-Account Storage**
7. **Phase 6 : Audit Logs**
8. **Phase 7 : Tests E2E complets**

---

## 🙋 FAQ

### Pourquoi "v19" ?

Version interne de tracking pour cette feature d'isolation. Peut ne pas correspondre à la version publique d'E-audit.

### Pourquoi useAuth() au lieu de window.__currentUserId ?

`useAuth()` est un hook React qui :
- ✅ Re-render automatiquement quand user change
- ✅ Type-safe (`User | undefined`)
- ✅ Évite race conditions
- ✅ Testable (Context mockable)

`window.__currentUserId` :
- ❌ Global mutable
- ❌ Pas de re-render
- ❌ Peut être undefined au démarrage
- ❌ Difficile à tester

### Qu'est-ce que "fail-closed" ?

Principe de sécurité : **en cas d'erreur, bloquer l'accès plutôt que de permettre**.

Exemple :
```typescript
// ❌ Fail-open (dangereux)
if (!userId) {
  userId = 'system_default_user'; // Permet accès
}

// ✅ Fail-closed (sécurisé)
if (!userId) {
  return []; // Bloque accès
}
```

### Puis-je encore utiliser window.__currentUserId ?

**Non recommandé**. Utilisez toujours `useAuth()` dans les composants React.

`window.__currentUserId` est conservé temporairement pour rétrocompatibilité mais sera supprimé dans une version future.

### Comment tester l'isolation ?

1. Créer 2 comptes (Alice, Bob)
2. Login Alice → Créer conversation
3. Logout → Login Bob
4. Vérifier que Bob ne voit pas la conversation d'Alice

### Que faire si je trouve un bug d'isolation ?

1. **Documenter** : Screenshot, steps to reproduce
2. **Créer mémo** : Nouveau fichier dans `Doc_Saas_Multi_User/`
3. **Reporter** : Issue GitHub ou notification équipe sécurité

---

## 📞 Contact

**Mainteneur documentation** : Kiro AI (Claude Sonnet 4.5)  
**Dernière mise à jour** : 2024-11-18  
**Prochaine revue** : Après completion Phase 2

---

## 📜 Licence

Voir fichier LICENSE à la racine du projet.

---

## 🔗 Liens utiles

- **Projet principal** : `g:/Aionui_client/`
- **Autre documentation** : `g:/Aionui_client/docs/`
- **Documentation n8n** : `g:/Aionui_client/Doc_activation_workflow_n8n_chat/`
- **Rebranding n8n** : `g:/Aionui_client/Doc_rebranding_n8n/`
