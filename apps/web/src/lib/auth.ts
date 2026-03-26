import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cookie-based auth: just try to fetch user
    // Token is sent automatically via HttpOnly cookie
    api
      .post<User>('/api/v1/auth/me')
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const logout = async () => {
    try {
      // Call logout endpoint to clear server session
      await api.post('/api/v1/auth/logout');
    } catch {
      // Ignore errors, cookies will be cleared anyway
    }

    // Navigate to login
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return { user, loading, logout };
}
