import { useState, type FormEvent } from 'react';
import type { UltronUser } from './authSession';
import { isValidDemoLogin, ULTRON_DEMO_EMAIL, ULTRON_DEMO_PASSWORD } from './demoCredentials';
import { fetchGoogleProfile, getGoogleClientId, signInWithGoogleAccessToken } from './googleAuth';
import { publicAsset } from './publicUrl';
import './LoginView.css';

type CardProps = {
  onAuthed: (user: UltronUser) => void;
  className?: string;
  idPrefix?: string;
};

/**
 * Reusable sign-in card (used on the login page and the intro handoff).
 */
export function LoginCard({ onAuthed, className, idPrefix = 'login' }: CardProps) {
  const [email, setEmail] = useState(ULTRON_DEMO_EMAIL);
  const [password, setPassword] = useState(ULTRON_DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidDemoLogin(email, password)) {
      setError('Invalid email or password.');
      return;
    }
    const local = email.trim().toLowerCase();
    const displayName = local.includes('@') ? local.split('@')[0]! : local || 'Demo user';
    onAuthed({ kind: 'demo', email: local, name: displayName });
  };

  const onGoogle = async () => {
    setGoogleError('');
    const clientId = getGoogleClientId();
    if (!clientId) {
      setGoogleError(
        'Add VITE_GOOGLE_CLIENT_ID (or VITE_GOOGLE_OAUTH_CLIENT_ID) to a `.env` or `.env.local` file in the project root, then restart `npm run dev`. Create a Web client ID in Google Cloud Console → APIs & Services → Credentials, and add this origin: http://localhost:5180'
      );
      return;
    }
    setGoogleBusy(true);
    try {
      const token = await signInWithGoogleAccessToken(clientId);
      const profile = await fetchGoogleProfile(token);
      onAuthed({
        kind: 'google',
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      });
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : String(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  const eid = `${idPrefix}-email`;
  const pid = `${idPrefix}-password`;

  return (
    <div className={`login-card ${className ?? ''}`.trim()} role="dialog" aria-label="Sign in to Ultron">
      <div className="login-card__brand">
        <div className="login-card__mark-wrap">
          <div className="login-card__mark-glow" aria-hidden />
          <img className="login-card__mark" src={publicAsset('ultron-mark.png')} alt="" decoding="async" />
        </div>
        <div className="login-card__titles">
          <img
            className="login-card__wordmark"
            src={publicAsset('ultron-wordmark.png')}
            alt="Ultron"
            decoding="async"
          />
          <p className="login-card__sub">ACKO for Business</p>
        </div>
      </div>

      <form className="login-form" onSubmit={onSubmit} noValidate>
        <div className="login-field">
          <label htmlFor={eid}>Email</label>
          <input
            id={eid}
            name="email"
            type="email"
            autoComplete="email"
            className="login-input"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="name@company.com"
          />
        </div>
        <div className="login-field">
          <label htmlFor={pid}>Password</label>
          <input
            id={pid}
            name="password"
            type="password"
            autoComplete="current-password"
            className="login-input"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error ? <p className="login-form__err">{error}</p> : null}
        <button type="submit" className="login-submit">
          Sign in
        </button>
      </form>

      <div className="login-card__oauth" aria-label="Other sign-in options">
        <div className="login-card__oauth-rule" aria-hidden />
        <span className="login-card__oauth-label">or</span>
        <div className="login-card__oauth-rule" aria-hidden />
      </div>
      <button
        type="button"
        className="login-google-btn"
        onClick={() => void onGoogle()}
        disabled={googleBusy}
        aria-busy={googleBusy}
      >
        <span className="login-google-btn__icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.839l3.254-3.138C16.55 2.55 14.637 1.2 12.24 1.2 6.705 1.2 2.2 5.705 2.2 11.24s4.505 10.04 10.04 10.04c5.8 0 9.66-4.08 9.66-9.84 0-.66-.06-1.16-.18-1.655H12.24z"
            />
            <path
              fill="#34A853"
              d="M3.084 7.245l2.681 1.965C6.84 6.555 9.205 4.8 12.24 4.8c2.33 0 3.891.989 4.785 1.839l3.254-3.138C16.55 2.55 14.637 1.2 12.24 1.2 8.09 1.2 4.6 3.705 3.084 7.245z"
            />
            <path
              fill="#4A90E2"
              d="M12.24 22.32c3.24 0 5.955-1.065 7.935-2.895l-3.78-2.895c-1.05.72-2.385 1.14-4.155 1.14-3.18 0-5.88-2.145-6.84-5.055L3.48 14.52c1.92 3.825 5.88 6.8 10.76 6.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.4 14.61c-.3-.9-.48-1.86-.48-2.85s.18-1.95.48-2.85L2.52 7.065C1.56 9.015 1.2 11.085 1.2 11.76c0 .675.36 2.745 1.32 4.695L5.4 14.61z"
            />
          </svg>
        </span>
        <span className="login-google-btn__label">
          {googleBusy ? 'Opening Google…' : 'Continue with Google'}
        </span>
      </button>
      {googleError ? <p className="login-form__err login-form__err--oauth">{googleError}</p> : null}
    </div>
  );
}

type PageProps = {
  onAuthed: (user: UltronUser) => void;
};

export function LoginView({ onAuthed }: PageProps) {
  return (
    <div className="login-page">
      <div className="login-page__vignette" aria-hidden />
      <div className="login-page__inner">
        <LoginCard onAuthed={onAuthed} idPrefix="login" />
      </div>
    </div>
  );
}
