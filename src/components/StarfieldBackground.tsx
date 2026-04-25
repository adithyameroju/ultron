import { useEffect, useRef } from 'react';
import './starfield.css';

type Star = { x: number; y: number; z: number; vx: number; vy: number; r: number; a: number };

type Props = {
  /** Stronger nebula (login) vs very subtle (shell) */
  variant?: 'login' | 'app';
  className?: string;
};

/**
 * Subtle parallax starfield; respects prefers-reduced-motion.
 */
export function StarfieldBackground({ variant = 'app', className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const onMq = () => {
      reducedRef.current = mq.matches;
    };
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) {
      return;
    }
    const c2d = cvs.getContext('2d');
    if (!c2d) {
      return;
    }

    let stars: Star[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    const isLogin = variant === 'login';
    const starCount = isLogin ? 340 : 300;

    function makeStars() {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        const z = Math.random() * 0.8 + 0.2;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          vx: (Math.random() - 0.5) * (isLogin ? 0.12 : 0.05) * z,
          vy: (Math.random() - 0.5) * (isLogin ? 0.1 : 0.04) * z,
          r: isLogin ? Math.random() * 1.1 + 0.2 : Math.random() * 0.65 + 0.12,
          a: isLogin ? Math.random() * 0.38 + 0.14 : Math.random() * 0.26 + 0.07,
        });
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      cvs.style.width = `${w}px`;
      cvs.style.height = `${h}px`;
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    };

    let t = 0;
    const tick = () => {
      const staticStars = reducedRef.current;
      if (!staticStars) {
        t += 0.0009;
        for (const s of stars) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < -2) s.x = w + 2;
          if (s.x > w + 2) s.x = -2;
          if (s.y < -2) s.y = h + 2;
          if (s.y > h + 2) s.y = -2;
        }
      } else {
        t += 0.0012;
      }

      c2d.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = staticStars ? 1 : 0.85 + 0.12 * Math.sin(t * 0.25 + s.z * 3);
        const px = staticStars
          ? s.x + Math.sin(t * 0.3 + s.z * 2) * 0.3
          : s.x;
        const py = staticStars
          ? s.y + Math.cos(t * 0.25 + s.z) * 0.25
          : s.y;
        c2d.beginPath();
        c2d.arc(px, py, s.r, 0, Math.PI * 2);
        c2d.fillStyle = `rgba(210, 225, 255, ${s.a * tw})`;
        c2d.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [variant]);

  const isApp = variant === 'app';

  return (
    <div
      className={`starfield-wrap ${variant === 'login' ? 'starfield-wrap--login' : 'starfield-wrap--app'} ${className}`.trim()}
    >
      <div
        className={`starfield-nebula${isApp ? ' starfield-nebula--app' : ''}`.trim()}
        aria-hidden
      >
        <div className="starfield-nebula__b starfield-nebula__b1" />
        <div className="starfield-nebula__b starfield-nebula__b2" />
        <div className="starfield-nebula__b starfield-nebula__b3" />
        {isApp ? <div className="starfield-nebula__b starfield-nebula__b4" /> : null}
      </div>
      <canvas ref={canvasRef} className="starfield-canvas" aria-hidden />
    </div>
  );
}
