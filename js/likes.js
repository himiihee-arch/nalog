let nalogAllWindows = [];
let activeTag = '全部';
let activeEntry = null;

document.addEventListener('DOMContentLoaded', async () => {
  nalogRequireAuth();

  const [data] = await Promise.all([nalogLoadData('nalog_data.json'), nalogInitBookmarks()]);
  nalogAllWindows = data.windows;

  renderGridView();

  nalogOnBookmarksChange(() => {
    if (!activeEntry) renderGridView();
  });

  document.getElementById('detail-back-btn').addEventListener('click', () => {
    showGridView();
  });

  document.getElementById('detail-tag-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('detail-tag-input');
    const tag = input.value.trim();
    if (!tag || !activeEntry) return;
    if (!activeEntry.tags.includes(tag)) {
      activeEntry.tags.push(tag);
      nalogSetBookmarkTags(activeEntry.message.id, activeEntry.tags);
      renderDetailTags();
    }
    input.value = '';
  });

  document.getElementById('detail-unbookmark-btn').addEventListener('click', () => {
    if (!activeEntry) return;
    nalogRemoveBookmark(activeEntry.message.id);
    showGridView();
  });
});

/* ---------- grid view ---------- */

function renderGridView() {
  const entries = nalogListBookmarkEntries(nalogAllWindows);
  renderTagBar(entries);
  renderGrid(entries);
}

function renderTagBar(entries) {
  const allTags = new Set();
  entries.forEach((e) => e.tags.forEach((t) => allTags.add(t)));

  const bar = document.getElementById('tag-bar');
  bar.innerHTML = '';

  ['全部', ...allTags].forEach((tag) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'tag-pill' + (tag === activeTag ? ' active' : '');
    pill.textContent = tag;
    pill.addEventListener('click', () => {
      activeTag = tag;
      renderGridView();
    });
    bar.appendChild(pill);
  });
}

function renderGrid(entries) {
  const filtered = activeTag === '全部' ? entries : entries.filter((e) => e.tags.includes(activeTag));

  const grid = document.getElementById('likes-grid');
  const empty = document.getElementById('likes-empty');
  grid.innerHTML = '';

  empty.hidden = filtered.length > 0;

  filtered.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'like-card';

    const tagsEl = document.createElement('div');
    tagsEl.className = 'like-card-tags';
    entry.tags.forEach((t) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = t;
      tagsEl.appendChild(chip);
    });

    const preview = document.createElement('p');
    preview.className = 'like-card-preview';
    preview.textContent = entry.message.text;

    const source = document.createElement('span');
    source.className = 'like-card-source';
    source.textContent = entry.windowTitle;

    card.append(tagsEl, preview, source);
    card.addEventListener('click', () => showDetailView(entry));
    grid.appendChild(card);
  });
}

/* ---------- detail view ---------- */

function showDetailView(entry) {
  activeEntry = entry;

  document.getElementById('likes-grid-view').hidden = true;
  document.getElementById('like-detail-view').hidden = false;

  document.getElementById('detail-title').textContent = entry.windowTitle;

  const body = document.getElementById('detail-body');
  body.innerHTML = '';

  const m = entry.message;
  const group = document.createElement('div');
  group.className = 'msg-group ' + (m.sender === 'coco' ? 'msg-coco' : 'msg-anan');

  if (m.hasThinking && m.thinking) {
    group.appendChild(buildThinkingBlock(m.thinking));
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = m.text;
  group.appendChild(bubble);

  body.appendChild(group);

  renderDetailTags();
}

function renderDetailTags() {
  const list = document.getElementById('detail-tags-list');
  list.innerHTML = '';

  activeEntry.tags.forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'detail-tag-chip';

    const label = document.createElement('span');
    label.textContent = tag;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      activeEntry.tags = activeEntry.tags.filter((t) => t !== tag);
      nalogSetBookmarkTags(activeEntry.message.id, activeEntry.tags);
      renderDetailTags();
    });

    chip.append(label, remove);
    list.appendChild(chip);
  });
}

function showGridView() {
  document.getElementById('like-detail-view').hidden = true;
  document.getElementById('likes-grid-view').hidden = false;
  activeEntry = null;
  renderGridView();
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
