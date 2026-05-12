type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GsiTokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => GsiTokenClient;
        };
      };
    };
  }
}

/** OAuth web client ID — set `VITE_GOOGLE_CLIENT_ID` or alias `VITE_GOOGLE_OAUTH_CLIENT_ID` in `.env` / `.env.local`. */
export function getGoogleClientId(): string {
  const primary = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? '';
  if (primary) {
    return primary;
  }
  return (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined)?.trim() ?? '';
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google Sign-In script.'));
    document.head.appendChild(s);
  });
}

/** Opens Google account picker / consent; returns OAuth access token. */
export async function signInWithGoogleAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google Sign-In is not available.');
  }
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope:
        'openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: (resp: TokenResponse) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        if (resp.access_token) {
          resolve(resp.access_token);
          return;
        }
        reject(new Error('Sign-in was cancelled.'));
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export async function fetchGoogleProfile(accessToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Could not load Google profile (${res.status}).`);
  }
  const j = (await res.json()) as Record<string, unknown>;
  const email = typeof j.email === 'string' ? j.email : '';
  const name =
    typeof j.name === 'string' && j.name.trim()
      ? j.name.trim()
      : (email.split('@')[0] || 'Google user').trim();
  const picture = typeof j.picture === 'string' ? j.picture : '';
  return { email, name, picture };
}
