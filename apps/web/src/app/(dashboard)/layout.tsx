'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

const navigation: Array<{ name: string; href: string; icon: string }> = [
  { name: 'Genel Bakış', href: '/dashboard', icon: '📊' },
  { name: 'Entegrasyonlar', href: '/dashboard/integrations', icon: '🔗' },
  { name: 'Mahalle Kalite', href: '/dashboard/neighborhoods', icon: '🏘️' },
  { name: 'Karar Destek', href: '/dashboard/decision-support', icon: '🎯' },
  { name: 'Audit Logs', href: '/dashboard/audit-logs', icon: '📝' },
  { name: 'Kullanıcılar', href: '/dashboard/users', icon: '👥' },
  { name: 'Raporlar', href: '/dashboard/reports', icon: '📈' },
  { name: 'Ayarlar', href: '/dashboard/settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-blue-600">CRM</div>
            <div className="text-sm text-gray-500">Analiz Platform</div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm text-gray-700">
              {user.name || user.email}
            </div>
            <div className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
              {user.role}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100 transition"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <main className="p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
