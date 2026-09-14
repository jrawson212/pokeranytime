const PREFIX = "poker-anytime";

function playerKey(code: string) {
  return `${PREFIX}:${code.toUpperCase()}:playerId`;
}

export function savePlayerId(code: string, playerId: string) {
  if (typeof window === "undefined") return;
  const key = playerKey(code);
  try {
    localStorage.setItem(key, playerId);
  } catch {
    /* private mode / quota */
  }
  try {
    sessionStorage.setItem(key, playerId);
  } catch {
    /* ignore */
  }
}

export function loadPlayerId(code: string): string | null {
  if (typeof window === "undefined") return null;
  const key = playerKey(code);
  try {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}:name`, name);
}

export function loadName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${PREFIX}:name`) ?? "";
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function normalizeName(name: string): string {
  return name.trim().slice(0, 16);
}
