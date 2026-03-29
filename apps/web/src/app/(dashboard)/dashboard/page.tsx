'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface DashboardMetrics {
  totalCustomers: number;
  totalNeighborhoods: number;
  importSuccessRate: number;
  latestImport?: {
    batchId: string;
    fileName: string;
    importedRows: number;
    failedRows: number;
    status: string;
    importedAt: string;
  };
  dataSourceStatus: {
    type: string;
    description: string;
    lastSync?: string;
  };
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .get('/api/v1/dashboard/metrics')
      .then((res) => {
        if (mounted) {
          setMetrics(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('Dashboard metrics error:', err);
          setError(
            err.response?.data?.message ||
              err.message ||
              'Metrikler yüklenirken hata oluştu'
          );
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
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
          Dashboard
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

  if (!metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Veri bulunamadı
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Henüz veri yok';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Dashboard
      </h1>

      {/* Data Source Status */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Veri Kaynağı:</strong>{' '}
              {metrics.dataSourceStatus.description}
            </p>
            {metrics.dataSourceStatus.lastSync && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Son senkronizasyon:{' '}
                {formatDate(metrics.dataSourceStatus.lastSync)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Toplam Müşteri"
          value={metrics.totalCustomers.toString()}
        />
        <Card
          title="Toplam Mahalle"
          value={metrics.totalNeighborhoods.toString()}
        />
        <Card
          title="Import Başarı Oranı"
          value={`${metrics.importSuccessRate.toFixed(0)}%`}
        />
        {metrics.latestImport && (
          <Card
            title="Son Import"
            value={`${metrics.latestImport.importedRows} kayıt`}
          />
        )}
      </div>

      {/* Latest Import Details */}
      {metrics.latestImport && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              Son Import Detayları
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {metrics.latestImport.fileName}
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Durum
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      metrics.latestImport.status === 'COMPLETED'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}
                  >
                    {metrics.latestImport.status}
                  </span>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Başarılı Kayıtlar
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  {metrics.latestImport.importedRows}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Başarısız Kayıtlar
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  {metrics.latestImport.failedRows}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Import Tarihi
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
                  {formatDate(metrics.latestImport.importedAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
          {title}
        </div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </div>
      </div>
    </div>
  );
}
