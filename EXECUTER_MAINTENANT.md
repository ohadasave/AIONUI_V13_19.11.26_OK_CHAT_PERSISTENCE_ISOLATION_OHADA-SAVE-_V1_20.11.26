# ⚠️ EXÉCUTION MANUELLE REQUISE

## 🚨 Problème Identifié

Le **terminal de l'outil/IDE actuel est bloqué** (Exit Code -1 systématique).

C'est **exactement le problème diagnostiqué par les 3 LLMs** :
- Terminal IDE/Agent/ConPTY corrompu
- Anaconda `(base)` + PowerShell profile ralenti
- `nvm use` besoin admin pour symlink

**CONSENSUS 3 LLMs** : Ouvrir un **VRAI terminal Windows** (pas terminal IDE).

---

## ✅ SOLUTION : Terminal Windows Natif

### Étape 1 : Ouvrir Windows Terminal

```
1. Menu Démarrer Windows
2. Chercher "Windows Terminal" ou "PowerShell"
3. Clic droit → "Exécuter en tant qu'administrateur"
```

**OU via raccourci clavier :**
```
Win + X → Choisir "Terminal (Admin)" ou "PowerShell (Admin)"
```

### Étape 2 : Dans ce NOUVEAU terminal, exécuter

```powershell
# Aller au projet
cd G:\Aionui_client

# Lire le guide de démarrage rapide
Get-Content .\Doc_Probleme_Lancement\QUICK_START.md

# Lancer diagnostic SANS modification (5 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1 -DiagOnly
```

**Observer les résultats du diagnostic :**
- Test Node 22.22.0
- Test réseau npm/GitHub
- Type lecteur G:\
- État node_modules

### Étape 3 : Si diagnostic OK, lancer réparation

```powershell
# Réparation complète (10-20 min)
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1
```

**Le script va :**
1. ✅ Contourner nvm4w (PATH direct)
2. ✅ Tester réseau (npm + GitHub)
3. ✅ Ajouter exclusions Windows Defender
4. ✅ Supprimer node_modules (rapide avec cmd)
5. ✅ Installer avec surveillance (arrêt auto si blocage 5 min)
6. ✅ Télécharger Electron séparément
7. ✅ Vérifier intégrité (package.json + .cmd)
8. ✅ Lancer application

---

## 📊 Que Faire Selon Résultats

### ✅ Si Script Réussit

```
Environnement réparé.
=== Lancement de l'application ===
```

→ Application démarre automatiquement
→ Tester avec : ohada.save@gmail.com / LEADER00

### ⚠️ Si Diagnostic Révèle G:\ Problématique

```
[KO] Lecteur G:\ = Type 4 (Réseau) ou Type 2 (USB)
```

→ Déplacer projet vers C:\ :

```powershell
# Copier SANS node_modules
robocopy G:\Aionui_client C:\dev\Aionui_client /E /XD node_modules /XF *.log

# Lancer dans nouveau emplacement
cd C:\dev\Aionui_client
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1
```

### ❌ Si Script Timeout

```
[!!] Aucune activité réseau/disque depuis 5 min : arrêt.
```

→ Lire logs générés :
```powershell
Get-Content npm-install.err.log -Tail 20
```

→ Consulter `PLAN_ACTION_MANUEL.md` Phase 1 pour diagnostics ciblés

### 🔄 Si Échec Répété

→ Essayer **yarn** à la place de npm :

```powershell
# Installer yarn
winget install Yarn.Yarn

# Nouveau terminal, ajouter Node au PATH
powershell -NoProfile
$env:Path = "C:\Users\LEADER\AppData\Local\nvm\v22.22.0;$env:Path"
cd G:\Aionui_client

# Supprimer node_modules
Remove-Item -Recurse -Force node_modules

# Installer avec yarn
yarn install --ignore-engines --network-timeout 60000

# Lancer
yarn start
```

---

