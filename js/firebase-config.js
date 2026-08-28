// ============================================
// SafeSite — Firebase Configuration & Data Layer
// ============================================

const DEMO_MODE = false; // Firebase is actively connected to safesite-93be8!

const firebaseConfig = {
  apiKey: "AIzaSyBrj49ySYF1RBZgpBKZR1oIgDW92d9mWJ8",
  authDomain: "safesite-93be8.firebaseapp.com",
  projectId: "safesite-93be8",
  storageBucket: "safesite-93be8.firebasestorage.app",
  messagingSenderId: "213156576491",
  appId: "1:213156576491:web:26a08f59c35fc5162012ae"
};

// ============================================
// Firebase Initialization
// ============================================

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;

if (!DEMO_MODE && typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.app();
    }
    firebaseAuth = firebase.auth();
    firebaseDB = firebase.firestore();
    console.log('✅ Connected to Firestore database for project: safesite-93be8');
  } catch (err) {
    console.error('❌ Firebase initialization error:', err);
  }
}

// ============================================
// SafeSiteDB — Unified Data Layer
// Synchronizes Firestore Cloud Database & Local Storage
// ============================================

const SafeSiteDB = {

  // Check if Firestore is actively available
  isFirebase() {
    return Boolean(firebaseDB);
  },

  // Helper: Format Firestore document data into standard JS object
  _formatDoc(doc) {
    if (!doc) return null;
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    const formatted = { id: doc.id || data.id, ...data };

    // Convert Firestore Timestamp objects to ISO strings
    ['createdAt', 'updatedAt', 'dateTime', 'date'].forEach(field => {
      if (formatted[field] && typeof formatted[field].toDate === 'function') {
        formatted[field] = formatted[field].toDate().toISOString();
      }
    });

    return formatted;
  },

  // Helper: Remove undefined values before saving to Firestore
  _cleanForFirestore(obj) {
    const clean = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined && obj[key] !== null) {
        clean[key] = obj[key];
      }
    });
    return clean;
  },

  // ============================================
  // LOCAL STORAGE HELPERS
  // ============================================

  _getCollection(name) {
    try {
      const raw = localStorage.getItem(`safesite_${name}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  _saveCollection(name, data) {
    try {
      localStorage.setItem(`safesite_${name}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },

  // ============================================
  // UNIFIED CRUD API
  // ============================================

  // Add or Create a document in Firestore & Local Storage
  async add(collection, doc) {
    const docId = doc.id || ('doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const nowIso = new Date().toISOString();

    const localDoc = {
      ...doc,
      id: docId,
      createdAt: doc.createdAt || nowIso
    };

    // Update local store immediately for instant UI response
    const localData = this._getCollection(collection);
    const existingIdx = localData.findIndex(d => d.id === docId);
    if (existingIdx >= 0) {
      localData[existingIdx] = localDoc;
    } else {
      localData.unshift(localDoc);
    }
    this._saveCollection(collection, localData);

    // Save directly to Firestore Cloud Database
    if (this.isFirebase()) {
      try {
        const firestoreData = this._cleanForFirestore({
          ...localDoc,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await firebaseDB.collection(collection).doc(docId).set(firestoreData, { merge: true });
        console.log(`🔥 Document saved to Firestore [${collection}/${docId}]`);
        return { ...localDoc, id: docId };
      } catch (err) {
        console.error(`Firestore save failed for [${collection}]:`, err);
      }
    }

    return localDoc;
  },

  // Get all documents from a collection (Firestore first, fallback to local)
  async getAll(collection) {
    if (this.isFirebase()) {
      try {
        const snapshot = await firebaseDB.collection(collection).get();
        if (!snapshot.empty) {
          const results = snapshot.docs.map(doc => this._formatDoc(doc));

          // Sort in memory by date/createdAt descending
          results.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.date || a.dateTime || 0).getTime();
            const timeB = new Date(b.createdAt || b.date || b.dateTime || 0).getTime();
            return timeB - timeA;
          });

          // Sync back to local store cache
          this._saveCollection(collection, results);
          return results;
        }
      } catch (err) {
        console.warn(`Firestore getAll('${collection}') notice, using local cache:`, err);
      }
    }

    // Fallback to local storage
    const local = this._getCollection(collection);
    local.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || a.dateTime || 0).getTime();
      const timeB = new Date(b.createdAt || b.date || b.dateTime || 0).getTime();
      return timeB - timeA;
    });
    return local;
  },

  // Get a single document by ID
  async getById(collection, id) {
    if (this.isFirebase()) {
      try {
        const doc = await firebaseDB.collection(collection).doc(id).get();
        if (doc.exists) {
          return this._formatDoc(doc);
        }
      } catch (err) {
        console.warn(`Firestore getById error:`, err);
      }
    }

    return this._getCollection(collection).find(d => d.id === id) || null;
  },

  // Update a document in Firestore & Local Storage
  async update(collection, id, updates) {
    const nowIso = new Date().toISOString();

    // Update Local Storage
    const localData = this._getCollection(collection);
    const idx = localData.findIndex(d => d.id === id);
    let updatedDoc = { id, ...updates, updatedAt: nowIso };
    if (idx !== -1) {
      updatedDoc = { ...localData[idx], ...updates, updatedAt: nowIso };
      localData[idx] = updatedDoc;
      this._saveCollection(collection, localData);
    }

    // Update Firestore
    if (this.isFirebase()) {
      try {
        const cleanUpdates = this._cleanForFirestore({
          ...updates,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await firebaseDB.collection(collection).doc(id).set(cleanUpdates, { merge: true });
        console.log(`🔥 Document updated in Firestore [${collection}/${id}]`);
      } catch (err) {
        console.error(`Firestore update error for [${collection}/${id}]:`, err);
      }
    }

    return updatedDoc;
  },

  // Delete a document from Firestore & Local Storage
  async remove(collection, id) {
    // Remove from Local Storage
    const localData = this._getCollection(collection).filter(d => d.id !== id);
    this._saveCollection(collection, localData);

    // Remove from Firestore
    if (this.isFirebase()) {
      try {
        await firebaseDB.collection(collection).doc(id).delete();
        console.log(`🔥 Document deleted from Firestore [${collection}/${id}]`);
      } catch (err) {
        console.error(`Firestore delete error for [${collection}/${id}]:`, err);
      }
    }
  },

  // Query with filters (Safely evaluated without throwing composite index errors)
  async query(collection, filters = {}) {
    // Get all docs from Firestore or cache
    const all = await this.getAll(collection);

    return all.filter(d => {
      let match = true;

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          if (key === 'dateFrom') {
            const dVal = (d.date || d.dateTime || '').split('T')[0];
            if (dVal && dVal < value) match = false;
          } else if (key === 'dateTo') {
            const dVal = (d.date || d.dateTime || '').split('T')[0];
            if (dVal && dVal > value) match = false;
          } else if (key === 'urgency') {
            if (d.urgency !== value) match = false;
          } else if (key === 'status') {
            if (d.status !== value) match = false;
          } else if (key === 'siteName') {
            if (d.siteName !== value) match = false;
          } else if (d[key] !== value) {
            match = false;
          }
        }
      });

      return match;
    });
  },

  // Count documents
  async count(collection, filters = {}) {
    const results = await this.query(collection, filters);
    return results.length;
  },

  // ============================================
  // INITIAL SEEDING & FIRESTORE SYNC
  // ============================================

  async seedIfEmpty() {
    // 1. Ensure local cache has baseline data
    if (this._getCollection('sites').length === 0) this._seedSites();
    if (this._getCollection('dailyReports').length === 0) this._seedDailyReports();
    if (this._getCollection('safetyIncidents').length === 0) this._seedSafetyIncidents();
    if (this._getCollection('users').length === 0) this._seedUsers();

    // 2. Synchronize to Firestore if Firestore collections are empty
    if (this.isFirebase()) {
      try {
        const sitesSnap = await firebaseDB.collection('sites').limit(1).get();
        if (sitesSnap.empty) {
          console.log('🔄 Syncing initial site data to Firestore...');
          const sites = this._getCollection('sites');
          for (const s of sites) {
            await firebaseDB.collection('sites').doc(s.id).set(this._cleanForFirestore(s), { merge: true });
          }
        }

        const reportsSnap = await firebaseDB.collection('dailyReports').limit(1).get();
        if (reportsSnap.empty) {
          console.log('🔄 Syncing initial daily reports to Firestore...');
          const reports = this._getCollection('dailyReports');
          for (const r of reports) {
            await firebaseDB.collection('dailyReports').doc(r.id).set(this._cleanForFirestore(r), { merge: true });
          }
        }

        const incidentsSnap = await firebaseDB.collection('safetyIncidents').limit(1).get();
        if (incidentsSnap.empty) {
          console.log('🔄 Syncing initial safety incidents to Firestore...');
          const incidents = this._getCollection('safetyIncidents');
          for (const inc of incidents) {
            await firebaseDB.collection('safetyIncidents').doc(inc.id).set(this._cleanForFirestore(inc), { merge: true });
          }
        }

        const usersSnap = await firebaseDB.collection('users').limit(1).get();
        if (usersSnap.empty) {
          console.log('🔄 Syncing user profiles to Firestore...');
          const users = this._getCollection('users');
          for (const u of users) {
            await firebaseDB.collection('users').doc(u.id).set(this._cleanForFirestore(u), { merge: true });
          }
        }
      } catch (err) {
        console.warn('Firestore initial sync notice:', err);
      }
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

// Initialize seed data and synchronize with Firestore
SafeSiteDB.seedIfEmpty();

