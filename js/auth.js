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

  // Sign in with email/password
  async signIn(email, password) {
    if (!DEMO_MODE && firebaseAuth) {
      try {
        const credential = await firebaseAuth.signInWithEmailAndPassword(email, password);
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
        console.error('Firebase sign-in error:', err);
        let errorMsg = 'Invalid email or password.';
        if (err.code === 'auth/user-not-found') errorMsg = 'No account found with this email.';
        if (err.code === 'auth/wrong-password') errorMsg = 'Incorrect password.';
        if (err.code === 'auth/too-many-requests') errorMsg = 'Too many attempts. Please try again later.';
        if (err.code === 'auth/invalid-email') errorMsg = 'Invalid email format.';
        return { success: false, error: errorMsg };
      }
    }

    // Demo mode
    const user = this.DEMO_USERS.find(u => u.email === email && u.password === password);
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
