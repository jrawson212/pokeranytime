const PREFIX = "poker-anytime";

export function savePlayerId(code: string, playerId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}:${code.toUpperCase()}:playerId`, playerId);
}

export function loadPlayerId(code: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${PREFIX}:${code.toUpperCase()}:playerId`);
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
