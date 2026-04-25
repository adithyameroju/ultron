import { useState, type FormEvent } from 'react';
import { isValidDemoLogin, ULTRON_DEMO_EMAIL, ULTRON_DEMO_PASSWORD } from './demoCredentials';
import { publicAsset } from './publicUrl';
import './LoginView.css';

type CardProps = {
  onAuthed: () => void;
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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidDemoLogin(email, password)) {
      setError('Invalid email or password.');
      return;
    }
    onAuthed();
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
    </div>
  );
}

type PageProps = {
  onAuthed: () => void;
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
