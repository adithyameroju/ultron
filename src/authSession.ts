export const ULTRON_SESSION_KEY = 'ultron_session_v1';

export function isSessionValid(): boolean {
  try {
    return sessionStorage.getItem(ULTRON_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSession(): void {
  try {
    sessionStorage.setItem(ULTRON_SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(ULTRON_SESSION_KEY);
  } catch {
    // ignore
  }
}
