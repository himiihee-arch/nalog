document.addEventListener('DOMContentLoaded', () => {
  if (nalogIsAuthenticated()) {
    window.location.replace('desktop.html');
    return;
  }

  createSparkles(document.getElementById('sparkle-layer'), 28);

  const screen = document.getElementById('login-screen');
  const form = document.getElementById('login-form');
  const input = document.getElementById('password-input');
  const error = document.getElementById('login-error');
  const flash = document.getElementById('unlock-flash');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    const ok = await nalogVerifyPassword(value);

    if (ok) {
      await nalogSetAuthenticated(value);
      error.classList.remove('show');
      screen.classList.add('unlocking');
      flash.classList.add('flash');
      setTimeout(() => {
        window.location.href = 'desktop.html';
      }, 600);
    } else {
      error.classList.add('show');
      screen.classList.remove('shake');
      requestAnimationFrame(() => screen.classList.add('shake'));
      input.value = '';
      input.focus();
    }
  });
});
