'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface DecisionRule {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  priority: number;
  lastExecuted?: string;
}

interface DecisionInsight {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionRequired: boolean;
  createdAt: string;
}

export default function DecisionSupportPage() {
  const [rules, setRules] = useState<DecisionRule[]>([]);
  const [insights, setInsights] = useState<DecisionInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/v1/decision-support/rules'),
      api.get('/api/v1/decision-support/insights'),
    ])
      .then(([rulesRes, insightsRes]) => {
        setRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
        setInsights(Array.isArray(insightsRes.data) ? insightsRes.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Karar destek verileri yüklenirken hata oluştu'
        );
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Karar Destek Sistemi
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
          Karar Destek Sistemi
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

  const hasData = rules.length > 0 || insights.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Karar Destek Sistemi
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Yeni Kural Ekle
        </button>
      </div>

      {!hasData ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-12 sm:px-6 text-center">
            <p className="text-sm text-gray-500">
              Henüz karar destek kuralı veya içgörü tanımlanmamış.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Sistem otomatik analizler sonucunda içgörüler üretecektir.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Insights */}
          {insights.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Aktif İçgörüler
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`bg-white shadow rounded-lg p-5 border-l-4 ${
                      insight.severity === 'high'
                        ? 'border-red-500'
                        : insight.severity === 'medium'
                          ? 'border-yellow-500'
                          : 'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {insight.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              insight.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : insight.severity === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {insight.severity === 'high'
                              ? 'Yüksek'
                              : insight.severity === 'medium'
                                ? 'Orta'
                                : 'Düşük'}
                          </span>
                          {insight.actionRequired && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                              Aksiyon Gerekli
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {insight.description}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(insight.createdAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <button className="ml-4 text-sm text-blue-600 hover:text-blue-900 transition">
                        Detay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Rules */}
          {rules.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Karar Kuralları
              </h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kural
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Öncelik
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Son Çalıştırma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {rule.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rule.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rule.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              rule.priority >= 8
                                ? 'bg-red-100 text-red-800'
                                : rule.priority >= 5
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {rule.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              rule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {rule.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rule.lastExecuted
                            ? new Date(rule.lastExecuted).toLocaleString(
                                'tr-TR'
                              )
                            : 'Henüz çalıştırılmadı'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-blue-600 hover:text-blue-900 transition">
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
