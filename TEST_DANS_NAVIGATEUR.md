# Test Dans le Navigateur Web

## 🌐 Pourquoi Tester Dans le Navigateur ?

L'application Electron desktop **ne montre pas l'URL** dans une barre d'adresse, ce qui rend le debug difficile.

En ouvrant l'application dans un **navigateur web**, on pourra :
- ✅ Voir l'URL changer en temps réel
- ✅ Utiliser la console DevTools (F12)
- ✅ Voir tous les logs console.log
- ✅ Inspecter le DOM

## 📋 Comment Ouvrir Dans le Navigateur

### Méthode 1 : URL Directe (RECOMMANDÉE)

Le serveur Vite dev tourne déjà sur `http://localhost:5173/`.

1. **Ouvrir un navigateur** (Chrome, Edge, Firefox)
2. **Aller à l'URL** : `http://localhost:5173/`
3. **Se connecter** si nécessaire (credentials de test)
4. **Tester le bouton "New Chat"**

### Méthode 2 : Via PowerShell

```powershell
Start-Process "http://localhost:5173/"
```

Cela ouvrira automatiquement le navigateur par défaut.

---

## 🎯 Test À Faire

### Étape 1 : Ouvrir la console DevTools

Une fois sur `http://localhost:5173/` :
- **Appuyer sur F12** (ou Ctrl+Shift+I)
- **Aller sur l'onglet "Console"**

### Étape 2 : Cliquer sur "New Chat"

Dans l'interface web, cliquer sur le bouton **"+ New Chat"**.

### Étape 3 : Observer

**Regardez simultanément** :

1. **L'URL dans la barre d'adresse**
   - Change-t-elle vers `http://localhost:5173/#/conversation/xxx` ?

2. **La console DevTools**
   - Des erreurs JavaScript apparaissent-elles ?
   - Des logs s'affichent-ils ?

3. **L'interface**
   - La page change-t-elle ?
   - Un chat apparaît-il ?

---

## ✅ Résultats Attendus

### Scénario A : Succès ✅

- ✅ URL change vers `#/conversation/<UUID>`
- ✅ Page de chat s'affiche
- ✅ Zone de saisie visible
- ✅ Pas d'erreur dans la console

**→ PARFAIT ! On peut alors tester l'envoi de messages vers n8n.**

---

### Scénario B : URL Change, Mais Page Blanche ⚠️

- ✅ URL change vers `#/conversation/<UUID>`
- ❌ Page reste blanche
- ⚠️ Erreur JavaScript dans la console

**→ La console DevTools montrera l'erreur exacte.**

**Action** : Copier le message d'erreur complet.

---

### Scénario C : URL Ne Change Pas ❌

- ❌ URL reste `http://localhost:5173/` (ou `#/guid`)
- ❌ Rien ne se passe

**→ Le code n'est toujours pas exécuté.**

**Action de secours** : Vérifier dans la console si des erreurs s'affichent au chargement de la page.

---

## 🔍 Avantages du Test Navigateur

1. **Console accessible** : F12 → Console → Voir tous les logs
2. **URL visible** : Barre d'adresse montre l'URL complète
3. **Network tab** : Voir les requêtes HTTP (vers n8n par exemple)
4. **React DevTools** : Inspecter les composants React
5. **Pas de cache Electron** : Plus facile à déboguer

---

## 📝 Informations À Me Fournir

Après avoir testé dans le navigateur, merci de me dire :

1. **L'URL change-t-elle ?** (Oui/Non + nouvelle URL)
2. **Des erreurs dans la console ?** (Oui/Non + copier le message)
3. **La page de chat s'affiche ?** (Oui/Non + description)
4. **Des logs `[NEW CHAT]` apparaissent-ils dans la console ?** (Oui/Non)

---

## 🚀 Commande Rapide

Pour ouvrir directement dans le navigateur :

```powershell
Start-Process "http://localhost:5173/"
```

Puis **F12** pour ouvrir la console DevTools.

---

## ⚠️ Si le Serveur n'Est Pas Accessible

Si `http://localhost:5173/` ne charge pas :

1. Vérifier que `npm run start` tourne toujours (terminal ID: 5)
2. Vérifier les logs du terminal pour voir l'URL exacte
3. Essayer avec l'IP locale : `http://127.0.0.1:5173/`

---

**Testez maintenant dans le navigateur !** 🌐🔍
