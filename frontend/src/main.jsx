import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a18',
              color: '#e8e8e6',
              border: '1px solid #2a2a27',
              borderRadius: '10px',
              fontSize: '13px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: { iconTheme: { primary: '#c8f135', secondary: '#0a0a0a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
