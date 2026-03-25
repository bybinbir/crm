'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ISSmanagerPage() {
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ name: '', baseUrl: '', apiKey: '', timeoutMs: 30000 });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get('/api/v1/admin/integrations').then(res => {
      if (res.data[0]) {
        const c = res.data[0];
        setConfig(c);
        setForm({ name: c.name, baseUrl: c.baseUrl, apiKey: '', timeoutMs: c.timeoutMs });
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (config) {
        await api.put(`/api/v1/admin/integrations/${config.id}`, form);
      } else {
        await api.post('/api/v1/admin/integrations', form);
      }
      alert('Saved successfully');
      window.location.reload();
    } catch {
      alert('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!config) return;
    setTesting(true);
    try {
      const res = await api.post(`/api/v1/admin/integrations/issmanager/${config.id}/test`);
      alert(res.data.success ? 'Connection successful' : `Failed: ${res.data.message}`);
    } catch {
      alert('Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    if (!config) return;
    try {
      await api.post(`/api/v1/admin/integrations/issmanager/${config.id}/sync`);
      alert('Sync started');
    } catch {
      alert('Sync failed');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ISSmanager Integration</h1>
      <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Base URL</label>
          <input value={form.baseUrl} onChange={e => setForm({...form, baseUrl: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">API Key {config && '(masked)'}</label>
          <input type="password" value={form.apiKey} onChange={e => setForm({...form, apiKey: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" placeholder={config ? '""""""""' : ''} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
          <input type="number" value={form.timeoutMs} onChange={e => setForm({...form, timeoutMs: parseInt(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        <div className="flex space-x-4">
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
          {config && (
            <>
              <button onClick={handleTest} disabled={testing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button onClick={handleSync} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Sync Now
              </button>
            </>
          )}
        </div>
      </div>
      {config && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-sm text-gray-500">Status</dt><dd className="text-sm font-medium">{config.status}</dd></div>
            <div><dt className="text-sm text-gray-500">Last Test</dt><dd className="text-sm">{config.lastTestAt ? new Date(config.lastTestAt).toLocaleString() : 'Never'}</dd></div>
            <div><dt className="text-sm text-gray-500">Last Sync</dt><dd className="text-sm">{config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : 'Never'}</dd></div>
            <div><dt className="text-sm text-gray-500">API Key</dt><dd className="text-sm">{config.apiKeyMasked}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
