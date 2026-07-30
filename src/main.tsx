import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { PasswordGate } from './components/PasswordGate';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PasswordGate>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </PasswordGate>
  </React.StrictMode>,
);

// Production only — in dev the SW would shadow Vite's HMR and the Notion proxy.
// Registered relative to BASE_URL so it works under the GitHub Pages subpath.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // A failed SW registration should never break the app — offline is a bonus.
    });
  });
}
