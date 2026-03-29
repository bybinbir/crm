'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  isEnabled: boolean;
  lastTestAt?: string;
  lastSyncAt?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/v1/admin/integrations')
      .then((res) => {
        setIntegrations(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Entegrasyonlar yüklenirken hata oluştu'
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Entegrasyonlar
        </h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Entegrasyonlar
        </h1>
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Entegrasyonlar
        </h1>
      </div>

      {integrations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-12 sm:px-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Henüz entegrasyon yapılandırılmamış.
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ISSmanager entegrasyonu eklemek için aşağıdaki kartı tıklayın.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
          {integrations.map((integration) => (
            <Link
              key={integration.id}
              href={`/dashboard/integrations/issmanager?id=${integration.id}`}
              className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {integration.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {integration.type} - {integration.status}
                    </p>
                    {integration.lastSyncAt && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Son senkronizasyon:{' '}
                        {new Date(integration.lastSyncAt).toLocaleString(
                          'tr-TR'
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        integration.isEnabled && integration.status === 'ACTIVE'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {integration.isEnabled ? 'Aktif' : 'Devre Dışı'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <Link
          href="/dashboard/integrations/issmanager"
          className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
        >
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              + Yeni ISSmanager Entegrasyonu Ekle
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              CRM sistem entegrasyonu ile müşteri verilerini senkronize edin
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
