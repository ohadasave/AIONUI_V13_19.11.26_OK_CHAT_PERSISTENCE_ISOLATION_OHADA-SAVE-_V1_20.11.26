# Documentation - Problème d'activation des workflows n8n

## 📚 Présentation

Ce dossier contient une documentation exhaustive du problème d'intégration n8n dans AionUi E-audit v1.8.25, préparée pour consultation par des experts Frontier Models (Claude, GPT-4, etc.).

## 📂 Structure des documents

### 1. 📄 [PROBLEME_DETAILLE.md](./01_PROBLEME_DETAILLE.md)
**Description exhaustive du problème**

Contient :
- Vue d'ensemble et objectifs
- Symptômes détaillés (3 problèmes persistants)
- Cause racine identifiée (code compilé périmé)
- Historique des 5 tentatives de résolution
- Architecture impliquée (flux de données)
- Fichiers modifiés avec extraits de code
- Tests ajoutés (14 nouveaux tests)
- Configuration (chemins, ports, config.json)
- Points de blocage techniques
- Suggestions de prochaines étapes

**Lire en premier** pour comprendre le contexte complet.

### 2. 🏗️ [ARCHITECTURE.md](./02_ARCHITECTURE.md)
**Architecture technique du système**

Contient :
- Diagramme multi-processus Electron
- Flux de données détaillés (4 scénarios)
- Points de défaillance identifiés (4 défaillances)
- Chaîne de dépendances critiques
- Graphe des fichiers interdépendants
- Stockage des données (Electron Store, SessionStorage, SQLite)
- Cycle de build (dev vs production)
- Points de test avec exemples de code

**Lire en second** pour comprendre comment les composants interagissent.

### 3. 🥇 [TOP_3_FICHIERS.md](./03_TOP_3_FICHIERS.md)
**Les 3 fichiers les plus critiques à analyser**

Contient :
- **#1** `useGuidSend.ts` - Cœur du problème (logique d'envoi)
- **#2** `useGuidAgentSelection.ts` - Source de l'état (sélection agent)
- **#3** `acpTypes.ts` - Fondation des types (définitions TypeScript)

Pour chaque fichier :
- Pourquoi il est critique
- Questions spécifiques pour les experts
- Sections clés à examiner (numéros de lignes)
- Bonus: 2 fichiers contextuels supplémentaires

**Lire en troisième** pour cibler l'analyse sur les zones problématiques.

### 4. 💬 [PROMPT_EXPERT.md](./04_PROMPT_EXPERT.md)
**Prompt structuré pour consultation Frontier**

Contient :
- Contexte du projet (1 paragraphe)
- Problème actuel (3 symptômes)
- 5 questions spécifiques avec code
- 3 formats de solutions attendues :
  - Solution #1: Correction de code
  - Solution #2: Build & cache
  - Solution #3: Architecture alternative
- Tests à valider
- Contraintes du projet
- Résultat attendu (checklist)

**Copier-coller ce document** dans une conversation avec Claude/GPT-4 pour obtenir une analyse experte.

## 🚀 Guide d'utilisation rapide

### Pour un développeur interne
1. Lisez `01_PROBLEME_DETAILLE.md` (10 min)
2. Parcourez `02_ARCHITECTURE.md` (15 min)
3. Consultez les fichiers source dans `../src/`

### Pour un expert externe (Frontier Model)
1. Copiez tout le contenu de `04_PROMPT_EXPERT.md`
2. Collez dans une nouvelle conversation Claude/GPT-4
3. Joignez les 3 fichiers TypeScript (voir section suivante)
4. Attendez l'analyse et les solutions proposées

### Pour envoyer à un consultant humain
1. Zipper tout le dossier `Doc_activation_workflow_n8n_chat/`
2. Ajouter les 3 fichiers source :
   - `src/renderer/pages/guid/hooks/useGuidSend.ts`
   - `src/renderer/pages/guid/hooks/useGuidAgentSelection.ts`
   - `src/types/acpTypes.ts`
3. Envoyer par email avec objet : "Analyse critique - Intégration n8n AionUi"

## 📁 Fichiers source à joindre

Lors de la consultation d'un expert, joindre ces 3 fichiers complets :

```
📎 useGuidSend.ts (412 lignes)
   Chemin: g:\Aionui_client\src\renderer\pages\guid\hooks\useGuidSend.ts

📎 useGuidAgentSelection.ts (520 lignes)
   Chemin: g:\Aionui_client\src\renderer\pages\guid\hooks\useGuidAgentSelection.ts

📎 acpTypes.ts (600+ lignes)
   Chemin: g:\Aionui_client\src\types\acpTypes.ts
```

### Comment extraire les fichiers

```powershell
# Copier les 3 fichiers dans le dossier de documentation
Copy-Item "src\renderer\pages\guid\hooks\useGuidSend.ts" "Doc_activation_workflow_n8n_chat\"
Copy-Item "src\renderer\pages\guid\hooks\useGuidAgentSelection.ts" "Doc_activation_workflow_n8n_chat\"
Copy-Item "src\types\acpTypes.ts" "Doc_activation_workflow_n8n_chat\"

# Créer une archive ZIP
Compress-Archive -Path "Doc_activation_workflow_n8n_chat\*" -DestinationPath "n8n_problem_docs.zip"
```

## 🎯 Objectif final

**Obtenir une solution qui permette de** :

1. ✅ Afficher "n8n Workflow" par défaut sur la page `/guid`
2. ✅ Créer une conversation n8n au clic sur "Envoyer"
3. ✅ Supprimer la dépendance au bouton "ADMIN"

**Sans régression** :
- ❌ Pas de break des autres assistants (Gemini, Claude, Codex)
- ❌ Pas de régression des 496 tests existants
- ❌ Respect du TypeScript strict mode

## 📊 Statut actuel

| Élément | Statut |
|---------|--------|
| Code source modifié | ✅ Commit ec247856, d38fb736 |
| Tests passants | ✅ 496/496 (dont 14 nouveaux pour n8n) |
| Code compilé | ❌ Périmé (date 14h52 vs commits 13h25) |
| Application fonctionnelle | ❌ Échec des 3 symptômes |
| Cause identifiée | ⚠️ Hypothèse (hot reload / cache) |
| Solution validée | ❌ En attente expertise |

## 🔗 Liens utiles

- **Projet GitHub**: (ajouter si public)
- **Issue tracking**: (ajouter si existant)
- **Documentation n8n**: https://docs.n8n.io/
- **Electron docs**: https://www.electronjs.org/docs/latest/
- **React 19 docs**: https://react.dev/

## 👥 Contributeurs

- **Développeur principal**: (votre nom)
- **Expert consulté**: À déterminer (Claude/GPT-4)
- **Date de création**: 18 novembre 2026

## 📝 Historique des versions

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 18/11/2026 | Documentation initiale complète |
| 1.1.0 | (future) | Intégration de la solution validée |

---

**Dernière mise à jour**: 18/11/2026 16:35

Pour toute question sur cette documentation : (votre contact)
