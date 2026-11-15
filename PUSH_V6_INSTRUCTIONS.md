# Push vers AIONUI V6 - Instructions

## 🎯 Repository cible

**URL**: https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git  
**Remote name**: `backup-v6`

---

## ⚡ Méthode rapide (Scripts automatisés)

### Option 1: Script Batch (RECOMMANDÉ)

```cmd
cd g:\Aionui_client
.\push_to_v6.bat
```

### Option 2: Script PowerShell

```powershell
cd g:\Aionui_client
.\push_to_backup_v6.ps1
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
git commit -m "Sauvegarde AIONUI V6 - Documentation Push GitHub complète"

# 5. Ajouter le remote backup-v6
git remote add backup-v6 https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git

# 6. Push vers V6
git push -u backup-v6 HEAD
```

**Note**: Si le remote `backup-v6` existe déjà:
```bash
git remote remove backup-v6
git remote add backup-v6 https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git
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
origin      https://github.com/sekadalle2024/Aionui_client_windows_11_19.03.26_V0-Public.git
upstream    https://github.com/iOfficeAI/AionUi.git
```

---

## 📊 Configuration finale

Après ce push, vous aurez **4 remotes** configurés:

| Remote | Repository | Usage |
|--------|------------|-------|
| `origin` | Aionui_client_windows_11_19.03.26_V0-Public | Principal |
| `backup` | AIONUI_V5_15.11.26 | Sauvegarde V5 |
| `backup-v6` | AIONUI_V6_15.11.26 | Sauvegarde V6 (NOUVEAU) |
| `upstream` | iOfficeAI/AionUi | Source originale |

---

## 🚀 Futures sauvegardes vers V6

Pour les prochaines fois, utilisez simplement:

```bash
git push backup-v6 main
```

Ou avec le script:
```bash
.\push_to_v6.bat
```

---

## 💡 Conseil

**Stratégie multi-sauvegarde**: Vous pouvez maintenant sauvegarder vers plusieurs repositories:

```bash
# Vers V5
git push backup main

# Vers V6
git push backup-v6 main

# Vers origin
git push origin main
```

---

## 🆘 En cas de problème

**Erreur d'authentification?**  
→ Voir `Doc push to github/MEMO_COMPLET_PUSH_GITHUB.md` section Troubleshooting

**Conflit?**
```bash
git pull backup-v6 main --rebase
git push backup-v6 main
```

---

**Créé le**: 15 Novembre 2026  
**Repository V6**: https://github.com/sekadalle2024/AIONUI_V6_15.11.26
