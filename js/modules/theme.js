// ====================================================================
// theme.js — dark/light theme toggle with localStorage persistence
// ====================================================================

export function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  // Sync button with current state
  const isDark = document.documentElement.classList.contains('dark-theme');
  btn.setAttribute('aria-pressed', String(isDark));

  btn.addEventListener('click', () => {
    const nextDark = !document.documentElement.classList.contains('dark-theme');
    if (nextDark) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('zperiod_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('zperiod_dark_mode', 'false');
    }
    btn.setAttribute('aria-pressed', String(nextDark));
  });
}