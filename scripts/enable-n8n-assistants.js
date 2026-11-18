#!/usr/bin/env node

/**
 * Script to enable n8n workflow assistants in E-audit config
 * 
 * This script:
 * 1. Locates the E-audit config file (aionui-config.txt)
 * 2. Decodes the URL-encoded content
 * 3. Finds n8n workflow assistants and enables them
 * 4. Encodes and saves the config back to the file
 */

const path = require('path');
const fs = require('fs');

// Determine the config file path
function getConfigPath() {
  const appData = process.env.APPDATA || 
    (process.platform === 'darwin' 
      ? path.join(process.env.HOME, 'Library', 'Application Support')
      : path.join(process.env.HOME, '.config'));
  
  const appName = 'E-audit';
  const configDir = path.join(appData, appName, 'config');
  const configFile = path.join(configDir, 'aionui-config.txt');
  
  return { configDir, configFile };
}

function decodeConfig(encoded) {
  // The config is base64 encoded, then URL-encoded
  const base64Decoded = Buffer.from(encoded, 'base64').toString('utf8');
  return decodeURIComponent(base64Decoded);
}

function encodeConfig(jsonString) {
  // URL-encode first, then base64 encode to match the app's format
  const urlEncoded = encodeURIComponent(jsonString);
  return Buffer.from(urlEncoded).toString('base64');
}

function main() {
  console.log('=== Enable n8n Assistants Script ===\n');
  
  const { configDir, configFile } = getConfigPath();
  
  console.log(`Looking for config at: ${configFile}`);
  
  // Check if config file exists
  if (!fs.existsSync(configFile)) {
    console.error(`❌ ERROR: Config file not found at ${configFile}`);
    console.error('   Make sure the E-audit application has been run at least once.');
    process.exit(1);
  }
  
  // Read the config file
  let config;
  let originalEncoded;
  try {
    originalEncoded = fs.readFileSync(configFile, 'utf8');
    const decoded = decodeConfig(originalEncoded);
    config = JSON.parse(decoded);
    console.log('✓ Config file loaded and decoded successfully\n');
  } catch (error) {
    console.error(`❌ ERROR: Failed to read or parse config file: ${error.message}`);
    process.exit(1);
  }
  
  // Check if acp.customAgents exists
  if (!config['acp.customAgents'] || !Array.isArray(config['acp.customAgents'])) {
    console.error('❌ ERROR: acp.customAgents array not found in config');
    console.error('   The config structure may be invalid or incomplete.');
    process.exit(1);
  }
  
  const customAgents = config['acp.customAgents'];
  console.log(`Found ${customAgents.length} custom agents in config`);
  
  // Find n8n assistants
  const targetIds = ['builtin-n8n-workflow', 'builtin-n8n-multi-workflow'];
  const foundAgents = [];
  let changesMade = false;
  
  for (const agent of customAgents) {
    if (targetIds.includes(agent.id)) {
      foundAgents.push(agent);
      
      if (agent.enabled === true) {
        console.log(`ℹ️  Agent '${agent.id}' is already enabled`);
      } else {
        console.log(`✓ Enabling agent '${agent.id}'`);
        agent.enabled = true;
        changesMade = true;
      }
    }
  }
  
  // Check results
  if (foundAgents.length === 0) {
    console.warn('\n⚠️  WARNING: No n8n workflow assistants found in config');
    console.warn('   Expected to find agents with IDs:');
    targetIds.forEach(id => console.warn(`   - ${id}`));
    process.exit(0);
  }
  
  console.log(`\nFound ${foundAgents.length} n8n assistant(s)`);
  
  // Save config if changes were made
  if (changesMade) {
    try {
      // Create backup
      const backupFile = configFile + '.backup';
      fs.copyFileSync(configFile, backupFile);
      console.log(`\n✓ Backup created: ${backupFile}`);
      
      // Write updated config (encode it back)
      const jsonString = JSON.stringify(config);
      const encoded = encodeConfig(jsonString);
      fs.writeFileSync(configFile, encoded, 'utf8');
      console.log('✓ Config file updated and encoded successfully');
      
      console.log('\n✅ SUCCESS: n8n assistants have been enabled');
      console.log('   Restart the E-audit application to see the changes.');
    } catch (error) {
      console.error(`\n❌ ERROR: Failed to save config file: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log('\n✅ All n8n assistants are already enabled');
    console.log('   No changes needed.');
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error(`\n❌ FATAL ERROR: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
