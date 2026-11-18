# Instructions de Test Immédiat

**Date** : 2026-11-18 18:20  
**Statut** : ✅ Login activé - Application en cours d'exécution  
**Action** : REDÉMARRER l'application pour voir l'écran de connexion

---

## 🎯 Deux objectifs de test

### 1. Valider le correctif race condition (PRIORITÉ 1)

**But** : Confirmer que "n8n Workflow" est sélectionné par défaut sans cliquer Admin

### 2. Tester la persistance par utilisateur (PRIORITÉ 2)

**But** : Vérifier que chaque utilisateur a sa propre sélection d'agent

---

## 🚀 Procédure rapide

### Étape 1 : Redémarrer l'application

**Actions** :
1. Fermer complètement l'application E-audit (si ouverte)
2. Dans le terminal Kiro, arrêter le processus :
   ```powershell
   # Le processus npm run start (Terminal ID: 5) devrait être arrêté
   ```
3. Relancer :
   ```powershell
   npm run start
   ```

**Attendu** : L'application démarre et affiche l'**écran de connexion** (pas auto-login)

---

### Étape 2 : Connexion admin

**Identifiants** :
- Username: `admin`
- Password: `admin`

**Si l'écran de connexion n'apparaît pas** :
- Vérifier `config.json` :
  ```powershell
  Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json"
  ```
- Devrait contenir : `"security.loginEnabled": true`

---

### Étape 3 : Test navigation vers /guid

**Actions** :
1. Une fois connecté, chercher un bouton **"Nouveau Chat"** / **"Home"** / **"Accueil"**
2. Cliquer dessus pour naviguer vers `/guid`
3. Observer le sélecteur d'assistant

**Questions de validation** :
- ❓ "n8n Workflow" est-il **sélectionné automatiquement** ?
- ❓ La liste des assistants est-elle **visible** ?
- ❓ Avez-vous dû **cliquer sur "Admin"** à un moment donné ?

**Résultats possibles** :

| Observation | Signification |
|-------------|---------------|
| ✅ "n8n Workflow" sélectionné | Correctif race condition FONCTIONNE |
| ❌ "Sélectionner un assistant..." | Correctif race condition ÉCHOUE |
| ❌ Liste vide/erreur | Problème plus profond |

---

### Étape 4 : Test envoi message

**Si "n8n Workflow" est sélectionné** :

1. Taper un message test : `Bonjour, test de validation n8n`
2. Cliquer sur **"Envoyer"**
3. Observer :
   - Spinner apparaît brièvement puis disparaît ? ✅
   - Navigation vers `/conversation/{id}` ? ✅
   - Message initial affiché ? ✅
   - Réponse n8n reçue ? ✅

---

### Étape 5 : Test persistance par utilisateur (OPTIONNEL)

**Si vous voulez tester la multi-user** :

1. Aller dans **Settings** > **Admin** (ou **Security**)
2. Créer un nouvel utilisateur :
   - Username: `testuser`
   - Password: `test123`
   - Rôle: user
3. Se **déconnecter** (logout button)
4. Se connecter avec `testuser` / `test123`
5. Naviguer vers `/guid`
6. Observer : Quel agent est sélectionné ?
   - Si **n8n** (default) → Config isolée par user ✅
   - Si autre chose → Peut-être config globale

**Documentation complète** : Voir [05_TEST_PERSISTANCE_PAR_USER.md](05_TEST_PERSISTANCE_PAR_USER.md)

---

## 📊 Rapport de test attendu

### Format de réponse

```
=== TEST RACE CONDITION ===
1. Écran de connexion affiché au démarrage : [OUI / NON]
2. Connexion admin réussie : [OUI / NON]
3. Navigation vers /guid : [OUI / NON]
4. Agent sélectionné par défaut : [n8n Workflow / Sélectionner... / Autre: ___]
5. Clic Admin nécessaire ? : [OUI / NON]
6. Envoi message réussi : [OUI / NON]
7. Réponse n8n reçue : [OUI / NON]

=== LOGS DEVTOOLS (si échec) ===
[Copier/coller logs console ici]

=== CONFIG.JSON ===
[Contenu du fichier config.json]
```

---

## 🔧 Commandes de diagnostic

### Vérifier config.json

```powershell
Get-Content "C:\Users\LEADER\AppData\Roaming\E-audit\config.json" | ConvertFrom-Json | Format-List
```

### Vérifier processus Electron en cours

```powershell
Get-Process electron -ErrorAction SilentlyContinue
```

### Tuer processus Electron (si nécessaire)

```powershell
Stop-Process -Name electron -Force
```

---

## ✅ Critères de succès

### Succès total (5/5)

- ✅ Écran de connexion affiché
- ✅ "n8n Workflow" sélectionné automatiquement
- ✅ Pas de clic Admin nécessaire
- ✅ Message envoyé sans spinner infini
- ✅ Réponse n8n reçue

→ **RÉSOLUTION COMPLÈTE CONFIRMÉE** 🎉

### Succès partiel (3-4/5)

- ✅ Login fonctionne
- ✅ Message envoyé
- ❌ Agent pas sélectionné OU Admin nécessaire

→ **Correctif race condition à ajuster**

### Échec (0-2/5)

- ❌ Login ne fonctionne pas OU
- ❌ Application crash OU
- ❌ Erreurs majeures

→ **Investigation supplémentaire requise**

---

## 📚 Documents de référence

| Document | Usage |
|----------|-------|
| [02_ANALYSE_CAUSE_RACINE.md](02_ANALYSE_CAUSE_RACINE.md) | Comprendre le problème |
| [03_CORRECTIF_APPLIQUE.md](03_CORRECTIF_APPLIQUE.md) | Voir le code modifié |
| [04_VALIDATION_DEMARRAGE_DERNIER_CHAT.md](04_VALIDATION_DEMARRAGE_DERNIER_CHAT.md) | Observation démarrage |
| [05_TEST_PERSISTANCE_PAR_USER.md](05_TEST_PERSISTANCE_PAR_USER.md) | Test multi-user |

---

**Statut** : 🟢 PRÊT POUR LES TESTS  
**Action immédiate** : Redémarrer l'application E-audit
