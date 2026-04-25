import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from './AppRoot';
import './acko-tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="cyber-app">
      <AppRoot />
    </div>
  </StrictMode>
);
