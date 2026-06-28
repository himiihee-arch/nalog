let nalogWindows = [];
let activeWindow = null;
let searchTotal = 0;
let searchCurrent = -1;

const WALLPAPER_STORAGE_KEY = 'nalog_chat_wallpaper';
const WALLPAPER_PRESETS = [
  { id: 'dusk', label: '暮霭紫', css: 'linear-gradient(160deg, #2B2350 0%, #564A99 55%, #A89AD6 100%)' },
  { id: 'lilac-fog', label: '丁香雾', css: 'linear-gradient(160deg, #F0EDF6 0%, #D8D7EA 100%)' },
  { id: 'starlit', label: '星夜蓝', css: 'linear-gradient(160deg, #1B1640 0%, #4F3DA0 100%)' },
  { id: 'morning-haze', label: '晨雾粉紫', css: 'linear-gradient(135deg, #E9DCF3 0%, #B6A8DE 100%)' }
];

document.addEventListener('DOMContentLoaded', async () => {
  nalogRequireAuth();

  const data = await nalogLoadData('nalog_data.json');
  nalogWindows = data.windows;
  renderWindowList();
  applyStoredWallpaper();
  renderWallpaperPresets();
  wireTopbarMenu();
  wireSearch();
  wireWallpaperModal();

  document.getElementById('chat-back-btn').addEventListener('click', () => {
    document.querySelector('.logs-shell').classList.remove('chat-active');
  });
});

function renderWindowList() {
  const list = document.getElementById('window-list');
  list.innerHTML = '';

  nalogWindows.forEach((win) => {
    const last = win.messages[win.messages.length - 1];

    const li = document.createElement('li');
    li.className = 'window-row';
    li.dataset.id = win.id;

    const title = document.createElement('span');
    title.className = 'window-row-title';
    title.textContent = win.title;

    const preview = document.createElement('span');
    preview.className = 'window-row-preview';
    preview.textContent = last ? truncate(last.text.replace(/\s+/g, ' '), 28) : '';

    const date = document.createElement('span');
    date.className = 'window-row-date';
    date.textContent = last ? formatDate(last.timestamp) : '';

    li.append(title, preview, date);
    li.addEventListener('click', () => selectWindow(win.id));
    list.appendChild(li);
  });
}

function selectWindow(id) {
  document.querySelectorAll('.window-row').forEach((row) => {
    row.classList.toggle('active', row.dataset.id === id);
  });

  closeSearch();
  closeTopbarMenu();

  const win = nalogWindows.find((w) => w.id === id);
  renderChat(win);
  document.getElementById('menu-btn').hidden = false;
  document.querySelector('.logs-shell').classList.add('chat-active');
}

function renderChat(win) {
  activeWindow = win;
  document.getElementById('chat-title').textContent = win.title;

  const body = document.getElementById('chat-body');
  body.innerHTML = '';

  win.messages.forEach((m) => {
    const group = document.createElement('div');
    group.className = 'msg-group ' + (m.sender === 'coco' ? 'msg-coco' : 'msg-anan');

    if (m.hasThinking && m.thinking) {
      group.appendChild(buildThinkingBlock(m.thinking));
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.text;

    const star = buildStarButton(m.id);

    const row = document.createElement('div');
    row.className = 'bubble-row';
    if (m.sender === 'coco') row.append(star, bubble);
    else row.append(bubble, star);
    group.appendChild(row);

    wireLongPress(group);
    body.appendChild(group);
  });
}

function buildStarButton(messageId) {
  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'msg-star';
  star.setAttribute('aria-label', '收藏');
  const bookmarked = nalogIsBookmarked(messageId);
  star.textContent = bookmarked ? '★' : '☆';
  star.classList.toggle('bookmarked', bookmarked);

  star.addEventListener('click', (e) => {
    e.stopPropagation();
    const now = nalogToggleBookmark(messageId);
    star.textContent = now ? '★' : '☆';
    star.classList.toggle('bookmarked', now);
  });

  return star;
}

let nalogLongPressDocListenerAdded = false;

function wireLongPress(group) {
  let timer = null;

  group.addEventListener('touchstart', () => {
    timer = setTimeout(() => group.classList.add('show-actions'), 450);
  });
  group.addEventListener('touchend', () => clearTimeout(timer));
  group.addEventListener('touchmove', () => clearTimeout(timer));

  if (!nalogLongPressDocListenerAdded) {
    nalogLongPressDocListenerAdded = true;
    document.addEventListener('touchstart', (e) => {
      document.querySelectorAll('.msg-group.show-actions').forEach((g) => {
        if (!g.contains(e.target)) g.classList.remove('show-actions');
      });
    });
  }
}

function buildThinkingBlock(thinkingText) {
  const wrap = document.createElement('div');
  wrap.className = 'thinking-block';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'thinking-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="thinking-icon">✦</span><span>思考过程</span><span class="thinking-chevron">›</span>';

  const content = document.createElement('div');
  content.className = 'thinking-content';
  content.textContent = thinkingText;
  content.hidden = true;

  toggle.addEventListener('click', () => {
    const willExpand = content.hidden;
    content.hidden = !willExpand;
    toggle.classList.toggle('expanded', willExpand);
    toggle.setAttribute('aria-expanded', String(willExpand));
  });

  wrap.append(toggle, content);
  return wrap;
}

/* ---------- three-dot menu ---------- */

function wireTopbarMenu() {
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('topbar-menu');

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn) {
      menu.hidden = true;
    }
  });

  document.getElementById('menu-search-btn').addEventListener('click', () => {
    closeTopbarMenu();
    openSearch();
  });

  document.getElementById('menu-wallpaper-btn').addEventListener('click', () => {
    closeTopbarMenu();
    document.getElementById('wallpaper-modal').hidden = false;
  });
}

