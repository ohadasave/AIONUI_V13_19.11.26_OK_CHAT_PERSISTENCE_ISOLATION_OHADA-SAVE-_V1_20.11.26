# Mémo : Correction de l'affichage du titre (Heading) dans le Chat n8n

## 1. Problème Identifié
Lors de l'utilisation des workflows **n8n**, le titre de la conversation (souvent le contenu du premier message envoyé, ex: "ok" ou "salut") restait affiché de manière persistante en haut à gauche de l'interface de chat. 

Ce titre "flottant" créait une redondance visuelle inutile car les chats n8n ne sont pas gérés par onglets de la même manière que les assistants classiques (ACP/Gemini).

## 2. Analyse des Causes Racines

### A. Rendu par défaut dans `ChatLayout.tsx`
Le composant `ChatLayout.tsx` contenait une condition à la ligne 408 qui affichait le titre dès que les onglets (`tabs`) étaient absents sur desktop. Il ne prenait pas en compte le type de backend utilisé.

### B. Omission de la propriété `backend` dans `ChatConversation.tsx` (Cause Principale)
La cause la plus subtile était dans `ChatConversation.tsx`. Lorsque l'application utilise un assistant prédéfini (ex: "E-audit"), l'objet `chatLayoutProps` était construit sans la propriété `backend`. 
Par conséquent, même après avoir ajouté une condition dans `ChatLayout`, celle-ci échouait car `props.backend` était indéfini (`undefined`), ce qui rendait la condition `props.backend !== 'n8n'` toujours vraie.

## 3. Solutions Appliquées

### ✅ Correction du Layout (`ChatLayout.tsx`)
Mise à jour de la condition de rendu du titre pour exclure explicitement le backend `n8n` :
```tsx
// Avant
{!layout?.isMobile && !hasTabs && <span ...>{props.title}</span>}

// Après
{!layout?.isMobile && !hasTabs && props.backend !== 'n8n' && <span ...>{props.title}</span>}
```

### ✅ Correction de la transmission des Props (`ChatConversation.tsx`)
Refactorisation de la logique de construction des propriétés pour garantir que `backend` est toujours transmis au layout, quel que soit l'assistant utilisé.
```tsx
const backend = conversation?.type === 'n8n' ? 'n8n' : ...;
const chatLayoutProps = {
  backend,
  ...(presetAssistantInfo ? { ...info } : { ...fallback }),
};
```

### ✅ Synchronisation des Messages (`N8nSendBox.tsx` & `N8nAgentManager.ts`)
Standardisation du flux de messages pour suivre le pattern **ACP** :
- Utilisation de l'événement `user_content` émis par le backend.
- Utilisation d'identifiants de messages cohérents (`user_msg_id`) pour éviter les doublons ou les décalages d'affichage.

## 4. Résultat
L'interface est désormais propre : le titre redondant est supprimé et les messages s'affichent instantanément dans le flux de discussion sans répétition.
