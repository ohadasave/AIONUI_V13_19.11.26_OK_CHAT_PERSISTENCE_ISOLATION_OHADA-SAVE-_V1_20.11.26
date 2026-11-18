/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Button, Modal } from '@arco-design/web-react';
import { BugOne } from '@icon-park/react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const DebugPanel: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Intercepter console.log, console.warn, console.error
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: unknown[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message,
        },
      ]);

      originalLog(...args);
    };

    console.warn = (...args: unknown[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'warn',
          message,
        },
      ]);

      originalWarn(...args);
    };

    console.error = (...args: unknown[]) => {
      const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');

      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message,
        },
      ]);

      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#f53f3f';
      case 'warn':
        return '#ff7d00';
      default:
        return '#00b42a';
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
        }}
      >
        <Button
          type='primary'
          shape='circle'
          size='large'
          onClick={() => setVisible(true)}
          icon={<BugOne theme='outline' size='24' />}
          style={{
            width: '60px',
            height: '60px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        />
      </div>

      {/* Modal de logs */}
      <Modal
        title='Debug Panel - Logs Console'
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={clearLogs}>Clear Logs</Button>
            <Button type='primary' onClick={() => setVisible(false)}>
              Close
            </Button>
          </div>
        }
        style={{ width: '80%', maxWidth: '900px' }}
      >
        <div
          style={{
            maxHeight: '500px',
            overflow: 'auto',
            backgroundColor: '#1e1e1e',
            padding: '12px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Aucun log pour le moment. Cliquez sur "New Chat" pour voir les logs.</div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '8px',
                  padding: '6px 8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '3px',
                  borderLeft: `3px solid ${getLogColor(log.level)}`,
                }}
              >
                <span style={{ color: '#999', marginRight: '8px' }}>[{log.timestamp}]</span>
                <span style={{ color: getLogColor(log.level), fontWeight: 'bold', marginRight: '8px' }}>{log.level.toUpperCase()}</span>
                <span style={{ color: '#ddd' }}>{log.message}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f7f8fa', borderRadius: '4px', fontSize: '12px' }}>
          <strong>Instructions :</strong>
          <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Laissez cette fenêtre ouverte</li>
            <li>Cliquez sur le bouton "New Chat" dans la sidebar</li>
            <li>Observez les logs qui apparaissent ici</li>
            <li>Cherchez les messages avec [NEW CHAT]</li>
          </ol>
        </div>
      </Modal>
    </>
  );
};

export default DebugPanel;