function closeTopbarMenu() {
  document.getElementById('topbar-menu').hidden = true;
}

/* ---------- search ---------- */

function wireSearch() {
  const input = document.getElementById('search-input');

  input.addEventListener('input', () => performSearch(input.value));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.shiftKey ? goToMatch(searchCurrent - 1) : goToMatch(searchCurrent + 1);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  });

  document.getElementById('search-next').addEventListener('click', () => goToMatch(searchCurrent + 1));
  document.getElementById('search-prev').addEventListener('click', () => goToMatch(searchCurrent - 1));
  document.getElementById('search-close').addEventListener('click', closeSearch);
}

function openSearch() {
  const bar = document.getElementById('search-bar');
  bar.hidden = false;
  const input = document.getElementById('search-input');
  input.value = '';
  input.focus();
  performSearch('');
}

function closeSearch() {
  document.getElementById('search-bar').hidden = true;
  restoreBubbleText();
  searchTotal = 0;
  searchCurrent = -1;
  updateSearchCounter();
}

function restoreBubbleText() {
  if (!activeWindow) return;
  document.querySelectorAll('#chat-body .bubble').forEach((bubble, i) => {
    bubble.textContent = activeWindow.messages[i].text;
  });
}

function performSearch(query) {
  restoreBubbleText();
  searchTotal = 0;
  searchCurrent = -1;

  if (!query || !activeWindow) {
    updateSearchCounter();
    return;
  }

  const lowerQuery = query.toLowerCase();
  const bubbles = document.querySelectorAll('#chat-body .bubble');

  bubbles.forEach((bubble, i) => {
    const text = activeWindow.messages[i].text;
    const lowerText = text.toLowerCase();
    if (!lowerText.includes(lowerQuery)) return;
    bubble.innerHTML = highlightMatches(text, lowerText, lowerQuery);
  });

  searchTotal = document.querySelectorAll('#chat-body .search-hit').length;
  if (searchTotal > 0) goToMatch(0);
  else updateSearchCounter();
}

function highlightMatches(text, lowerText, lowerQuery) {
  let html = '';
  let cursor = 0;
  let idx = lowerText.indexOf(lowerQuery, cursor);

  while (idx !== -1) {
    html += escapeHtml(text.slice(cursor, idx));
    html += `<mark class="search-hit">${escapeHtml(text.slice(idx, idx + lowerQuery.length))}</mark>`;
    cursor = idx + lowerQuery.length;
    idx = lowerText.indexOf(lowerQuery, cursor);
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

function goToMatch(index) {
  if (searchTotal === 0) return;
  const next = ((index % searchTotal) + searchTotal) % searchTotal;

  document.querySelectorAll('#chat-body .search-hit').forEach((m) => m.classList.remove('current'));
  const marks = document.querySelectorAll('#chat-body .search-hit');
  const mark = marks[next];
  if (mark) {
    mark.classList.add('current');
    mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  searchCurrent = next;
  updateSearchCounter();
}

function updateSearchCounter() {
  const el = document.getElementById('search-counter');
  el.textContent = searchTotal > 0 ? `第 ${searchCurrent + 1} 处 / 共 ${searchTotal} 处` : '';
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- chat wallpaper ---------- */

function renderWallpaperPresets() {
  const wrap = document.getElementById('wallpaper-presets');
  wrap.innerHTML = '';

  WALLPAPER_PRESETS.forEach((preset) => {
    const swatch = document.createElement('div');
    swatch.className = 'wallpaper-swatch';
    swatch.style.background = preset.css;
    swatch.title = preset.label;
    swatch.addEventListener('click', () => setWallpaper({ type: 'preset', value: preset.css }));
    wrap.appendChild(swatch);
  });
}

function wireWallpaperModal() {
  document.getElementById('wallpaper-close').addEventListener('click', () => {
    document.getElementById('wallpaper-modal').hidden = true;
  });

  document.getElementById('wallpaper-modal').addEventListener('click', (e) => {
    if (e.target.id === 'wallpaper-modal') e.target.hidden = true;
  });

  document.getElementById('wallpaper-upload-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setWallpaper({ type: 'custom', value: reader.result });
    reader.readAsDataURL(file);
  });
}

function setWallpaper(wallpaper) {
  try {
    localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(wallpaper));
  } catch (e) {
    alert('这张图片太大了，存不下，换一张小一点的试试');
    return;
  }
  applyWallpaper(wallpaper);
  document.getElementById('wallpaper-modal').hidden = true;
}

function applyWallpaper(wallpaper) {
  const body = document.getElementById('chat-body');
  body.style.backgroundImage = wallpaper.type === 'custom' ? `url("${wallpaper.value}")` : wallpaper.value;
}

function applyStoredWallpaper() {
  const raw = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  if (!raw) return;
  try {
    applyWallpaper(JSON.parse(raw));
  } catch (e) {
    localStorage.removeItem(WALLPAPER_STORAGE_KEY);
  }
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
