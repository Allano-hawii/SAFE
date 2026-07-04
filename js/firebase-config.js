// ============================================
// SafeSite — Firebase Configuration
// ============================================
// INSTRUCTIONS: Replace the config below with your
// actual Firebase project credentials from:
// https://console.firebase.google.com → Project Settings → Web App

const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "safesite-demo.firebaseapp.com",
  projectId: "safesite-demo",
  storageBucket: "safesite-demo.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};

// ============================================
// DEMO MODE — Local Storage Mock Database
// ============================================
// Since Firebase isn't configured yet, the app runs
// in full demo mode using localStorage. All CRUD
// operations work locally. Replace with real Firebase
// calls when you have a project.

const DEMO_MODE = true;

const SafeSiteDB = {
  // --- Generic CRUD via localStorage ---
  _getCollection(name) {
    const raw = localStorage.getItem(`safesite_${name}`);
    return raw ? JSON.parse(raw) : [];
  },

  _saveCollection(name, data) {
    localStorage.setItem(`safesite_${name}`, JSON.stringify(data));
  },

  // Add a document to a collection
  add(collection, doc) {
    const data = this._getCollection(collection);
    doc.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    doc.createdAt = new Date().toISOString();
    data.unshift(doc); // newest first
    this._saveCollection(collection, data);
    return doc;
  },

  // Get all documents from a collection
  getAll(collection) {
    return this._getCollection(collection);
  },

  // Get a single document by ID
  getById(collection, id) {
    return this._getCollection(collection).find(d => d.id === id) || null;
  },

  // Update a document
  update(collection, id, updates) {
    const data = this._getCollection(collection);
    const idx = data.findIndex(d => d.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...updates, updatedAt: new Date().toISOString() };
    this._saveCollection(collection, data);
    return data[idx];
  },

  // Delete a document
  remove(collection, id) {
    const data = this._getCollection(collection).filter(d => d.id !== id);
    this._saveCollection(collection, data);
  },

  // Query with filters
  query(collection, filters = {}) {
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
  count(collection, filters = {}) {
    return this.query(collection, filters).length;
  },

  // Seed demo data if empty
  seedIfEmpty() {
    if (this._getCollection('dailyReports').length === 0) {
      this._seedDailyReports();
    }
    if (this._getCollection('safetyIncidents').length === 0) {
      this._seedSafetyIncidents();
    }
    if (this._getCollection('sites').length === 0) {
      this._seedSites();
    }
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
