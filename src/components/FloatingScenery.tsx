import './FloatingScenery.css';

type Props = {
  variant: 'login' | 'app';
};

const FIGHTER = '/spaceship-fighter.png';
const CRUISER = '/spaceship-cruiser.png';

export function FloatingScenery({ variant }: Props) {
  return (
    <div className={`floating-scenery floating-scenery--${variant}`} aria-hidden>
      {variant === 'login' ? <LoginUniverse /> : <AppUniverse />}
    </div>
  );
}

function LoginUniverse() {
  return (
    <>
      <div className="fs-planet fs-planet--gas fs-planet--g1" />
      <div className="fs-planet fs-planet--rocky fs-planet--r1" />
      <div className="fs-planet fs-planet--ring" />
      <div className="fs-planet fs-planet--gas fs-planet--g2" />
      <div className="fs-planet fs-planet--dwarf fs-planet--d1" />
      <div className="fs-moon" />
      <div className="fs-belt" />
      <SubtleDust variant="login" />
      <RealCruiser className="fs-3dship--login-c1" />
      <RealCruiser className="fs-3dship--login-c2" />
      <RealFighter className="fs-3dship--login-f1" />
      <RealFighter className="fs-3dship--login-f2" />
    </>
  );
}

function AppUniverse() {
  return (
    <>
      <div className="fs-planet fs-planet--gas fs-planet--g-app1" />
      <div className="fs-planet fs-planet--rocky fs-planet--r-app1" />
      <div className="fs-planet fs-planet--dwarf fs-planet--d-app1" />
      <div className="fs-orb fs-orb--1" />
      <div className="fs-orb fs-orb--2" />
      <div className="fs-orb fs-orb--3" />
      <div className="fs-belt fs-belt--faint" />
      <div className="fs-chip" />
      <SubtleDust variant="app" />
      <RealCruiser className="fs-3dship--app-c1" />
      <RealCruiser className="fs-3dship--app-c2" />
      <RealFighter className="fs-3dship--app-f1" />
      <RealFighter className="fs-3dship--app-f2" />
    </>
  );
}

const DUST_COUNT = 20;

function SubtleDust({ variant }: { variant: 'login' | 'app' }) {
  return (
    <div className={`fs-dust-layer fs-dust-layer--${variant}`} aria-hidden>
      {Array.from({ length: DUST_COUNT }, (_, i) => (
        <span key={i} className={`fs-dust fs-dust--d${i}`} />
      ))}
    </div>
  );
}

function RealFighter({ className }: { className: string }) {
  return (
    <div className={`fs-3dship fs-3dship--fighter ${className}`.trim()}>
      <span className="fs-3dship__trail fs-3dship__trail--fighter" aria-hidden />
      <div className="fs-3dship__exhaust fs-3dship__exhaust--fighter">
        <span className="fs-3dship__flame" />
        <span className="fs-3dship__flame" />
        <span className="fs-3dship__flame" />
        <span className="fs-3dship__flame" />
      </div>
      <img className="fs-3dship__img" src={FIGHTER} alt="" decoding="async" />
    </div>
  );
}

function RealCruiser({ className }: { className: string }) {
  return (
    <div className={`fs-3dship fs-3dship--cruiser ${className}`.trim()}>
      <span className="fs-3dship__trail fs-3dship__trail--cruiser" aria-hidden />
      <div className="fs-3dship__exhaust fs-3dship__exhaust--cruiser">
        <span className="fs-3dship__flame fs-3dship__flame--c1" />
        <span className="fs-3dship__flame fs-3dship__flame--c2" />
        <span className="fs-3dship__flame fs-3dship__flame--c3" />
      </div>
      <img className="fs-3dship__img" src={CRUISER} alt="" decoding="async" />
    </div>
  );
}
