import axios from 'axios';

import { env } from './env';

const api = axios.create({
  // Browser: use relative paths (Next.js rewrites in dev, nginx in prod)
  // Server (SSR): use direct backend URL
  baseURL:
    typeof window !== 'undefined'
      ? '' // Browser: same-origin requests
      : env.apiUrl || 'http://localhost:4000', // SSR: direct backend (localhost fallback for dev)
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Include cookies in all requests
});

// Cookie-based auth: no need for manual token management
// Backend JWT strategy extracts token from HttpOnly cookies

export default api;
