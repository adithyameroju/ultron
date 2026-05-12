import { useCallback, useState } from 'react';
import App from './App';
import { AuthScreen } from './AuthScreen';
import { StarfieldBackground } from './components/StarfieldBackground';
import { FloatingScenery } from './components/FloatingScenery';
import type { UltronUser } from './authSession';
import { clearSession, getSessionUser, isSessionValid, setSession } from './authSession';
import './AppRoot.css';

export function AppRoot() {
  const [user, setUser] = useState<UltronUser | null>(() => (isSessionValid() ? getSessionUser() : null));

  const onAuthed = useCallback((next: UltronUser) => {
    setSession(next);
    setUser(next);
  }, []);

  const onSignOut = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const authed = user !== null;

  return (
    <>
      <StarfieldBackground variant={authed ? 'app' : 'login'} />
      {authed ? <div className="cyber-app__shell" aria-hidden /> : null}
      {authed ? <FloatingScenery variant="app" /> : null}
      {!authed ? <FloatingScenery variant="login" /> : null}
      <div className="cyber-app__content">
        {user ? <App user={user} onSignOut={onSignOut} /> : <AuthScreen onAuthed={onAuthed} />}
      </div>
    </>
  );
}
