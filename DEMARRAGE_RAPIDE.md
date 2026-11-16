# 🚀 Guide de Démarrage Rapide - AionUi WebUI

## ✅ Ce Qui Est Fait

Les **5 problèmes WebUI** sont tous corrigés et sauvegardés :
- ✅ Admin menu redirect
- ✅ Login redirect vers dernier chat
- ✅ Bouton "Back to Chat"
- ✅ Google OAuth (désactivé en WebUI)
- ✅ Gemini message bloquant

**Tous les commits sont sauvegardés dans Git** 🎉

## 🔧 Réparer l'Environnement (1 commande)

Après le redémarrage de votre PC, l'environnement Node.js a besoin d'être réparé.

### Solution Automatique

```powershell
.\scripts\repair-dev-environment.ps1
```

Ce script va :
1. Nettoyer `node_modules/` et `package-lock.json`
2. Vider le cache npm
3. Réinstaller toutes les dépendances
4. Vérifier que tout est OK

**⏱️ Durée estimée : 5-10 minutes**

---

### Solution Manuelle (Si le script ne marche pas)

```powershell
# Nettoyer
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force

# Réinstaller
npm cache clean --force
npm install

# Vérifier
npm run start
```

---

## 🎯 Lancer l'Application

Une fois l'environnement réparé :

### Option 1 : Application Desktop (Recommandé pour tester)
```powershell
npm run start
```
L'application Electron s'ouvrira automatiquement.

### Option 2 : Serveur WebUI
```powershell
npm run webui
```
Puis ouvrir : **http://localhost:25808**

---

## 🧪 Tests à Effectuer

### Credentials Admin
- **Email** : `ohada.save@gmail.com`
- **Password** : `LEADER00`

### Checklist des 5 Corrections

1. **Test Login Redirect**
   - Se déconnecter puis se reconnecter
   - ✅ Devrait aller vers dernier chat (pas `/guid`)

2. **Test Admin Navigation**
   - Aller dans Settings → Admin
   - ✅ Devrait afficher la page admin (pas retour accueil)

3. **Test Back Button**
   - Depuis la page admin, cliquer sur le bouton retour
   - ✅ Devrait retourner au dernier chat

4. **Test Google OAuth**
   - Aller dans Settings → Gemini
   - ✅ Bouton "Connect Google" devrait être désactivé avec tooltip

5. **Test Gemini Send**
   - Ajouter une clé API Gemini active
   - Essayer d'envoyer un message
   - ✅ Devrait s'envoyer sans message bloquant "Model list will be available"

---

## 📊 État Git

```bash
# Commits locaux non pushés : 8
git log --oneline -8

afdceddf feat: add dev environment repair script
9a6c24aa docs: add status report after PC restart
ade83741 chore: replace js-cookie with document.cookie
12052fc7 fix(webui): resolve remaining 2 issues
f2f47de8 fix(webui): resolve 3 critical navigation issues
f432caee feat(auth): redirect to last chat after login
432d5f3e fix(sider): back button returns to last chat
f470bacb fix(router): correct admin navigation redirect
```

### Pour Pusher sur le Remote

```powershell
git push backup-v7 main
```

---

## 🆘 En Cas de Problème

### Le script repair ne marche pas

Essayez avec Bun (plus rapide) :
```powershell
bun install
bun run start
```

### Node.js/npm ne fonctionne pas

Vérifier les versions :
```powershell
node --version  # Attendu: v24.21.0
npm --version   # Attendu: 11.19.0
```

Si incorrectes, réinstaller avec nvm :
```powershell
nvm install 24.21.0
nvm use 24.21.0
```

### L'application ne démarre toujours pas

1. Vérifier les logs d'erreur dans le terminal
2. Vérifier que le port 25808 n'est pas déjà utilisé
3. Redémarrer le PC si nécessaire

---

## 📋 Prochaines Étapes (Optionnel)

Après validation des 5 corrections :

1. **Phase 5 SaaS** : Retirer le fallback `defaultUserId`
2. **Phase 6 SaaS** : Vérification finale multi-users
3. **Documentation** : Finaliser les guides
4. **Déploiement** : Préparer pour production

---

## 📞 Résumé Ultra-Rapide

```powershell
# 1. Réparer l'environnement
.\scripts\repair-dev-environment.ps1

# 2. Lancer l'app
npm run start

# 3. Tester avec admin
# Email: ohada.save@gmail.com
# Pass: LEADER00

# 4. Vérifier les 5 corrections fonctionnent

# 5. Pusher si tout est OK
git push backup-v7 main
```

---

**💡 Tout est sauvegardé dans Git. Pas de panique !**
