-- Script SQL pour créer un utilisateur admin
-- L'ID et les timestamps seront remplacés par le script PowerShell

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
  '__USER_ID__',
  '__USERNAME__',
  '__EMAIL__',
  '__PASSWORD_HASH__',
  'admin',
  'active',
  '__JWT_SECRET__',
  __TIMESTAMP__,
  __TIMESTAMP__
);
