# Synthèse rapide - Problème n8n (2 minutes de lecture)

## 🎯 Le problème en une phrase

**Les modifications pour intégrer n8n sont committées et testées, mais ne s'appliquent pas dans l'application lancée.**

## ❌ 3 symptômes visibles

1. Page d'accueil ne montre pas "n8n Workflow" par défaut
2. Bouton "Envoyer" tourne indéfiniment
3. Il faut cliquer sur "ADMIN" pour voir les assistants

## 🔍 Cause hypothétique

**Code compilé périmé** : `out/main/index.js` date de 14h52, commits de 13h25. Le hot reload Vite ou le cache Electron ne recharge pas les changements.

## 💡 Solution recherchée

Corriger **SOIT** :

### A. Le code TypeScript
- Erreur dans `useGuidSend.ts` (condition incorrecte ?)
- Type union incomplet dans `acpTypes.ts` ?
- État initial mal appliqué dans `useGuidAgentSelection.ts` ?

### B. Le système de build
- Cache Vite persistant (`node_modules\.vite\*`)
- Cache Electron (`AppData\E-audit\*`)
- Processus Electron/Node toujours en mémoire

### C. L'architecture
- Approche fondamentalement incorrecte ?
- n8n ne devrait pas être dans `AcpBackendAll` ?
- Besoin d'un système de plugin séparé ?

## 📁 3 fichiers à analyser

| Priorité | Fichier | Problème supposé |
|----------|---------|------------------|
| 🥇 | `useGuidSend.ts` | `selectedAgent !== 'n8n'` → branche jamais exécutée |
| 🥈 | `useGuidAgentSelection.ts` | `selectedAgentKey = 'n8n'` non appliqué ? |
| 🥉 | `acpTypes.ts` | Type `AcpBackendAll` avec `'n8n'` non compilé ? |

## 📊 Données vérifiées

✅ **Git commits présents** : ec247856, d38fb736  
✅ **Tests passants** : 496/496 (dont 14 nouveaux pour n8n)  
✅ **Code source correct** : Vérifié avec `git show`  
❌ **Application runtime** : Échec des 3 symptômes  
❓ **Code compilé** : Non vérifié (`out/main/index.js`)  

## 🚀 Actions déjà tentées

| Action | Commande | Résultat |
|--------|----------|----------|
| Restart normal | `npm run start` | ❌ Échec |
| Clear cache Vite | `Remove-Item out\*, node_modules\.vite\*` | ❌ Échec |
| Kill processes | `taskkill /F /IM electron.exe` | ❌ Échec |
| Full rebuild | Cache clear + restart | ❌ Échec |
| Workflow automation | `wf_20ce7fb91ade9ce1` | ❌ Failed |

## 💬 Question pour l'expert

**En examinant les 3 fichiers joints, pouvez-vous identifier :**

1. Pourquoi `selectedAgent` n'est jamais `'n8n'` ?
2. Quelle ligne de code est incorrecte ?
3. Comment forcer l'application du code compilé ?

## 🎯 Résultat attendu

À la fin, l'application doit :

```javascript
// Au démarrage
selectedAgentKey === 'n8n' // ✅
selectedAgent === 'n8n'    // ✅

// Au clic "Envoyer"
if (selectedAgent === 'n8n') {  // ✅ Branch executed
  conversation = await create({ type: 'n8n', ... });
  navigate(`/conversation/${id}`);  // ✅ Navigation works
}
```

## 📎 Documents complets

Pour une analyse approfondie :

1. `01_PROBLEME_DETAILLE.md` - Description complète
2. `02_ARCHITECTURE.md` - Flux technique
3. `03_TOP_3_FICHIERS.md` - Zones critiques
4. `04_PROMPT_EXPERT.md` - Prompt structuré pour IA
5. `README.md` - Guide de navigation

## ⏱️ Temps de lecture suggéré

- **Cette synthèse** : 2 minutes
- **Problème détaillé** : 10 minutes
- **Architecture** : 15 minutes
- **Analyse des 3 fichiers** : 30 minutes
- **Total** : ~1 heure pour analyse complète

---

**Prochaine étape** : Ouvrir `04_PROMPT_EXPERT.md` et copier dans Claude/GPT-4

**Dernière mise à jour** : 18/11/2026 16:40
