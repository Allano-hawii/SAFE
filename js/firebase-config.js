// ============================================
// SafeSite — Firebase Configuration
// ============================================
// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Open your project → Project Settings → General → Your apps → Web app
// 3. Copy the config values below
// 4. Set DEMO_MODE to false to use real Firebase

// ============================================
// 🔧 CONFIGURATION — EDIT THESE VALUES
// ============================================

const DEMO_MODE = false; // Firebase is now configured!

const firebaseConfig = {
  apiKey: "AIzaSyBrj49ySYF1RBZgpBKZR1oIgDW92d9mWJ8",
  authDomain: "safesite-93be8.firebaseapp.com",
  projectId: "safesite-93be8",
  storageBucket: "safesite-93be8.firebasestorage.app",
  messagingSenderId: "213156576491",
  appId: "1:213156576491:web:26a08f59c35fc5162012ae",
  measurementId: "G-DBE9B1YRKW"
};

// ============================================
// Firebase Initialization (only when not in demo mode)
// ============================================

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;

if (!DEMO_MODE) {
  // Firebase is loaded via CDN in HTML files
  // These will be available after firebase scripts load
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDB = firebase.firestore();
    console.log('✅ Firebase initialized successfully');
  } catch (err) {
    console.error('❌ Firebase initialization failed:', err);
    console.warn('⚠️ Falling back to demo mode');
  }
}

// ============================================
// SafeSiteDB — Unified Data Layer
// Provides the same API for both Firebase and Demo mode
// ============================================

