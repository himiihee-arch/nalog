let nalogWindows = [];

document.addEventListener('DOMContentLoaded', async () => {
  nalogRequireAuth();

  const data = await nalogLoadData('nalog_data.json');
  nalogWindows = data.windows;
  renderWindowList();

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

  const win = nalogWindows.find((w) => w.id === id);
  renderChat(win);
  document.querySelector('.logs-shell').classList.add('chat-active');
}

function renderChat(win) {
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
    group.appendChild(bubble);

    body.appendChild(group);
  });
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

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
