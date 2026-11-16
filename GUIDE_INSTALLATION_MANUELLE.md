# Guide d'Installation Manuelle - AionUi

**Problème** : `node_modules` corrompu, installation npm bloquée  
**Solution** : Installation manuelle étape par étape

---

## 🔧 Méthode 1 : Nettoyage Complet (RECOMMANDÉ)

### Étape 1 : Fermer Tous les Terminaux

Fermez **tous** les terminaux PowerShell/CMD ouverts.

### Étape 2 : Supprimer Manuellement

1. Ouvrir l'Explorateur Windows
2. Naviguer vers `G:\Aionui_client`
3. Supprimer **manuellement** le dossier `node_modules` (peut prendre 2-3 minutes)
   - Si Windows dit "fichier utilisé", redémarrer le PC
4. Supprimer `package-lock.json`

### Étape 3 : Vider le Cache npm

Ouvrir un **nouveau** PowerShell :
```powershell
cd G:\Aionui_client
npm cache clean --force
npm cache verify
```

### Étape 4 : Réinstaller

```powershell
npm install
```

⏱️ **Durée estimée** : 10-15 minutes

### Étape 5 : Vérifier

```powershell
dir node_modules\.bin\electron*
```

Devrait afficher :
- `electron.cmd`
- `electron-vite.cmd`

### Étape 6 : Lancer

```powershell
npm run start
```

---

## 🚀 Méthode 2 : Utiliser Yarn (Plus Rapide)

### Installation de Yarn

```powershell
npm install -g yarn
```

### Nettoyage

```powershell
# Supprimer node_modules manuellement dans l'Explorateur
# Puis :
yarn cache clean
```

### Installation

```powershell
yarn install
```

⏱️ **Durée estimée** : 5-8 minutes (plus rapide que npm)

### Lancer

```powershell
yarn start
```

---

## 🔍 Méthode 3 : Installation Sélective

Si les méthodes 1 et 2 échouent, installez uniquement les packages critiques :

### Étape 1 : Supprimer node_modules

Manuellement dans l'Explorateur Windows.

### Étape 2 : Installer Electron et Vite d'abord

```powershell
npm install electron@37 electron-vite@5 --save-dev
```

### Étape 3 : Installer le Reste

```powershell
npm install --ignore-scripts
```

### Étape 4 : Rebuild Natifs

```powershell
npm rebuild @parcel/watcher --force
npm rebuild esbuild --force
```

---

## ❌ Dépannage

### Erreur "node-gyp"

```powershell
npm install -g node-gyp@latest
npm config set node_gyp "C:\Users\LEADER\AppData\Roaming\npm\node_modules\node-gyp\bin\node-gyp.js"
```

### Erreur "semver"

```powershell
npm install semver@latest --save-dev
```

### Timeout pendant npm install

Augmenter le timeout :
```powershell
npm config set fetch-timeout 600000
npm config set timeout 600000
npm install
```

### node_modules ne se supprime pas

**Méthode Windows** :
1. Télécharger [Unlocker](https://www.iobit.com/en/iobit-unlocker.php)
2. Clic droit sur `node_modules` → Unlocker → Supprimer

**Méthode CMD (Admin)** :
```cmd
cd G:\Aionui_client
rmdir /s /q node_modules
```

**Méthode Robocopy** (déjà dans le script) :
```powershell
.\scripts\force-clean-node-modules.ps1
```

---

## ✅ Vérification Finale

Une fois l'installation terminée :

### 1. Vérifier les Binaires

```powershell
Test-Path node_modules\.bin\electron.cmd
Test-Path node_modules\.bin\electron-vite.cmd
```

Les deux doivent retourner `True`.

### 2. Vérifier le Nombre de Packages

```powershell
(Get-ChildItem node_modules -Directory).Count
```

Devrait être ~1200-1300.

### 3. Lancer l'Application

**Desktop** :
```powershell
npm run start
```

**WebUI** :
```powershell
npm run webui
# Ouvrir : http://localhost:25808
```

### 4. Tester les 5 Corrections

**Credentials** :
- Email : `ohada.save@gmail.com`
- Password : `LEADER00`

**Tests** :
1. ✅ Clic Admin → va vers `/admin/users`
2. ✅ Login → retourne au dernier chat
3. ✅ Back button → retourne au dernier chat
4. ✅ Google OAuth désactivé en WebUI
5. ✅ Gemini send button fonctionne

---

## 🆘 Dernière Option : Cloner à Nouveau

Si tout échoue, cloner une copie fraîche :

```powershell
cd G:\
git clone G:\Aionui_client Aionui_client_fresh
cd Aionui_client_fresh
npm install
npm run start
```

---

## 📞 État Actuel

**Ce qui fonctionne** :
- ✅ Code source complet (16 commits)
- ✅ Toutes les corrections committées
- ✅ Documentation complète

**Ce qui bloque** :
- ❌ Installation npm corrompue
- ❌ Dossier `.bin` manquant
- ❌ Erreurs node-gyp/semver

**Solution** : Suivre **Méthode 1** (nettoyage complet manuel)

---

**Temps estimé pour résoudre** : 15-20 minutes avec Méthode 1 ou 2

**Important** : Tous vos changements de code sont sauvegardés dans Git. Même si vous devez recréer `node_modules`, le code est intact.
