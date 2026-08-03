import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Vite + React Router app, so this is the /react entry point — the /next
// one in Vercel's docs is only for Next.js projects.
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './styles/index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Inside BrowserRouter so client-side route changes are counted
          as page views, not just the initial load. */}
      <Analytics />
    </BrowserRouter>
  </React.StrictMode>,
);
