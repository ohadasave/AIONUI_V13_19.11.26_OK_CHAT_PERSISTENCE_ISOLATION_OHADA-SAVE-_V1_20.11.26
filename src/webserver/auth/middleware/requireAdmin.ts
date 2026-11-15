/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware that requires admin role
 * Must be used after authenticateToken middleware
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(403).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const userRole = (req.user as any).role || 'user';

  if (userRole !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}
