import axios from 'axios';

const api = axios.create({
  // Browser: use relative paths (same-origin, nginx proxies /api to backend)
  // Server (SSR): use internal API URL
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Include cookies in all requests
});

// Cookie-based auth: no need for manual token management
// Backend JWT strategy extracts token from HttpOnly cookies

export default api;