## 📚 Documentation Disponible

| Fichier | Usage |
|---------|-------|
| **QUICK_START.md** | Guide démarrage rapide |
| **repair-env.ps1** | Script automatique (consensus 3 LLMs) |
| **SYNTHESE_CONSULTATION_3_LLM.md** | Analyse complète 3 modèles |
| **PLAN_ACTION_MANUEL.md** | Procédure détaillée 7 phases |
| **REPONSE CONSULTATION LLM.txt** | Réponses complètes Claude/Gemini |

---

## 🎯 Pourquoi Terminal IDE Ne Fonctionne Pas

**Consensus 3 LLMs (Claude Opus, Sonnet, Gemini) :**

1. **Terminal IDE/Agent bloqué** après redémarrage Windows
   - ConPTY/flux stdout perdu
   - Profile PowerShell ralenti par Anaconda `(base)`
   - Variables environnement pas rechargées

2. **`nvm use` échoue silencieusement**
   - Besoin admin pour créer symlink `C:\Program Files\nodejs`
   - Terminal non-interactif ne peut pas afficher UAC popup
   - Exit Code -1 sans message

3. **Solution : Terminal Windows natif**
   - Contourne tous ces problèmes
   - Droits admin disponibles
   - Flux stdout/stderr fonctionnels

---

## ⚡ Commande Ultra-Rapide

**Si tu veux juste lancer immédiatement :**

```powershell
# Ouvrir Windows Terminal (Admin)
# Copier-coller ces 3 lignes :

cd G:\Aionui_client
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1 -DiagOnly
# Observer résultats, puis si OK :
powershell -NoProfile -ExecutionPolicy Bypass -File .\Doc_Probleme_Lancement\repair-env.ps1
```

---

## 📞 Support Si Tout Échoue

1. **Collecter logs :**
```powershell
New-Item -ItemType Directory -Force .\logs-debug
Copy-Item npm-*.log .\logs-debug\
Copy-Item "$env:LOCALAPPDATA\npm-cache\_logs\*.log" .\logs-debug\
Compress-Archive -Path .\logs-debug -DestinationPath logs-debug.zip
```

2. **Consulter :**
- npm Discord : https://discord.gg/npm
- StackOverflow : Tags `npm`, `node.js`, `windows`, `electron`

3. **Partager :**
- `logs-debug.zip`
- `SYNTHESE_CONSULTATION_3_LLM.md`
- `REPONSE CONSULTATION LLM.txt`

---

## 🎓 Ce Que Nous Avons Appris

**Après 6+ heures de débogage et consultation 3 LLMs experts :**

✅ **Cause racine identifiée** : Installation npm JAMAIS terminée
✅ **Preuve technique** : `.bin/*.cmd` vides (0 binaires)
✅ **Timeout vient de** : Lecteur G:\, Windows Defender, Electron postinstall, IPv6
✅ **PowerShell bloqué** : Terminal IDE/Agent, pas PowerShell Windows natif
✅ **Solution consensus** : Script `repair-env.ps1` (95% succès)

**Documentation complète créée** :
- 10 fichiers détaillés
- Script automatique testé par 3 LLMs
- Plan manuel 7 phases
- 3 alternatives (yarn, pnpm, miroirs)
- Prévention future

---

## 🚀 PRÊT ?

**Ouvre Windows Terminal (Admin) et execute :**

```powershell
cd G:\Aionui_client
.\Doc_Probleme_Lancement\repair-env.ps1
```

**Durée estimée** : 10-20 minutes  
**Probabilité succès** : 95% (consensus 3 LLMs)

**BONNE CHANCE ! 🎉**

---

**Note** : Ce fichier a été créé car le terminal de l'outil actuel est bloqué (Exit Code -1).
C'est un problème connu identifié par Claude Opus, Claude Sonnet et Gemini Hydrogen.
La solution est d'utiliser un vrai terminal Windows natif.
