# Instructions de Sauvegarde AIONUI vers GitHub

## Repository cible
https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git

## Commandes à exécuter dans l'ordre

Ouvrez un terminal (PowerShell ou Git Bash) et exécutez les commandes suivantes:

### 1. Aller dans le répertoire du projet
```bash
cd g:\Aionui_client
```

### 2. Vérifier l'état actuel
```bash
git status
```

### 3. Ajouter tous les fichiers modifiés
```bash
git add .
```

### 4. Créer un commit
```bash
git commit -m "Sauvegarde AIONUI - Version du 2024"
```

### 5. Ajouter le remote de sauvegarde
```bash
git remote add backup https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
```

**Note:** Si le remote `backup` existe déjà, supprimez-le d'abord:
```bash
git remote remove backup
git remote add backup https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
```

### 6. Vérifier les remotes configurés
```bash
git remote -v
```

Vous devriez voir:
- `origin` → votre repository n8n_node original
- `backup` → le nouveau repository de sauvegarde

### 7. Vérifier la branche courante
```bash
git branch
```

### 8. Push vers le repository de sauvegarde
```bash
git push -u backup HEAD
```

**Note:** `HEAD` pousse automatiquement la branche courante, quelle qu'elle soit.

---

## Alternative: Si vous voulez remplacer complètement le remote origin

Si vous voulez que ce nouveau repository devienne votre remote principal:

```bash
# Changer l'URL du remote origin
git remote set-url origin https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git

# Vérifier
git remote -v

# Push
git push -u origin HEAD
```

---

## En cas d'erreur d'authentification

Si GitHub demande une authentification:

1. **Avec Personal Access Token (PAT):**
   ```bash
   git push -u backup HEAD
   # Username: sekadalle2024
   # Password: [votre PAT GitHub]
   ```

2. **Ou utilisez l'URL avec token:**
   ```bash
   git remote set-url backup https://[TOKEN]@github.com/sekadalle2024/AIONUI_V5_15.11.26.git
   git push -u backup HEAD
   ```

---

## Vérification finale

Après le push, vérifiez sur GitHub que votre code est bien présent:
https://github.com/sekadalle2024/AIONUI_V5_15.11.26

---

## Scripts automatisés disponibles

J'ai créé deux scripts pour automatiser le processus:

1. **push_to_github.bat** - Script Windows Batch
2. **push_to_github.ps1** - Script PowerShell

Pour les utiliser:
```powershell
# Batch
.\push_to_github.bat

# PowerShell
.\push_to_github.ps1
```
