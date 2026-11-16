# Commandes Rapides - AionUi SaaS

**Référence rapide des commandes PowerShell utiles**

---

## 🔧 Installation

### Option 1 : Node.js 20 LTS (Recommandé)

```powershell
# Avec nvm4w
nvm install 20
nvm use 20
node -v  # Vérifier version

# Installer packages
cd G:\Aionui_client
npm cache clean --force
npm install

# Lancer
npm run start
```

### Option 2 : Script Automatisé

```powershell
cd G:\Aionui_client
.\INSTALL_FINAL_CLEAN.ps1
```

### Option 3 : Yarn

```powershell
npm install -g yarn
cd G:\Aionui_client
Remove-Item -Recurse -Force node_modules
yarn install
yarn start
```

---

## 🚀 Lancement Application

### Electron (App Desktop)

```powershell
cd G:\Aionui_client
npm run start
```

### WebUI (Navigateur)

```powershell
cd G:\Aionui_client
npm run webui
# Ouvrir: http://localhost:25808
```

---

## 🧹 Nettoyage

### Nettoyer Cache npm

```powershell
npm cache clean --force
```

### Supprimer node_modules

```powershell
# Méthode 1 : Simple
Remove-Item -Recurse -Force node_modules

# Méthode 2 : Robocopy (si verrouillé)
mkdir empty_temp
robocopy empty_temp node_modules /MIR /R:1 /W:1
Remove-Item -Recurse -Force node_modules, empty_temp
```

### Nettoyer Tout

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
```

---

## 🔍 Vérifications

### Vérifier Installation

```powershell
# Node.js version
node -v

# npm version
npm -v

# Packages installés
(Get-ChildItem node_modules -Directory).Count

# Electron existe?
Test-Path node_modules\.bin\electron.cmd

# electron-vite existe?
Test-Path node_modules\.bin\electron-vite.cmd
```

### Vérifier Processus en Cours

```powershell
# npm ou node actif?
Get-Process npm,node -ErrorAction SilentlyContinue

# Détails des processus
Get-Process npm,node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,CPU
```

### Surveiller Installation npm

```powershell
# Voir logs en temps réel
Get-Content npm-install-clean.log -Tail 10 -Wait

# Compter packages pendant installation
while ($true) {
    $count = (Get-ChildItem node_modules -Directory -ErrorAction SilentlyContinue).Count
    Write-Host "Packages: $count"
    Start-Sleep -Seconds 10
}
```

---

## 🧪 Tests

### Lancer Tests

```powershell
cd G:\Aionui_client

# Tous les tests
npm run test

# Tests en mode watch
npm run test:watch

# Tests avec coverage
npm run test:coverage

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

---

## 🔨 Build et Compilation

### Build pour Production

```powershell
# Compiler
npm run package

# Build complet
npm run build
```

### Linter et Formatter

```powershell
# ESLint
npm run lint

# Auto-fix lint
npm run lint:fix

# Prettier
npm run format
```

---

## 📊 Diagnostics

### Vérifier État Projet

```powershell
# Espace disque node_modules
if (Test-Path node_modules) {
    $size = (Get-ChildItem node_modules -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "node_modules: $([math]::Round($size, 2)) GB"
}

# Derniers logs npm
Get-ChildItem C:\temp\npm-cache-aionui\_logs\ -Filter "*debug*.log" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1 |
    ForEach-Object { Get-Content $_.FullName -Tail 20 }
```

### Vérifier Database

```powershell
# Si sqlite3 installé
sqlite3 user_data/aionui.db "SELECT * FROM users;"
sqlite3 user_data/aionui.db "SELECT COUNT(*) FROM audit_log;"
```

---

## 👤 Admin CLI

### Créer Admin

```powershell
cd G:\Aionui_client
npx tsx scripts/create-admin.ts
```

### Avec Paramètres

```powershell
# Créer admin directement
npx tsx scripts/create-admin.ts --email admin@example.com --password SecurePass123!
```

---

## 🔐 Credentials

### Admin Par Défaut

```
Email: ohada.save@gmail.com
Password: LEADER00
```

### Tester Login WebUI

```powershell
# Lancer WebUI
npm run webui

# Dans navigateur: http://localhost:25808
# Login avec credentials ci-dessus
```

---

## 🌐 Git

### Status et Diff

```powershell
# Status
git status

# Voir changements
git diff

# Logs
git log --oneline -10
```

### Commit et Push

```powershell
# Ajouter fichiers
git add .

# Commit
git commit -m "type(scope): message"

# Push
git push backup-v7 main
```

---

## 📝 Logs

### Voir Logs Application

```powershell
# Logs npm install
Get-Content npm-install-clean.log -Tail 50

# Logs npm debug
$latest = Get-ChildItem C:\temp\npm-cache-aionui\_logs\ -Filter "*debug*.log" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1
Get-Content $latest.FullName
```

---

## 🆘 Dépannage

### Réinstaller Electron

```powershell
npm install electron --force
npm rebuild electron
```

### Réinstaller electron-vite

```powershell
npm install electron-vite --force --save-dev
```

### Rebuild Complet

```powershell
npm rebuild
npm run package
```

### Si Tout Échoue

```powershell
# Nettoyage total
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
Remove-Item -Recurse -Force C:\temp\npm-cache-aionui

# Réinstaller avec Node 20
nvm use 20
npm install
```

---

## 📚 Documentation

### Ouvrir Documents Clés

```powershell
# Éditeur par défaut
notepad LISEZ_MOI_EN_PREMIER.md

# VS Code (si installé)
code INDEX_DOCUMENTATION.md
code Doc_Saas_Multi_User\MEMO_PROGRESSION_COMPLETE.md
```

---

## 🎯 Workflow Complet

### Démarrage Journée

```powershell
cd G:\Aionui_client
git pull backup-v7 main
npm run start
```

### Fin Développement

```powershell
npm run lint:fix
npm run test
git add .
git commit -m "feat: description"
git push backup-v7 main
```

---

## 💡 Astuces

### Alias PowerShell (Optionnel)

Ajouter dans `$PROFILE` :

```powershell
# Ouvrir profil
notepad $PROFILE

# Ajouter ces lignes:
function aionui-start { cd G:\Aionui_client; npm run start }
function aionui-webui { cd G:\Aionui_client; npm run webui }
function aionui-test { cd G:\Aionui_client; npm run test }
function aionui-clean { cd G:\Aionui_client; Remove-Item -Recurse -Force node_modules; npm cache clean --force }
```

Utilisation :

```powershell
aionui-start    # Lance l'app
aionui-webui    # Lance WebUI
aionui-test     # Lance tests
aionui-clean    # Nettoie
```

---

## 📞 Références

**Docs** : `INDEX_DOCUMENTATION.md`  
**Installation** : `LISEZ_MOI_EN_PREMIER.md`  
**Problèmes** : `SITUATION_ACTUELLE_ET_OPTIONS.md`

---

**Dernière mise à jour** : 16 novembre 2026
