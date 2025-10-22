import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import App from './App';
import './index.css';

// Configure axios defaults globally
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    // Check if this is a portal request
    const isPortalRequest = config.url?.includes('/portal');

    // Use appropriate token based on request type
    const token = isPortalRequest
      ? localStorage.getItem('portalToken')
      : localStorage.getItem('token');

    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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
