/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Admin API Integration Tests', () => {
  const srcPath = path.join(process.cwd(), 'src');

  it('should have checkUserStatus middleware', () => {
    const filePath = path.join(srcPath, 'webserver/auth/middleware/checkUserStatus.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('checkUserStatus');
    expect(content).toContain('blocked');
    expect(content).toContain('suspended');
  });

  it('should have requireAdmin middleware', () => {
    const filePath = path.join(srcPath, 'webserver/auth/middleware/requireAdmin.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('requireAdmin');
    expect(content).toContain('Admin access required');
  });

  it('should have AuditLogService', () => {
    const filePath = path.join(srcPath, 'webserver/services/AuditLogService.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('AuditLogService');
    expect(content).toContain('logAction');
    expect(content).toContain('audit_log');
  });

  it('should have AdminService', () => {
    const filePath = path.join(srcPath, 'webserver/services/AdminService.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('AdminService');
    expect(content).toContain('blockUser');
    expect(content).toContain('unblockUser');
    expect(content).toContain('listUsers');
  });

  it('should have AdminController', () => {
    const filePath = path.join(srcPath, 'webserver/controllers/AdminController.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('AdminController');
    expect(content).toContain('listUsers');
    expect(content).toContain('getUserDetails');
    expect(content).toContain('blockUser');
    expect(content).toContain('unblockUser');
    expect(content).toContain('getAuditLog');
  });

  it('should have admin routes', () => {
    const filePath = path.join(srcPath, 'webserver/routes/adminRoutes.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('authenticateToken');
    expect(content).toContain('checkUserStatus');
    expect(content).toContain('requireAdmin');
    expect(content).toContain('/users');
    expect(content).toContain('/audit');
  });

  it('should update express types to include role', () => {
    const filePath = path.join(srcPath, 'webserver/types/express.d.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("role?: 'admin' | 'user'");
  });

  it('should update AuthService.verifyToken to check user status', () => {
    const filePath = path.join(srcPath, 'webserver/auth/service/AuthService.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Check user status after token validation');
    expect(content).toContain("userStatus === 'blocked'");
    expect(content).toContain("userStatus === 'suspended'");
  });

  it('should mount admin routes in webserver index', () => {
    const filePath = path.join(srcPath, 'webserver/index.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("import { checkUserStatus }");
    expect(content).toContain("import adminRoutes");
    expect(content).toContain('app.use(checkUserStatus)');
    expect(content).toContain("app.use('/api/admin', adminRoutes)");
  });

  it('should update TokenMiddleware to include role in req.user', () => {
    const filePath = path.join(srcPath, 'webserver/auth/middleware/TokenMiddleware.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("role: (user as any).role || 'user'");
  });
});
