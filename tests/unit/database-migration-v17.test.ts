/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema, setDatabaseVersion, getDatabaseVersion } from '@process/database/schema';
import { runMigrations } from '@process/database/migrations';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync } from 'node:fs';

describe('Database Migration v17', () => {
  let db: Database.Database;
  let dbPath: string;

  beforeEach(() => {
    // Create a temporary database file for testing
    dbPath = join(tmpdir(), `test-db-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = new Database(dbPath);

    // Initialize schema
    initSchema(db);
    setDatabaseVersion(db, 16); // Start from v16
  });

  afterEach(() => {
    // Clean up
    db.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should run migration v17 without errors', () => {
    expect(() => {
      runMigrations(db, 16, 17);
    }).not.toThrow();

    // Verify version was updated
    expect(getDatabaseVersion(db)).toBe(17);
  });

  it('should add role, status, and blocking columns to users table', () => {
    runMigrations(db, 16, 17);

    const tableInfo = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string; type: string }>;
    const columnNames = tableInfo.map((col) => col.name);

    expect(columnNames).toContain('role');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('blocked_at');
    expect(columnNames).toContain('blocked_by');
    expect(columnNames).toContain('blocked_reason');
  });

  it('should create audit_log table with correct columns', () => {
    runMigrations(db, 16, 17);

    const tableInfo = db.prepare('PRAGMA table_info(audit_log)').all() as Array<{ name: string; type: string }>;
    const columnNames = tableInfo.map((col) => col.name);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('target_user_id');
    expect(columnNames).toContain('action');
    expect(columnNames).toContain('resource_type');
    expect(columnNames).toContain('resource_id');
    expect(columnNames).toContain('details');
    expect(columnNames).toContain('ip_address');
    expect(columnNames).toContain('user_agent');
    expect(columnNames).toContain('created_at');
  });

  it('should create indexes for users table', () => {
    runMigrations(db, 16, 17);

    const indexes = db.prepare('PRAGMA index_list(users)').all() as Array<{ name: string }>;
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain('idx_users_status');
    expect(indexNames).toContain('idx_users_role');
  });

  it('should create indexes for audit_log table', () => {
    runMigrations(db, 16, 17);

    const indexes = db.prepare('PRAGMA index_list(audit_log)').all() as Array<{ name: string }>;
    const indexNames = indexes.map((idx) => idx.name);

    expect(indexNames).toContain('idx_audit_log_user_id');
    expect(indexNames).toContain('idx_audit_log_action');
    expect(indexNames).toContain('idx_audit_log_created_at');
  });

  it('should set default values for existing users', () => {
    // Insert a test user before migration
    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('test-user-1', 'testuser', 'test@example.com', 'hash123', Date.now(), Date.now());

    runMigrations(db, 16, 17);

    const user = db.prepare('SELECT role, status FROM users WHERE id = ?').get('test-user-1') as {
      role: string;
      status: string;
    };

    expect(user.role).toBe('user');
    expect(user.status).toBe('active');
  });

  it('should allow inserting data into audit_log table', () => {
    runMigrations(db, 16, 17);

    // Insert a test user
    const userId = 'admin-user-1';
    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, created_at, updated_at, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, 'admin', 'admin@example.com', 'hash123', Date.now(), Date.now(), 'admin', 'active');

    // Insert an audit log entry
    const auditId = 'audit-1';
    const timestamp = Date.now();
    expect(() => {
      db.prepare(
        `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(auditId, userId, 'user.block', 'user', 'target-user-1', '{"reason":"test"}', timestamp);
    }).not.toThrow();

    const log = db.prepare('SELECT * FROM audit_log WHERE id = ?').get(auditId) as {
      user_id: string;
      action: string;
    };
    expect(log.user_id).toBe(userId);
    expect(log.action).toBe('user.block');
  });

  it('should enforce foreign key constraint on audit_log.user_id', () => {
    runMigrations(db, 16, 17);

    // Re-enable foreign keys (disabled during migration)
    db.pragma('foreign_keys = ON');

    // Try to insert audit log with non-existent user_id
    expect(() => {
      db.prepare(
        `INSERT INTO audit_log (id, user_id, action, created_at) 
         VALUES (?, ?, ?, ?)`
      ).run('audit-invalid', 'non-existent-user', 'test.action', Date.now());
    }).toThrow();
  });
});
