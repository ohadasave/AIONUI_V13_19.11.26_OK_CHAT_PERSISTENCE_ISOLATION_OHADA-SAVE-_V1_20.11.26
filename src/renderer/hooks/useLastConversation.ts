import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook pour mémoriser la dernière conversation visitée
 * Utilisé pour la navigation "Back to Chat" depuis Settings/Admin
 */
export function useLastConversation() {
  const location = useLocation();
  const { pathname } = location;
  const lastConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Mémoriser l'ID de conversation quand on visite une page de conversation
    if (pathname.startsWith('/conversation/')) {
      const convId = pathname.split('/conversation/')[1];
      if (convId) {
        lastConversationIdRef.current = convId;
        // Sauvegarder le path complet dans localStorage pour persistance (utilisé par router.tsx)
        localStorage.setItem('last_conversation_path', pathname);
      }
    }
  }, [pathname]);

  const getLastConversationPath = (): string => {
    // Priorité 1: Conversation mémorisée dans ce composant
    if (lastConversationIdRef.current) {
      return `/conversation/${lastConversationIdRef.current}`;
    }

    // Priorité 2: Conversation sauvegardée dans localStorage
    const savedPath = localStorage.getItem('last_conversation_path');
    if (savedPath && savedPath.startsWith('/conversation/')) {
      return savedPath;
    }

    // Fallback: Page d'accueil
    return '/guid';
  };

  return { getLastConversationPath };
}
