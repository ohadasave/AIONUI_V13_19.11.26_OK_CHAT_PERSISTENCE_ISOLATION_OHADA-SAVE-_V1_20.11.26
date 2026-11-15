# Guide Visuel Rapide - Push GitHub

## 🎯 Workflow en 3 minutes

```
┌─────────────────────────────────────────────────────────────┐
│                   WORKFLOW PUSH GITHUB                       │
└─────────────────────────────────────────────────────────────┘

1️⃣ PRÉPARER
   ┌──────────────────────┐
   │ cd g:\Aionui_client  │
   └──────────────────────┘
         ↓
   ┌──────────────────────┐
   │   git status         │ ← Vérifier les modifications
   └──────────────────────┘

2️⃣ COMMITTER
         ↓
   ┌──────────────────────┐
   │   git add .          │ ← Ajouter tous les fichiers
   └──────────────────────┘
         ↓
   ┌─────────────────────────────────────────┐
   │ git commit -m "Description du commit"   │
   └─────────────────────────────────────────┘

3️⃣ SAUVEGARDER
         ↓
   ┌──────────────────────┐
   │ git push backup main │ ← Push vers GitHub
   └──────────────────────┘
         ↓
   ┌──────────────────────┐
   │    ✅ TERMINÉ !      │
   └──────────────────────┘
```

## 🤖 Workflow avec script (ENCORE PLUS RAPIDE)

```
┌──────────────────────────────┐
│  cd g:\Aionui_client         │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│  .\push_to_github.ps1        │ ← Exécute le script
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│  [Entrer message de commit]  │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│  ✅ TOUT EST FAIT AUTO !     │
└──────────────────────────────┘
```

## 📋 Checklist visuelle

### Avant chaque sauvegarde

```
☐ Fichiers prêts à committer?
    ↓ NON → Terminer modifications
    ↓ OUI
    ↓
☐ Tests passent? (bun run test)
    ↓ NON → Corriger les erreurs
    ↓ OUI
    ↓
☐ Pas de secrets dans le code?
    ↓ NON → Retirer et ajouter au .gitignore
    ↓ OUI
    ↓
☐ Message de commit clair?
    ↓ NON → Réfléchir à un meilleur message
    ↓ OUI
    ↓
✅ PRÊT À PUSH!
```

## 🎨 Conventions de commit

```
┌─────────────────────────────────────────────────┐
│  feat(scope): nouvelle fonctionnalité           │
│  fix(scope): correction de bug                  │
│  refactor(scope): refactorisation               │
│  chore: tâche de maintenance                    │
│  docs: documentation                            │
│  test: ajout/modification de tests              │
│  style: formatage (pas de changement logique)   │
└─────────────────────────────────────────────────┘

Exemples:
  ✅ feat(n8n): add SendBox component
  ✅ fix(webui): correct modal z-index
  ✅ chore: update dependencies
  ❌ update stuff
  ❌ changed files
```

## 🔄 États des fichiers Git

```
┌──────────────────────────────────────────────────────┐
│                  ÉTATS DES FICHIERS                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Untracked  →  Staged  →  Committed  →  Pushed      │
│   (rouge)     (vert)      (log)        (GitHub)      │
│                                                       │
│    git add .      git commit       git push          │
│       └──────────────┘                  └────┘       │
│                 git add && commit        push        │
└──────────────────────────────────────────────────────┘
```

## 🌳 Structure des remotes

```
┌─────────────────────────────────────────────────────┐
│              VOS REMOTES CONFIGURÉS                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────┐                                         │
│  │ LOCAL  │                                         │
│  └───┬────┘                                         │
│      │                                              │
│      ├──→ origin (Principal)                        │
│      │    Aionui_client_windows_11_19.03.26_V0     │
│      │                                              │
│      ├──→ backup (Sauvegarde) ⭐                    │
│      │    AIONUI_V5_15.11.26                       │
│      │                                              │
│      └──→ upstream (Source originale)               │
│           iOfficeAI/AionUi                          │
│                                                      │
└─────────────────────────────────────────────────────┘

Commandes:
  git push origin main     → Push vers principal
  git push backup main     → Push vers sauvegarde ⭐
  git pull upstream main   → Pull depuis source
```

## 📊 Diagramme de décision

```
┌─────────────────────────────────────────────────┐
│     QUELLE COMMANDE UTILISER?                    │
└─────────────────────────────────────────────────┘

Sauvegarde simple?
    ↓ OUI
    git push backup main
    
Première fois avec ce repo?
    ↓ OUI
    git remote add backup [URL]
    git push -u backup main
    
Changements sur GitHub?
    ↓ OUI
    git pull backup main
    
Conflit détecté?
    ↓ OUI
    git pull backup main --rebase
    git push backup main
    
Annuler dernier commit local?
    ↓ OUI
    git reset --soft HEAD~1
    
Voir historique?
    ↓ OUI
    git log --oneline --graph
```

## 🚨 Codes d'erreur courants

```
┌────────────────────────────────────────────────────────┐
│  ERREUR                    │  SOLUTION                  │
├────────────────────────────┼────────────────────────────┤
│  Authentication failed     │  Utiliser PAT GitHub       │
│  Non-fast-forward          │  git pull puis push        │
│  File too large            │  .gitignore ou Git LFS     │
│  Untracked content         │  Gérer les submodules      │
│  Merge conflict            │  Résoudre manuellement     │
└────────────────────────────────────────────────────────┘
```

## 🎯 Commandes essentielles (Top 10)

```
1.  git status              → État actuel
2.  git add .               → Ajouter tous les fichiers
3.  git commit -m "msg"     → Créer commit
4.  git push backup main    → Sauvegarder sur GitHub
5.  git pull backup main    → Récupérer depuis GitHub
6.  git log --oneline       → Voir historique
7.  git diff                → Voir modifications
8.  git branch              → Voir les branches
9.  git remote -v           → Voir les remotes
10. git reset --soft HEAD~1 → Annuler dernier commit
```

## 📱 Raccourcis pratiques

### Créer un alias Git

Ajouter dans `~/.gitconfig`:

```ini
[alias]
    st = status
    co = commit
    pu = push backup main
    pl = pull backup main
    lg = log --oneline --graph --all
    last = log -1 HEAD
```

Utilisation:
```bash
git st        # au lieu de git status
git pu        # au lieu de git push backup main
git lg        # historique graphique
```

## 🔐 Mémo sécurité

```
┌────────────────────────────────────────────┐
│  ⚠️  NE JAMAIS COMMITTER                   │
├────────────────────────────────────────────┤
│  ❌ .env (variables d'environnement)       │
│  ❌ config/*.secret.json                   │
│  ❌ *.key, *.pem (clés privées)            │
│  ❌ node_modules/ (dépendances)            │
│  ❌ dist/, build/ (fichiers compilés)      │
│  ❌ *.log (logs)                           │
└────────────────────────────────────────────┘

Toujours vérifier .gitignore !
```

## ⏱️ Temps estimés

```
Méthode script:      ~30 secondes
Méthode manuelle:    ~1-2 minutes
Première fois:       ~3-5 minutes
```

---

**💡 Conseil:** Gardez ce guide sous la main pour vos sauvegardes quotidiennes !
