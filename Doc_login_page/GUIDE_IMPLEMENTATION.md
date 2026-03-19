# Guide d'Implémentation - Système de Connexion E-audit

Ce guide détaille l'implémentation complète du système de connexion pour E-audit.

## 📋 Prérequis

- Electron 37
- React 19
- TypeScript 5.8
- Arco Design 2
- UnoCSS 66

## 🎯 Objectifs

1. Créer une page de connexion avec branding E-audit
2. Implémenter l'authentification en mode desktop
3. Gérer la persistance de session (24h)
4. Ajouter une page d'inscription
5. Intégrer dans les paramètres de sécurité

## 📁 Fichiers à Créer/Modifier

### Fichiers Créés

1. `src/renderer/pages/login/LoginPage.tsx`
2. `src/renderer/pages/login/index.tsx`
3. `src/renderer/pages/settings/SecuritySettings.tsx`
4. `public/scripts/cleanup.js`

### Fichiers Modifiés

1. `src/renderer/context/AuthContext.tsx`
2. `src/renderer/router.tsx`
3. `src/renderer/pages/settings/SettingsSider.tsx`
4. `public/index.html`

## 🔨 Implémentation Étape par Étape

### Étape 1: Créer la Page de Connexion

**Fichier**: `src/renderer/pages/login/LoginPage.tsx`

```typescript
import React, { useState } from 'react';
import { Button, Input, Message, Tabs } from '@arco-design/web-react';
import { IconLock, IconUser } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/renderer/context/AuthContext';

const TabPane = Tabs.TabPane;

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignIn = async () => {
    if (!username || !password) {
      Message.warning('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const result = await login({ username, password });
      
      if (result.success) {
        Message.success('Connexion réussie');
        navigate('/guid');
      } else {
        Message.error(result.message || 'Échec de la connexion');
      }
    } catch (error) {
      Message.error('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!username || !password || !confirmPassword) {
      Message.warning('Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Message.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Message.warning('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      Message.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      setLoading(false);
      setActiveTab('signin');
      setPassword('');
      setConfirmPassword('');
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === 'signin') {
        handleSignIn();
      } else {
        handleSignUp();
      }
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-fill-1'>
      <div className='w-full max-w-md p-8'>
        <div className='flex flex-col items-center mb-8'>
          <img 
            src='/logo_projet/android-chrome-512x512.png' 
            alt='E-audit' 
            className='w-24 h-24 mb-4 object-contain' 
          />
          <h1 className='text-3xl font-bold text-text-1 text-center mb-2'>E-audit</h1>
          <p className='text-base text-text-2 text-center'>
            Automatisez vos activités, d'audit, risque et contrôle
          </p>
        </div>

        <div className='bg-fill-2 rounded-lg p-6 shadow-lg border border-solid border-border-2'>
          <Tabs activeTab={activeTab} onChange={setActiveTab} type='rounded'>
            <TabPane key='signin' title='Se connecter'>
              <div className='mt-4'>
                <div className='mb-4'>
                  <Input
                    size='large'
                    placeholder="Nom d'utilisateur"
                    prefix={<IconUser />}
                    value={username}
                    onChange={setUsername}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <div className='mb-6'>
                  <Input.Password
                    size='large'
                    placeholder='Mot de passe'
                    prefix={<IconLock />}
                    value={password}
                    onChange={setPassword}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <Button 
                  type='primary' 
                  size='large' 
                  long 
                  loading={loading} 
                  onClick={handleSignIn}
                >
                  Se connecter
                </Button>
              </div>
            </TabPane>

            <TabPane key='signup' title="S'inscrire">
              <div className='mt-4'>
                <div className='mb-4'>
                  <Input
                    size='large'
                    placeholder="Nom d'utilisateur"
                    prefix={<IconUser />}
                    value={username}
                    onChange={setUsername}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <div className='mb-4'>
                  <Input.Password
                    size='large'
                    placeholder='Mot de passe'
                    prefix={<IconLock />}
                    value={password}
                    onChange={setPassword}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <div className='mb-6'>
                  <Input.Password
                    size='large'
                    placeholder='Confirmer le mot de passe'
                    prefix={<IconLock />}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <Button 
                  type='primary' 
                  size='large' 
                  long 
                  loading={loading} 
                  onClick={handleSignUp}
                >
                  Créer un compte
                </Button>
              </div>
            </TabPane>
          </Tabs>
        </div>

        <div className='text-center mt-6 text-text-3 text-sm'>
          <p>© 2025 E-audit. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

**Fichier**: `src/renderer/pages/login/index.tsx`

```typescript
export { default } from './LoginPage';
```

### Étape 2: Modifier AuthContext

**Fichier**: `src/renderer/context/AuthContext.tsx`

Ajouter la gestion de session persistante dans la méthode `refresh()`:

```typescript
const refresh = useCallback(async () => {
  if (isDesktopRuntime) {
    // Check if user is already logged in via localStorage
    const loggedIn = localStorage.getItem('eaudit_logged_in') === 'true';
    const loginTime = localStorage.getItem('eaudit_login_time');

    if (loggedIn && loginTime) {
      // Check if session is still valid (24 hours)
      const now = Date.now();
      const elapsed = now - parseInt(loginTime, 10);
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (elapsed < twentyFourHours) {
        // Valid session exists
        const username = localStorage.getItem('eaudit_username') || 'desktop-user';
        console.log('[AuthContext] Desktop mode - valid session found');
        setUser({ id: 'desktop-user', username });
        setStatus('authenticated');
        setReady(true);
        return;
      } else {
        // Session expired - clear it
        console.log('[AuthContext] Desktop mode - session expired');
        localStorage.removeItem('eaudit_logged_in');
        localStorage.removeItem('eaudit_login_time');
        localStorage.removeItem('eaudit_username');
      }
    }

    // No valid session - require login
    console.log('[AuthContext] Desktop mode - requiring login');
    setStatus('unauthenticated');
    setUser(null);
    setReady(true);
    return;
  }

  // ... reste du code pour WebUI mode
}, []);
```

Modifier la méthode `login()` pour stocker le username:

```typescript
if (isDesktopRuntime) {
  if (!username || !password) {
    return {
      success: false,
      message: 'Veuillez remplir tous les champs',
      code: 'invalidCredentials',
    };
  }
  
  // Store login state with username
  localStorage.setItem('eaudit_logged_in', 'true');
  localStorage.setItem('eaudit_login_time', Date.now().toString());
  localStorage.setItem('eaudit_username', username);
  
  setUser({ id: 'desktop-user', username });
  setStatus('authenticated');
  setReady(true);
  return { success: true };
}
```

Modifier la méthode `logout()`:

```typescript
if (isDesktopRuntime) {
  localStorage.removeItem('eaudit_logged_in');
  localStorage.removeItem('eaudit_login_time');
  localStorage.removeItem('eaudit_username');
  setUser(null);
  setStatus('unauthenticated');
  setReady(true);
  return;
}
```

### Étape 3: Modifier le Router

**Fichier**: `src/renderer/router.tsx`

Ajouter la route de login et la protection:

```typescript
const LoginPage = React.lazy(() => import('./pages/login'));

