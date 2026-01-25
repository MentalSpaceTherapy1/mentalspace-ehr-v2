import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

/**
 * HIPAA Security: Auth is handled via httpOnly cookies
 *
 * The api.ts module handles all auth logic:
 * - EHR routes: httpOnly cookies (automatically sent with withCredentials: true)
 * - Portal routes: Bearer tokens from localStorage (separate auth system)
 * - CSRF tokens: Added to state-changing requests
 *
 * No need for global axios interceptors here - use the api instance from lib/api.ts
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 0, // Never retry mutations to prevent duplicate submissions
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
