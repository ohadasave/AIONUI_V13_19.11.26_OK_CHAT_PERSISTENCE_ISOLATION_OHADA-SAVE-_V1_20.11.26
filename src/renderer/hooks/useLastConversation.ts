/**
 * Hook to track and restore last conversation for better navigation
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_CONVERSATION_KEY = 'last_conversation_path';

export const useLastConversation = () => {
  const location = useLocation();

  useEffect(() => {
    // Save conversation path when user is on a conversation page
    if (location.pathname.startsWith('/conversation/')) {
      localStorage.setItem(LAST_CONVERSATION_KEY, location.pathname);
    }
  }, [location.pathname]);

  return {
    getLastConversationPath: (): string => {
      const lastPath = localStorage.getItem(LAST_CONVERSATION_KEY);
      // Return last conversation if it exists, otherwise fallback to /guid
      return lastPath && lastPath.startsWith('/conversation/') ? lastPath : '/guid';
    },
    clearLastConversation: () => {
      localStorage.removeItem(LAST_CONVERSATION_KEY);
    },
  };
};