const ProtectedLayout: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  if (status === 'checking') {
    return <AppLoader />;
  }

  if (status !== 'authenticated') {
    return <Navigate to='/login' replace />;
  }

  return React.cloneElement(layout);
};

const PanelRoute: React.FC<{ layout: React.ReactElement }> = ({ layout }) => {
  const { status } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route 
          path='/login' 
          element={
            status === 'authenticated' 
              ? <Navigate to='/guid' replace /> 
              : withRouteFallback(LoginPage)
          } 
        />
        <Route element={<ProtectedLayout layout={layout} />}>
          <Route index element={<Navigate to='/guid' replace />} />
          <Route path='/guid' element={withRouteFallback(Guid)} />
          {/* ... autres routes */}
        </Route>
        <Route path='*' element={
          <Navigate to={status === 'authenticated' ? '/guid' : '/login'} replace />
        } />
      </Routes>
    </HashRouter>
  );
};
```

### Étape 4: Créer le Script de Nettoyage

**Fichier**: `public/scripts/cleanup.js`

```javascript
(function() {
  'use strict';
  
  console.log('[E-audit Cleanup] Starting cleanup...');
  
  function forceCleanup() {
    console.log('[E-audit Cleanup] FORCING session cleanup...');
    localStorage.removeItem('eaudit_logged_in');
    localStorage.removeItem('eaudit_login_time');
    localStorage.removeItem('eaudit_username');
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('aionui') || key.includes('AionUi'))) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      console.log('[E-audit Cleanup] Removing old keys:', keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    console.log('[E-audit Cleanup] Session cleared.');
  }
  
  function cleanupOldData() {
    console.log('[E-audit Cleanup] Cleaning old AionUi data...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('aionui') || key.includes('AionUi'))) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      console.log('[E-audit Cleanup] Removing old keys:', keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
  
  function enableRightClick() {
    document.addEventListener('contextmenu', function(e) {
      console.log('[E-audit Cleanup] Context menu event captured');
    }, false);
    
    console.log('[E-audit Cleanup] Right-click enabled');
  }
  
  function addDebugButtons() {
    const addButtons = function() {
      if (!document.body) {
        setTimeout(addButtons, 100);
        return;
      }
      
      const debugPanel = document.createElement('div');
      debugPanel.id = 'eaudit-debug-panel';
      debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 999999;
        font-family: monospace;
        font-size: 12px;
      `;
      
      debugPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">E-audit Debug</div>
        <button id="eaudit-clear-session" style="
          background: #ff4444;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          margin-bottom: 5px;
          width: 100%;
        ">Clear Session & Reload</button>
        <button id="eaudit-check-status" style="
          background: #4444ff;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          width: 100%;
        ">Check Status</button>
        <div id="eaudit-status" style="margin-top: 10px; font-size: 10px;"></div>
      `;
      
      document.body.appendChild(debugPanel);
      
      document.getElementById('eaudit-clear-session').addEventListener('click', function() {
        forceCleanup();
        setTimeout(() => location.reload(), 500);
      });
      
      document.getElementById('eaudit-check-status').addEventListener('click', function() {
        const statusDiv = document.getElementById('eaudit-status');
        const loggedIn = localStorage.getItem('eaudit_logged_in');
        const loginTime = localStorage.getItem('eaudit_login_time');
        const username = localStorage.getItem('eaudit_username');
        
        let timeInfo = 'N/A';
        if (loginTime) {
          const elapsed = Date.now() - parseInt(loginTime, 10);
          const hours = Math.floor(elapsed / (1000 * 60 * 60));
          const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
          timeInfo = `${hours}h ${minutes}m ago`;
        }
        
        statusDiv.innerHTML = `
          <div>Logged in: ${loggedIn || 'false'}</div>
          <div>Username: ${username || 'N/A'}</div>
          <div>Login time: ${timeInfo}</div>
          <div>URL: ${window.location.hash}</div>
        `;
      });
      
      console.log('[E-audit Cleanup] Debug panel added');
    };
    
    addButtons();
  }
  
  cleanupOldData();
  
  // FOR TESTING: Force logout on first load
  if (!sessionStorage.getItem('eaudit_cleanup_done')) {
    console.log('[E-audit Cleanup] First load - forcing logout for testing');
    forceCleanup();
    sessionStorage.setItem('eaudit_cleanup_done', 'true');
  }
  
  enableRightClick();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDebugButtons);
  } else {
    addDebugButtons();
  }
  
  console.log('[E-audit Cleanup] Cleanup complete');
})();
```

### Étape 5: Intégrer le Script dans index.html

**Fichier**: `public/index.html`

Ajouter avant la fermeture de `</body>`:

```html
<script src="/scripts/cleanup.js"></script>
```

### Étape 6: Créer les Paramètres de Sécurité

**Fichier**: `src/renderer/pages/settings/SecuritySettings.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Button, Message, Switch } from '@arco-design/web-react';
import { ConfigStorage } from '@/common/storage';

