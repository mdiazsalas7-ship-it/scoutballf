import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// =========================================================
// Registrar Service Worker para PWA
// =========================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrado:', registration.scope);
      })
      .catch((err) => {
        console.warn('⚠️ Service Worker falló:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);