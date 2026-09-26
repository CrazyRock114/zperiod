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
}