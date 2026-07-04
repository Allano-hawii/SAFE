// ============================================
// SafeSite — Daily Report Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.requireAuth();
  if (!user) return;

  UI.populateSidebar(user);
  UI.initSidebar();
  UI.initSignOut();

  // Set default date to today
  document.getElementById('report-date').value = UI.today();

  // Populate site dropdown
  document.getElementById('report-site').innerHTML = '<option value="">Select site...</option>' + UI.getSiteOptions();

  // Completion slider
  const slider = document.getElementById('report-completion');
  const display = document.getElementById('completion-display');
  slider.addEventListener('input', () => {
    display.textContent = slider.value + '%';
  });

  // Form submission
  document.getElementById('daily-report-form').addEventListener('submit', handleSubmit);
});

function addMaterialRow() {
  const list = document.getElementById('materials-list');
  const group = document.createElement('div');
  group.className = 'input-group';
  group.innerHTML = `
    <input type="text" class="form-control material-input" placeholder="e.g., Rebar Y16 — 120 pieces">
    <button type="button" class="btn btn-icon btn-danger" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(group);
  group.querySelector('input').focus();
}

function resetForm() {
  document.getElementById('daily-report-form').reset();
  document.getElementById('completion-display').textContent = '0%';
  document.getElementById('report-date').value = UI.today();
  // Clear extra material rows
  const list = document.getElementById('materials-list');
  const groups = list.querySelectorAll('.input-group');
  groups.forEach((g, i) => { if (i > 0) g.remove(); });
  // Clear errors
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.form-control').forEach(c => c.classList.remove('error'));
}

function handleSubmit(e) {
  e.preventDefault();

  // Clear previous errors
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.form-control').forEach(c => c.classList.remove('error'));

  let valid = true;
  const fields = {
    date: document.getElementById('report-date'),
    site: document.getElementById('report-site'),
    weather: document.getElementById('report-weather'),
    equipment: document.getElementById('report-equipment'),
    work: document.getElementById('report-work'),
    skilled: document.getElementById('report-skilled'),
    unskilled: document.getElementById('report-unskilled'),
  };

  // Validate required fields
  if (!fields.date.value) { showError('date'); valid = false; }
  if (!fields.site.value) { showError('site'); valid = false; }
  if (!fields.weather.value) { showError('weather'); valid = false; }
  if (!fields.equipment.value) { showError('equipment'); valid = false; }
  if (!fields.work.value || fields.work.value.trim().length < 10) { showError('work'); valid = false; }

  const skilled = parseInt(fields.skilled.value);
  const unskilled = parseInt(fields.unskilled.value);
  if (isNaN(skilled) || skilled < 0 || skilled > 500) { showError('skilled'); valid = false; }
  if (isNaN(unskilled) || unskilled < 0 || unskilled > 500) { showError('unskilled'); valid = false; }

  if (!valid) {
    UI.toast('error', 'Validation Failed', 'Please fill in all required fields correctly.');
    // Scroll to first error
    const firstError = document.querySelector('.form-error.visible');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Collect materials
  const materials = [];
  document.querySelectorAll('.material-input').forEach(input => {
    const val = input.value.trim();
    if (val) materials.push(val);
  });

  const user = Auth.getCurrentUser();
  const report = {
    date: fields.date.value,
    siteName: fields.site.value,
    weather: fields.weather.value,
    workCompleted: fields.work.value.trim(),
    materialsUsed: materials,
    laborSkilled: skilled,
    laborUnskilled: unskilled,
    completionPct: parseInt(document.getElementById('report-completion').value),
    equipmentStatus: fields.equipment.value,
    notes: document.getElementById('report-notes').value.trim(),
    submittedBy: user.id,
    submittedByName: user.name,
  };

  // Submit
  const btn = document.getElementById('submit-btn');
  btn.classList.add('loading');

  setTimeout(() => {
    SafeSiteDB.add('dailyReports', report);
    btn.classList.remove('loading');
    UI.toast('success', 'Report Submitted', `Daily report for ${report.siteName} has been saved successfully.`);
    
    // Reset form after success
    setTimeout(() => resetForm(), 500);
  }, 800);
}

function showError(fieldId) {
  const errorEl = document.getElementById(fieldId + '-error');
  const inputEl = document.getElementById('report-' + fieldId);
  if (errorEl) errorEl.classList.add('visible');
  if (inputEl) inputEl.classList.add('error');
}
