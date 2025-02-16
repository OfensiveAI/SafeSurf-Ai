import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { app, auth, db } from '@/config/firebase';

// Custom hook for auth management
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw new Error('Invalid email or password');
    }
  };

  const logout = () => signOut(auth);

  return { user, loading, error, login, logout };
};

// Custom hook for settings management
const useSettings = (userId) => {
  const [settings, setSettings] = useState({
    timeRestrictions: { enabled: false, startTime: '21:00', endTime: '06:00' },
    blockedCategories: { adult: true, violence: true, drugs: true, gambling: true },
    whitelist: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) loadSettings(userId);
  }, [userId]);

  const loadSettings = async (uid) => {
    try {
      const doc = await getDoc(doc(db, 'userSettings', uid));
      if (doc.exists()) setSettings(doc.data());
    } catch (err) {
      setError('Error loading settings');
      console.error(err);
    }
  };

  const saveSettings = async (newSettings) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'userSettings', userId), newSettings);
      setSettings(newSettings);
    } catch (err) {
      setError('Error saving settings');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { settings, saveSettings, saving, error };
};

const ParentDashboard = () => {
  const { user, loading: authLoading, login, logout } = useAuth();
  const { settings, saveSettings, saving, error: settingsError } = useSettings(user?.uid);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activityData, setActivityData] = useState([]);

  // Load user data from Firestore
  useEffect(() => {
    if (user) {
      loadUserData(user.uid);
    }
  }, [user]);

  const loadUserData = async (userId) => {
    try {
      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('userId', '==', userId)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logs = [];
      logsSnapshot.forEach((doc) => {
        logs.push(doc.data());
      });
      setActivityData(logs);
    } catch (err) {
      setError('Error loading user data');
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleWhitelistAdd = (domain) => {
    if (!domain) return;
    
    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      setError('Please enter a valid domain');
      return;
    }

    saveSettings({
      ...settings,
      whitelist: [...settings.whitelist, domain.toLowerCase()]
    });
  };

  // Loading state
  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Login form
  if (!user) {
    return (
      <div className="flex flex-col space-y-4 p-6">
        <h1 className="text-2xl font-bold">SafeSurf Parent Dashboard</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border rounded"
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <button 
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SafeSurf Parent Dashboard</h1>
          <p className="text-gray-600">Logged in as: {user.email}</p>
        </div>
        <button 
          onClick={logout} 
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </header>

      {/* Combined error alerts */}
      {(error || settingsError) && (
        <Alert variant="destructive">
          <AlertDescription>{error || settingsError}</AlertDescription>
        </Alert>
      )}

      {/* Activity Graph */}
      <div className="h-64 w-full bg-white rounded-lg shadow p-4">
        <ResponsiveContainer>
          <LineChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="blockedSites" stroke="#8884d8" />
            <Line type="monotone" dataKey="totalRequests" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Restrictions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Time Restrictions</h2>
          <div className="flex items-center space-x-4">
            <input
              type="time"
              value={settings.timeRestrictions.startTime}
              onChange={(e) => {
                saveSettings({
                  ...settings,
                  timeRestrictions: {
                    ...settings.timeRestrictions,
                    startTime: e.target.value
                  }
                });
              }}
              className="border rounded p-2"
            />
            <span>to</span>
            <input
              type="time"
              value={settings.timeRestrictions.endTime}
              onChange={(e) => {
                saveSettings({
                  ...settings,
                  timeRestrictions: {
                    ...settings.timeRestrictions,
                    endTime: e.target.value
                  }
                });
              }}
              className="border rounded p-2"
            />
          </div>
        </div>

        {/* Blocked Categories */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Blocked Categories</h2>
          <div className="space-y-2">
            {Object.entries(settings.blockedCategories).map(([category, enabled]) => (
              <label key={category} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    saveSettings({
                      ...settings,
                      blockedCategories: {
                        ...settings.blockedCategories,
                        [category]: e.target.checked
                      }
                    });
                  }}
                  className="h-4 w-4"
                />
                <span className="capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Whitelist Management */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Whitelisted Sites</h2>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Enter domain (e.g., khanacademy.org)"
            className="flex-1 border rounded p-2"
            id="whitelist-input"
          />
          <button
            onClick={() => {
              const input = document.getElementById('whitelist-input');
              if (input.value) {
                handleWhitelistAdd(input.value);
              }
            }}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add'}
          </button>
        </div>
        <ul className="space-y-2">
          {settings.whitelist.map((site, index) => (
            <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{site}</span>
              <button
                onClick={() => {
                  saveSettings({
                    ...settings,
                    whitelist: settings.whitelist.filter((_, i) => i !== index)
                  });
                }}
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ParentDashboard;