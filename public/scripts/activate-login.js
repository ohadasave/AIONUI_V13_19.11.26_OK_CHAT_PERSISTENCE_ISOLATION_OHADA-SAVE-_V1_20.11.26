/**
 * Script d'activation de la page de connexion E-audit
 * 
 * Ce script doit être exécuté dans la Console DevTools de l'application
 * 
 * Utilisation:
 * 1. Ouvrir l'application (npm run start)
 * 2. Appuyer sur F12 pour ouvrir DevTools
 * 3. Copier-coller ce script dans la Console
 * 4. Appuyer sur Entrée
 */

(function activateLoginPage() {
  console.log('%c🔐 ACTIVATION DE LA PAGE DE CONNEXION E-AUDIT', 'color: #667eea; font-size: 18px; font-weight: bold;');
  console.log('');

  try {
    // Étape 1: Activer le login dans la configuration
    console.log('%c📝 Étape 1: Activation du paramètre security.loginEnabled', 'color: #3b82f6; font-weight: bold;');
    
    const config = JSON.parse(localStorage.getItem('app_config') || '{}');
    const wasEnabled = config['security.loginEnabled'] === true;
    
    config['security.loginEnabled'] = true;
    localStorage.setItem('app_config', JSON.stringify(config));
    
    if (wasEnabled) {
      console.log('%c   ℹ️  Le login était déjà activé', 'color: #6b7280;');
    } else {
      console.log('%c   ✅ Login activé avec succès', 'color: #10b981;');
    }
    
    // Étape 2: Nettoyer la session actuelle
    console.log('');
    console.log('%c🧹 Étape 2: Nettoyage de la session actuelle', 'color: #3b82f6; font-weight: bold;');
    
    const hadSession = localStorage.getItem('eaudit_logged_in') === 'true';
    const username = localStorage.getItem('eaudit_username');
    
    localStorage.removeItem('eaudit_logged_in');
    localStorage.removeItem('eaudit_login_time');
    localStorage.removeItem('eaudit_username');
    
    if (hadSession) {
      console.log(`%c   ℹ️  Session de "${username || 'utilisateur inconnu'}" supprimée`, 'color: #6b7280;');
    } else {
      console.log('%c   ℹ️  Aucune session active trouvée', 'color: #6b7280;');
    }
    console.log('%c   ✅ Session nettoyée', 'color: #10b981;');
    
    // Étape 3: Vérification
    console.log('');
    console.log('%c🔍 Étape 3: Vérification de la configuration', 'color: #3b82f6; font-weight: bold;');
    
    const finalConfig = JSON.parse(localStorage.getItem('app_config') || '{}');
    console.table({
      'Login Activé': finalConfig['security.loginEnabled'] === true ? '✅ Oui' : '❌ Non',
      'Session Active': localStorage.getItem('eaudit_logged_in') === 'true' ? '✅ Oui' : '❌ Non',
      'Utilisateur': localStorage.getItem('eaudit_username') || 'Aucun'
    });
    
    // Étape 4: Rechargement
    console.log('');
    console.log('%c🔄 Étape 4: Rechargement de l\'application', 'color: #3b82f6; font-weight: bold;');
    console.log('%c   ⏳ Rechargement dans 2 secondes...', 'color: #f59e0b;');
    console.log('');
    console.log('%c✅ CONFIGURATION TERMINÉE !', 'color: #10b981; font-size: 16px; font-weight: bold;');
    console.log('');
    console.log('%c📋 Après le rechargement, utilisez ces identifiants:', 'color: #667eea; font-weight: bold;');
    console.log('%c   Email    : ohada.save@gmail.com', 'color: #10b981;');
    console.log('%c   Password : LEADER00', 'color: #10b981;');
    console.log('');
    
    // Recharger après 2 secondes
    setTimeout(() => {
      location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('%c❌ ERREUR lors de l\'activation:', 'color: #ef4444; font-weight: bold;', error);
    console.log('');
    console.log('%cVeuillez essayer manuellement:', 'color: #f59e0b;');
    console.log('');
    console.log('const config = JSON.parse(localStorage.getItem(\'app_config\') || \'{}\');');
    console.log('config[\'security.loginEnabled\'] = true;');
    console.log('localStorage.setItem(\'app_config\', JSON.stringify(config));');
    console.log('localStorage.removeItem(\'eaudit_logged_in\');');
    console.log('localStorage.removeItem(\'eaudit_login_time\');');
    console.log('localStorage.removeItem(\'eaudit_username\');');
    console.log('location.reload();');
  }
})();
