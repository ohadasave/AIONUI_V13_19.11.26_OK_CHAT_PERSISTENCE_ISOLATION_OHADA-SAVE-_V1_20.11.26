# Push vers AIONUI V7 - Instructions

## 🎯 Repository cible

**URL**: https://github.com/sekadalle2024/AIONUI_V7_15.11.26.git  
**Remote name**: `backup-v7`

---

## ⚡ Méthode rapide (Scripts automatisés)

### Option 1: Script Batch (RECOMMANDÉ)

```cmd
cd g:\Aionui_client
.\push_to_v7.bat
```

### Option 2: Script PowerShell

```powershell
cd g:\Aionui_client
.\push_to_backup_v7.ps1
```

---

## 📝 Méthode manuelle

Si vous préférez exécuter les commandes une par une:

```bash
# 1. Aller dans le répertoire
cd g:\Aionui_client

# 2. Vérifier l'état
git status

# 3. Ajouter les fichiers
git add .

# 4. Créer un commit
git commit -m "Sauvegarde AIONUI V7 - Documentation complète avec V5, V6 et V7"

# 5. Ajouter le remote backup-v7
git remote add backup-v7 https://github.com/sekadalle2024/AIONUI_V7_15.11.26.git

# 6. Push vers V7
git push -u backup-v7 HEAD
```

**Note**: Si le remote `backup-v7` existe déjà:
```bash
git remote remove backup-v7
git remote add backup-v7 https://github.com/sekadalle2024/AIONUI_V7_15.11.26.git
```

---

## 🔍 Vérification

Après le push, vérifiez que vos remotes sont correctement configurés:

```bash
git remote -v
```

Vous devriez voir:
```
backup      https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
backup-v6   https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git
backup-v7   https://github.com/sekadalle2024/AIONUI_V7_15.11.26.git
origin      https://github.com/sekadalle2024/Aionui_client_windows_11_19.03.26_V0-Public.git
upstream    https://github.com/iOfficeAI/AionUi.git
```

---

## 📊 Configuration finale

Après ce push, vous aurez **5 remotes** configurés:

| Remote | Repository | Usage |
|--------|------------|-------|
| `origin` | Aionui_client_windows_11_19.03.26_V0-Public | Principal |
| `backup` | AIONUI_V5_15.11.26 | Sauvegarde V5 |
| `backup-v6` | AIONUI_V6_15.11.26 | Sauvegarde V6 |
| `backup-v7` | AIONUI_V7_15.11.26 | Sauvegarde V7 (NOUVEAU) |
| `upstream` | iOfficeAI/AionUi | Source originale |

---

## 🚀 Futures sauvegardes vers V7

Pour les prochaines fois, utilisez simplement:

```bash
git push backup-v7 main
```

Ou avec le script:
```bash
.\push_to_v7.bat
```

---

## 💡 Stratégie multi-sauvegarde complète

**Vous disposez maintenant de 3 repositories de sauvegarde!**

```bash
# Vers V5
git push backup main

# Vers V6
git push backup-v6 main

# Vers V7
git push backup-v7 main

# Vers tous les remotes de sauvegarde (manuel)
git push backup main && git push backup-v6 main && git push backup-v7 main
```

**Avantages:**
- ✅ Triple redondance
- ✅ Sécurité maximale
- ✅ Versions multiples
- ✅ Flexibilité totale

---

## 🆘 En cas de problème

**Erreur d'authentification?**  
→ Voir `Doc push to github/MEMO_COMPLET_PUSH_GITHUB.md` section Troubleshooting

**Conflit?**
```bash
git pull backup-v7 main --rebase
git push backup-v7 main
```

---

**Créé le**: 15 Novembre 2026  
**Repository V7**: https://github.com/sekadalle2024/AIONUI_V7_15.11.26
