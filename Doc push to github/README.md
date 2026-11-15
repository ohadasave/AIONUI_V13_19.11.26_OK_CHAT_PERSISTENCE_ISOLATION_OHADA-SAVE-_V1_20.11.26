# Documentation Push GitHub - AIONUI

Ce dossier contient toute la documentation et les scripts nécessaires pour sauvegarder le projet AIONUI sur GitHub.

## 📁 Contenu du dossier

### 📖 Documentation

1. **MEMO_COMPLET_PUSH_GITHUB.md** ⭐ **DOCUMENT PRINCIPAL**
   - Historique complet des problèmes rencontrés
   - Solutions détaillées
   - Procédures de push
   - Troubleshooting complet
   - Bonnes pratiques Git
   - **👉 LIRE EN PREMIER**

2. **INSTRUCTIONS_PUSH_GITHUB.md**
   - Guide rapide pas à pas
   - Commandes Git essentielles
   - Gestion de l'authentification
   - Alternatives de configuration

### 🔧 Scripts

1. **push_to_github.ps1** (PowerShell)
   - Script interactif avec interface colorée
   - Recommandé pour PowerShell 5.1+
   - Demande confirmation pour le message de commit

2. **push_to_github.bat** (Batch)
   - Compatible tous terminaux Windows
   - Plus simple, pas de restriction ExecutionPolicy
   - Même fonctionnalité que le script PowerShell

## 🚀 Démarrage rapide

### Option 1: Utiliser le script (RECOMMANDÉ)

```powershell
# Ouvrir PowerShell dans le projet
cd g:\Aionui_client

# Exécuter le script
.\push_to_github.ps1
# OU
.\push_to_github.bat
```

### Option 2: Commandes manuelles

```bash
cd g:\Aionui_client
git add .
git commit -m "Votre message"
git push backup main
```

## 📊 Configuration actuelle

**Repositories de sauvegarde:**  
- **V5**: https://github.com/sekadalle2024/AIONUI_V5_15.11.26.git
- **V6**: https://github.com/sekadalle2024/AIONUI_V6_15.11.26.git ⭐ NOUVEAU

**Remotes configurés:**
- `backup` → AIONUI_V5_15.11.26 (sauvegarde V5)
- `backup-v6` → AIONUI_V6_15.11.26 (sauvegarde V6) ⭐ NOUVEAU
- `origin` → Aionui_client_windows_11_19.03.26_V0-Public (principal)
- `upstream` → iOfficeAI/AionUi (source)

## ⚠️ Points importants

1. **Ne jamais committer de secrets** (tokens, mots de passe, clés API)
2. **Vérifier `.gitignore`** avant chaque commit
3. **Messages de commit en anglais** suivant la convention du projet
4. **Exécuter `bun run test`** avant de committer (bonne pratique)

## 🆘 Aide rapide

**Problème d'authentification?**  
→ Voir section "Troubleshooting" dans MEMO_COMPLET_PUSH_GITHUB.md

**Conflit lors du push?**  
→ `git pull backup main --rebase` puis `git push backup main`

**Fichier trop volumineux?**  
→ Ajouter au `.gitignore` ou utiliser Git LFS

## 📞 Ressources

- **Documentation Git officielle:** https://git-scm.com/docs
- **GitHub Docs:** https://docs.github.com/
- **AGENTS.md:** Guide du projet AIONUI

---

**Créé le:** 15 Novembre 2026  
**Dernière mise à jour:** 15 Novembre 2026  
**Version:** 1.0
