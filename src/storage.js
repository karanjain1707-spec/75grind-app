// Replaces Claude's window.storage with a free, keyless JSON backend
// (jsonblob.com) for shared data, and localStorage for personal /
// per-device data. No account, no API key of any kind.
//
// Previously used jsonstorage.net, but that service started requiring a
// paid API key to create new boards (existing boards could still be read,
// but every brand-new deploy/device would fail at the "create" step with a
// 400 "Create operation requires API key" error). jsonblob.com offers the
// same anonymous create/read/write shape and was verified working directly
// against this deployment before switching.

const API = "https://jsonblob.com/api/jsonBlob";

let boardPath = new URLSearchParams(window.location.search).get("board");

function saveBoardPath(path) {
  boardPath = path;
  localStorage.setItem("grind_board_path", path);
  const url = new URL(window.location.href);
  url.searchParams.set("board", path);
  window.history.replaceState(null, "", url.toString());
}

async function ensureBoard() {
  if (boardPath) return boardPath;
  const saved = localStorage.getItem("grind_board_path");
  if (saved) {
    saveBoardPath(saved);
    return saved;
  }
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ players: {} }),
  });
  if (!res.ok) throw new Error(`Could not create shared board (status ${res.status})`);
  const location = res.headers.get("Location") || "";
  const path = location.split("/").filter(Boolean).pop();
  if (!path) throw new Error("Backend did not return a board id");
  saveBoardPath(path);
  return path;
}

export function installStorage() {
  window.storage = {
    async get(key, shared) {
      if (!shared) {
        const v = localStorage.getItem(key);
        return v !== null ? { key, value: v, shared } : null;
      }
      const path = await ensureBoard();
      const res = await fetch(`${API}/${path}`);
      if (!res.ok) throw new Error(`Sync failed (status ${res.status})`);
      const json = await res.json();
      return { key, value: JSON.stringify(json), shared };
    },
    async set(key, value, shared) {
      if (!shared) {
        localStorage.setItem(key, value);
        return { key, value, shared };
      }
      const path = await ensureBoard();
      const res = await fetch(`${API}/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: value,
      });
      if (!res.ok) throw new Error(`Save failed (status ${res.status})`);
      return { key, value, shared };
    },
    async delete(key, shared) {
      if (!shared) {
        localStorage.removeItem(key);
        return { key, deleted: true, shared };
      }
      return { key, deleted: false, shared };
    },
    async list() {
      return { keys: [] };
    },
  };
}
