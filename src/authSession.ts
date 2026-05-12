export const ULTRON_SESSION_KEY = 'ultron_session_v1';
export const ULTRON_USER_KEY = 'ultron_user_v1';

export type UltronUser =
  | { kind: 'google'; email: string; name: string; picture: string }
  | { kind: 'demo'; email: string; name: string };

export function isSessionValid(): boolean {
  try {
    return sessionStorage.getItem(ULTRON_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSession(user: UltronUser): void {
  try {
    sessionStorage.setItem(ULTRON_SESSION_KEY, '1');
    sessionStorage.setItem(ULTRON_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getSessionUser(): UltronUser | null {
  if (!isSessionValid()) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(ULTRON_USER_KEY);
    if (!raw) {
      return { kind: 'demo', email: '', name: 'Signed in' };
    }
    return JSON.parse(raw) as UltronUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(ULTRON_SESSION_KEY);
    sessionStorage.removeItem(ULTRON_USER_KEY);
  } catch {
    // ignore
  }
}
