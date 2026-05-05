// Simple local admin gate. Password hashed (SHA-256) and stored in localStorage.
// Default password: "admin123" — pode ser alterada na UI.

const KEY_HASH = "pf-admin-hash-v1";
const KEY_SESSION = "pf-admin-session-v1";
const SESSION_MS = 1000 * 60 * 60 * 4; // 4h

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_PASSWORD = "admin123";
let defaultHashCache: string | null = null;
async function defaultHash() {
  if (!defaultHashCache) defaultHashCache = await sha256(DEFAULT_PASSWORD);
  return defaultHashCache;
}

export async function getStoredHash(): Promise<string> {
  return localStorage.getItem(KEY_HASH) ?? (await defaultHash());
}

export async function verifyPassword(pwd: string): Promise<boolean> {
  const h = await sha256(pwd);
  return h === (await getStoredHash());
}

export async function changePassword(current: string, next: string): Promise<boolean> {
  if (!(await verifyPassword(current))) return false;
  if (next.length < 4) return false;
  localStorage.setItem(KEY_HASH, await sha256(next));
  return true;
}

export function startSession() {
  localStorage.setItem(KEY_SESSION, String(Date.now() + SESSION_MS));
}

export function endSession() {
  localStorage.removeItem(KEY_SESSION);
}

export function isAdmin(): boolean {
  const v = localStorage.getItem(KEY_SESSION);
  if (!v) return false;
  const exp = Number(v);
  if (!exp || exp < Date.now()) {
    localStorage.removeItem(KEY_SESSION);
    return false;
  }
  return true;
}
