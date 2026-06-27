// Scatters twinkling ✦ sparkles (silver/gold) into a container. Used by login + desktop backdrops.
function createSparkles(container, count) {
  if (!container) return;
  const glyphs = ['✦', '✧', '•']; // ✦ ✧ •
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'sparkle' + (i % 3 === 0 ? ' gold' : '');
    el.textContent = glyphs[i % glyphs.length];
    el.style.left = Math.random() * 100 + '%';
    el.style.top = Math.random() * 100 + '%';
    el.style.animationDelay = (Math.random() * 2.6).toFixed(2) + 's';
    el.style.fontSize = (8 + Math.random() * 10).toFixed(0) + 'px';
    container.appendChild(el);
  }
}
