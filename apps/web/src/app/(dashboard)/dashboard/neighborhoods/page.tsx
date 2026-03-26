'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Neighborhood {
  id: string;
  name: string;
  district: string;
  city: string;
  qualityScore: number;
  customerCount: number;
  avgRevenue: number;
  trend: 'up' | 'down' | 'stable';
}

export default function NeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/v1/neighborhoods')
      .then((res) => {
        setNeighborhoods(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Mahalle verileri yüklenirken hata oluştu'
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Mahalle Kalite Analizi
        </h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Mahalle Kalite Analizi
        </h1>
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Mahalle Kalite Analizi
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Analiz Çalıştır
        </button>
      </div>

      {neighborhoods.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-12 sm:px-6 text-center">
            <p className="text-sm text-gray-500">
              Henüz mahalle kalite verisi yok.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              ISSmanager entegrasyonunu yapılandırıp senkronizasyon çalıştırın.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">
                  Toplam Mahalle
                </div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {neighborhoods.length}
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">
                  Ortalama Kalite Skoru
                </div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {(
                    neighborhoods.reduce((sum, n) => sum + n.qualityScore, 0) /
                    neighborhoods.length
                  ).toFixed(1)}
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="text-sm font-medium text-gray-500">
                  Toplam Müşteri
                </div>
                <div className="mt-1 text-3xl font-semibold text-gray-900">
                  {neighborhoods.reduce((sum, n) => sum + n.customerCount, 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Neighborhood List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mahalle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İlçe / İl
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kalite Skoru
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri Sayısı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {neighborhoods.map((neighborhood) => (
                  <tr key={neighborhood.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {neighborhood.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {neighborhood.district} / {neighborhood.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {neighborhood.qualityScore.toFixed(1)}
                        </div>
                        <div
                          className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                            neighborhood.qualityScore >= 8
                              ? 'bg-green-100 text-green-800'
                              : neighborhood.qualityScore >= 6
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {neighborhood.qualityScore >= 8
                            ? 'Yüksek'
                            : neighborhood.qualityScore >= 6
                              ? 'Orta'
                              : 'Düşük'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {neighborhood.customerCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center ${
                          neighborhood.trend === 'up'
                            ? 'text-green-600'
                            : neighborhood.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {neighborhood.trend === 'up' && '↑'}
                        {neighborhood.trend === 'down' && '↓'}
                        {neighborhood.trend === 'stable' && '→'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-900 transition">
                        Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
