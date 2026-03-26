'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailReports, setEmailReports] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const handleSave = () => {
    // TODO: Save settings via API
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {/* Genel Ayarlar */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Genel Ayarlar
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Bildirimler
                </h3>
                <p className="text-sm text-gray-500">
                  Sistem bildirimleri ve uyarılar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  E-posta Raporları
                </h3>
                <p className="text-sm text-gray-500">
                  Haftalık özet raporları e-posta ile gönder
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmailReports(!emailReports)}
                className={`${
                  emailReports ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    emailReports ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Otomatik Senkronizasyon
                </h3>
                <p className="text-sm text-gray-500">
                  ISSmanager ile otomatik veri senkronizasyonu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoSync(!autoSync)}
                className={`${
                  autoSync ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    autoSync ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Görünüm Ayarları */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Görünüm Ayarları
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="theme"
                className="block text-sm font-medium text-gray-700"
              >
                Tema
              </label>
              <select
                id="theme"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option>Açık</option>
                <option disabled>Koyu (Yakında)</option>
                <option disabled>Otomatik (Yakında)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="language"
                className="block text-sm font-medium text-gray-700"
              >
                Dil
              </label>
              <select
                id="language"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option>Türkçe</option>
                <option disabled>English (Yakında)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Güvenlik */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Güvenlik</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md transition">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  Şifre Değiştir
                </span>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md transition">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  İki Faktörlü Kimlik Doğrulama
                </span>
                <span className="text-xs text-gray-500">Yakında</span>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-md transition">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">
                  Aktif Oturumlar
                </span>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
    </div>
  );
}