const SecuritySettings: React.FC = () => {
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const enabled = await ConfigStorage.get('security.loginEnabled');
      setLoginEnabled(enabled === true);
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await ConfigStorage.set('security.loginEnabled', loginEnabled);
      Message.success('Paramètres de sécurité sauvegardés');
      
      if (!loginEnabled) {
        Message.success('Écran de connexion désactivé.');
        localStorage.removeItem('eaudit_logged_in');
        localStorage.removeItem('eaudit_login_time');
      }
    } catch (error) {
      Message.error('Erreur lors de la sauvegarde');
      console.error('Failed to save security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-6'>
      <h2 className='text-2xl font-bold mb-6'>Paramètres de Sécurité</h2>
      
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-base'>Activer l'écran de connexion</span>
          <Switch checked={loginEnabled} onChange={setLoginEnabled} />
        </div>
        <p className='text-sm text-text-3'>
          Lorsque activé, un écran de connexion sera affiché au démarrage de l'application.
        </p>
      </div>

      <Button type='primary' loading={loading} onClick={handleSave}>
        Sauvegarder
      </Button>
    </div>
  );
};

export default SecuritySettings;
```

## ✅ Checklist d'Implémentation

- [ ] Créer `LoginPage.tsx` avec branding E-audit
- [ ] Créer `index.tsx` pour export
- [ ] Modifier `AuthContext.tsx` pour gestion de session
- [ ] Modifier `router.tsx` pour protection des routes
- [ ] Créer `cleanup.js` pour debug
- [ ] Intégrer script dans `index.html`
- [ ] Créer `SecuritySettings.tsx`
- [ ] Ajouter route dans `SettingsSider.tsx`
- [ ] Tester connexion
- [ ] Tester persistance
- [ ] Tester expiration
- [ ] Tester inscription

## 🧪 Tests à Effectuer

1. **Test de connexion**: Vérifier que la page s'affiche
2. **Test d'authentification**: Connexion avec credentials
3. **Test de persistance**: Fermer/rouvrir l'application
4. **Test d'expiration**: Simuler session expirée
5. **Test d'inscription**: Créer un compte
6. **Test de déconnexion**: Bouton de nettoyage
7. **Test des paramètres**: Activer/désactiver le login

## 📝 Notes d'Implémentation

- Utiliser Arco Design pour cohérence UI
- Respecter les conventions TypeScript strict
- Utiliser UnoCSS pour le styling
- Logs console pour debug
- Validation côté client uniquement (MVP)

---

**Version**: 1.0  
**Date**: Janvier 2025
