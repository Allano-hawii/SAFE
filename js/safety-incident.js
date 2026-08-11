// ============================================
// SafeSite — Safety Incident Report Logic
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireAuth();
  if (!user) return;

  UI.populateSidebar(user);
  UI.initSidebar();
  UI.initSignOut();

  // Set default datetime
  document.getElementById('incident-datetime').value = UI.nowLocal();

  // Populate site dropdown
  document.getElementById('incident-site').innerHTML = '<option value="">Select site...</option>' + await UI.getSiteOptions();

  // Urgency radio — change card border color
  document.querySelectorAll('input[name="urgency"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const card = document.getElementById('incident-card');
      card.classList.remove('urgency-active-low', 'urgency-active-medium', 'urgency-active-high');
      card.classList.add('urgency-active-' + radio.value.toLowerCase());
    });
  });

  // Injuries toggle
  const injuriesToggle = document.getElementById('incident-injuries');
  const injurySection = document.getElementById('injury-details-section');
  const injuriesLabel = document.getElementById('injuries-label');

  injuriesToggle.addEventListener('change', () => {
    if (injuriesToggle.checked) {
      injurySection.classList.add('visible');
      injuriesLabel.textContent = 'Yes — injuries reported';
      injuriesLabel.style.color = 'var(--danger-red)';
    } else {
      injurySection.classList.remove('visible');
      injuriesLabel.textContent = 'No injuries';
      injuriesLabel.style.color = 'var(--text-secondary)';
    }
  });

  // Form submission
  document.getElementById('incident-form').addEventListener('submit', handleIncidentSubmit);
});

function resetIncidentForm() {
  document.getElementById('incident-form').reset();
  document.getElementById('incident-datetime').value = UI.nowLocal();
  document.getElementById('injury-details-section').classList.remove('visible');
  document.getElementById('injuries-label').textContent = 'No injuries';
  document.getElementById('injuries-label').style.color = 'var(--text-secondary)';
  const card = document.getElementById('incident-card');
  card.classList.remove('urgency-active-low', 'urgency-active-medium', 'urgency-active-high');
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.form-control').forEach(c => c.classList.remove('error'));
}

async function handleIncidentSubmit(e) {
  e.preventDefault();

  // Clear previous errors
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.form-control').forEach(c => c.classList.remove('error'));

  let valid = true;

  const datetime = document.getElementById('incident-datetime');
  const site = document.getElementById('incident-site');
  const location = document.getElementById('incident-location');
  const type = document.getElementById('incident-type');
  const urgency = document.querySelector('input[name="urgency"]:checked');
  const description = document.getElementById('incident-description');
  const injuries = document.getElementById('incident-injuries').checked;
  const injuryDetails = document.getElementById('incident-injury-details');
  const action = document.getElementById('incident-action');

  if (!datetime.value) { showIncidentError('datetime'); valid = false; }
  if (!site.value) { showIncidentError('isite', site); valid = false; }
  if (!location.value.trim()) { showIncidentError('location', location); valid = false; }
  if (!type.value) { showIncidentError('type', type); valid = false; }
  if (!urgency) {
    document.getElementById('urgency-error').classList.add('visible');
    valid = false;
  }
  if (!description.value.trim() || description.value.trim().length < 20) {
    showIncidentError('description', description);
    valid = false;
  }
  if (injuries && !injuryDetails.value.trim()) {
    showIncidentError('injury-details', injuryDetails);
    valid = false;
  }
  if (!action.value.trim()) { showIncidentError('action', action); valid = false; }

  if (!valid) {
    UI.toast('error', 'Validation Failed', 'Please fill in all required fields correctly.');
    const firstError = document.querySelector('.form-error.visible');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const user = Auth.getCurrentUser();
  const incident = {
    dateTime: new Date(datetime.value).toISOString(),
    siteName: site.value,
    locationOnSite: location.value.trim(),
    incidentType: type.value,
    urgency: urgency.value,
    description: description.value.trim(),
    injuriesReported: injuries,
    injuryDetails: injuries ? injuryDetails.value.trim() : null,
    actionTaken: action.value.trim(),
    status: 'Open',
    reportedBy: user.id,
    reportedByName: user.name,
  };

  const btn = document.getElementById('incident-submit-btn');
  btn.classList.add('loading');

  try {
    await SafeSiteDB.add('safetyIncidents', incident);
    btn.classList.remove('loading');

    if (incident.urgency === 'High') {
      UI.toast('warning', '🔴 High-Urgency Alert Submitted',
        `Critical incident at ${incident.siteName} has been flagged for immediate attention.`, 6000);
    } else {
      UI.toast('success', 'Incident Reported',
        `Safety incident at ${incident.siteName} has been logged successfully.`);
    }

    setTimeout(() => resetIncidentForm(), 500);
  } catch (err) {
    btn.classList.remove('loading');
    UI.toast('error', 'Submission Failed', 'Could not save the incident. Please try again.');
    console.error('Incident submission error:', err);
  }
}

function showIncidentError(errorId, inputEl) {
  const errorEl = document.getElementById(errorId + '-error');
  if (errorEl) errorEl.classList.add('visible');
  if (inputEl) inputEl.classList.add('error');
}
