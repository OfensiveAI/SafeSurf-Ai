// Import Firebase configurations and utilities
import { auth, db } from '../config/firebase.js';
import { getDoc, doc, setDoc } from 'firebase/firestore';

// Cache for storing settings and whitelist
let settings = null;
let whitelist = new Set();

// Initialize settings and listeners
chrome.runtime.onInstalled.addListener(async () => {
  // Set default settings
  settings = {
    enabled: true,
    timeRestrictions: {
      enabled: false,
      startTime: '21:00',
      endTime: '06:00'
    },
    blockedCategories: {
      adult: true,
      violence: true,
      drugs: true,
      gambling: true
    }
  };

  // Save default settings to storage
  await chrome.storage.sync.set({ settings });

  // Set up Google Safe Browsing API
  initializeSafeBrowsing();
});

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) { // Only check main frame
    const url = new URL(details.url);
    
    // Skip whitelisted sites
    if (whitelist.has(url.hostname)) {
      return;
    }

    // Check time restrictions
    if (await isTimeRestricted()) {
      blockNavigation(details.tabId, 'Time restricted');
      return;
    }

    // Check URL safety
    const isSafe = await checkUrlSafety(url.href);
    if (!isSafe) {
      blockNavigation(details.tabId, 'Unsafe website');
      logBlockedSite(url.href, 'unsafe');
    }
  }
});

// URL Safety check using Google Safe Browsing
async function checkUrlSafety(url) {
  try {
    const apiKey = 'YOUR_SAFE_BROWSING_API_KEY';
    const response = await fetch('https://safebrowsing.googleapis.com/v4/threatMatches:find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client: {
          clientId: 'SafeSurf',
          clientVersion: '1.0.0'
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      })
    });

    const data = await response.json();
    return !data.matches; // Return true if no threats found
  } catch (error) {
    console.error('Safe Browsing API error:', error);
    return true; // Fail open on API error
  }
}

// Check time restrictions
async function isTimeRestricted() {
  const { settings } = await chrome.storage.sync.get('settings');
  if (!settings.timeRestrictions.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const start = parseInt(settings.timeRestrictions.startTime.replace(':', ''));
  const end = parseInt(settings.timeRestrictions.endTime.replace(':', ''));

  return currentTime >= start || currentTime <= end;
}

// Block navigation and show warning
function blockNavigation(tabId, reason) {
  chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL(`/blocked.html?reason=${encodeURIComponent(reason)}`)
  });
}

// Log blocked sites to Firebase
async function logBlockedSite(url, reason) {
  if (!auth.currentUser) return;

  try {
    const logRef = doc(db, 'activityLogs', `${Date.now()}`);
    await setDoc(logRef, {
      userId: auth.currentUser.uid,
      url,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging blocked site:', error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_URL':
      checkUrlSafety(message.url)
        .then(isSafe => sendResponse({ isSafe }));
      return true; // Keep channel open for async response

    case 'UPDATE_SETTINGS':
      settings = message.settings;
      chrome.storage.sync.set({ settings });
      break;

    case 'GET_SETTINGS':
      sendResponse({ settings });
      break;

    case 'LOG_ACTIVITY':
      logBlockedSite(message.url, message.reason);
      break;
  }
});

// Initialize Google Safe Browsing
function initializeSafeBrowsing() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: 'block'
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame']
      }
    }]
  });
}

// Handle authentication state changes
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Load user settings
    const settingsDoc = await getDoc(doc(db, 'userSettings', user.uid));
    if (settingsDoc.exists()) {
      settings = settingsDoc.data();
      chrome.storage.sync.set({ settings });
    }

    // Load whitelist
    const whitelistDoc = await getDoc(doc(db, 'whitelists', user.uid));
    if (whitelistDoc.exists()) {
      whitelist = new Set(whitelistDoc.data().sites);
    }
  }
});