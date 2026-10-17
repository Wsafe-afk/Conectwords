import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

/**
 * Mantém a variável CSS --app-height sincronizada com a altura REAL visível
 * (visualViewport). Assim, quando o teclado virtual abre no celular, o layout
 * encolhe e o campo de digitação continua visível acima do teclado.
 */
function syncAppHeight() {
  const vv = window.visualViewport;
  const height = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

syncAppHeight();
window.addEventListener('orientationchange', syncAppHeight);
window.addEventListener('resize', syncAppHeight);
window.visualViewport?.addEventListener('resize', syncAppHeight);
window.visualViewport?.addEventListener('scroll', syncAppHeight);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
