/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ISOLATION FIX: Get current user ID for multi-user data isolation
 * 
 * Retrieves the currently authenticated user's ID from window.__currentUserId.
 * This is set by AuthContext after successful login.
 * 
 * @returns userId string if authenticated, undefined if not logged in
 */
export function getCurrentUserId(): string | undefined {
  return (window as any).__currentUserId;
}
