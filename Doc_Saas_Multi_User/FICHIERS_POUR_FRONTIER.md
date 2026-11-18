# Fichiers à Envoyer au Frontier Model

**Date:** 7 Février 2025  
**Objectif:** Résoudre bug isolation multi-utilisateur (utilisateurs voient conversations des autres)

---

## 📦 Package Complet pour Frontier Model

### 1. PROMPT PRINCIPAL (OBLIGATOIRE)

**Fichier:** `PROMPT_FRONTIER_ISOLATION_BUG.md`  
**Lignes:** 580  
**Localisation:** `g:/Aionui_client/Doc_Saas_Multi_User/PROMPT_FRONTIER_ISOLATION_BUG.md`

**Contenu:**
- Contexte du problème
- Comportement observé (Bob voit conversations d'Alice)
- Architecture implémentée (code complet)
- 4 hypothèses avec probabilités
- 4 solutions proposées avec code TypeScript
- Plan d'implémentation 3 phases
- 5 questions pour le Frontier
- Format de réponse attendu

**À envoyer en premier** ⭐⭐⭐⭐⭐

---

### 2. ARCHITECTURE COMPLÈTE (OBLIGATOIRE)

**Fichier:** `ARCHITECTURE_DEBUG_ISOLATION_V19.md`  
**Lignes:** 650  
**Localisation:** `g:/Aionui_client/Doc_Saas_Multi_User/ARCHITECTURE_DEBUG_ISOLATION_V19.md`

**Contenu:**
- Symptômes détaillés avec captures
- Architecture actuelle (v18.1) complète
- Génération userId (AuthContext.tsx)
- Chaîne READ (ChatHistory → Database)
- Chaîne WRITE (AgentSetupCard → Database)
- 4 hypothèses avec code suspect
- Tests de diagnostic (logs + SQL)
- 4 solutions avec implémentation
- Plan d'action complet
- Checklist finale

**À envoyer en second** ⭐⭐⭐⭐⭐

---

### 3. FICHIERS CODE SOURCE (TOP 3)

#### 3.1 AuthContext.tsx (CRITIQUE)

**Localisation:** `g:/Aionui_client/src/renderer/context/AuthContext.tsx`  
**Lignes:** 310 (fichier complet)

**Rôle:**
- Génération `userId = user_${Date.now()}`
- Exposition `window.__currentUserId`
- Login/logout/refresh
- Race condition suspectée

**Points clés:**
- Ligne ~170: Génération userId
- Ligne ~215: `(window as any).__currentUserId = userId;`
- Ligne ~219: `setUser({ id: userId, ... }); setStatus('authenticated');`

**À envoyer en troisième** ⭐⭐⭐⭐⭐

---

#### 3.2 database/index.ts (getUserConversations)

**Localisation:** `g:/Aionui_client/src/process/database/index.ts`  
**Lignes:** Extraire lignes 527-620 (fonction getUserConversations)

**Rôle:**
- Query SQL `SELECT * FROM conversations WHERE user_id = ?`
- Fallback `const finalUserId = userId || this.defaultUserId;`
- Filtrage par userId

**Points clés:**
- Ligne 533: Fallback vers 'system_default_user'
- Ligne 535: COUNT(*)
- Ligne 541: SELECT * avec ORDER BY

**Extrait déjà disponible** (100 lignes) ⭐⭐⭐⭐⭐

---

#### 3.3 ChatHistory.tsx (useEffect)

**Localisation:** `g:/Aionui_client/src/renderer/pages/conversation/ChatHistory.tsx`  
**Lignes:** Extraire lignes 1-200 (imports + useEffect principal)

**Rôle:**
- Lecture `window.__currentUserId`
- Appel IPC `getUserConversations`
- Affichage conversations

**Points clés:**
- Ligne 104: `const userId = (window as any).__currentUserId;`
- Ligne 108: `invoke({ userId, page, pageSize })`
- Ligne 126: addEventListener('chat.history.refresh')

**Extrait déjà disponible** (200 lignes) ⭐⭐⭐⭐⭐

---

### 4. DOCUMENTS COMPLÉMENTAIRES (OPTIONNELS)

#### 4.1 Architecture Actualisée (contexte historique)

**Fichier:** `ARCHITECTURE_ACTUALISEE_2025.md`  
**Lignes:** 1020  
**Localisation:** `g:/Aionui_client/Doc_Saas_Multi_User/ARCHITECTURE_ACTUALISEE_2025.md`

**Contenu:**
- Mémo progressif v17 → v18 → v18.1 → v19
- Chronologie des évolutions
- Scénarios Alice/Bob (avant/après)
- Fichiers modifiés (8 fichiers)
- Section BUG v18.1 détaillée
- Plan de correction v19

**Utilité:** Contexte historique, évolution du projet ⭐⭐⭐

---

#### 4.2 Tentatives de Correction (v18.1)

**Fichier:** `CORRECTION_ISOLATION_LECTURE_FEVRIER_2025.md`  
**Lignes:** 350  
**Localisation:** `g:/Aionui_client/CORRECTION_ISOLATION_LECTURE_FEVRIER_2025.md`

**Contenu:**
- Symptômes
- Analyse cause racine (WRITE ok, READ ko)
- Corrections appliquées (6 fichiers)
- Tests de validation
- Différences v18 vs v18.1
- Limitations

**Utilité:** Comprendre les tentatives précédentes ⭐⭐

---

## 📋 Ordre d'Envoi Recommandé

### Envoi Minimaliste (3 fichiers) ✅

```
1. PROMPT_FRONTIER_ISOLATION_BUG.md      (prompt structuré)
2. ARCHITECTURE_DEBUG_ISOLATION_V19.md   (architecture complète)
3. AuthContext.tsx                        (code source #1)
```

**Estimation tokens:** ~15,000 tokens  
**Temps lecture Frontier:** ~3-5 minutes

---

### Envoi Complet (6 fichiers) ✅✅

```
1. PROMPT_FRONTIER_ISOLATION_BUG.md      (prompt structuré)
2. ARCHITECTURE_DEBUG_ISOLATION_V19.md   (architecture complète)
3. AuthContext.tsx                        (code source #1)
4. database/index.ts (extrait)            (code source #2)
5. ChatHistory.tsx (extrait)              (code source #3)
6. ARCHITECTURE_ACTUALISEE_2025.md       (contexte historique)
```

**Estimation tokens:** ~25,000 tokens  
**Temps lecture Frontier:** ~5-8 minutes

---

### Envoi Exhaustif (8 fichiers) ✅✅✅

```
1. PROMPT_FRONTIER_ISOLATION_BUG.md              (prompt structuré)
2. ARCHITECTURE_DEBUG_ISOLATION_V19.md           (architecture complète)
3. AuthContext.tsx                                (code source #1)
4. database/index.ts (extrait)                    (code source #2)
5. ChatHistory.tsx (extrait)                      (code source #3)
6. ARCHITECTURE_ACTUALISEE_2025.md               (contexte historique)
7. CORRECTION_ISOLATION_LECTURE_FEVRIER_2025.md  (tentatives v18.1)
8. databaseBridge.ts (si demandé par Frontier)   (IPC provider)
```

**Estimation tokens:** ~30,000 tokens  
**Temps lecture Frontier:** ~8-12 minutes

---

## 📂 Localisation des Fichiers

### Documentation (Doc_Saas_Multi_User/)

```
g:/Aionui_client/Doc_Saas_Multi_User/
├── PROMPT_FRONTIER_ISOLATION_BUG.md              ← OBLIGATOIRE ⭐⭐⭐⭐⭐
├── ARCHITECTURE_DEBUG_ISOLATION_V19.md           ← OBLIGATOIRE ⭐⭐⭐⭐⭐
├── ARCHITECTURE_ACTUALISEE_2025.md               ← Optionnel ⭐⭐⭐
├── FICHIERS_POUR_FRONTIER.md                     ← Ce document
└── RECAP_ACTIONS_FRONTIER.md                     ← Récapitulatif
```

### Code Source (src/)

```
g:/Aionui_client/src/
├── renderer/context/AuthContext.tsx              ← OBLIGATOIRE ⭐⭐⭐⭐⭐
├── process/database/index.ts                     ← OBLIGATOIRE ⭐⭐⭐⭐⭐
├── renderer/pages/conversation/ChatHistory.tsx   ← OBLIGATOIRE ⭐⭐⭐⭐⭐
├── process/bridge/databaseBridge.ts              ← Optionnel ⭐⭐⭐
├── process/services/conversationService.ts       ← Optionnel ⭐⭐
└── common/ipcBridge.ts                           ← Optionnel ⭐⭐
```

### Documents Additionnels

```
g:/Aionui_client/
├── CORRECTION_ISOLATION_LECTURE_FEVRIER_2025.md  ← Optionnel ⭐⭐
└── AGENTS.md                                      ← Conventions projet
```

---

## 🎯 Comment Envoyer au Frontier Model

### Option 1: Copier-Coller Manuel

1. **Ouvrir chaque fichier** dans VS Code
2. **Copier le contenu complet**
3. **Coller dans l'interface Frontier** (ordre recommandé)

### Option 2: Upload Fichiers

1. **Sélectionner les fichiers** dans l'explorateur
2. **Uploader dans Frontier** (si interface supporte)

### Option 3: Commande Automatique (si API disponible)

```bash
# Créer un bundle
cat "g:/Aionui_client/Doc_Saas_Multi_User/PROMPT_FRONTIER_ISOLATION_BUG.md" \
    "g:/Aionui_client/Doc_Saas_Multi_User/ARCHITECTURE_DEBUG_ISOLATION_V19.md" \
    "g:/Aionui_client/src/renderer/context/AuthContext.tsx" \
    > frontier_bundle.txt

# Envoyer le bundle
# (dépend de l'API Frontier)
```

---

## 📊 Checklist Avant Envoi

### Vérifications Obligatoires

- [ ] **PROMPT_FRONTIER_ISOLATION_BUG.md** est complet (580 lignes)
- [ ] **ARCHITECTURE_DEBUG_ISOLATION_V19.md** est complet (650 lignes)
- [ ] **AuthContext.tsx** est le fichier COMPLET (310 lignes)
- [ ] Les 3 fichiers sont dans le bon ordre
- [ ] Pas de données sensibles dans les fichiers (tokens, API keys, etc.)
- [ ] Format Markdown préservé (pas de corruption)

### Vérifications Optionnelles

- [ ] **database/index.ts** extrait (lignes 527-620)
- [ ] **ChatHistory.tsx** extrait (lignes 1-200)
- [ ] **ARCHITECTURE_ACTUALISEE_2025.md** complet (1020 lignes)
- [ ] Ordre d'envoi respecté (prompt → architecture → code)

---

## 💬 Message d'Accompagnement pour Frontier

**À inclure dans votre message au Frontier Model:**

```
Bonjour,

J'ai un bug critique d'isolation multi-utilisateur dans mon application Electron (AionUI).

**Problème:** Les utilisateurs voient les conversations des autres utilisateurs.

**Contexte:** Application Desktop multi-comptes avec base SQLite.

**Documents fournis:**
1. PROMPT_FRONTIER_ISOLATION_BUG.md (prompt structuré avec hypothèses)
2. ARCHITECTURE_DEBUG_ISOLATION_V19.md (architecture complète)
3. AuthContext.tsx (génération userId)
4. database/index.ts (query SQL avec fallback suspect)
5. ChatHistory.tsx (lecture conversations frontend)

**Questions principales:**
1. Quelle hypothèse est la plus probable (race condition vs bug en création) ?
2. Quelle solution recommandez-vous ?
3. Y a-t-il d'autres points de fuite de données ?

**Format de réponse souhaité:**
- Diagnostic clair (1-2 paragraphes)
- Code exact à appliquer (snippets TypeScript)
- Ordre des modifications (fichier 1 → 2 → 3)
- Tests de validation (SQL + UI)

Merci de votre expertise !
```

---

## 📖 Ressources Additionnelles

### Si Frontier Model Demande Plus d'Informations

**Fichiers secondaires disponibles:**
- `databaseBridge.ts` (IPC provider getUserConversations)
- `conversationService.ts` (service création conversations)
- `ipcBridge.ts` (type definitions IPC)
- `ConversationTabs.tsx` (autre usage getUserConversations)
- `workspace/index.tsx` (autre usage getUserConversations)
- `AGENTS.md` (conventions projet, tech stack)

**Commandes de diagnostic:**
```sql
-- Vérifier les user_id en base
sqlite3 "C:\Users\LEADER\AppData\Roaming\E-audit\aionui\aionui.db"
SELECT id, user_id, name, created_at FROM conversations ORDER BY created_at DESC;
```

**Logs attendus (DevTools F12):**
```
[AuthContext] userId: user_1738976543210
[ChatHistory] __currentUserId: undefined ← BUG
[DatabaseBridge] userId: undefined
[Database] finalUserId: system_default_user
```

---

## ✅ Checklist Finale

### Avant d'Envoyer

- [x] Documentation complète préparée (5 documents)
- [x] Architecture exhaustive créée (ARCHITECTURE_DEBUG_ISOLATION_V19.md)
- [x] Prompt structuré rédigé (PROMPT_FRONTIER_ISOLATION_BUG.md)
- [x] Top 3 fichiers code identifiés (AuthContext, database, ChatHistory)
- [x] Hypothèses formulées avec probabilités (4 hypothèses)
- [x] Solutions proposées avec code complet (4 solutions)
- [x] Plan d'implémentation détaillé (3 phases)
- [x] Tests de validation définis (scénarios Alice/Bob)
- [x] Ordre d'envoi déterminé (minimaliste vs complet vs exhaustif)
- [x] Message d'accompagnement rédigé
- [x] Checklist vérifications avant envoi

### Après Réponse Frontier

- [ ] Lire le diagnostic du Frontier
- [ ] Appliquer les corrections recommandées
- [ ] Tester avec scénario Alice/Bob
- [ ] Vérifier base de données (user_id)
- [ ] Mettre à jour documentation
- [ ] Créer commit Git avec résolution

---

**PRÊT POUR ENVOI AU FRONTIER MODEL** ✅

**Fichiers à envoyer (minimaliste):**
1. `PROMPT_FRONTIER_ISOLATION_BUG.md`
2. `ARCHITECTURE_DEBUG_ISOLATION_V19.md`
3. `AuthContext.tsx`

**Estimation temps réponse Frontier:** 5-15 minutes
