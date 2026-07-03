import type { CSSProperties, ReactNode } from 'react';

type Props = {
  label: string;
  selected: boolean;
  swatchStyle: CSSProperties;
  onClick: () => void;
  ariaLabel: string;
};

export function WorkspaceCanvasSwatch({ label, selected, swatchStyle, onClick, ariaLabel }: Props) {
  return (
    <div className="canvas-swatch-item" role="presentation">
      <button
        type="button"
        className={`canvas-swatch${selected ? ' is-selected' : ''}`}
        style={swatchStyle}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-pressed={selected}
      >
        {selected ? (
          <span className="canvas-swatch__check" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 9.25L7.75 12.5L13.5 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </button>
      <span className="canvas-swatch__label">{label}</span>
    </div>
  );
}

type StripProps = {
  children: ReactNode;
  ariaLabel: string;
};

export function WorkspaceCanvasSwatchStrip({ children, ariaLabel }: StripProps) {
  return (
    <div className="canvas-swatch-strip" role="listbox" aria-label={ariaLabel}>
      {children}
    </div>
  );
}
