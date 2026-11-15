# Script PowerShell pour créer un utilisateur admin dans AionUi
# Usage: .\scripts\create-admin.ps1 -Email "admin@example.com" -Username "admin" -Password "MySecurePass"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [Parameter(Mandatory=$true)]
    [string]$Password
)

# Chemin de la base de données
$dataPath = "$env:APPDATA\E-audit\aionui"
$dbPath = Join-Path $dataPath "aionui.db"

Write-Host "`n📁 Chemin de la base de données: $dbPath" -ForegroundColor Cyan

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Erreur: Base de données non trouvée!" -ForegroundColor Red
    Write-Host "`nVeuillez lancer AionUi au moins une fois pour initialiser la base." -ForegroundColor Yellow
    exit 1
}

# Générer un hash bcrypt du mot de passe (utilisation de PowerShell Core bcrypt)
Write-Host "`n🔐 Génération du hash du mot de passe..." -ForegroundColor Cyan

# Installation du module si nécessaire
if (-not (Get-Module -ListAvailable -Name "Bcrypt")) {
    Write-Host "Installation du module Bcrypt..." -ForegroundColor Yellow
    # Pour simplifier, on utilisera Node.js pour le hash
}

# Utiliser Node.js pour hacher le mot de passe
$hashScript = @"
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('$Password', 10));
"@

$passwordHash = node -e $hashScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du hashage du mot de passe" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Hash généré" -ForegroundColor Green

# Générer un JWT secret aléatoire
$jwtScript = @"
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
"@

$jwtSecret = node -e $jwtScript

# Générer un ID utilisateur unique
$userId = "user_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

Write-Host "`n👤 Création de l'utilisateur admin..." -ForegroundColor Cyan
Write-Host "   Email: $Email" -ForegroundColor White
Write-Host "   Username: $Username" -ForegroundColor White

# Préparer la commande SQL
$sql = @"
INSERT OR REPLACE INTO users (
  id,
  username,
  email,
  password_hash,
  role,
  status,
  jwt_secret,
  created_at,
  updated_at
) VALUES (
  '$userId',
  '$Username',
  '$Email',
  '$passwordHash',
  'admin',
  'active',
  '$jwtSecret',
  $timestamp,
  $timestamp
);
"@

# Écrire le SQL dans un fichier temporaire
$tempSqlFile = Join-Path $env:TEMP "create-admin-temp.sql"
$sql | Out-File -FilePath $tempSqlFile -Encoding UTF8

# Utiliser sqlite3.exe si disponible, sinon utiliser Node.js
Write-Host "`n💾 Insertion dans la base de données..." -ForegroundColor Cyan

$nodeScript = @"
const Database = require('better-sqlite3');
const db = new Database('$($dbPath.Replace('\', '\\'))');

try {
  // Vérifier si l'utilisateur existe déjà
  const existing = db.prepare('SELECT id, role FROM users WHERE username = ? OR email = ?').get('$Username', '$Email');
  
  if (existing) {
    if (existing.role === 'admin') {
      console.log('EXISTS_ADMIN');
    } else {
      db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE username = ? OR email = ?').run('admin', $timestamp, '$Username', '$Email');
      console.log('UPDATED');
    }
  } else {
    db.prepare(\`
      INSERT INTO users (id, username, email, password_hash, role, status, jwt_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?)
    \`).run('$userId', '$Username', '$Email', '$passwordHash', '$jwtSecret', $timestamp, $timestamp);
    console.log('CREATED');
  }
  
  db.close();
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
"@

$result = node -e $nodeScript 2>&1

if ($LASTEXITCODE -eq 0) {
    if ($result -eq 'EXISTS_ADMIN') {
        Write-Host "`n⚠️  L'utilisateur existe déjà et est déjà administrateur." -ForegroundColor Yellow
    } elseif ($result -eq 'UPDATED') {
        Write-Host "`n✅ Utilisateur mis à jour vers le rôle admin!" -ForegroundColor Green
    } elseif ($result -eq 'CREATED') {
        Write-Host "`n✅ Utilisateur admin créé avec succès!" -ForegroundColor Green
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   Identifiants Admin" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Email:    $Email" -ForegroundColor White
    Write-Host "Username: $Username" -ForegroundColor White
    Write-Host "Role:     admin" -ForegroundColor Green
    Write-Host "Status:   active" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "`nVous pouvez maintenant vous connecter sur:" -ForegroundColor White
    Write-Host "  http://localhost:25808/login`n" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Erreur lors de la création: $result" -ForegroundColor Red
    exit 1
}

# Nettoyer
Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
