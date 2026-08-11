// ============================================
// SafeSite — Shared UI Utilities
// ============================================

const UI = {
  // --- Toast Notifications ---
  toast(type, title, message, duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // --- Format Relative Time ---
  timeAgo(isoString) {
    const now = new Date();
    const then = new Date(isoString);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  // --- Format Date ---
  formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  // --- Urgency Badge ---
  urgencyBadge(level) {
    const map = {
      'Low': 'badge-low',
      'Medium': 'badge-medium',
      'High': 'badge-high'
    };
    return `<span class="badge ${map[level] || ''}">${level}</span>`;
  },

  // --- Status Badge ---
  statusBadge(status) {
    const map = {
      'Open': 'badge-open',
      'Under Review': 'badge-review',
      'Resolved': 'badge-resolved'
    };
    return `<span class="badge ${map[status] || ''}">${status}</span>`;
  },

  // --- Populate Sidebar User Info ---
  populateSidebar(user) {
    const avatarEl = document.getElementById('sidebar-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');

    if (avatarEl) avatarEl.textContent = Auth.getInitials(user.name);
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
  },

  // --- Mobile Sidebar Toggle ---
  initSidebar() {
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },

  // --- Sign Out ---
  initSignOut() {
    const btn = document.getElementById('sign-out-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.signOut();
      });
    }
  },

  // --- Tabs ---
  initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        // Deactivate all
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        // Activate target
        btn.classList.add('active');
        const panel = document.getElementById(target);
        if (panel) panel.classList.add('active');
      });
    });
  },

  // --- CSV Export ---
  exportCSV(data, columns, filename) {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row => {
      return columns.map(c => {
        let val = row[c.key];
        if (Array.isArray(val)) val = val.join('; ');
        if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
        return val ?? '';
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('success', 'Export Complete', `${filename} downloaded successfully.`);
  },

  // --- Get today's date in YYYY-MM-DD ---
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // --- Get current datetime-local value ---
  nowLocal() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  },

  // --- Get site options ---
  async getSiteOptions() {
    const sites = await SafeSiteDB.getAll('sites');
    return sites.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
  }
};
