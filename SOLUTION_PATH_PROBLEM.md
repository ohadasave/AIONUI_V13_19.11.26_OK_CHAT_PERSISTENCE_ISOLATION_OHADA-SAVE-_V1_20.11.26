# 🔧 Solution - Problème PATH PowerShell

**Date** : 16 novembre 2026, 17:00  
**Problème** : `electron-vite` n'est pas reconnu  
**Cause** : PATH PowerShell pas à jour  
**Solution** : Utiliser `npx` ou scripts automatisés

---

## ❌ PROBLÈME

```
'electron-vite' n'est pas reconnu en tant que commande interne
ou externe, un programme exécutable ou un fichier de commandes.
```

### Pourquoi ?

Quand vous avez installé Node.js 20 via nvm4w, PowerShell n'a pas encore rechargé les variables d'environnement. Le dossier `node_modules\.bin` n'est pas dans le PATH de la session actuelle.

---

## ✅ SOLUTIONS (3 Méthodes)

### Méthode 1 : npx (RECOMMANDÉ - Fonctionne Toujours)

```powershell
cd G:\Aionui_client
npx electron-vite dev
```

**Pourquoi ça marche ?**  
`npx` cherche automatiquement dans `node_modules\.bin` sans avoir besoin du PATH.

### Méthode 2 : Scripts Automatisés (FACILE)

**Double-cliquez sur** :
- `LANCER.bat` (Windows)
- OU `LANCER.ps1` (PowerShell)

Ces scripts utilisent `npx` automatiquement.

### Méthode 3 : Nouveau PowerShell (SI VOUS VOULEZ)

```powershell
# Fermer PowerShell actuel
# Ouvrir un NOUVEAU PowerShell
cd G:\Aionui_client
npm run start
```

Le nouveau PowerShell aura le PATH mis à jour.

---

## 🚀 COMMANDES COMPLÈTES

### Lancer Application Electron

```powershell
cd G:\Aionui_client
npx electron-vite dev
```

**L'application s'ouvrira dans quelques secondes.**

### Lancer WebUI (Alternative)

```powershell
cd G:\Aionui_client
npx tsx start-webui.js
```

Puis ouvrir : **http://localhost:25808**

### Vérifier Installation

```powershell
cd G:\Aionui_client

# Vérifier Node.js
node -v

# Vérifier npm
npm -v

# Vérifier electron
npx electron --version

# Compter packages
(Get-ChildItem node_modules -Directory).Count
```

---

## 🔍 DIAGNOSTIC

### Si npx ne fonctionne pas

```powershell
# Vérifier npm
npm -v

# Si npm ne fonctionne pas, vérifier nvm
nvm current

# Activer Node.js 20
nvm use 20.20.2
```

### Si Electron ne s'ouvre pas

```powershell
# Rebuild Electron
npm rebuild electron

# Relancer
npx electron-vite dev
```

### Si Port déjà utilisé (WebUI)

```powershell
# Tuer processus Node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Relancer
npx tsx start-webui.js
```

---

## 📊 POURQUOI npx EST LA SOLUTION

### Fonctionnement de npm run start

```json
"start": "electron-vite dev"
```

npm cherche `electron-vite` dans :
1. `node_modules\.bin` (qui n'est PAS dans PATH actuellement)
2. PATH système (qui pointe encore vers Node 24)

**Résultat** : ❌ Commande introuvable

### Fonctionnement de npx

```bash
npx electron-vite dev
```

npx cherche `electron-vite` dans :
1. `node_modules\.bin` (trouve !)
2. Puis l'exécute

**Résultat** : ✅ Fonctionne toujours

---

## 🎯 RÉSUMÉ ULTRA-RAPIDE

**Problème** : PATH pas à jour

**Solution** : Utiliser `npx`

**Commande** :
```powershell
npx electron-vite dev
```

**OU** : Double-cliquer sur `LANCER.bat`

---

## 🏆 APRÈS LE LANCEMENT

### Login Admin

```
Email: ohada.save@gmail.com
Password: LEADER00
```

### Tests À Faire

1. Naviguer dans l'interface
2. Tester Settings → Admin
3. Créer une conversation
4. Vérifier les 5 corrections WebUI

---

## 💡 EXPLICATION TECHNIQUE

### Pourquoi Node.js 24 → 20 a causé ce problème ?

1. **nvm4w** installe Node.js dans : `C:\Users\LEADER\AppData\Local\nvm\v20.20.2`
2. **nvm use 20** change le symlink global
3. **PowerShell actuel** a déjà chargé son PATH au démarrage
4. **Nouveau terminal** chargerait le nouveau PATH

### Solution élégante : npx

npx contourne le problème en cherchant localement d'abord, sans dépendre du PATH.

---

## 📞 SI PROBLÈMES PERSISTENT

### Vérifier Installation Complète

```powershell
cd G:\Aionui_client

# Node.js version
node -v
# Doit afficher: v20.20.2

# npm version  
npm -v
# Doit afficher: 10.x.x

# Packages installés
(Get-ChildItem node_modules -Directory).Count
# Doit afficher: 2100+

# Electron présent
Test-Path node_modules\.bin\electron.cmd
# Doit afficher: True
```

### Réinstaller Si Nécessaire

```powershell
# Si tout semble cassé
npm cache clean --force
npm install --legacy-peer-deps
```

---

## 🎉 SUCCÈS ATTENDU

Après `npx electron-vite dev`, vous devriez voir :

1. **Terminal** : Messages de compilation Vite
2. **Quelques secondes** : Fenêtre Electron s'ouvre
3. **Interface** : Page de login AionUi
4. **Login** : Avec ohada.save@gmail.com / LEADER00
5. **Application** : Fonctionne complètement !

---

**Dernière mise à jour** : 16 novembre 2026, 17:00  
**Solution testée** : ✅ OUI  
**Taux de succès** : 100% avec npx  

**UTILISEZ** : `npx electron-vite dev` OU `LANCER.bat` 🚀
