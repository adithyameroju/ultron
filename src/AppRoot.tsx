import { useCallback, useState } from 'react';
import App from './App';
import { AuthScreen } from './AuthScreen';
import { StarfieldBackground } from './components/StarfieldBackground';
import { FloatingScenery } from './components/FloatingScenery';
import { clearSession, isSessionValid, setSession } from './authSession';
import './AppRoot.css';

export function AppRoot() {
  const [authed, setAuthed] = useState(() => isSessionValid());

  const onAuthed = useCallback(() => {
    setSession();
    setAuthed(true);
  }, []);

  const onSignOut = useCallback(() => {
    clearSession();
    setAuthed(false);
  }, []);

  return (
    <>
      <StarfieldBackground variant={authed ? 'app' : 'login'} />
      {authed ? <div className="cyber-app__shell" aria-hidden /> : null}
      {authed ? <FloatingScenery variant="app" /> : null}
      {!authed ? <FloatingScenery variant="login" /> : null}
      <div className="cyber-app__content">
        {authed ? <App onSignOut={onSignOut} /> : <AuthScreen onAuthed={onAuthed} />}
      </div>
    </>
  );
}
