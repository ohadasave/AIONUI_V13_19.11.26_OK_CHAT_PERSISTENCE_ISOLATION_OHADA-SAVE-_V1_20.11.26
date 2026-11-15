/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { AuthMiddleware } from '@/webserver/auth/middleware/AuthMiddleware';
import { checkUserStatus } from '@/webserver/auth/middleware/checkUserStatus';
import { requireAdmin } from '@/webserver/auth/middleware/requireAdmin';
import { AdminController } from '@/webserver/controllers/AdminController';

const router = Router();

// Apply authentication and authorization middleware to all routes
router.use(AuthMiddleware.authenticateToken);
router.use(checkUserStatus);
router.use(requireAdmin);

// User management routes
router.get('/users', AdminController.listUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.post('/users/:userId/block', AdminController.blockUser);
router.post('/users/:userId/unblock', AdminController.unblockUser);

// Audit log route
router.get('/audit', AdminController.getAuditLog);

export default router;
