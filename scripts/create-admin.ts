#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * CLI script to create an admin user for AionUi
 * Usage: npm run create-admin
 */

import * as readline from 'readline';
import bcrypt from 'bcryptjs';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getDataPath, ensureDirectory } from '../src/process/utils';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        // Ctrl+C
        process.exit();
      } else if (char === '\u007f') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', onData);
  });
}

function validateUsername(username: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 32) {
    errors.push('Username must be at most 32 characters long');
  }

  if (!/^[a-zA-Z0-9_@.-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and characters: _ @ . -');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be at most 128 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function main() {
  console.log('\n========================================');
  console.log('   AionUi Admin User Creation Tool');
  console.log('========================================\n');

  try {
    // Get database path
    const dbPath = path.join(getDataPath(), 'aionui.db');
    console.log(`Database path: ${dbPath}\n`);

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    ensureDirectory(dir);

    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Error: Database not found!');
      console.log('\nPlease run AionUi at least once to initialize the database:');
      console.log('  npm run start');
      console.log('  or');
      console.log('  npm run webui\n');
      process.exit(1);
    }

    // Connect to database
    const db = new BetterSqlite3(dbPath);

    // Check if users table exists
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get() as { name: string } | undefined;

    if (!tableExists) {
      console.error('❌ Error: Database is not properly initialized!');
      console.log('\nPlease run AionUi at least once to initialize the database.\n');
      db.close();
      process.exit(1);
    }

    // Get username
    let username: string;
    while (true) {
      username = await question('Enter admin username (or email): ');
      const validation = validateUsername(username);

      if (!validation.isValid) {
        console.log('❌ Invalid username:');
        validation.errors.forEach((err) => console.log(`   - ${err}`));
        console.log('');
        continue;
      }

      // Check if username already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as
        | { id: string }
        | undefined;

      if (existingUser) {
        const answer = await question(`⚠️  User "${username}" already exists. Update to admin? (y/N): `);
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          // Update existing user to admin
          db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE username = ?').run(
            'admin',
            Date.now(),
            username
          );

          console.log(`\n✅ User "${username}" updated to admin role successfully!\n`);
          console.log('You can now login with your existing password.\n');
          db.close();
          rl.close();
          process.exit(0);
        } else {
          console.log('');
          continue;
        }
      }

      break;
    }

    // Get password
    let password: string;
    while (true) {
      password = await questionHidden('Enter admin password: ');
      const validation = validatePassword(password);

      if (!validation.isValid) {
        console.log('❌ Password does not meet requirements:');
        validation.errors.forEach((err) => console.log(`   - ${err}`));
        console.log('');
        continue;
      }

      const confirmPassword = await questionHidden('Confirm password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match!\n');
        continue;
      }

      break;
    }

    // Optional email
    let email: string | undefined;
    const emailInput = await question('Enter email (optional, press Enter to skip): ');
    if (emailInput.trim()) {
      email = emailInput.trim();
    }

    console.log('\nCreating admin user...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${Date.now()}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)
    `).run(userId, username, email || null, passwordHash, now, now);

    console.log('\n✅ Admin user created successfully!\n');
    console.log('========================================');
    console.log('   Admin Credentials');
    console.log('========================================');
    console.log(`Username: ${username}`);
    if (email) {
      console.log(`Email:    ${email}`);
    }
    console.log(`Role:     admin`);
    console.log(`Status:   active`);
    console.log('========================================\n');

    console.log('You can now login with these credentials at:');
    console.log('  http://localhost:25808/login (WebUI mode)');
    console.log('  or');
    console.log('  npm run start (Desktop mode)\n');

    db.close();
    rl.close();
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

main();
