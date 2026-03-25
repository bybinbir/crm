'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/api/v1/admin/integrations').then(res => {
      const config = res.data[0];
      setStats({
        connectionStatus: config?.status || 'PENDING',
        lastTest: config?.lastTestAt,
        lastSync: config?.lastSyncAt,
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="ISSmanager Status" value={stats?.connectionStatus || 'Not Configured'} />
        <Card title="Last Test" value={stats?.lastTest ? new Date(stats.lastTest).toLocaleString() : 'Never'} />
        <Card title="Last Sync" value={stats?.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'} />
        <Card title="System Health" value="Healthy" />
        <Card title="Audit Events" value="Active" />
        <Card title="Mahalle Kalite" value="Henuz veri yok" />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="text-sm font-medium text-gray-500 truncate">{title}</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}
