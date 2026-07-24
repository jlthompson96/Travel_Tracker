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
