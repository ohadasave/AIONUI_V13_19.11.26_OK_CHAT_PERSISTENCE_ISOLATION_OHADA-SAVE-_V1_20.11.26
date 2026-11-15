# MÉMO COMPLET - Push GitHub pour AIONUI

**Date**: 15 Novembre 2026  
**Projet**: AIONUI Client  
**Repository cible**: https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git

---

## 📋 Table des matières

1. [Problèmes rencontrés](#problèmes-rencontrés)
2. [Solution finale](#solution-finale)
3. [Procédure de push](#procédure-de-push)
4. [Scripts disponibles](#scripts-disponibles)
5. [Configuration des remotes](#configuration-des-remotes)
6. [Bonnes pratiques](#bonnes-pratiques)
7. [Troubleshooting](#troubleshooting)

---

## 🚨 Problèmes rencontrés

### Problème #1: Échec d'exécution des commandes PowerShell via l'agent IA

**Symptômes:**
- Toutes les commandes PowerShell retournaient `Exit Code: -1`
- Aucune sortie visible dans les logs
- Impossible d'exécuter `git status`, `git branch`, etc.

**Cause:**
- Problème d'environnement d'exécution entre l'agent IA et le shell PowerShell
- Possiblement lié aux permissions ou au contexte d'exécution

**Solution:**
- Création de scripts autonomes (`.bat` et `.ps1`) 
- Exécution manuelle par l'utilisateur dans son propre terminal
- ✅ **Résultat**: Scripts fonctionnels lors de l'exécution manuelle

### Problème #2: Submodule py_backend avec contenu non tracké

**Symptômes:**
```
modified:   py_backend (untracked content)
```

**Cause:**
- Le submodule `py_backend` contient des modifications non committées
- Git ne peut pas ajouter automatiquement les changements dans un submodule

**Solution partielle:**
- Le push a réussi sans inclure les changements du submodule
- Documentation créée pour gérer ce cas ultérieurement

**À faire si nécessaire:**
```bash
cd py_backend
git add .
git commit -m "Update py_backend"
cd ..
git add py_backend
git commit -m "Update py_backend submodule reference"
git push backup main
```

---

## ✅ Solution finale

### Approche retenue: Stratégie multi-remote

Au lieu de remplacer le remote `origin` existant, nous avons créé un remote `backup` dédié aux sauvegardes.

**Avantages:**
- ✅ Préserve la configuration existante (`origin`, `upstream`)
- ✅ Permet plusieurs sauvegardes vers différents repositories
- ✅ Pas de risque de conflit avec le workflow existant
- ✅ Facilite les sauvegardes incrémentielles

**Configuration finale:**
```
origin   → https://github.com/sekadalle2024/Aionui_client_windows_11_19.03.26_V0-Public.git
backup   → https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
upstream → https://github.com/iOfficeAI/AionUi.git
```

---

## 📝 Procédure de push

### Méthode 1: Utilisation du script automatisé (RECOMMANDÉ)

```powershell
# Ouvrir PowerShell dans le répertoire du projet
cd g:\Aionui_client

# Exécuter le script
.\push_to_github.ps1
```

Le script va:
1. Afficher l'état Git actuel
2. Ajouter tous les fichiers modifiés (`git add .`)
3. Demander un message de commit
4. Créer le commit
5. Configurer le remote `backup` (si nécessaire)
6. Push vers GitHub

### Méthode 2: Commandes manuelles

```bash
# 1. Se placer dans le répertoire
cd g:\Aionui_client

# 2. Vérifier l'état
git status

# 3. Ajouter les fichiers
git add .

# 4. Créer un commit
git commit -m "Sauvegarde AIONUI - [Description]"

# 5. Vérifier le remote (première fois)
git remote -v

# 6. Ajouter le remote backup (si pas déjà fait)
git remote add backup https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git

# 7. Push vers le repository de sauvegarde
git push backup main
```

### Méthode 3: Push vers un nouveau repository

Si vous voulez créer une nouvelle sauvegarde vers un autre repository:

```bash
# Ajouter un nouveau remote (exemple: backup2)
git remote add backup2 https://github.com/sekadalle2024/NOUVEAU_REPO.git

# Push vers ce nouveau remote
git push backup2 main
```

---

## 📜 Scripts disponibles

### Script 1: `push_to_github.ps1` (PowerShell)

**Localisation**: `g:\Aionui_client\push_to_github.ps1`

**Fonctionnalités:**
- ✅ Interface colorée et conviviale
- ✅ Affichage détaillé de chaque étape
- ✅ Demande de confirmation pour le message de commit
- ✅ Gestion automatique du remote `backup`
- ✅ Affichage du statut final

**Utilisation:**
```powershell
.\push_to_github.ps1
```

### Script 2: `push_to_github.bat` (Batch)

**Localisation**: `g:\Aionui_client\push_to_github.bat`

**Fonctionnalités:**
- ✅ Compatible avec tous les terminaux Windows
- ✅ Même fonctionnalité que le script PowerShell
- ✅ Plus simple, pas de restriction ExecutionPolicy

**Utilisation:**
```cmd
.\push_to_github.bat
```

### Script 3: `INSTRUCTIONS_PUSH_GITHUB.md`

**Localisation**: `g:\Aionui_client\INSTRUCTIONS_PUSH_GITHUB.md`

**Contenu:**
- Instructions manuelles pas à pas
- Gestion des erreurs d'authentification
- Alternative pour remplacer le remote origin
- Conseils de vérification

---

## 🔧 Configuration des remotes

### État actuel

```bash
git remote -v
```

**Sortie:**
```
backup   https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git (fetch)
backup   https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git (push)
origin   https://github.com/sekadalle2024/Aionui_client_windows_11_19.03.26_V0-Public.git (fetch)
origin   https://github.com/sekadalle2024/Aionui_client_windows_11_19.03.26_V0-Public.git (push)
upstream https://github.com/iOfficeAI/AionUi.git (fetch)
upstream https://github.com/iOfficeAI/AionUi.git (push)
```

### Gestion des remotes

#### Ajouter un remote
```bash
git remote add <nom> <url>
```

#### Supprimer un remote
```bash
git remote remove <nom>
```

#### Modifier l'URL d'un remote
```bash
git remote set-url <nom> <nouvelle-url>
```

#### Renommer un remote
```bash
git remote rename <ancien-nom> <nouveau-nom>
```

---

## 📌 Bonnes pratiques

### Messages de commit

**Format recommandé:**
```
<type>(<scope>): <subject>

[body optionnel]
```

**Types:**
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `refactor`: Refactorisation
- `chore`: Tâches de maintenance
- `docs`: Documentation
- `test`: Tests
- `style`: Formatage

**Exemples:**
```bash
git commit -m "feat(n8n): add new SendBox component"
git commit -m "fix(webui): correct modal z-index issue"
git commit -m "chore: update dependencies"
```

### Workflow de sauvegarde recommandé

1. **Avant de commencer une session de travail:**
   ```bash
   git pull backup main  # Récupérer les dernières modifications
   ```

2. **Pendant le travail:**
   - Faire des commits fréquents et atomiques
   - Messages de commit clairs et descriptifs

3. **Fin de session:**
   ```bash
   git push backup main  # Sauvegarder sur GitHub
   ```

4. **Sauvegarde hebdomadaire:**
   - Créer un tag pour marquer les versions importantes
   ```bash
   git tag -a v1.0.0 -m "Version 1.0.0 - Description"
   git push backup --tags
   ```

### Vérifications avant push

```bash
# 1. Vérifier les fichiers modifiés
git status

# 2. Vérifier les différences
git diff

# 3. Vérifier l'historique
git log --oneline -5

# 4. Vérifier la branche
git branch
```

---

## 🔍 Troubleshooting

### Problème: Erreur d'authentification

**Symptôme:**
```
fatal: Authentication failed
```

**Solutions:**

1. **Utiliser un Personal Access Token (PAT):**
   - Aller sur GitHub → Settings → Developer settings → Personal access tokens
   - Générer un nouveau token avec les permissions `repo`
   - Utiliser le token comme mot de passe lors du push

2. **Configurer le token dans l'URL:**
   ```bash
   git remote set-url backup https://[TOKEN]@github.com/sekadalle2024/AIONUI_V5_15.11.26.git
   ```

3. **Utiliser Git Credential Manager:**
   ```bash
   git config --global credential.helper manager
   ```

### Problème: Conflit lors du push

**Symptôme:**
```
! [rejected] main -> main (non-fast-forward)
```

**Solutions:**

1. **Pull puis push:**
   ```bash
   git pull backup main --rebase
   git push backup main
   ```

2. **Force push (ATTENTION: écrase l'historique distant):**
   ```bash
   git push backup main --force
   ```
   ⚠️ À utiliser uniquement si vous êtes sûr !

### Problème: Fichiers volumineux

**Symptôme:**
```
remote: error: File xxx is 100.00 MB; this exceeds GitHub's file size limit
```

**Solutions:**

1. **Utiliser Git LFS:**
   ```bash
   git lfs install
   git lfs track "*.psd"
   git add .gitattributes
   git commit -m "Add Git LFS tracking"
   ```

2. **Ajouter au .gitignore:**
   ```bash
   echo "fichier_volumineux.zip" >> .gitignore
   git rm --cached fichier_volumineux.zip
   git commit -m "Remove large file"
   ```

### Problème: Submodule avec modifications

**Symptôme:**
```
modified: py_backend (untracked content)
```

**Solution:**
```bash
# Entrer dans le submodule
cd py_backend

# Committer les changements dans le submodule
git add .
git commit -m "Update submodule content"

# Revenir au projet principal
cd ..

# Mettre à jour la référence du submodule
git add py_backend
git commit -m "Update py_backend submodule reference"

# Push les deux
git push backup main
cd py_backend
git push
cd ..
```

### Problème: Branche désynchronisée

**Symptôme:**
```
Your branch and 'backup/main' have diverged
```

**Solution:**
```bash
# Voir les différences
git log --oneline --graph --all

# Option 1: Merge
git pull backup main

# Option 2: Rebase (historique plus propre)
git pull backup main --rebase
```

---

## 📊 Historique des sauvegardes

### Première sauvegarde réussie

**Date:** 15 Novembre 2026  
**Commit:** `e48489e9`  
**Message:** "HELLOO"  
**Fichiers modifiés:** 
- `src/renderer/pages/conversation/n8n/N8nSendBox.tsx`

**Résultat:**
```
Enumerating objects: 15, done.
Counting objects: 100% (15/15), done.
Delta compression using up to 8 threads
Compressing objects: 100% (8/8), done.
Writing objects: 100% (8/8), 776 bytes | 388.00 KiB/s, done.
Total 8 (delta 6), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (6/6), completed with 6 local objects.
To https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
   ae47ebce..e48489e9  HEAD -> main
```

✅ **Succès total**

---

## 🎯 Checklist rapide pour chaque sauvegarde

- [ ] `cd g:\Aionui_client`
- [ ] `git status` (vérifier l'état)
- [ ] `git add .` (ajouter les fichiers)
- [ ] `git commit -m "Message clair"` (créer le commit)
- [ ] `git push backup main` (push vers GitHub)
- [ ] Vérifier sur GitHub que le code est bien présent

---

## 📞 Contacts et ressources

**Repositories:**
- **Backup actuel:** https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
- **Origin:** https://github.com/sekadalle2024/Aionui_client_windows_11_19.03.26_V0-Public.git
- **Upstream:** https://github.com/iOfficeAI/AionUi.git

**Documentation Git:**
- https://git-scm.com/docs
- https://docs.github.com/

**Documentation projet:**
- `AGENTS.md` - Guide du projet
- `docs/tech/architecture.md` - Architecture technique

---

## 📝 Notes additionnelles

### Sécurité

- ⚠️ Ne jamais committer de tokens, mots de passe ou clés API
- ⚠️ Vérifier le fichier `.gitignore` avant chaque commit
- ⚠️ Ne pas utiliser `--force` push sans être absolument sûr

### Performance

- Faire des commits atomiques (une fonctionnalité = un commit)
- Éviter de committer des fichiers volumineux
- Utiliser `.gitignore` pour exclure `node_modules`, `dist`, etc.

### Maintenance

- Nettoyer régulièrement les branches obsolètes
- Créer des tags pour les versions importantes
- Documenter les changements majeurs dans un CHANGELOG

---

**Dernière mise à jour:** 15 Novembre 2026  
**Auteur:** Assistant IA Kiro  
**Version:** 1.0
