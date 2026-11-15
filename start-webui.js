/**
 * Script de démarrage du serveur WebUI
 * Build l'application puis lance Electron en mode WebUI
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isRemote = process.argv.includes('--remote');

console.log('🚀 Building application for WebUI mode...\n');

// Étape 1: Build l'application
try {
  execSync('npm run package', {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
  });
} catch (err) {
  console.error('❌ Build failed');
  process.exit(1);
}

console.log('\n✅ Build complete! Starting WebUI server...\n');

// Étape 2: Lancer Electron avec --webui
const electronPath = require('electron');
const appPath = path.join(__dirname, 'out', 'main', 'index.js');

const args = [appPath, '--webui'];
if (isRemote) {
  args.push('--remote');
}

const electronProcess = spawn(electronPath, args, {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' }
});

electronProcess.on('error', (err) => {
  console.error('❌ Failed to start Electron:', err);
  process.exit(1);
});

electronProcess.on('exit', (code) => {
  process.exit(code || 0);
});

// Gérer les signaux d'arrêt
process.on('SIGINT', () => {
  console.log('\n⏹️  Stopping WebUI server...');
  electronProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  electronProcess.kill('SIGTERM');
});
