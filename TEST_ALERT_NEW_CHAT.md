# Test Alert - Bouton New Chat

## 🎯 Objectif

Vérifier si le bouton "New Chat" **capture le clic** en affichant des **alertes visibles** (popups).

## ⚠️ Modifications apportées

J'ai ajouté **3 alert() visibles** dans le code du bouton "New Chat" :

1. **Alert 1** : Au tout début du clic → `[DEBUG] Bouton New Chat cliqué !`
2. **Alert 2** : Après génération de l'ID → `[DEBUG] ID généré: <uuid>`
3. **Alert 3** : Si succès → `[DEBUG] Conversation créée, navigation...`
4. **Alert 4** : Si erreur → `[DEBUG] ERREUR: <message d'erreur>`

## 📋 Procédure de Test

### Étape 1 : Cliquer sur "New Chat"
Cliquez sur le bouton **"New Chat"** (icône `+`) dans la barre latérale gauche.

### Étape 2 : Observer les alertes

Vous devriez voir **immédiatement** une popup avec le message :

```
[DEBUG] Bouton New Chat cliqué !
```

✅ **Si cette alerte apparaît** → Le bouton fonctionne, le clic est capturé ✓

❌ **Si aucune alerte n'apparaît** → Le clic n'est PAS capturé (problème CSS/DOM)

---

### Étape 3 : Cliquer sur OK et observer la suite

Après avoir cliqué sur **OK** dans la première alerte, vous devriez voir une **deuxième alerte** :

```
[DEBUG] ID généré: <un UUID>
```

Exemple : `[DEBUG] ID généré: 8f3a2c1b-4e5d-6789-abcd-ef1234567890`

✅ **Si cette alerte apparaît** → La génération d'ID fonctionne ✓

---

### Étape 4 : Observer le résultat final

Après la deuxième alerte, **deux scénarios possibles** :

#### Scénario A : Succès (rare à cause de SQLite)
```
[DEBUG] Conversation créée, navigation...
```

→ L'application navigue vers `/conversation/<UUID>`

#### Scénario B : Erreur (très probable)
```
[DEBUG] ERREUR: <message d'erreur>
Redirection vers /guid
```

→ L'application redirige vers la page d'accueil `/guid`

---

## 🔍 Diagnostic selon le résultat

### Cas 1 : Aucune alerte ne s'affiche

**Signification** : Le `onClick` du bouton n'est **pas déclenché**

**Causes possibles** :
- Un élément avec `z-index` plus élevé bloque le clic
- Le bouton a `pointer-events: none` en CSS
- Un autre gestionnaire d'événement empêche la propagation

**Action recommandée** :
- Vérifier si d'autres boutons (Settings, Batch Mode) répondent au clic
- Si aucun bouton ne répond : problème global de la sidebar
- Si seul "New Chat" ne répond pas : problème spécifique au bouton

---

### Cas 2 : Première alerte OK, mais pas la deuxième

**Signification** : Le clic fonctionne, mais le code crash **avant** `uuid()`

**Cause probable** : Erreur JavaScript synchrone dans le handler

**Action recommandée** : Consulter les logs du processus Electron (terminal)

---

### Cas 3 : Deux alertes OK, puis erreur SQLite

**Signification** : Le bouton fonctionne parfaitement, mais **SQLite échoue**

**Message d'erreur attendu** :
```
Could not locate the bindings file
```

**Cause** : Le binding better-sqlite3 manque (déjà connu)

**Solution** : Contourner SQLite en naviguant directement vers `/guid` **avec state** pour pré-remplir les paramètres n8n

---

### Cas 4 : Trois alertes OK (succès complet)

**Signification** : Tout fonctionne parfaitement ! 🎉

→ La conversation n8n est créée et l'application navigue vers `/conversation/<UUID>`

---

## 📝 Rapport à fournir

Merci de me communiquer **exactement** :

1. **Combien d'alertes apparaissent ?** (0, 1, 2, 3, ou 4)
2. **Quel est le texte exact de chaque alerte ?**
3. **Que se passe-t-il après la dernière alerte ?** (navigation, erreur, rien)

---

## 🔧 Prochaines étapes selon le résultat

### Si aucune alerte
→ Inspecter le DOM pour trouver ce qui bloque le clic

### Si alerte 1 seule
→ Lire les logs Electron pour trouver l'erreur JavaScript

### Si alertes 1+2, puis erreur SQLite
→ **Contourner SQLite** en modifiant le code pour naviguer vers `/guid` avec les bons paramètres state

### Si tout fonctionne (3 alertes)
→ Retirer les alertes et garder seulement la logique qui fonctionne

---

## ⚡ Test maintenant !

L'application a été **hot-reloadée**, les alertes sont actives.

**Cliquez sur "New Chat" et observez** ! 👀
