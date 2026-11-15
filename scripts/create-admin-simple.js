#!/usr/bin/env node

/**
 * Script simple pour créer un utilisateur admin
 * Usage: node scripts/create-admin-simple.js
 */

const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Fonction pour obtenir le chemin des données
function getDataPath() {
  const platform = process.platform;
  const homeDir = os.homedir();
  
  if (platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Roaming', 'E-audit');
  } else if (platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'E-audit');
  } else {
    return path.join(homeDir, '.config', 'E-audit');
  }
}

async function createAdmin(email, username, password) {
  try {
    // Chemin de la base de données (dans le sous-dossier aionui)
    const dbPath = path.join(getDataPath(), 'aionui', 'aionui.db');
    console.log(`\n📁 Chemin de la base de données: ${dbPath}`);
    
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Erreur: Base de données non trouvée!');
      console.log('\nVeuillez lancer AionUi au moins une fois pour initialiser la base.');
      process.exit(1);
    }
    
    // Connexion à la base
    const db = new Database(dbPath);
    
    // Vérifier que la table users existe
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).get();
    
    if (!tableExists) {
      console.error('❌ Erreur: Table users non trouvée!');
      db.close();
      process.exit(1);
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = db.prepare('SELECT id, role FROM users WHERE username = ? OR email = ?')
      .get(username, email);
    
    if (existingUser) {
      console.log(`\n⚠️  Utilisateur "${username}" existe déjà.`);
      
      if (existingUser.role === 'admin') {
        console.log('✅ Cet utilisateur est déjà administrateur.');
        db.close();
        return;
      }
      
      // Mettre à jour vers admin
      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE username = ? OR email = ?')
        .run('admin', Date.now(), username, email);
      
      console.log(`✅ Utilisateur mis à jour vers le rôle admin!`);
      db.close();
      return;
    }
    
    console.log('\n🔐 Création de l\'utilisateur admin...');
    
    // Hacher le mot de passe
    const passwordHash = bcrypt.hashSync(password, 10);
    
    // Créer l'utilisateur
    const userId = `user_${Date.now()}`;
    const now = Date.now();
    const jwtSecret = require('crypto').randomBytes(32).toString('hex');
    
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, status, jwt_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?)
    `).run(userId, username, email, passwordHash, jwtSecret, now, now);
    
    console.log('\n✅ Utilisateur admin créé avec succès!\n');
    console.log('========================================');
    console.log('   Identifiants Admin');
    console.log('========================================');
    console.log(`Email:    ${email}`);
    console.log(`Username: ${username}`);
    console.log(`Role:     admin`);
    console.log(`Status:   active`);
    console.log('========================================\n');
    console.log('Vous pouvez maintenant vous connecter sur:');
    console.log('  http://localhost:25808/login\n');
    
    db.close();
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('\nUsage: node scripts/create-admin-simple.js <email> <username> <password>\n');
  console.log('Exemple: node scripts/create-admin-simple.js admin@example.com admin MySecurePass123\n');
  process.exit(1);
}

const [email, username, password] = args;

createAdmin(email, username, password);
