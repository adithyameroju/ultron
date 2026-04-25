import { useEffect, useState } from 'react';
import { LoginCard } from './LoginView';
import './AuthScreen.css';

const MS_WORD = 500;
const MS_FORM = 1600;

type Props = {
  onAuthed: () => void;
};

export function AuthScreen({ onAuthed }: Props) {
  const [wordIn, setWordIn] = useState(false);
  const [formIn, setFormIn] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setWordIn(true);
      setFormIn(true);
      return;
    }
    const t1 = window.setTimeout(() => setWordIn(true), MS_WORD);
    const t2 = window.setTimeout(() => setFormIn(true), MS_FORM);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return (
    <div className="auth-screen">
      <div className="auth-screen__vignette" aria-hidden />
      <div
        className={`auth-screen__intro${formIn ? ' auth-screen__intro--out' : ''}`}
        aria-hidden={formIn}
      >
        <div className="auth-screen__glow" aria-hidden />
        <div className="auth-screen__mark-box">
          <img className="auth-screen__mark" src="/ultron-mark.png" alt="" decoding="async" />
        </div>
        <div className={`auth-screen__word-wrap${wordIn ? ' auth-screen__word-wrap--in' : ''}`}>
          <img
            className="auth-screen__word"
            src="/ultron-wordmark.png"
            alt="Ultron"
            decoding="async"
          />
        </div>
      </div>
      <div
        className={`auth-screen__panel${formIn ? ' auth-screen__panel--in' : ''}`}
      >
        <div className="auth-screen__panel-inner">
          <LoginCard onAuthed={onAuthed} idPrefix="auth" />
        </div>
      </div>
    </div>
  );
}
