import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import SystemProvider from './powersync/SystemProvider';

const el = document.getElementById('root')!;
createRoot(el).render(
  <React.StrictMode>
    <SystemProvider>
      <App />
    </SystemProvider>
  </React.StrictMode>
);
