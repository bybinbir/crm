'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface IntegrationConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  timeoutMs: number;
  status: string;
  isEnabled: boolean;
  lastTestAt?: string;
  lastSyncAt?: string;
}

export default function ISSmanagerPage() {
  const router = useRouter();
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    timeoutMs: 30000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/v1/admin/integrations')
      .then((res) => {
        const configs = Array.isArray(res.data) ? res.data : [];
        if (configs[0]) {
          const c = configs[0];
          setConfig(c);
          setForm({
            name: c.name,
            baseUrl: c.baseUrl,
            apiKey: '',
            timeoutMs: c.timeoutMs,
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || 'Entegrasyon yüklenirken hata oluştu'
        );
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (config) {
        await api.put(`/api/v1/admin/integrations/${config.id}`, form);
        setSuccess('Entegrasyon güncellendi');
      } else {
        await api.post('/api/v1/admin/integrations', form);
        setSuccess('Entegrasyon oluşturuldu');
      }
      setTimeout(() => router.refresh(), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    setError(null);
    setSuccess(null);
    setTesting(true);

    try {
      const res = await api.post(
        `/api/v1/admin/integrations/issmanager/${config.id}/test`
      );
      if (res.data.success) {
        setSuccess('Bağlantı testi başarılı');
      } else {
        setError(`Test başarısız: ${res.data.message}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Test başarısız');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    if (!config) return;
    setError(null);
    setSuccess(null);
    setSyncing(true);

    try {
      await api.post(`/api/v1/admin/integrations/issmanager/${config.id}/sync`);
      setSuccess('Senkronizasyon başlatıldı');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Senkronizasyon başlatılamadı');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          ISSmanager Entegrasyonu
        </h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        ISSmanager Entegrasyonu
      </h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Yapılandırma</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Entegrasyon Adı
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="ISSmanager Production"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Base URL
          </label>
          <input
            type="url"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://crm.example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            API Key {config && '(değiştirmek için yeni değer girin)'}
          </label>
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={config ? '••••••••' : 'API key giriniz'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Timeout (ms)
          </label>
          <input
            type="number"
            value={form.timeoutMs}
            onChange={(e) =>
              setForm({ ...form, timeoutMs: parseInt(e.target.value) })
            }
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            min={1000}
            max={120000}
          />
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {config && (
            <>
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {syncing ? 'Başlatılıyor...' : 'Şimdi Senkronize Et'}
              </button>
            </>
          )}
        </div>
      </div>

      {config && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Durum</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Durum</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    config.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {config.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Aktif</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.isEnabled ? 'Evet' : 'Hayır'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Son Test</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.lastTestAt
                  ? new Date(config.lastTestAt).toLocaleString('tr-TR')
                  : 'Henüz test edilmedi'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Son Senkronizasyon
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {config.lastSyncAt
                  ? new Date(config.lastSyncAt).toLocaleString('tr-TR')
                  : 'Henüz senkronize edilmedi'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">API Key</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {config.apiKeyMasked}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
