/**
 * E-audit Cleanup Script
 * Cleans up localStorage and forces login page display
 */

(function() {
  'use strict';
  
  console.log('[E-audit Cleanup] Starting cleanup...');
  
  // FORCE CLEANUP - Remove all session data
  function forceCleanup() {
    console.log('[E-audit Cleanup] FORCING session cleanup...');
    
    // Remove session data
    localStorage.removeItem('eaudit_logged_in');
    localStorage.removeItem('eaudit_login_time');
    localStorage.removeItem('eaudit_username');
    
    // Remove old AionUi data
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
    
    console.log('[E-audit Cleanup] Session cleared. Login page should appear.');
  }
  
  // Clean up old AionUi data only (not session data)
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
  
  // Enable right-click globally
  function enableRightClick() {
    // Allow context menu everywhere
    document.addEventListener('contextmenu', function(e) {
      // Don't prevent default - allow context menu
      console.log('[E-audit Cleanup] Context menu event captured');
    }, false);
    
    console.log('[E-audit Cleanup] Right-click enabled');
  }
  
  // Add debug buttons to page
  function addDebugButtons() {
    // Wait for body to be available
    const addButtons = function() {
      if (!document.body) {
        setTimeout(addButtons, 100);
        return;
      }
      
      // Create debug panel
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
      
      // Add event listeners
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
  
  // FORCE CLEANUP IMMEDIATELY - For testing login page
  // This will clear the session EVERY TIME the app starts
  // DÉSACTIVÉ : Pour permettre la reconnexion avec credentials
  // console.log('[E-audit Cleanup] FORCING CLEANUP ON EVERY START (TESTING MODE)');
  // forceCleanup();
  
  // Clean up old data
  cleanupOldData();
  
  enableRightClick();
  
  // Add debug buttons after DOM loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDebugButtons);
  } else {
    addDebugButtons();
  }
  
  console.log('[E-audit Cleanup] Cleanup complete');
})();
