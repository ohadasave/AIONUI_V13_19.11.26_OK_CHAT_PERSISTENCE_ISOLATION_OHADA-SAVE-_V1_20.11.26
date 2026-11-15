/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { getDatabase } from '@process/database/export';

/**
 * Controller for admin operations
 */
export class AdminController {
  /**
   * List users with filters and pagination
   * GET /api/admin/users
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const { status, role, search, page = '1', pageSize = '20' } = req.query;

      const filters: any = {};
      if (status && (status === 'active' || status === 'blocked' || status === 'suspended')) {
        filters.status = status;
      }
      if (role && (role === 'admin' || role === 'user')) {
        filters.role = role;
      }
      if (search && typeof search === 'string') {
        filters.search = search;
      }

      const pagination = {
        page: parseInt(page as string, 10) || 1,
        pageSize: Math.min(parseInt(pageSize as string, 10) || 20, 100),
      };

      const result = AdminService.listUsers(filters, pagination);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[AdminController] listUsers error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list users',
      });
    }
  }

  /**
   * Get user details including statistics
   * GET /api/admin/users/:userId
   */
  static async getUserDetails(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const db = getDatabase();

      // Get user info
      const userStmt = db['db'].prepare(`
        SELECT id, username, email, role, status, created_at, updated_at, last_login,
               blocked_at, blocked_by, blocked_reason
        FROM users
        WHERE id = ?
      `);
      const user = userStmt.get(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Get conversation count
      const statsStmt = db['db'].prepare(`
        SELECT COUNT(*) as conversation_count
        FROM conversations
        WHERE user_id = ?
      `);
      const stats = statsStmt.get(userId) as { conversation_count: number };

      res.json({
        success: true,
        user,
        stats: {
          conversationCount: stats.conversation_count,
        },
      });
    } catch (error: any) {
      console.error('[AdminController] getUserDetails error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user details',
      });
    }
  }

  /**
   * Block a user
   * POST /api/admin/users/:userId/block
   */
  static async blockUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Reason is required',
        });
        return;
      }

      const adminId = req.user!.id;
      const ipAddress = typeof req.ip === 'string' ? req.ip : undefined;

      const result = AdminService.blockUser(adminId, userId, reason, ipAddress);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        message: 'User blocked successfully',
      });
    } catch (error: any) {
      console.error('[AdminController] blockUser error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to block user',
      });
    }
  }

  /**
   * Unblock a user
   * POST /api/admin/users/:userId/unblock
   */
  static async unblockUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user!.id;
      const ipAddress = typeof req.ip === 'string' ? req.ip : undefined;

      const result = AdminService.unblockUser(adminId, userId, ipAddress);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        message: 'User unblocked successfully',
      });
    } catch (error: any) {
      console.error('[AdminController] unblockUser error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unblock user',
      });
    }
  }

  /**
   * Get audit log with filters and pagination
   * GET /api/admin/audit
   */
  static async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        targetUserId,
        action,
        page = '1',
        pageSize = '50',
      } = req.query;

      const db = getDatabase();

      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];

      if (userId && typeof userId === 'string') {
        conditions.push('a.user_id = ?');
        params.push(userId);
      }

      if (targetUserId && typeof targetUserId === 'string') {
        conditions.push('a.target_user_id = ?');
        params.push(targetUserId);
      }

      if (action && typeof action === 'string') {
        conditions.push('a.action = ?');
        params.push(action);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Pagination
      const pageNum = parseInt(page as string, 10) || 1;
      const pageSizeNum = Math.min(parseInt(pageSize as string, 10) || 50, 100);
      const offset = (pageNum - 1) * pageSizeNum;

      // Count total
      const countStmt = db['db'].prepare(`
        SELECT COUNT(*) as count FROM audit_log a ${whereClause}
      `);
      const countResult = countStmt.get(...params) as { count: number };
      const total = countResult.count;

      // Get data with user info
      const dataStmt = db['db'].prepare(`
        SELECT
          a.*,
          u.username as user_username,
          tu.username as target_username
        FROM audit_log a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN users tu ON a.target_user_id = tu.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `);

      const data = dataStmt.all(...params, pageSizeNum, offset);

      res.json({
        success: true,
        data,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: offset + (data as any[]).length < total,
      });
    } catch (error: any) {
      console.error('[AdminController] getAuditLog error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit log',
      });
    }
  }
}
