const env = import.meta.env;

/** Default demo sign-in (override with `.env` Vite vars). */
export const ULTRON_DEMO_EMAIL =
  (typeof env.VITE_ULTRON_EMAIL === 'string' && env.VITE_ULTRON_EMAIL) || 'ultron@acko.com';

export const ULTRON_DEMO_PASSWORD =
  (typeof env.VITE_ULTRON_PASSWORD === 'string' && env.VITE_ULTRON_PASSWORD) || 'Ultron#2026';

export function isValidDemoLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === ULTRON_DEMO_EMAIL.trim().toLowerCase() &&
    password === ULTRON_DEMO_PASSWORD
  );
}