const SafeSiteDB = {

  // ---- Mode Detection ----
  isFirebase() {
    return !DEMO_MODE && firebaseDB !== null;
  },

  // ============================================
  // LOCAL STORAGE (DEMO MODE) HELPERS
  // ============================================

  _getCollection(name) {
    const raw = localStorage.getItem(`safesite_${name}`);
    return raw ? JSON.parse(raw) : [];
  },

  _saveCollection(name, data) {
    localStorage.setItem(`safesite_${name}`, JSON.stringify(data));
  },

  // ============================================
  // UNIFIED CRUD API
  // ============================================

  // Add a document to a collection
  async add(collection, doc) {
    // Always save to localStorage for fallback
    const localDoc = { ...doc };
    localDoc.id = localDoc.id || 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    localDoc.createdAt = new Date().toISOString();
    const data = this._getCollection(collection);
    data.unshift(localDoc);
    this._saveCollection(collection, data);

    if (this.isFirebase()) {
      try {
        doc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await firebaseDB.collection(collection).add(doc);
        return { ...doc, id: ref.id };
      } catch (err) {
        console.warn('Firebase add failed, saved locally:', err);
      }
    }

    return localDoc;
  },

  // Get all documents from a collection
  async getAll(collection) {
    if (this.isFirebase()) {
      try {
        const snapshot = await firebaseDB.collection(collection)
          .orderBy('createdAt', 'desc')
          .get();
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (results.length > 0) return results;
        // Firestore empty — fall through to localStorage
      } catch (err) {
        console.warn(`Firebase getAll('${collection}') failed, using localStorage:`, err);
      }
    }

    return this._getCollection(collection);
  },

  // Get a single document by ID
  async getById(collection, id) {
    if (this.isFirebase()) {
      const doc = await firebaseDB.collection(collection).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    return this._getCollection(collection).find(d => d.id === id) || null;
  },

  // Update a document
  async update(collection, id, updates) {
    if (this.isFirebase()) {
      updates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await firebaseDB.collection(collection).doc(id).update(updates);
      return { id, ...updates };
    }

    // Demo mode
    const data = this._getCollection(collection);
    const idx = data.findIndex(d => d.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    this._saveCollection(collection, data);
    return data[idx];
  },

  // Delete a document
  async remove(collection, id) {
    if (this.isFirebase()) {
      await firebaseDB.collection(collection).doc(id).delete();
      return;
    }

    const data = this._getCollection(collection).filter(d => d.id !== id);
    this._saveCollection(collection, data);
  },

  // Query with filters
  async query(collection, filters = {}) {
    if (this.isFirebase()) {
      let query = firebaseDB.collection(collection);

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          if (key === 'dateFrom') {
            query = query.where('date', '>=', value);
          } else if (key === 'dateTo') {
            query = query.where('date', '<=', value + 'T23:59:59');
          } else {
            query = query.where(key, '==', value);
          }
        }
      });

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Demo mode
    let data = this._getCollection(collection);

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        data = data.filter(d => {
          if (key === 'dateFrom') return new Date(d.date || d.dateTime) >= new Date(value);
          if (key === 'dateTo') return new Date(d.date || d.dateTime) <= new Date(value + 'T23:59:59');
          return d[key] === value;
        });
      }
    });

    return data;
  },

  // Count documents
  async count(collection, filters = {}) {
    const results = await this.query(collection, filters);
    return results.length;
  },

  // ============================================
  // DEMO DATA SEEDING
  // ============================================

  seedIfEmpty() {
    // Always seed localStorage so demo data is available as fallback

    if (this._getCollection('dailyReports').length === 0) {
      this._seedDailyReports();
    }
    if (this._getCollection('safetyIncidents').length === 0) {
      this._seedSafetyIncidents();
    }
    if (this._getCollection('sites').length === 0) {
      this._seedSites();
    }
    if (this._getCollection('users').length === 0) {
      this._seedUsers();
    }
  },

  _seedUsers() {
    const users = [
      { id: 'user_demo', email: 'supervisor@safesite.com', name: 'James Ochieng', role: 'supervisor', site: 'Riverside Tower Complex', authProvider: 'demo', createdAt: new Date().toISOString() },
      { id: 'user_mgr', email: 'manager@safesite.com', name: 'Dr. Allan Msando', role: 'manager', site: 'All Sites', authProvider: 'demo', createdAt: new Date().toISOString() },
      { id: 'user_admin', email: 'admin@safesite.com', name: 'Admin User', role: 'admin', site: 'All Sites', authProvider: 'demo', createdAt: new Date().toISOString() },
    ];
    this._saveCollection('users', users);
  },

  _seedSites() {
    const sites = [
      { id: 'site_1', name: 'Riverside Tower Complex', location: 'Nairobi, CBD', status: 'Active' },
      { id: 'site_2', name: 'Westlands Mall Extension', location: 'Westlands, Nairobi', status: 'Active' },
      { id: 'site_3', name: 'Industrial Park Phase 2', location: 'Athi River', status: 'Active' },
      { id: 'site_4', name: 'Greenfield Apartments', location: 'Kilimani, Nairobi', status: 'On Hold' },
    ];
    this._saveCollection('sites', sites);
  },

  _seedDailyReports() {
    const now = new Date();
    const reports = [
      {
        id: 'dr_001', date: new Date(now - 86400000 * 0).toISOString().split('T')[0],
        siteName: 'Riverside Tower Complex', weather: 'Clear',
        workCompleted: 'Completed formwork for 4th floor slab. Rebar installation 80% done on columns C1-C12. Concrete pour scheduled for tomorrow morning.',
        materialsUsed: ['Concrete 32.5R - 45 bags', 'Rebar Y16 - 120 pieces', 'Formwork plywood - 30 sheets'],
        laborSkilled: 18, laborUnskilled: 32, completionPct: 42,
        equipmentStatus: 'Operational', notes: 'Crane inspection passed. All equipment operational.',
        submittedBy: 'user_demo', submittedByName: 'James Ochieng', createdAt: new Date(now - 3600000 * 2).toISOString()
      },
      {
        id: 'dr_002', date: new Date(now - 86400000 * 1).toISOString().split('T')[0],
        siteName: 'Westlands Mall Extension', weather: 'Rainy',
        workCompleted: 'Interior finishing work on Level 2. Electrical conduit installation in progress. Rain delayed exterior work by 3 hours.',
        materialsUsed: ['Electrical conduit 25mm - 200m', 'Junction boxes - 45 pcs', 'Plaster - 20 bags'],
        laborSkilled: 24, laborUnskilled: 15, completionPct: 67,
        equipmentStatus: 'Operational', notes: 'Rain delay documented. Will extend schedule by half day.',
        submittedBy: 'user_demo', submittedByName: 'Sarah Wanjiku', createdAt: new Date(now - 86400000 * 1).toISOString()
      },
      {
        id: 'dr_003', date: new Date(now - 86400000 * 2).toISOString().split('T')[0],
        siteName: 'Industrial Park Phase 2', weather: 'Overcast',
        workCompleted: 'Foundation excavation for Block C complete. Started base compaction. Site survey verification done.',
        materialsUsed: ['Murram - 8 lorries', 'Hardcore - 5 lorries', 'BRC mesh A142 - 15 sheets'],
        laborSkilled: 12, laborUnskilled: 40, completionPct: 23,
        equipmentStatus: 'Needs Repair', notes: 'Excavator hydraulic line leaking. Mechanic called for tomorrow AM.',
        submittedBy: 'user_demo', submittedByName: 'Peter Mutua', createdAt: new Date(now - 86400000 * 2).toISOString()
      },
      {
        id: 'dr_004', date: new Date(now - 86400000 * 3).toISOString().split('T')[0],
        siteName: 'Riverside Tower Complex', weather: 'Clear',
        workCompleted: '3rd floor slab curing ongoing. Started column formwork for 4th floor. Material delivery received and verified.',
        materialsUsed: ['Timber 2x4 - 100 pieces', 'Nails 4 inch - 20kg', 'Binding wire - 50kg'],
        laborSkilled: 16, laborUnskilled: 28, completionPct: 38,
        equipmentStatus: 'Operational', notes: 'All materials verified against BQ. No discrepancies.',
        submittedBy: 'user_demo', submittedByName: 'James Ochieng', createdAt: new Date(now - 86400000 * 3).toISOString()
      },
    ];
    this._saveCollection('dailyReports', reports);
  },

  _seedSafetyIncidents() {
    const now = new Date();
    const incidents = [
      {
        id: 'si_001', dateTime: new Date(now - 3600000 * 3).toISOString(),
        siteName: 'Riverside Tower Complex', locationOnSite: 'Block A, 4th Floor, East Wing',
        incidentType: 'Fall', urgency: 'High',
        description: 'Worker slipped on wet concrete near column C7. Guardrails were not yet installed on the eastern edge. Worker sustained minor knee injury.',
        injuriesReported: true, injuryDetails: 'Minor knee abrasion. First aid administered on site. Worker rested for 2 hours before resuming light duties.',
        actionTaken: 'Area cordoned off immediately. Temporary guardrails installed within 1 hour. All workers briefed on wet surface hazards.',
        status: 'Under Review', reportedBy: 'user_demo', reportedByName: 'James Ochieng',
        createdAt: new Date(now - 3600000 * 3).toISOString()
      },
      {
        id: 'si_002', dateTime: new Date(now - 86400000 * 1).toISOString(),
        siteName: 'Westlands Mall Extension', locationOnSite: 'Basement Level 1, Electrical Room',
        incidentType: 'Electrical', urgency: 'High',
        description: 'Exposed wiring found near the main switchboard area during routine inspection. No incident occurred but presents serious electrocution risk.',
        injuriesReported: false, injuryDetails: null,
        actionTaken: 'Power supply to the section disconnected. Electrician team dispatched. Area marked as restricted zone.',
        status: 'Open', reportedBy: 'user_demo', reportedByName: 'Sarah Wanjiku',
        createdAt: new Date(now - 86400000 * 1).toISOString()
      },
      {
        id: 'si_003', dateTime: new Date(now - 86400000 * 2).toISOString(),
        siteName: 'Industrial Park Phase 2', locationOnSite: 'Block C Excavation Trench',
        incidentType: 'Near-Miss', urgency: 'Medium',
        description: 'Trench wall partially collapsed during excavation. No workers were in the trench at the time. Soil was saturated from previous rains.',
        injuriesReported: false, injuryDetails: null,
        actionTaken: 'Trench work suspended. Shoring materials ordered. Geotechnical assessment requested before resuming.',
        status: 'Open', reportedBy: 'user_demo', reportedByName: 'Peter Mutua',
        createdAt: new Date(now - 86400000 * 2).toISOString()
      },
      {
        id: 'si_004', dateTime: new Date(now - 86400000 * 4).toISOString(),
        siteName: 'Riverside Tower Complex', locationOnSite: 'Material Storage Area',
        incidentType: 'Equipment Failure', urgency: 'Low',
        description: 'Wheelbarrow tyre burst during material transportation. Cement bags had to be manually carried for approximately 30 minutes.',
        injuriesReported: false, injuryDetails: null,
        actionTaken: 'Wheelbarrow replaced from site stores. Spare tyres ordered for contingency.',
        status: 'Resolved', reportedBy: 'user_demo', reportedByName: 'James Ochieng',
        createdAt: new Date(now - 86400000 * 4).toISOString()
      },
      {
        id: 'si_005', dateTime: new Date(now - 86400000 * 5).toISOString(),
        siteName: 'Greenfield Apartments', locationOnSite: 'Scaffolding Section B2',
        incidentType: 'Structural', urgency: 'High',
        description: 'Scaffolding inspection revealed loose couplers and missing toe boards on sections B2-B4. Scaffolding in use by plastering team.',
        injuriesReported: false, injuryDetails: null,
        actionTaken: 'Scaffolding section taken out of service. Full re-inspection of all scaffolding ordered. Plastering team reassigned to interior work.',
        status: 'Resolved', reportedBy: 'user_demo', reportedByName: 'Mary Akinyi',
        createdAt: new Date(now - 86400000 * 5).toISOString()
      },
    ];
    this._saveCollection('safetyIncidents', incidents);
  }
};

// Initialize demo data on first load
SafeSiteDB.seedIfEmpty();
