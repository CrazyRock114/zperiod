// ====================================================================
// navigation.js — top-nav page switcher
// ====================================================================

export function initNavigation() {
  const buttons = document.querySelectorAll('.nav-pill-btn[data-page]');
  const pages = document.querySelectorAll('.page[data-page]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      buttons.forEach(b => b.classList.toggle('active', b === btn));
      pages.forEach(p => p.classList.toggle('active', p.dataset.page === target));
    });
  });

  // Mobile desktop overlay bypass
  const bypassBtn = document.getElementById('bypass-mobile-overlay-btn');
  const overlay = document.getElementById('desktop-only-overlay');
  if (bypassBtn && overlay) {
    bypassBtn.addEventListener('click', () => {
      document.body.classList.add('mobile-bypassed');
      overlay.style.display = 'none';
      try {
        sessionStorage.setItem('zperiod_bypass_mobile', 'true');
      } catch (e) {}
    });

    try {
      if (sessionStorage.getItem('zperiod_bypass_mobile') === 'true') {
        document.body.classList.add('mobile-bypassed');
        overlay.style.display = 'none';
      }
    } catch (e) {}
  }

  // Ion modal close handler
  const ionClose = document.getElementById('ion-modal-close');
  const ionModal = document.getElementById('ion-modal');
  if (ionClose && ionModal) {
    ionClose.addEventListener('click', () => {
      ionModal.classList.remove('active');
      ionModal.setAttribute('aria-hidden', 'true');
    });
    ionModal.addEventListener('click', (e) => {
      if (e.target === ionModal) {
        ionModal.classList.remove('active');
        ionModal.setAttribute('aria-hidden', 'true');
      }
    });
  }
}