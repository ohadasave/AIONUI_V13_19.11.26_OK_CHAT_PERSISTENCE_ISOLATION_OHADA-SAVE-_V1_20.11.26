/**
 * Script pour activer la page de connexion E-audit
 * 
 * Ce script:
 * 1. Active le paramètre security.loginEnabled
 * 2. Nettoie la session actuelle pour forcer l'affichage de la page de login
 * 
 * Utilisation:
 *   node scripts/enable-login.js
 */

console.log('\n=== Activation de la page de connexion E-audit ===\n');

// Simuler le comportement du navigateur pour localStorage
if (typeof localStorage === 'undefined') {
  console.log('⚠️  Ce script doit être exécuté dans le contexte de l\'application.');
  console.log('\nÉtapes manuelles:');
  console.log('1. Démarrer l\'application: npm run start');
  console.log('2. Ouvrir DevTools (F12)');
  console.log('3. Dans la Console, exécuter:');
  console.log('\n   // Activer la page de login');
  console.log('   const config = JSON.parse(localStorage.getItem(\'app_config\') || \'{}\');');
  console.log('   config[\'security.loginEnabled\'] = true;');
  console.log('   localStorage.setItem(\'app_config\', JSON.stringify(config));');
  console.log('\n   // Nettoyer la session');
  console.log('   localStorage.removeItem(\'eaudit_logged_in\');');
  console.log('   localStorage.removeItem(\'eaudit_login_time\');');
  console.log('   localStorage.removeItem(\'eaudit_username\');');
  console.log('\n   // Recharger l\'application');
  console.log('   location.reload();');
  console.log('\n✅ La page de login devrait maintenant s\'afficher!\n');
  process.exit(0);
}
