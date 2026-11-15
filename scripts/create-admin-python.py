#!/usr/bin/env python3
"""
Script Python pour créer un utilisateur admin dans AionUi
Usage: python scripts/create-admin-python.py <email> <username> <password>
"""

import sqlite3
import bcrypt
import secrets
import sys
import os
from pathlib import Path
import time

def get_data_path():
    """Obtenir le chemin des données selon l'OS"""
    home = Path.home()
    if sys.platform == 'win32':
        return home / 'AppData' / 'Roaming' / 'E-audit' / 'aionui'
    elif sys.platform == 'darwin':
        return home / 'Library' / 'Application Support' / 'E-audit' / 'aionui'
    else:
        return home / '.config' / 'E-audit' / 'aionui'

def create_admin(email, username, password):
    """Créer un utilisateur admin"""
    # Chemin de la base
    db_path = get_data_path() / 'aionui.db'
    
    print(f'\n📁 Base de données: {db_path}')
    
    if not db_path.exists():
        print('❌ Erreur: Base de données non trouvée!')
        print('\nVeuillez lancer AionUi au moins une fois.')
        sys.exit(1)
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Vérifier si l'utilisateur existe
        cursor.execute(
            'SELECT id, role FROM users WHERE username = ? OR email = ?',
            (username, email)
        )
        existing = cursor.fetchone()
        
        # Générer le hash du mot de passe
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        jwt_secret = secrets.token_hex(32)
        timestamp = int(time.time() * 1000)
        user_id = f'user_{timestamp}'
        
        if existing:
            if existing[1] == 'admin':
                print('\n⚠️  Utilisateur déjà administrateur')
            else:
                cursor.execute(
                    'UPDATE users SET role = ?, updated_at = ? WHERE username = ? OR email = ?',
                    ('admin', timestamp, username, email)
                )
                conn.commit()
                print('\n✅ Utilisateur mis à jour vers admin')
        else:
            cursor.execute('''
                INSERT INTO users (id, username, email, password_hash, role, status, jwt_secret, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?)
            ''', (user_id, username, email, password_hash, jwt_secret, timestamp, timestamp))
            conn.commit()
            print('\n✅ Administrateur créé avec succès!')
        
        print('\n========================================')
        print('   Identifiants Admin')
        print('========================================')
        print(f'Email:    {email}')
        print(f'Username: {username}')
        print(f'Role:     admin')
        print(f'Status:   active')
        print('========================================\n')
        print('Connexion: http://localhost:25808/login\n')
        
        conn.close()
        
    except Exception as e:
        print(f'\n❌ Erreur: {e}')
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print('\nUsage: python scripts/create-admin-python.py <email> <username> <password>\n')
        sys.exit(1)
    
    email = sys.argv[1]
    username = sys.argv[2]
    password = sys.argv[3]
    
    create_admin(email, username, password)
