import { auth, signInWithGoogle, signOutUser, checkExistingSession } from '../config/firebase.js';
import { getActivityLogs } from '../utils/firebaseUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const signInButton = document.getElementById('signInButton');
  const userInfo = document.getElementById('userInfo');
  const errorMessage = document.getElementById('errorMessage');
  const loadingSpinner = document.getElementById('loadingSpinner');

  let isAuthenticating = false;

  // Check for existing session on load
  loadingSpinner.style.display = 'block';
  const existingUser = await checkExistingSession();
  loadingSpinner.style.display = 'none';

  if (existingUser) {
    updateUIForAuthenticatedUser(existingUser);
  }

  // Enhanced authentication state handler
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      updateUIForAuthenticatedUser(user);
      
      // Store session in local storage
      chrome.storage.local.set({
        userSession: {
          uid: user.uid,
          email: user.email,
          lastActive: new Date().toISOString()
        }
      });
    } else {
      updateUIForUnauthenticatedUser();
      // Clear session
      chrome.storage.local.remove('userSession');
    }
  });

  // Enhanced Google Sign-In handler
  signInButton.addEventListener('click', async () => {
    if (isAuthenticating) return;
    
    try {
      isAuthenticating = true;
      signInButton.disabled = true;
      signInButton.innerHTML = '<span class="spinner"></span> Signing in...';
      errorMessage.style.display = 'none';
      
      await signInWithGoogle();
    } catch (error) {
      showError('Sign-in error: ' + error.message);
    } finally {
      isAuthenticating = false;
      signInButton.disabled = false;
      signInButton.innerHTML = 'Sign in with Google';
    }
  });

  function updateUIForAuthenticatedUser(user) {
    userInfo.innerHTML = `
      <div class="user-profile">
        <img src="${user.photoURL}" alt="Profile" class="profile-image">
        <div class="user-details">
          <p class="user-name">${user.displayName}</p>
          <p class="email">${user.email}</p>
          <p class="last-active">Last active: ${new Date().toLocaleString()}</p>
        </div>
        <div class="actions">
          <button id="refreshButton" class="refresh-btn">
            <span class="material-icons">refresh</span>
          </button>
          <button id="signOutButton" class="sign-out-btn">Sign Out</button>
        </div>
      </div>
    `;
    signInButton.style.display = 'none';
    
    // Add refresh and sign out functionality
    document.getElementById('refreshButton').addEventListener('click', () => {
      loadActivityLogs(user.uid);
    });
    
    document.getElementById('signOutButton').addEventListener('click', async () => {
      try {
        await signOutUser();
      } catch (error) {
        showError('Error signing out: ' + error.message);
      }
    });

    // Load activity logs
    loadActivityLogs(user.uid);
  }

  function updateUIForUnauthenticatedUser() {
    userInfo.innerHTML = '';
    signInButton.style.display = 'block';
  }

  // Load activity logs
  async function loadActivityLogs(userId) {
    try {
      const logs = await getActivityLogs(userId);
      // Update UI with activity logs
      updateActivityDisplay(logs);
    } catch (error) {
      showError('Error loading activity logs: ' + error.message);
    }
  }

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }

  // Update activity display
  function updateActivityDisplay(logs) {
    const activityContainer = document.getElementById('activityLogs');
    if (!activityContainer) return;

    activityContainer.innerHTML = logs.length ? logs.map(log => `
      <div class="activity-item">
        <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
        <span class="url">${log.url}</span>
        <span class="reason">${log.reason}</span>
      </div>
    `).join('') : '<p>No activity logs found</p>';
  }
});