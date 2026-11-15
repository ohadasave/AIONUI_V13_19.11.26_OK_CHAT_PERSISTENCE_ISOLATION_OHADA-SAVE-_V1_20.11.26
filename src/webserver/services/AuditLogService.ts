/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/database/export';

export interface LogActionParams {
  userId: string;
  targetUserId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Service for logging admin actions and system events
 */
export class AuditLogService {
  /**
   * Log an action to the audit log
   */
  static logAction(params: LogActionParams): { success: boolean; error?: string } {
    try {
      const db = getDatabase();
      const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const stmt = db['db'].prepare(`
        INSERT INTO audit_log (
          id, user_id, target_user_id, action, resource_type,
          resource_id, details, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        params.userId,
        params.targetUserId || null,
        params.action,
        params.resourceType || null,
        params.resourceId || null,
        params.details || null,
        params.ipAddress || null,
        params.userAgent || null,
        now
      );

      return { success: true };
    } catch (error: any) {
      console.error('[AuditLogService] Failed to log action:', error);
      return {
        success: false,
        error: error.message || 'Failed to log action',
      };
    }
  }
}
