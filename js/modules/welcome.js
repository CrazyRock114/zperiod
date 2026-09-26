// ====================================================================
// welcome.js — first-visit welcome modal
// ====================================================================

export function initWelcome() {
  const modal = document.getElementById('welcome-modal');
  if (!modal) return;
  const closeBtn = document.getElementById('welcome-close');
  const startBtn = document.getElementById('welcome-start');

  const seen = localStorage.getItem('zperiod_welcomed') === 'true';
  if (!seen) {
    setTimeout(() => showModal(modal), 200);
  }

  const dismiss = () => {
    modal.classList.remove('active');
    document.documentElement.classList.remove('welcome-active');
    localStorage.setItem('zperiod_welcomed', 'true');
  };

  closeBtn.addEventListener('click', dismiss);
  startBtn.addEventListener('click', dismiss);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) dismiss();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) dismiss();
  });

  // Expose for re-opening from header/about buttons
  window._showWelcome = () => showModal(modal);
}

function showModal(modal) {
  modal.classList.add('active');
  document.documentElement.classList.add('welcome-active');
}