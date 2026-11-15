// Script Node.js pour insérer un admin directement
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const os = require('os');

const email = process.argv[2];
const username = process.argv[3];
const password = process.argv[4];

if (!email || !username || !password) {
  console.error('Usage: node insert-admin.js <email> <username> <password>');
  process.exit(1);
}

// Chemin de la base
const dataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'E-audit', 'aionui');
const dbPath = path.join(dataPath, 'aionui.db');

console.log('\n📁 Base de données:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Vérifier si existe
  const existing = db.prepare('SELECT id, role FROM users WHERE username = ? OR email = ?')
    .get(username, email);
  
  const passwordHash = bcrypt.hashSync(password, 10);
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  const userId = `user_${timestamp}`;
  
  if (existing) {
    if (existing.role === 'admin') {
      console.log('\n⚠️  Utilisateur déjà administrateur');
    } else {
      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE username = ? OR email = ?')
        .run('admin', timestamp, username, email);
      console.log('\n✅ Utilisateur mis à jour vers admin');
    }
  } else {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, status, jwt_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?)
    `).run(userId, username, email, passwordHash, jwtSecret, timestamp, timestamp);
    console.log('\n✅ Administrateur créé avec succès!');
  }
  
  console.log('\n========================================');
  console.log('   Identifiants Admin');
  console.log('========================================');
  console.log('Email:   ', email);
  console.log('Username:', username);
  console.log('Role:     admin');
  console.log('Status:   active');
  console.log('========================================\n');
  console.log('Connexion: http://localhost:25808/login\n');
  
  db.close();
} catch (error) {
  console.error('\n❌ Erreur:', error.message);
  process.exit(1);
}
