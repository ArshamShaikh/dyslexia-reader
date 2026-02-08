const MAX_SESSIONS = 8;
const sessionStore = new Map();

const trimStoreIfNeeded = () => {
  if (sessionStore.size <= MAX_SESSIONS) return;
  const sorted = [...sessionStore.entries()].sort(
    (a, b) => (a[1]?.createdAt || 0) - (b[1]?.createdAt || 0)
  );
  while (sorted.length > MAX_SESSIONS) {
    const [oldestId] = sorted.shift();
    sessionStore.delete(oldestId);
  }
};

export const createReaderSession = (text) => {
  const id = `reader_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStore.set(id, {
    text: String(text || ""),
    createdAt: Date.now(),
  });
  trimStoreIfNeeded();
  return id;
};

export const getReaderSessionText = (sessionId) => {
  if (!sessionId) return "";
  const entry = sessionStore.get(sessionId);
  return entry?.text || "";
};

export const clearReaderSession = (sessionId) => {
  if (!sessionId) return;
  sessionStore.delete(sessionId);
};

