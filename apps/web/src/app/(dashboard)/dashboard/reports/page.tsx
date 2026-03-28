'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ImportSummary {
  totalBatches: number;
  totalImportedRows: number;
  totalFailedRows: number;
  overallSuccessRate: number;
  sourceDistribution: {
    sourceType: string;
    count: number;
    percentage: number;
  }[];
  recentImports: {
    batchId: string;
    sourceType: string;
    fileName: string;
    totalRows: number;
    successRows: number;
    failedRows: number;
    status: string;
    importedAt: string;
  }[];
}

interface DataQuality {
  totalCustomers: number;
  totalNeighborhoods: number;
  customersWithNeighborhood: number;
  neighborhoodCoverageRate: number;
  topNeighborhoods: {
    id: string;
    name: string;
    district: string;
    city: string;
    customerCount: number;
  }[];
}

interface ReportsSummary {
  importSummary: ImportSummary;
  dataQuality: DataQuality;
  generatedAt: string;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/v1/dashboard/reports')
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Rapor verileri yüklenirken hata oluştu'
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
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

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-sm text-yellow-700">Veri bulunamadı</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <span className="text-sm text-gray-500">
          Oluşturulma: {formatDate(data.generatedAt)}
        </span>
      </div>

      {/* Import Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Toplam Import"
          value={data.importSummary.totalBatches.toString()}
          description="Batch sayısı"
        />
        <MetricCard
          title="Başarılı Satır"
          value={data.importSummary.totalImportedRows.toString()}
          description="Import edilen"
        />
        <MetricCard
          title="Başarı Oranı"
          value={`${data.importSummary.overallSuccessRate}%`}
          description="Genel başarı"
        />
        <MetricCard
          title="Başarısız Satır"
          value={data.importSummary.totalFailedRows.toString()}
          description="Hatalı kayıt"
        />
      </div>

      {/* Source Distribution */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Veri Kaynağı Dağılımı
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data.importSummary.sourceDistribution.map((source) => (
              <div key={source.sourceType} className="flex items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {source.sourceType}
                    </span>
                    <span className="text-sm text-gray-500">
                      {source.count} batch ({source.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Quality Metrics */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Veri Kalitesi</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500">Toplam Müşteri</div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.dataQuality.totalCustomers}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Toplam Mahalle</div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.dataQuality.totalNeighborhoods}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">
                Mahalle Bilgili Müşteri
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.dataQuality.customersWithNeighborhood}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Mahalle Kapsama Oranı</div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.dataQuality.neighborhoodCoverageRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Neighborhoods */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            En Çok Müşterili Mahalleler
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mahalle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İlçe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şehir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri Sayısı
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.dataQuality.topNeighborhoods.map((neighborhood) => (
                <tr key={neighborhood.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {neighborhood.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {neighborhood.district}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {neighborhood.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {neighborhood.customerCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Son Import İşlemleri
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kaynak
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dosya
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başarılı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başarısız
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.importSummary.recentImports.map((importItem) => (
                <tr key={importItem.batchId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(importItem.importedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {importItem.sourceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {importItem.fileName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {importItem.successRows}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {importItem.failedRows}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        importItem.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : importItem.status === 'PARTIALLY_COMPLETED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {importItem.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module Status Notice */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Modül Durumu</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                <strong>Personnel Raporları:</strong> Veri kaynağı henüz bağlı
                değil (UNSUPPORTED)
              </p>
              <p className="mt-1">
                <strong>Finance Raporları:</strong> Veri kaynağı henüz bağlı
                değil (UNSUPPORTED)
              </p>
              <p className="mt-1">
                <strong>Neighborhood & Import Raporları:</strong> Gerçek veriden
                beslenmektedir (OPERATIONAL)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="text-sm font-medium text-gray-500 truncate">
          {title}
        </div>
        <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
        {description && (
          <div className="mt-1 text-xs text-gray-500">{description}</div>
        )}
      </div>
    </div>
  );
}
