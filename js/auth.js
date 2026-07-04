// ============================================
// SafeSite — Authentication Module
// ============================================

const Auth = {
  DEMO_USERS: [
    { id: 'user_demo', email: 'supervisor@safesite.com', password: 'demo123', name: 'James Ochieng', role: 'supervisor', site: 'Riverside Tower Complex' },
    { id: 'user_mgr', email: 'manager@safesite.com', password: 'demo123', name: 'Dr. Allan Msando', role: 'manager', site: 'All Sites' },
    { id: 'user_admin', email: 'admin@safesite.com', password: 'demo123', name: 'Admin User', role: 'admin', site: 'All Sites' },
  ],

  // Get currently logged-in user
  getCurrentUser() {
    const raw = localStorage.getItem('safesite_currentUser');
    return raw ? JSON.parse(raw) : null;
  },

  // Sign in with email/password
  signIn(email, password) {
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
  demoSignIn() {
    return this.signIn('supervisor@safesite.com', 'demo123');
  },

  // Sign out
  signOut() {
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
  }
};
