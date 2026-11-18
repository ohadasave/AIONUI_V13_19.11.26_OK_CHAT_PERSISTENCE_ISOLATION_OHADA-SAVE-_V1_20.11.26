/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AcpDetector - n8n Backend Detection', () => {
  const srcPath = path.join(process.cwd(), 'src');

  it('should have n8n backend definitions in acpTypes', () => {
    const filePath = path.join(srcPath, 'types/acpTypes.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check that n8n is included in the union type
    expect(content).toContain("| 'n8n'");
    expect(content).toContain("| 'n8n-multi-workflow'");
    
    // Check that n8n backend configs exist (flexible quote matching for keys)
    // n8n uses no quotes, n8n-multi-workflow uses quotes
    expect(content).toMatch(/\bn8n\s*:\s*\{/);
    expect(content).toMatch(/['"]n8n-multi-workflow['"]\s*:\s*\{/);
  });

  it('should register n8n backends in AcpDetector.initialize()', () => {
    const filePath = path.join(srcPath, 'agent/acp/AcpDetector.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check that n8n backends are pushed to detected array
    expect(content).toContain("backend: 'n8n'");
    expect(content).toContain("name: 'n8n Workflow'");
    expect(content).toContain("backend: 'n8n-multi-workflow'");
    expect(content).toContain("name: 'n8n Multi Workflow'");
    
    // Verify they're treated as built-in (no CLI detection)
    expect(content).toMatch(/n8n.*cliPath: undefined/s);
  });

  it('should have n8n backend configuration objects defined', () => {
    const filePath = path.join(srcPath, 'types/acpTypes.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify n8n config structure
    expect(content).toContain("id: 'n8n'");
    expect(content).toContain("name: 'n8n Workflow'");
    expect(content).toContain("authRequired: false");
    expect(content).toContain("enabled: true");
    
    // Verify n8n-multi-workflow config
    expect(content).toContain("id: 'n8n-multi-workflow'");
    expect(content).toContain("name: 'n8n Multi Workflow'");
  });
});
