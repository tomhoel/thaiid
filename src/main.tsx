import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found.');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Registered after mount so a failing service worker can never block the shell.
registerSW({ immediate: false });
