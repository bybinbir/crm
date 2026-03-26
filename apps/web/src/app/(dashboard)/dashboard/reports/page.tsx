'use client';
import { useState } from 'react';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('month');

  // Mock data - in production this would come from API
  const metrics = {
    totalRevenue: '₺125,340',
    activeCustomers: 842,
    avgQualityScore: 7.8,
    avgResponseTime: '2.4 saat',
  };

  const reportTypes = [
    {
      id: 'neighborhood',
      title: 'Mahalle Kalite Raporu',
      description: 'Mahalle bazlı müşteri kalite skorları ve dağılım analizi',
      status: 'available',
    },
    {
      id: 'personnel',
      title: 'Personel Performans Raporu',
      description:
        'Personel verimliliği, tamamlanan görevler ve yanıt süreleri',
      status: 'available',
    },
    {
      id: 'financial',
      title: 'Finansal Rapor',
      description: 'Gelir, maliyet ve kar marjı analizi',
      status: 'available',
    },
    {
      id: 'decision',
      title: 'Karar Destek Raporu',
      description: 'Yönetici karar desteği için öneriler ve içgörüler',
      status: 'available',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Son 7 Gün</option>
          <option value="month">Son 30 Gün</option>
          <option value="quarter">Son 90 Gün</option>
          <option value="year">Son 1 Yıl</option>
        </select>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Toplam Gelir"
          value={metrics.totalRevenue}
          trend="+12%"
          trendUp={true}
        />
        <MetricCard
          title="Aktif Müşteri"
          value={metrics.activeCustomers.toString()}
          trend="+5%"
          trendUp={true}
        />
        <MetricCard
          title="Ort. Kalite Skoru"
          value={metrics.avgQualityScore.toString()}
          trend="-0.2"
          trendUp={false}
        />
        <MetricCard
          title="Ort. Yanıt Süresi"
          value={metrics.avgResponseTime}
          trend="-15%"
          trendUp={true}
        />
      </div>

      {/* Report Types */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rapor Tipleri</h2>
          <p className="mt-1 text-sm text-gray-600">
            İhtiyacınız olan raporu seçin ve indirin
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {reportTypes.map((report) => (
            <div
              key={report.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">
                    {report.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {report.description}
                  </p>
                </div>
                <div className="ml-4 flex items-center space-x-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {report.status === 'available' ? 'Hazır' : 'Beklemede'}
                  </span>
                  <button
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                    onClick={() => {
                      // TODO: Implement report generation API call
                    }}
                  >
                    Oluştur
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
                    Önizle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Rapor Formatları
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Raporlar PDF, Excel ve CSV formatlarında indirilebilir.</p>
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
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-500 truncate">
              {title}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {value}
            </div>
          </div>
          <div
            className={`ml-2 flex items-center text-sm ${
              trendUp ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trendUp ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="ml-1">{trend}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
