/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repository/UserRepository';

/**
 * Middleware that checks user status after authentication
 * Blocks access if user is blocked or suspended
 */
export function checkUserStatus(req: Request, res: Response, next: NextFunction): void {
  // Only check status for authenticated requests (skip if no user)
  if (!req.user) {
    next();
    return;
  }

  try {
    // Get full user info from database
    const user = UserRepository.findById(req.user.id);

    if (!user) {
      res.status(403).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check user status
    const status = (user as any).status || 'active';

    if (status === 'blocked') {
      res.status(403).json({
        success: false,
        error: 'Your account has been blocked. Please contact the administrator.',
        code: 'USER_BLOCKED',
      });
      return;
    }

    if (status === 'suspended') {
      res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Please contact the administrator.',
        code: 'USER_SUSPENDED',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[checkUserStatus] Error checking user status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
