// ============================================
// SafeSite — Reports Viewer Logic
// ============================================

let currentDailyData = [];
let currentIncidentData = [];
let dailySortKey = 'date';
let dailySortAsc = false;
let incidentSortKey = 'dateTime';
let incidentSortAsc = false;

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireAuth();
  if (!user) return;

  UI.populateSidebar(user);
  UI.initSidebar();
  UI.initSignOut();
  UI.initTabs();

  // Populate site dropdowns
  const siteOpts = '<option value="all">All Sites</option>' + await UI.getSiteOptions();
  document.getElementById('filter-daily-site').innerHTML = siteOpts;
  document.getElementById('filter-inc-site').innerHTML = siteOpts;

  // Load data
  await loadDailyReports();
  await loadIncidents();

  // Filter buttons
  document.getElementById('apply-daily-filters').addEventListener('click', loadDailyReports);
  document.getElementById('clear-daily-filters').addEventListener('click', async () => {
    document.getElementById('filter-daily-from').value = '';
    document.getElementById('filter-daily-to').value = '';
    document.getElementById('filter-daily-site').value = 'all';
    await loadDailyReports();
  });

  document.getElementById('apply-inc-filters').addEventListener('click', loadIncidents);
  document.getElementById('clear-inc-filters').addEventListener('click', async () => {
    document.getElementById('filter-inc-from').value = '';
    document.getElementById('filter-inc-to').value = '';
    document.getElementById('filter-inc-site').value = 'all';
    document.getElementById('filter-inc-urgency').value = 'all';
    document.getElementById('filter-inc-status').value = 'all';
    await loadIncidents();
  });

  // Sort headers — daily
  document.querySelectorAll('#daily-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (dailySortKey === key) { dailySortAsc = !dailySortAsc; }
      else { dailySortKey = key; dailySortAsc = true; }
      renderDailyTable();
    });
  });

  // Sort headers — incidents
  document.querySelectorAll('#incidents-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (incidentSortKey === key) { incidentSortAsc = !incidentSortAsc; }
      else { incidentSortKey = key; incidentSortAsc = true; }
      renderIncidentsTable();
    });
  });

  // Export buttons
  document.getElementById('export-daily-btn').addEventListener('click', exportDailyCSV);
  document.getElementById('export-incidents-btn').addEventListener('click', exportIncidentsCSV);
});

// ==================== DAILY REPORTS ====================

async function loadDailyReports() {
  const filters = {
    dateFrom: document.getElementById('filter-daily-from').value,
    dateTo: document.getElementById('filter-daily-to').value,
    siteName: document.getElementById('filter-daily-site').value,
  };

  currentDailyData = await SafeSiteDB.query('dailyReports', filters);
  renderDailyTable();
}

