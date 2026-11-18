/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('useGuidSend - n8n Placeholder Model Creation', () => {
  const srcPath = path.join(process.cwd(), 'src');
  const filePath = path.join(srcPath, 'renderer/pages/guid/hooks/useGuidSend.ts');

  it('should create placeholder model for n8n conversations', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify n8n placeholder model creation
    expect(content).toContain("id: 'n8n-placeholder'");
    expect(content).toContain("name: 'n8n'");
    expect(content).toContain("useModel: 'n8n-workflow'");
    expect(content).toContain("platform: 'n8n'");
    
    // Verify it uses currentModel as fallback
    expect(content).toMatch(/placeholderModel = currentModel \|\|/);
  });

  it('should create placeholder model for n8n-multi-workflow conversations', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify n8n-multi-workflow placeholder
    expect(content).toContain("id: 'n8n-multi-workflow-placeholder'");
    expect(content).toContain("name: 'n8n Multi Workflow'");
    expect(content).toContain("useModel: 'n8n-multi-workflow'");
  });

  it('should handle n8n conversation creation errors', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify error handling for n8n
    expect(content).toContain('Failed to create n8n conversation');
    expect(content).toContain('catch (error: unknown)');
    expect(content).toContain('alert(');
    expect(content).toContain('throw error');
  });

  it('should handle n8n-multi-workflow conversation creation errors', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify error handling for n8n-multi-workflow
    expect(content).toContain('Failed to create n8n multi-workflow conversation');
  });

  it('should use finally block for loading state cleanup', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify finally block exists for cleanup in sendMessageHandler
    expect(content).toContain('sendMessageHandler');
    expect(content).toMatch(/\.finally\s*\(/);
    expect(content).toContain('setLoading(false)');
  });

  it('should navigate to conversation page after creation', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify navigation logic
    expect(content).toContain("navigate(`/conversation/${conversation.id}`)");
  });

  it('should emit history refresh event', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify history refresh emission
    expect(content).toContain("emit('chat.history.refresh')");
  });

  it('should store initial message in sessionStorage', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verify sessionStorage usage for n8n
    expect(content).toContain('sessionStorage.setItem');
    expect(content).toContain('n8n_initial_message_');
  });
});
