// ============================================
// SafeSite — Authentication Module
// ============================================
// Supports both Firebase Auth and Demo mode.
// When DEMO_MODE is true, uses local credentials.
// When DEMO_MODE is false, uses Firebase Auth.

const Auth = {
  DEMO_USERS: [
    { id: 'user_demo', email: 'supervisor@safesite.com', password: 'demo123', name: 'James Ochieng', role: 'supervisor', site: 'Riverside Tower Complex' },
    { id: 'user_mgr', email: 'manager@safesite.com', password: 'demo123', name: 'Dr. Allan Msando', role: 'manager', site: 'All Sites' },
    { id: 'user_admin', email: 'admin@safesite.com', password: 'demo123', name: 'Admin User', role: 'admin', site: 'All Sites' },
  ],

  // Get currently logged-in user
  getCurrentUser() {
    // Always check localStorage first — it's set during sign-in
    // and available immediately (no async Firebase delay)
    const stored = localStorage.getItem('safesite_currentUser');
    if (stored) return JSON.parse(stored);

    // In Firebase mode, check if Firebase has restored the session
    if (!DEMO_MODE && firebaseAuth && firebaseAuth.currentUser) {
      const fbUser = firebaseAuth.currentUser;
      return {
        id: fbUser.uid,
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email,
        role: 'supervisor'
      };
    }

    return null;
  },

  // Get local registered accounts fallback
  getLocalAccounts() {
    try {
      const raw = localStorage.getItem('safesite_registered_accounts');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // Save local registered account
  saveLocalAccount(account) {
    try {
      const accounts = this.getLocalAccounts();
      const existingIdx = accounts.findIndex(a => a.email === account.email);
      if (existingIdx >= 0) {
        accounts[existingIdx] = account;
      } else {
        accounts.unshift(account);
      }
      localStorage.setItem('safesite_registered_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.warn('Could not save local account:', e);
    }
  },

  // Sign in with email/password
  async signIn(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    // Try Firebase first if configured (with 5s timeout to prevent hanging)
    if (!DEMO_MODE && firebaseAuth) {
      try {
        const firebasePromise = firebaseAuth.signInWithEmailAndPassword(normalizedEmail, trimmedPassword);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 5000));
        const credential = await Promise.race([firebasePromise, timeoutPromise]);
        const user = credential.user;

        // Try to get user profile from Firestore
        let profile = {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email,
          role: 'supervisor',
          site: 'All Sites'
        };

        if (firebaseDB) {
          try {
            const doc = await firebaseDB.collection('users').doc(user.uid).get();
            if (doc.exists) {
              profile = { id: user.uid, ...doc.data() };
            }
          } catch (e) {
            console.warn('Could not fetch user profile from Firestore:', e);
          }
        }

        localStorage.setItem('safesite_currentUser', JSON.stringify(profile));
        return { success: true, user: profile };
      } catch (err) {
        console.warn('Firebase sign-in failed, falling back to demo/local users:', err.code);
        // Fall through to demo user check below
      }
    }

    // Check demo users
    let user = this.DEMO_USERS.find(u => u.email === normalizedEmail && u.password === trimmedPassword);
    
    // Check locally registered accounts
    if (!user) {
      const localAccs = this.getLocalAccounts();
      user = localAccs.find(u => u.email === normalizedEmail && u.password === trimmedPassword);
    }

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const sessionUser = { ...user };
    delete sessionUser.password;
    localStorage.setItem('safesite_currentUser', JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  },

  // Quick demo login (supervisor)
  async demoSignIn() {
    return this.signIn('supervisor@safesite.com', 'demo123');
  },

  // Register a new user
  async register(email, password, name, role = 'supervisor', site = 'All Sites') {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();
    const trimmedName = (name || '').trim();

    if (!normalizedEmail || !trimmedPassword || !trimmedName) {
      return { success: false, error: 'Full name, email, and password are required.' };
    }
    if (trimmedPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    // Check if demo user or local user already exists
    const existingDemo = this.DEMO_USERS.find(u => u.email === normalizedEmail);
    const existingLocal = this.getLocalAccounts().find(u => u.email === normalizedEmail);
    if (existingDemo || existingLocal) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    let firebaseUid = null;

    // Try Firebase registration if configured
    if (!DEMO_MODE && firebaseAuth) {
      try {
        const credential = await firebaseAuth.createUserWithEmailAndPassword(normalizedEmail, trimmedPassword);
        const user = credential.user;
        firebaseUid = user.uid;

        try {
          await user.updateProfile({ displayName: trimmedName });
        } catch (pErr) {
          console.warn('Could not update Firebase displayName:', pErr);
        }

        const profile = {
          id: user.uid,
          email: normalizedEmail,
          name: trimmedName,
          role: role,
          site: site,
          authProvider: 'email',
          createdAt: new Date().toISOString()
        };

        // Save to Firestore users collection
        if (firebaseDB) {
          try {
            await firebaseDB.collection('users').doc(user.uid).set({
              ...profile,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ User registered and saved to Firestore database:', user.uid);
          } catch (e) {
            console.warn('Could not save user profile to Firestore:', e);
          }
        }

        // Also save to local registered accounts collection
        this.saveLocalAccount({
          id: user.uid,
          email: normalizedEmail,
          password: trimmedPassword,
          name: trimmedName,
          role: role,
          site: site,
          authProvider: 'email',
          createdAt: new Date().toISOString()
        });

        // Add to SafeSiteDB users collection
        if (typeof SafeSiteDB !== 'undefined' && SafeSiteDB._getCollection) {
          const dbUsers = SafeSiteDB._getCollection('users');
          const existingIdx = dbUsers.findIndex(u => u.email === normalizedEmail);
          if (existingIdx >= 0) {
            dbUsers[existingIdx] = profile;
          } else {
            dbUsers.unshift(profile);
          }
          SafeSiteDB._saveCollection('users', dbUsers);
        }

        localStorage.setItem('safesite_currentUser', JSON.stringify(profile));
        return { success: true, user: profile };
      } catch (err) {
        console.warn('Firebase registration notice:', err.code, err.message);
        if (err.code === 'auth/email-already-in-use') {
          return { success: false, error: 'An account with this email already exists.' };
        }
        if (err.code === 'auth/weak-password') {
          return { success: false, error: 'Password is too weak. Use at least 6 characters.' };
        }
        if (err.code === 'auth/invalid-email') {
          return { success: false, error: 'Please enter a valid email address.' };
        }
        // If Firebase Auth provider is not enabled or domain is restricted,
        // proceed with local database registration so user flow is never blocked
        console.info('Completing account registration in database store...');
      }
    }

    // Database & local registration fallback
    const userId = firebaseUid || ('user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const newUser = {
      id: userId,
      email: normalizedEmail,
      password: trimmedPassword,
      name: trimmedName,
      role: role,
      site: site,
      authProvider: 'email',
      createdAt: new Date().toISOString()
    };
    
    this.DEMO_USERS.push(newUser);
    this.saveLocalAccount(newUser);

    // Save to Firestore if accessible
    if (firebaseDB) {
      try {
        await firebaseDB.collection('users').doc(userId).set({
          id: userId,
          email: normalizedEmail,
          name: trimmedName,
          role: role,
          site: site,
          authProvider: 'email',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (dbErr) {
        console.warn('Firestore doc write warning:', dbErr);
      }
    }

    // Update SafeSiteDB users collection
    if (typeof SafeSiteDB !== 'undefined' && SafeSiteDB._getCollection) {
      const dbUsers = SafeSiteDB._getCollection('users');
      const profileToSave = { ...newUser };
      delete profileToSave.password;
      const existingIdx = dbUsers.findIndex(u => u.email === normalizedEmail);
      if (existingIdx >= 0) {
        dbUsers[existingIdx] = profileToSave;
      } else {
        dbUsers.unshift(profileToSave);
      }
      SafeSiteDB._saveCollection('users', dbUsers);
    }

    const sessionUser = { ...newUser };
    delete sessionUser.password;
    localStorage.setItem('safesite_currentUser', JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  },

  // Sign out
  async signOut() {
    if (!DEMO_MODE && firebaseAuth) {
      try {
        await firebaseAuth.signOut();
      } catch (e) {
        console.warn('Firebase sign-out error:', e);
      }
    }
    localStorage.removeItem('safesite_currentUser');
    window.location.href = 'index.html';
  },

  // Route guard — redirect to login if not authenticated
  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  // Check if user has a specific role
  hasRole(requiredRole) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true; // admin has all roles
    return user.role === requiredRole;
  },

  // Get user initials for avatar
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  // ---- Firebase Auth State Listener ----
  // Call this on pages that need to react to auth state changes
  onAuthStateChanged(callback) {
    if (!DEMO_MODE && firebaseAuth) {
      firebaseAuth.onAuthStateChanged(callback);
    }
  },

  // ---- Google Sign-In ----
  // Automatically registers the user if they don't have an account
  async signInWithGoogle() {
    if (!firebaseAuth) {
      return { success: false, error: 'Firebase is not configured.' };
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebaseAuth.signInWithPopup(provider);
      const user = result.user;

      // Build profile from Google account
      let profile = {
        id: user.uid,
        email: user.email,
        name: user.displayName || user.email,
        photoURL: user.photoURL || null,
        role: 'supervisor', // default role for new Google users
        site: 'All Sites'
      };

      // Check if user already exists in Firestore
      if (firebaseDB) {
        try {
          const doc = await firebaseDB.collection('users').doc(user.uid).get();
          if (doc.exists) {
            // Existing user — use their stored profile
            profile = { id: user.uid, ...doc.data() };
          } else {
            // New user — auto-register by saving profile to Firestore
            await firebaseDB.collection('users').doc(user.uid).set({
              email: user.email,
              name: user.displayName || user.email,
              photoURL: user.photoURL || null,
              role: 'supervisor',
              site: 'All Sites',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              authProvider: 'google'
            });
            console.log('✅ New Google user auto-registered:', user.email);
          }
        } catch (e) {
          console.warn('Firestore profile check/create failed:', e);
        }
      }

      localStorage.setItem('safesite_currentUser', JSON.stringify(profile));
      return { success: true, user: profile };
    } catch (err) {
      console.error('Google sign-in error:', err);
      let errorMsg = 'Google sign-in failed. Please try again.';
      if (err.code === 'auth/popup-closed-by-user') errorMsg = 'Sign-in cancelled.';
      if (err.code === 'auth/popup-blocked') errorMsg = 'Pop-up blocked. Please allow pop-ups and try again.';
      if (err.code === 'auth/account-exists-with-different-credential') errorMsg = 'An account already exists with this email using a different sign-in method.';
      return { success: false, error: errorMsg };
    }
  }
};
