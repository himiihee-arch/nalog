// NA:log bookmarks (Likes) — synced across devices via Supabase (free tier),
// since localStorage alone can't be seen by both Coco and Stellan.
// nalog_data.json itself is never touched; this only stores message_id + tags.
const NALOG_SUPABASE_URL = 'https://yqartlidchgfqtfeofgl.supabase.co';
const NALOG_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxYXJ0bGlkY2hnZnF0ZmVvZmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDcxOTMsImV4cCI6MjA5ODIyMzE5M30.OYtlXq8WgvCcv2WC5k5lDMW1WSamP7iDsFjalWry1nQ';

const nalogSupabase = supabase.createClient(NALOG_SUPABASE_URL, NALOG_SUPABASE_ANON_KEY);

let nalogBookmarksCache = {};
let nalogBookmarksReadyPromise = null;
const nalogBookmarkListeners = [];

// Call once on page load, before any render that depends on bookmark state.
function nalogInitBookmarks() {
  if (nalogBookmarksReadyPromise) return nalogBookmarksReadyPromise;

  nalogBookmarksReadyPromise = (async () => {
    const { data, error } = await nalogSupabase.from('bookmarks').select('*');
    if (!error && data) {
      data.forEach((row) => {
        nalogBookmarksCache[row.message_id] = { tags: row.tags || [], savedAt: row.saved_at };
      });
    }

    nalogSupabase
      .channel('bookmarks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          delete nalogBookmarksCache[payload.old.message_id];
        } else {
          const row = payload.new;
          nalogBookmarksCache[row.message_id] = { tags: row.tags || [], savedAt: row.saved_at };
        }
        nalogBookmarkListeners.forEach((fn) => fn());
      })
      .subscribe();
  })();

  return nalogBookmarksReadyPromise;
}

// fn is called whenever bookmark state changes — locally or from another device.
function nalogOnBookmarksChange(fn) {
  nalogBookmarkListeners.push(fn);
}

function nalogIsBookmarked(messageId) {
  return Object.prototype.hasOwnProperty.call(nalogBookmarksCache, messageId);
}

// supabase-js query builders are thenable but lazy: the request is only sent
// once something calls .then()/await on them. logErr() below is that call —
// dropping it (as the first version of this file did) silently no-ops every write.
function logErr(promiseLike) {
  promiseLike.then(({ error }) => {
    if (error) console.error('nalog bookmark sync failed:', error);
  });
}

// Updates the local cache immediately (so the UI reacts instantly) and fires
// the Supabase write in the background — other tabs/devices catch up via realtime.
function nalogToggleBookmark(messageId) {
  if (nalogIsBookmarked(messageId)) {
    delete nalogBookmarksCache[messageId];
    logErr(nalogSupabase.from('bookmarks').delete().eq('message_id', messageId));
    return false;
  }

  const nowIso = new Date().toISOString();
  nalogBookmarksCache[messageId] = { tags: [], savedAt: nowIso };
  logErr(nalogSupabase.from('bookmarks').insert({ message_id: messageId, tags: [], saved_at: nowIso, updated_at: nowIso }));
  return true;
}

function nalogRemoveBookmark(messageId) {
  delete nalogBookmarksCache[messageId];
  logErr(nalogSupabase.from('bookmarks').delete().eq('message_id', messageId));
}

function nalogSetBookmarkTags(messageId, tags) {
  if (!nalogBookmarksCache[messageId]) return;
  nalogBookmarksCache[messageId].tags = tags;
  logErr(nalogSupabase.from('bookmarks').update({ tags, updated_at: new Date().toISOString() }).eq('message_id', messageId));
}

// Cross-references the in-memory bookmark cache against the loaded windows to
// build renderable entries: { message, tags, savedAt, windowId, windowTitle }.
function nalogListBookmarkEntries(windows) {
  const entries = [];

  windows.forEach((win) => {
    win.messages.forEach((m) => {
      if (nalogBookmarksCache[m.id]) {
        entries.push({
          message: m,
          tags: nalogBookmarksCache[m.id].tags || [],
          savedAt: nalogBookmarksCache[m.id].savedAt,
          windowId: win.id,
          windowTitle: win.title
        });
      }
    });
  });

  entries.sort((a, b) => new Date(a.message.timestamp) - new Date(b.message.timestamp));
  return entries;
}
