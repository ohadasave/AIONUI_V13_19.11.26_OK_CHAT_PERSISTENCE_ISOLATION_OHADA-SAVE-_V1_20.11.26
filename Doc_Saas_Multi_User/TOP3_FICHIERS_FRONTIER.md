# Top 3 Fichiers pour Frontier Model

**Date:** 7 Février 2025  
**Objectif:** Résoudre bug isolation multi-utilisateur

---

## 📦 Les 3 Fichiers à Envoyer

### 1. PROMPT PRINCIPAL ⭐⭐⭐⭐⭐

**Fichier:** `PROMPT_FRONTIER_ISOLATION_BUG.md`  
**Lignes:** 580  

**Contenu:**
- Contexte du problème
- Comportement observé
- Architecture v18.1 (code complet)
- 4 hypothèses avec probabilités
- 4 solutions proposées
- Plan d'implémentation
- 5 questions pour Frontier

---

### 2. ARCHITECTURE COMPLÈTE ⭐⭐⭐⭐⭐

**Fichier:** `ARCHITECTURE_DEBUG_ISOLATION_V19.md`  
**Lignes:** ~950 (avec fichiers secondaires intégrés)

**Contenu:**
- Symptômes détaillés
- Diagrammes de flux (READ + WRITE)
- 4 hypothèses détaillées
- **Description complète des 6 fichiers secondaires** (databaseBridge, ipcBridge, conversationService, ConversationTabs, workspace, conversationBridge)
- Solutions avec implémentation
- Tests de validation

---

### 3. CODE SOURCE - TOP 3

#### 3.1 AuthContext.tsx ⭐⭐⭐⭐⭐

**Fichier:** `CODE_AuthContext.tsx`  
**Lignes:** 310 (complet)

**Rôle:** Génération userId, login/logout, **race condition suspectée**

---

#### 3.2 getUserConversations ⭐⭐⭐⭐⭐

**Fichier:** `CODE_database_getUserConversations.ts`  
**Lignes:** 120 (avec annotations)

**Rôle:** Query SQL avec **fallback suspect**

---

#### 3.3 ChatHistory useEffect ⭐⭐⭐⭐⭐

**Fichier:** `CODE_ChatHistory_useEffect.tsx`  
**Lignes:** 170 (avec annotations)

**Rôle:** Lecture `window.__currentUserId`, **bug probable**

---

## 📋 Fichiers Secondaires

**Décrits dans ARCHITECTURE_DEBUG_ISOLATION_V19.md :**
- databaseBridge.ts
- ipcBridge.ts
- conversationService.ts
- ConversationTabs.tsx
- workspace/index.tsx
- conversationBridge.ts

---

## 🎯 Package Recommandé

### Minimaliste (3 fichiers)

```
1. PROMPT_FRONTIER_ISOLATION_BUG.md
2. ARCHITECTURE_DEBUG_ISOLATION_V19.md
3. CODE_AuthContext.tsx
```

### Complet (5 fichiers)

```
+ CODE_database_getUserConversations.ts
+ CODE_ChatHistory_useEffect.tsx
```

---

## 📍 Localisation

```
g:/Aionui_client/Doc_Saas_Multi_User/
├── PROMPT_FRONTIER_ISOLATION_BUG.md
├── ARCHITECTURE_DEBUG_ISOLATION_V19.md
├── CODE_AuthContext.tsx
├── CODE_database_getUserConversations.ts
└── CODE_ChatHistory_useEffect.tsx
```

---

## ✅ PRÊT POUR ENVOI
