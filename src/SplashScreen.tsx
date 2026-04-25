import { useEffect, useLayoutEffect, useState } from 'react';
import './SplashScreen.css';
import { publicAsset } from './publicUrl';

const HIDE_AT_MS = 2200;
const UNMOUNT_AT_MS = 3000;

type Props = {
  onComplete: () => void;
};

export function SplashScreen({ onComplete }: Props) {
  const [enter, setEnter] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      setEnter(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), HIDE_AT_MS);
    const t2 = window.setTimeout(() => onComplete(), UNMOUNT_AT_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <div className="splash" role="presentation" aria-hidden>
      <div className={`splash__inner${enter ? ' splash__inner--in' : ''}${leaving ? ' splash__inner--out' : ''}`}>
        <div className="splash__glow" aria-hidden />
        <img className="splash__mark" src={publicAsset('ultron-mark.png')} alt="" />
        <img className="splash__word" src={publicAsset('ultron-wordmark.png')} alt="Ultron" />
      </div>
    </div>
  );
}
