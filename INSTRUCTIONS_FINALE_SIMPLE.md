# 🚀 INSTRUCTIONS FINALES - LANCEMENT APPLICATION

**Date** : 16 novembre 2026, 18:50  
**Status** : Node.js 24 requis par package.json  
**Solution** : Script automatisé créé

---

## ✅ MÉTHODE SIMPLE (RECOMMANDÉE)

### Double-cliquez sur ce fichier :

📁 `G:\Aionui_client\LANCER_NODE24.bat`

**C'EST TOUT !**

Le script va :
1. Activer Node.js 24
2. Vérifier les versions
3. Lancer l'application

---

## 🔧 MÉTHODE MANUELLE

Si le script ne marche pas, exécutez dans PowerShell :

```powershell
# 1. Activer Node 24
nvm use 24.21.0

# 2. Aller dans le projet
cd G:\Aionui_client

# 3. Lancer
node node_modules\electron-vite\bin\electron-vite.js dev
```

---

## 👤 CREDENTIALS ADMIN

Une fois l'application ouverte :

```
Email: ohada.save@gmail.com
Password: LEADER00
```

---

## 🆘 SI ERREUR @babel/core

Si l'application dit "@babel/core not found" :

```powershell
npm install @babel/core --save-dev --legacy-peer-deps
```

Puis relancez `LANCER_NODE24.bat`

---

## 📊 VÉRIFICATIONS RAPIDES

### Vérifier Node.js

```powershell
nvm list
```

Devrait montrer :
- 24.21.0 (installé)
- 22.22.0 (installé)  
- 20.20.2 (installé)

### Activer manuellement

```powershell
nvm use 24.21.0
node -v
# Doit afficher: v24.21.0
```

---

## 🎯 RÉSUMÉ

**Fichier à double-cliquer** : `LANCER_NODE24.bat`

**OU commandes manuelles** :
```
nvm use 24.21.0
cd G:\Aionui_client
node node_modules\electron-vite\bin\electron-vite.js dev
```

---

## 💡 POURQUOI Node.js 24 ?

Votre `package.json` demande :

```json
{
  "engines": {
    "node": ">=22 <25"
  }
}
```

- Node.js 24 ✅ (dans la range)
- Node.js 20 ❌ (trop ancien)

---

**Dernière mise à jour** : 16 novembre 2026, 18:50  
**Action** : Double-cliquez sur `LANCER_NODE24.bat`  
