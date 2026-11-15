-- Insérer l'utilisateur admin directement
-- Email: ohada.save@gmail.com
-- Username: admin
-- Password: LEADER00

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
  'user_1732575600000',
  'admin',
  'ohada.save@gmail.com',
  '$2a$10$7LBHCXJiaMpDspexZp1H5eRRLWc3mr9OonDaV9fAqp2XtXMeGlrSS',
  'admin',
  'active',
  'fc1941781ee7844f9b8eb985cb6b0df3838d33ae671cb2aa9859b7c4af371225',
  1732575600000,
  1732575600000
);

-- Vérifier l'insertion
SELECT id, username, email, role, status FROM users WHERE username = 'admin';
