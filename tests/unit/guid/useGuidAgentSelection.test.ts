/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('useGuidAgentSelection - n8n Default Selection', () => {
  const srcPath = path.join(process.cwd(), 'src');

  it('should default selectedAgentKey to n8n', () => {
    const filePath = path.join(srcPath, 'renderer/pages/guid/hooks/useGuidAgentSelection.ts');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify the default state is 'n8n'
    expect(content).toMatch(/useState<string>\(['"]n8n['"]\)/);
  });

  it('should have getAgentKey helper function', () => {
    const filePath = path.join(srcPath, 'renderer/pages/guid/hooks/useGuidAgentSelection.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify getAgentKey function exists and handles custom agents
    expect(content).toContain('getAgentKey');
    expect(content).toContain('custom:');
  });

  it('should have findAgentByKey helper function', () => {
    const filePath = path.join(srcPath, 'renderer/pages/guid/hooks/useGuidAgentSelection.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify findAgentByKey function exists
    expect(content).toContain('findAgentByKey');
    expect(content).toContain('availableAgents');
  });
});
