// ============================================
// SafeSite — Dashboard Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.requireAuth();
  if (!user) return;

  UI.populateSidebar(user);
  UI.initSidebar();
  UI.initSignOut();

  loadStats();
  loadActivityFeed();
  loadUrgencyChart();
  loadHighUrgencyAlerts();
  updateNotificationBadge();
});

function loadStats() {
  const today = UI.today();

  // Reports today
  const allReports = SafeSiteDB.getAll('dailyReports');
  const todayReports = allReports.filter(r => r.date === today);
  document.getElementById('stat-reports-today').textContent = todayReports.length;

  // Open incidents
  const allIncidents = SafeSiteDB.getAll('safetyIncidents');
  const openIncidents = allIncidents.filter(i => i.status !== 'Resolved');
  document.getElementById('stat-open-incidents').textContent = openIncidents.length;

  // High urgency (open)
  const highUrgency = allIncidents.filter(i => i.urgency === 'High' && i.status !== 'Resolved');
  document.getElementById('stat-high-urgency').textContent = highUrgency.length;

  // Average completion %
  if (allReports.length > 0) {
    const avg = Math.round(allReports.reduce((sum, r) => sum + (r.completionPct || 0), 0) / allReports.length);
    document.getElementById('stat-avg-completion').textContent = avg + '%';
  }
}

function loadActivityFeed() {
  const feed = document.getElementById('activity-feed');
  const empty = document.getElementById('activity-empty');

  // Combine reports and incidents, sort by createdAt
  const reports = SafeSiteDB.getAll('dailyReports').map(r => ({ ...r, _type: 'report' }));
  const incidents = SafeSiteDB.getAll('safetyIncidents').map(i => ({ ...i, _type: 'incident' }));

  const all = [...reports, ...incidents]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  if (all.length === 0) {
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';
  feed.innerHTML = all.map(item => {
    if (item._type === 'report') {
      return `
        <li class="activity-item">
          <div class="activity-icon report">📝</div>
          <div class="activity-text">
            <p><span class="highlight">${item.submittedByName || 'Unknown'}</span> submitted a daily report for <span class="highlight">${item.siteName}</span></p>
            <div class="activity-time">${UI.timeAgo(item.createdAt)} · ${item.completionPct}% complete · ${item.weather}</div>
          </div>
        </li>
      `;
    } else {
      const isResolved = item.status === 'Resolved';
      return `
        <li class="activity-item">
          <div class="activity-icon ${isResolved ? 'resolved' : 'incident'}">${isResolved ? '✅' : '🚨'}</div>
          <div class="activity-text">
            <p><span class="highlight">${item.reportedByName || 'Unknown'}</span> reported a <span class="highlight">${item.incidentType}</span> incident at <span class="highlight">${item.siteName}</span></p>
            <div class="activity-time">${UI.timeAgo(item.createdAt)} · ${UI.urgencyBadge(item.urgency)} ${UI.statusBadge(item.status)}</div>
          </div>
        </li>
      `;
    }
  }).join('');
}

function loadUrgencyChart() {
  const incidents = SafeSiteDB.getAll('safetyIncidents');
  const low = incidents.filter(i => i.urgency === 'Low').length;
  const medium = incidents.filter(i => i.urgency === 'Medium').length;
  const high = incidents.filter(i => i.urgency === 'High').length;
  const total = incidents.length || 1;

  // Update bars with animation delay
  setTimeout(() => {
    document.getElementById('bar-low').style.width = (low / total * 100) + '%';
    document.getElementById('bar-low').textContent = low;
    document.getElementById('count-low').textContent = low;

    document.getElementById('bar-medium').style.width = (medium / total * 100) + '%';
    document.getElementById('bar-medium').textContent = medium;
    document.getElementById('count-medium').textContent = medium;

    document.getElementById('bar-high').style.width = (high / total * 100) + '%';
    document.getElementById('bar-high').textContent = high;
    document.getElementById('count-high').textContent = high;
  }, 300);

  // Type breakdown
  const types = {};
  incidents.forEach(i => { types[i.incidentType] = (types[i.incidentType] || 0) + 1; });
  const typeDiv = document.getElementById('type-breakdown');
  typeDiv.innerHTML = Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `<span class="badge badge-open" style="font-size: 0.8rem;">${type}: ${count}</span>`)
    .join('');
}

function loadHighUrgencyAlerts() {
  const incidents = SafeSiteDB.getAll('safetyIncidents')
    .filter(i => i.urgency === 'High' && i.status !== 'Resolved');
  
  const tbody = document.getElementById('alerts-tbody');
  const empty = document.getElementById('alerts-empty');
  const table = document.getElementById('alerts-table');

  if (incidents.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  table.classList.remove('hidden');
  empty.classList.add('hidden');

  tbody.innerHTML = incidents.map(i => `
    <tr>
      <td>${UI.formatDateTime(i.dateTime)}</td>
      <td>${i.siteName}</td>
      <td>${i.incidentType}</td>
      <td>${i.locationOnSite}</td>
      <td>${UI.urgencyBadge(i.urgency)}</td>
      <td>${UI.statusBadge(i.status)}</td>
    </tr>
  `).join('');
}

function updateNotificationBadge() {
  const high = SafeSiteDB.getAll('safetyIncidents')
    .filter(i => i.urgency === 'High' && i.status !== 'Resolved').length;

  const notifBadge = document.getElementById('notif-badge');
  const navBadge = document.getElementById('incident-nav-badge');

  if (high > 0) {
    notifBadge.textContent = high;
    notifBadge.style.display = 'flex';
    navBadge.textContent = high;
    navBadge.style.display = 'inline-block';
  }
}
