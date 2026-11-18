/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/database/export';
import type { IPaginatedResult } from '@process/database/types';
import { AuditLogService } from './AuditLogService';
import { AuthService } from '../auth/service/AuthService';
import { UserRepository } from '../auth/repository/UserRepository';

export interface UserFilters {
  status?: 'active' | 'blocked' | 'suspended';
  role?: 'admin' | 'user';
  search?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Service for admin operations on users
 */
export class AdminService {
  /**
   * Block a user
   */
  static blockUser(adminId: string, targetUserId: string, reason: string, ipAddress?: string): { success: boolean; error?: string } {
    try {
      // Verify admin role (defense-in-depth)
      const admin = UserRepository.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return {
          success: false,
          error: 'Admin access required',
        };
      }

      // Prevent admin from blocking themselves
      if (adminId === targetUserId) {
        return {
          success: false,
          error: 'Cannot block your own account',
        };
      }

      const db = getDatabase();
      const now = Date.now();

      // Update user status
      const stmt = db['db'].prepare(`
        UPDATE users
        SET status = 'blocked',
            blocked_at = ?,
            blocked_by = ?,
            blocked_reason = ?,
            updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(now, adminId, reason, now, targetUserId);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Rotate JWT secret to invalidate all tokens for this user
      const newSecret = AuthService['generateSecretKey']();
      const updateSecretStmt = db['db'].prepare(`
        UPDATE users SET jwt_secret = ? WHERE id = ?
      `);
      const secretResult = updateSecretStmt.run(newSecret, targetUserId);

      // Verify secret rotation succeeded
      if (secretResult.changes === 0) {
        console.error('[AdminService] Failed to rotate JWT secret for blocked user:', targetUserId);
        throw new Error('Failed to rotate JWT secret for blocked user');
      }

      // Log audit event
      AuditLogService.logAction({
        userId: adminId,
        targetUserId,
        action: 'user.block',
        resourceType: 'user',
        resourceId: targetUserId,
        details: JSON.stringify({ reason }),
        ipAddress,
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AdminService] Failed to block user:', error);
      return {
        success: false,
        error: error.message || 'Failed to block user',
      };
    }
  }

  /**
   * Unblock a user
   */
  static unblockUser(adminId: string, targetUserId: string, ipAddress?: string): { success: boolean; error?: string } {
    try {
      // Verify admin role (defense-in-depth)
      const admin = UserRepository.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return {
          success: false,
          error: 'Admin access required',
        };
      }

      const db = getDatabase();
      const now = Date.now();

      // Update user status
      const stmt = db['db'].prepare(`
        UPDATE users
        SET status = 'active',
            blocked_at = NULL,
            blocked_by = NULL,
            blocked_reason = NULL,
            updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(now, targetUserId);

      if (result.changes === 0) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Log audit event
      AuditLogService.logAction({
        userId: adminId,
        targetUserId,
        action: 'user.unblock',
        resourceType: 'user',
        resourceId: targetUserId,
        ipAddress,
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AdminService] Failed to unblock user:', error);
      return {
        success: false,
        error: error.message || 'Failed to unblock user',
      };
    }
  }

  /**
   * List users with filters and pagination
   */
  static listUsers(filters: UserFilters = {}, pagination: Pagination): IPaginatedResult<any> {
    try {
      const db = getDatabase();
      const { page, pageSize } = pagination;
      const offset = (page - 1) * pageSize;

      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.role) {
        conditions.push('role = ?');
        params.push(filters.role);
      }

      if (filters.search) {
        conditions.push('(username LIKE ? OR email LIKE ?)');
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countStmt = db['db'].prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`);
      const countResult = countStmt.get(...params) as { count: number };
      const total = countResult.count;

      // Get data
      const dataStmt = db['db'].prepare(`
        SELECT id, username, email, role, status, created_at, updated_at, last_login,
               blocked_at, blocked_by, blocked_reason
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);

      const data = dataStmt.all(...params, pageSize, offset) as any[];

      return {
        data,
        total,
        page,
        pageSize,
        hasMore: offset + data.length < total,
      };
    } catch (error: any) {
      console.error('[AdminService] Failed to list users:', error);
      return {
        data: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: false,
      };
    }
  }
}
