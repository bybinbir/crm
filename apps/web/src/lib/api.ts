import axios from 'axios';

const api = axios.create({
  // Browser: use relative paths (same-origin, nginx proxies /api to backend)
  // Server (SSR): use internal API URL
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-undef
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
