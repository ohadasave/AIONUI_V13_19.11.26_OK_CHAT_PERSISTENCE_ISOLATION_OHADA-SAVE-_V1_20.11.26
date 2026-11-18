# Instructions de Test - Validation Phase 5

**Application** : ✅ E-audit v1.8.25 démarrée avec succès  
**Terminal ID** : 5 (processus actif)  
**DevTools** : http://127.0.0.1:9230  
**Date** : 2026-11-18 17:00

---

## 🎯 Objectif

Vérifier que les 3 correctifs appliqués résolvent les symptômes identifiés :

1. ✅ Agent "n8n Workflow" sélectionné par défaut sur `/guid`
2. ✅ Bouton "Envoyer" fonctionne sans spinner infini
3. ✅ Pas besoin de cliquer sur "Admin" pour activer le chat

---

## 📋 Procédure de test

### Test 1 : Agent par défaut

**Étapes** :
1. Ouvrir l'application E-audit (déjà démarrée)
2. Aller sur la page `/guid` (page d'accueil guidée)
3. Observer la sélection dans le sélecteur d'assistant

**Résultat attendu** :
- "n8n Workflow" est **sélectionné par défaut** (pas "Sélectionner un assistant...")
- Le sélecteur affiche "n8n Workflow" avec son icône

**Si ça échoue** :
- Ouvrir DevTools (F12)
- Console → Chercher logs `[useGuidAgentSelection]` ou erreurs
- Capturer la valeur de `selectedAgent` et `availableAgents`

---

### Test 2 : Envoi de message

**Étapes** :
1. Depuis `/guid` avec "n8n Workflow" sélectionné
2. Taper un message test : `Bonjour, test n8n`
3. Cliquer sur le bouton "Envoyer"

**Résultat attendu** :
- Le bouton affiche un spinner **brièvement** (<2 secondes)
- Navigation automatique vers `/conversation/{id}`
- Message initial affiché dans la conversation n8n
- Pas de spinner infini ✅

**Si ça échoue** :
- DevTools → Console → Erreur `handleGuidSend`
- DevTools → Network → Échec requête API `/api/conversations`
- Spinner bloqué = `setLoading(false)` pas appelé

---

### Test 3 : Pas de dépendance Admin

**Étapes** :
1. Relancer l'application (⚠️ Important : redémarrer depuis zéro)
2. **NE PAS** cliquer sur le bouton "Admin" en haut
3. Aller directement sur `/guid`
4. Essayer d'envoyer un message avec "n8n Workflow"

**Résultat attendu** :
- L'envoi fonctionne **sans avoir cliqué sur Admin**
- La conversation n8n se crée normalement

**Si ça échoue** :
- Le symptôme original persiste (config.json pas migrée ?)
- Vérifier si `config.json` existe : `C:\Users\LEADER\AppData\Roaming\E-audit\config.json`
- Contenu attendu : `{ "lastSelectedAgent": "n8n" }`

---

## 🔍 Diagnostics avancés (si échec)

### Vérifier config.json

```powershell
Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json
```

**Valeurs correctes attendues** :
- `lastSelectedAgent: "n8n"` ✅
- ~~`lastSelectedAgent: "custom:builtin-n8n-workflow"`~~ ❌ (ancienne clé)

### Vérifier les logs DevTools

1. Ouvrir DevTools (F12)
2. Console → Filtrer `guid` ou `n8n`
3. Chercher :
   ```
   [useGuidAgentSelection] selectedAgent:
   [useGuidAgentSelection] Migration legacy key: custom:builtin-n8n-workflow → n8n
   [useGuidSend] n8nType detected:
   [useGuidSend] Using unified n8n branch
   ```

### Vérifier que les modifications sont compilées

```powershell
Select-String -Path "out\main\*.js" -Pattern "LEGACY_AGENT_KEYS"
Select-String -Path "out\renderer\*.js" -Pattern "isN8nType"
```

**Résultat attendu** : Au moins 1 match pour chaque pattern

---

## ✅ Critères de succès

| Test | Critère | Statut |
|------|---------|--------|
| 1. Agent par défaut | "n8n Workflow" sélectionné automatiquement | [ ] |
| 2. Envoi message | Navigation vers conversation, pas de spinner infini | [ ] |
| 3. Sans Admin | Fonctionne sans cliquer Admin au préalable | [ ] |

**SUCCÈS COMPLET** : 3/3 tests passent ✅

---

## 🚀 Si tous les tests passent

### Phase 6 : Commit des modifications

```powershell
git add src/renderer/pages/guid/hooks/useGuidAgentSelection.ts
git add src/renderer/pages/guid/hooks/useGuidSend.ts
git commit -m "fix(guid): n8n workflow default selection and send button

- Add legacy key migration (custom:builtin-n8n-workflow → n8n)
- Add type guard isN8nType() for safe n8n detection
- Unify n8n branches (remove duplication, single try...finally)
- Fix infinite spinner with guaranteed setLoading(false)
- Use platform:'custom' to avoid type check error

Fixes #XXX (remplacer par numéro issue si applicable)

Diagnostic: config.json persistence was overwriting useState default
Solution recommended by Claude Opus + Gemini Flash consultation"
```

---

## 📊 Si des tests échouent

1. **Noter quel(s) test(s) échoue(nt)**
2. **Capturer les logs DevTools**
3. **Vérifier config.json**
4. **Exécuter diagnostics avancés**
5. **Communiquer les résultats à l'agent**

Format de rapport d'échec :
```
Test X échoué :
- Symptôme observé : [description]
- Logs console : [copier/coller]
- config.json : [contenu]
- Comportement attendu : [description]
```

---

## 🎬 Action immédiate

**L'application est démarrée et prête.**  
Veuillez exécuter les 3 tests ci-dessus et rapporter les résultats.
