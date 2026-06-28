// NA:log bookmarks (Likes) — bookmarked/tag state lives in localStorage only,
// nalog_data.json is never mutated. Keyed by message id.
const NALOG_BOOKMARKS_KEY = 'nalog_bookmarks';

function nalogGetBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(NALOG_BOOKMARKS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function nalogSaveBookmarks(bookmarks) {
  localStorage.setItem(NALOG_BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function nalogIsBookmarked(messageId) {
  return Object.prototype.hasOwnProperty.call(nalogGetBookmarks(), messageId);
}

function nalogToggleBookmark(messageId) {
  const bookmarks = nalogGetBookmarks();
  if (bookmarks[messageId]) {
    delete bookmarks[messageId];
  } else {
    bookmarks[messageId] = { tags: [], savedAt: new Date().toISOString() };
  }
  nalogSaveBookmarks(bookmarks);
  return Object.prototype.hasOwnProperty.call(bookmarks, messageId);
}

function nalogRemoveBookmark(messageId) {
  const bookmarks = nalogGetBookmarks();
  delete bookmarks[messageId];
  nalogSaveBookmarks(bookmarks);
}

function nalogSetBookmarkTags(messageId, tags) {
  const bookmarks = nalogGetBookmarks();
  if (!bookmarks[messageId]) return;
  bookmarks[messageId].tags = tags;
  nalogSaveBookmarks(bookmarks);
}

// Cross-references localStorage bookmarks against the loaded windows to build
// renderable entries: { message, tags, savedAt, windowId, windowTitle }.
function nalogListBookmarkEntries(windows) {
  const bookmarks = nalogGetBookmarks();
  const entries = [];

  windows.forEach((win) => {
    win.messages.forEach((m) => {
      if (bookmarks[m.id]) {
        entries.push({
          message: m,
          tags: bookmarks[m.id].tags || [],
          savedAt: bookmarks[m.id].savedAt,
          windowId: win.id,
          windowTitle: win.title
        });
      }
    });
  });

  entries.sort((a, b) => new Date(a.message.timestamp) - new Date(b.message.timestamp));
  return entries;
}
