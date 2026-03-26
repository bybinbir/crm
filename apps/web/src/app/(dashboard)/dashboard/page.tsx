'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface DashboardStats {
  connectionStatus: string;
  lastTest: string | null;
  lastSync: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/v1/admin/integrations')
      .then((res) => {
        const configs = Array.isArray(res.data) ? res.data : [];
        const config = configs[0];
        setStats({
          connectionStatus: config?.status || 'PENDING',
          lastTest: config?.lastTestAt || null,
          lastSync: config?.lastSyncAt || null,
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Veri yüklenirken hata oluştu');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          title="ISSmanager Status"
          value={stats?.connectionStatus || 'Yapılandırılmadı'}
        />
        <Card
          title="Son Test"
          value={
            stats?.lastTest
              ? new Date(stats.lastTest).toLocaleString('tr-TR')
              : 'Henüz test edilmedi'
          }
        />
        <Card
          title="Son Senkronizasyon"
          value={
            stats?.lastSync
              ? new Date(stats.lastSync).toLocaleString('tr-TR')
              : 'Henüz senkronize edilmedi'
          }
        />
        <Card title="Sistem Sağlığı" value="Sağlıklı" />
        <Card title="Denetim Olayları" value="Aktif" />
        <Card title="Mahalle Kalite" value="Henüz veri yok" />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="text-sm font-medium text-gray-500 truncate">
          {title}
        </div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}