function renderDailyTable() {
  const tbody = document.getElementById('daily-tbody');
  const empty = document.getElementById('daily-empty');
  const table = document.getElementById('daily-table');

  // Sort
  const sorted = [...currentDailyData].sort((a, b) => {
    let va = a[dailySortKey], vb = b[dailySortKey];
    if (typeof va === 'number') return dailySortAsc ? va - vb : vb - va;
    va = String(va || '').toLowerCase();
    vb = String(vb || '').toLowerCase();
    return dailySortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  if (sorted.length === 0) {
    table.querySelector('thead').style.display = 'none';
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  table.querySelector('thead').style.display = '';
  empty.classList.add('hidden');

  tbody.innerHTML = sorted.map(r => {
    const equipClass = r.equipmentStatus === 'Operational' ? 'text-green' :
                       r.equipmentStatus === 'Needs Repair' ? 'text-orange' : 'text-red';
    return `
      <tr class="expandable" onclick="showDailyDetail('${r.id}')">
        <td>${UI.formatDate(r.date)}</td>
        <td>${r.siteName}</td>
        <td>${r.weather}</td>
        <td>${r.laborSkilled}</td>
        <td>${r.laborUnskilled}</td>
        <td>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <div style="flex:1; height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
              <div style="width:${r.completionPct}%; height:100%; background: linear-gradient(90deg, var(--accent-orange), var(--warning-amber)); border-radius:3px;"></div>
            </div>
            <span style="font-size:0.82rem; font-weight:600; min-width:35px;">${r.completionPct}%</span>
          </div>
        </td>
        <td><span class="${equipClass} fw-600">${r.equipmentStatus}</span></td>
        <td>${r.submittedByName || '—'}</td>
      </tr>
    `;
  }).join('');
}

async function showDailyDetail(id) {
  const r = await SafeSiteDB.getById('dailyReports', id);
  if (!r) return;

  document.getElementById('modal-title').textContent = `Daily Report — ${r.siteName}`;
  document.getElementById('modal-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Date</label><p>${UI.formatDate(r.date)}</p></div>
      <div class="detail-item"><label>Site</label><p>${r.siteName}</p></div>
      <div class="detail-item"><label>Weather</label><p>${r.weather}</p></div>
      <div class="detail-item"><label>Equipment</label><p>${r.equipmentStatus}</p></div>
      <div class="detail-item"><label>Skilled Labor</label><p>${r.laborSkilled}</p></div>
      <div class="detail-item"><label>Unskilled Labor</label><p>${r.laborUnskilled}</p></div>
      <div class="detail-item"><label>Completion</label><p style="font-size:1.2rem; font-weight:700; color:var(--accent-orange);">${r.completionPct}%</p></div>
      <div class="detail-item"><label>Submitted By</label><p>${r.submittedByName || '—'}</p></div>
    </div>
    <div style="margin-top:1.25rem;">
      <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Work Completed</label>
      <p style="font-size:0.9rem; line-height:1.6; background:var(--bg-primary); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">${r.workCompleted}</p>
    </div>
    ${r.materialsUsed && r.materialsUsed.length > 0 ? `
      <div style="margin-top:1rem;">
        <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Materials Used</label>
        <ul style="list-style:none; display:flex; flex-wrap:wrap; gap:0.4rem;">
          ${r.materialsUsed.map(m => `<li class="badge badge-open">${m}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    ${r.notes ? `
      <div style="margin-top:1rem;">
        <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Notes</label>
        <p style="font-size:0.9rem; color:var(--text-secondary);">${r.notes}</p>
      </div>
    ` : ''}
    <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted);">
      Submitted: ${UI.formatDateTime(r.createdAt)}
    </div>
  `;

  openModal();
}

// ==================== INCIDENTS ====================

async function loadIncidents() {
  const filters = {
    dateFrom: document.getElementById('filter-inc-from').value,
    dateTo: document.getElementById('filter-inc-to').value,
    siteName: document.getElementById('filter-inc-site').value,
    urgency: document.getElementById('filter-inc-urgency').value,
    status: document.getElementById('filter-inc-status').value,
  };

  currentIncidentData = await SafeSiteDB.query('safetyIncidents', filters);
  renderIncidentsTable();
}

function renderIncidentsTable() {
  const tbody = document.getElementById('incidents-tbody');
  const empty = document.getElementById('incidents-empty');
  const table = document.getElementById('incidents-table');

  const urgencyOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };

  const sorted = [...currentIncidentData].sort((a, b) => {
    let va = a[incidentSortKey], vb = b[incidentSortKey];
    if (incidentSortKey === 'urgency') {
      va = urgencyOrder[va] || 0;
      vb = urgencyOrder[vb] || 0;
      return incidentSortAsc ? va - vb : vb - va;
    }
    va = String(va || '').toLowerCase();
    vb = String(vb || '').toLowerCase();
    return incidentSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  if (sorted.length === 0) {
    table.querySelector('thead').style.display = 'none';
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  table.querySelector('thead').style.display = '';
  empty.classList.add('hidden');

  tbody.innerHTML = sorted.map(i => `
    <tr class="expandable" onclick="showIncidentDetail('${i.id}')">
      <td>${UI.formatDateTime(i.dateTime)}</td>
      <td>${i.siteName}</td>
      <td>${i.incidentType}</td>
      <td>${i.locationOnSite}</td>
      <td>${UI.urgencyBadge(i.urgency)}</td>
      <td>${UI.statusBadge(i.status)}</td>
      <td>${i.reportedByName || '—'}</td>
      <td><button class="btn btn-ghost btn-icon" title="View details">👁️</button></td>
    </tr>
  `).join('');
}

async function showIncidentDetail(id) {
  const i = await SafeSiteDB.getById('safetyIncidents', id);
  if (!i) return;

  document.getElementById('modal-title').textContent = `Incident — ${i.incidentType} at ${i.siteName}`;
  document.getElementById('modal-body').innerHTML = `
    <div style="display:flex; gap:0.5rem; margin-bottom:1.25rem;">
      ${UI.urgencyBadge(i.urgency)} ${UI.statusBadge(i.status)}
    </div>
    <div class="detail-grid">
      <div class="detail-item"><label>Date & Time</label><p>${UI.formatDateTime(i.dateTime)}</p></div>
      <div class="detail-item"><label>Site</label><p>${i.siteName}</p></div>
      <div class="detail-item"><label>Location</label><p>${i.locationOnSite}</p></div>
      <div class="detail-item"><label>Type</label><p>${i.incidentType}</p></div>
      <div class="detail-item"><label>Reported By</label><p>${i.reportedByName || '—'}</p></div>
      <div class="detail-item"><label>Injuries</label><p>${i.injuriesReported ? '🔴 Yes' : '🟢 No'}</p></div>
    </div>
    <div style="margin-top:1.25rem;">
      <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Description</label>
      <p style="font-size:0.9rem; line-height:1.6; background:var(--bg-primary); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">${i.description}</p>
    </div>
    ${i.injuriesReported && i.injuryDetails ? `
      <div style="margin-top:1rem;">
        <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--danger-red); text-transform:uppercase; margin-bottom:0.4rem;">🩹 Injury Details</label>
        <p style="font-size:0.9rem; color:var(--text-secondary); background:rgba(239,68,68,0.05); padding:0.75rem 1rem; border-radius:var(--radius-md); border:1px solid rgba(239,68,68,0.2);">${i.injuryDetails}</p>
      </div>
    ` : ''}
    <div style="margin-top:1rem;">
      <label style="display:block; font-size:0.75rem; font-weight:500; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">Action Taken</label>
      <p style="font-size:0.9rem; line-height:1.6; background:var(--bg-primary); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-subtle);">${i.actionTaken}</p>
    </div>
    <div style="margin-top:1.25rem; display:flex; gap:0.5rem; justify-content:flex-end;">
      ${i.status !== 'Resolved' ? `
        <button class="btn btn-success" onclick="updateIncidentStatus('${i.id}', 'Resolved')">✅ Mark Resolved</button>
        ${i.status === 'Open' ? `<button class="btn btn-secondary" onclick="updateIncidentStatus('${i.id}', 'Under Review')">🔍 Mark Under Review</button>` : ''}
      ` : ''}
    </div>
    <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted);">
      Reported: ${UI.formatDateTime(i.createdAt)}
    </div>
  `;

  openModal();
}

async function updateIncidentStatus(id, newStatus) {
  await SafeSiteDB.update('safetyIncidents', id, { status: newStatus });
  closeModal();
  await loadIncidents();
  UI.toast('success', 'Status Updated', `Incident marked as "${newStatus}".`);
}

// ==================== MODAL ====================

function openModal() {
  const modal = document.getElementById('detail-modal');
  modal.style.display = 'block';
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function closeModal() {
  document.getElementById('detail-modal').style.display = 'none';
}

// ==================== CSV EXPORT ====================

function exportDailyCSV() {
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'siteName', label: 'Site Name' },
    { key: 'weather', label: 'Weather' },
    { key: 'workCompleted', label: 'Work Completed' },
    { key: 'materialsUsed', label: 'Materials Used' },
    { key: 'laborSkilled', label: 'Skilled Labor' },
    { key: 'laborUnskilled', label: 'Unskilled Labor' },
    { key: 'completionPct', label: 'Completion %' },
    { key: 'equipmentStatus', label: 'Equipment Status' },
    { key: 'notes', label: 'Notes' },
    { key: 'submittedByName', label: 'Submitted By' },
    { key: 'createdAt', label: 'Timestamp' },
  ];
  UI.exportCSV(currentDailyData, columns, `safesite_daily_reports_${UI.today()}.csv`);
}

function exportIncidentsCSV() {
  const columns = [
    { key: 'dateTime', label: 'Date/Time' },
    { key: 'siteName', label: 'Site Name' },
    { key: 'locationOnSite', label: 'Location' },
    { key: 'incidentType', label: 'Type' },
    { key: 'urgency', label: 'Urgency' },
    { key: 'description', label: 'Description' },
    { key: 'injuriesReported', label: 'Injuries' },
    { key: 'injuryDetails', label: 'Injury Details' },
    { key: 'actionTaken', label: 'Action Taken' },
    { key: 'status', label: 'Status' },
    { key: 'reportedByName', label: 'Reported By' },
    { key: 'createdAt', label: 'Timestamp' },
  ];
  UI.exportCSV(currentIncidentData, columns, `safesite_incidents_${UI.today()}.csv`);
}
