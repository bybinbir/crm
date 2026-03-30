'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface IntegrationConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  isEnabled: boolean;
  status: string;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  lastSyncAt: string | null;
}

interface SyncRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessage: string | null;
}

interface AutomationSchedule {
  id: string;
  cronExpression: string;
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  nextScheduledRunAt: string | null;
}

interface AutomationJob {
  id: string;
  status: string;
  triggerType: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  filesProcessed: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorMessage: string | null;
}

type ConfigState =
  | 'NO_CONFIG'
  | 'CONFIG_UNVERIFIED'
  | 'CONNECTION_READY'
  | 'SYNC_RUNNING';

export default function ISSmanagerPage() {
  const router = useRouter();
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [state, setState] = useState<ConfigState>('NO_CONFIG');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Automation state
  const [automationSchedule, setAutomationSchedule] =
    useState<AutomationSchedule | null>(null);
  const [automationJobs, setAutomationJobs] = useState<AutomationJob[]>([]);
  const [triggeringAutomation, setTriggeringAutomation] = useState(false);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  // Load config and sync runs
  useEffect(() => {
    void loadConfigAndStatus();
  }, []);

  // Load automation status
  useEffect(() => {
    if (config?.id) {
      void loadAutomationStatus();
    }
  }, [config?.id]);

  const loadConfigAndStatus = async () => {
    try {
      setLoading(true);

      // Fetch all configs (should be only one ISSmanager)
      const configsRes = await fetch('/api/v1/admin/integrations', {
        credentials: 'include',
      });

      if (!configsRes.ok) {
        setState('NO_CONFIG');
        return;
      }

      const configs = await configsRes.json();
      const issmanagerConfig = configs.find((c: IntegrationConfig) =>
        c.name.includes('ISSmanager')
      );

      if (!issmanagerConfig) {
        setState('NO_CONFIG');
        return;
      }

      setConfig(issmanagerConfig);

      // Load recent sync runs
      const syncRunsRes = await fetch(
        `/api/v1/admin/integrations/issmanager/${issmanagerConfig.id}/sync-runs`,
        {
          credentials: 'include',
        }
      );

      if (syncRunsRes.ok) {
        const runs = await syncRunsRes.json();
        setSyncRuns(runs);

        // Check if sync is running
        const runningSync = runs.find(
          (r: SyncRun) => r.status === 'RUNNING' || r.status === 'PENDING'
        );
        if (runningSync) {
          setState('SYNC_RUNNING');
          return;
        }
      }

      // Determine state
      if (
        !issmanagerConfig.lastTestAt ||
        issmanagerConfig.lastTestStatus !== 'success'
      ) {
        setState('CONFIG_UNVERIFIED');
      } else {
        setState('CONNECTION_READY');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setState('NO_CONFIG');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config) {
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const res = await fetch(
        `/api/v1/admin/integrations/issmanager/${config.id}/test`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      const result = await res.json();
      setTestResult(result);

      // Reload config to get updated test status
      await loadConfigAndStatus();
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStartSync = async () => {
    if (!config) {
      return;
    }

    try {
      setSyncing(true);

      const res = await fetch(
        `/api/v1/admin/integrations/issmanager/${config.id}/sync`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(`Sync failed: ${error.message}`);
        return;
      }

      const { syncRunId } = await res.json();

      // Poll sync status
      void pollSyncStatus(syncRunId);
    } catch (error) {
      alert(
        `Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setSyncing(false);
    }
  };

  const pollSyncStatus = async (syncRunId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/v1/admin/integrations/issmanager/sync-runs/${syncRunId}`,
          {
            credentials: 'include',
          }
        );

        if (!res.ok) {
          clearInterval(interval);
          setSyncing(false);
          return;
        }

        const syncRun = await res.json();

        if (
          syncRun.status === 'COMPLETED' ||
          syncRun.status === 'FAILED' ||
          syncRun.status === 'CANCELLED'
        ) {
          clearInterval(interval);
          setSyncing(false);
          await loadConfigAndStatus();
        }
      } catch (error) {
        console.error('Failed to poll sync status:', error);
        clearInterval(interval);
        setSyncing(false);
      }
    }, 2000);
  };

  const loadAutomationStatus = async () => {
    if (!config?.id) return;

    try {
      // Load schedule
      const scheduleRes = await fetch(
        `/api/v1/automation/integrations/${config.id}/schedule`,
        { credentials: 'include' }
      );

      if (scheduleRes.ok) {
        const { schedule } = await scheduleRes.json();
        setAutomationSchedule(schedule);
      }

      // Load recent jobs
      const jobsRes = await fetch(
        `/api/v1/automation/integrations/${config.id}/jobs?limit=10`,
        { credentials: 'include' }
      );

      if (jobsRes.ok) {
        const { jobs } = await jobsRes.json();
        setAutomationJobs(jobs);
      }
    } catch (error) {
      console.error('Failed to load automation status:', error);
    }
  };

  const handleTriggerAutomation = async () => {
    if (!config?.id) return;

    try {
      setTriggeringAutomation(true);

      const res = await fetch(
        `/api/v1/automation/integrations/${config.id}/trigger`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(`Otomatik çekim başlatılamadı: ${error.message}`);
        return;
      }

      await res.json();

      // Reload automation status
      await loadAutomationStatus();

      alert(
        'Otomatik çekim başlatıldı. İşlem tamamlandığında bu sayfa güncellenecek.'
      );
    } catch (error) {
      alert(
        `Otomatik çekim başlatılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
      );
    } finally {
      setTriggeringAutomation(false);
    }
  };

  const handleToggleAutomation = async () => {
    if (!config?.id) return;

    try {
      setUpdatingSchedule(true);

      const newEnabled = !automationSchedule?.isEnabled;

      const res = await fetch(
        `/api/v1/automation/integrations/${config.id}/schedule`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isEnabled: newEnabled }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(`Zamanlama güncellenemedi: ${error.message}`);
        return;
      }

      await loadAutomationStatus();
    } catch (error) {
      alert(
        `Zamanlama güncellenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
      );
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const handleUpdateScheduleTime = async (hour: number, minute: number) => {
    if (!config?.id) return;

    try {
      setUpdatingSchedule(true);

      const cronExpression = `${minute} ${hour} * * *`;

      const res = await fetch(
        `/api/v1/automation/integrations/${config.id}/schedule`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cronExpression }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(`Saat güncellenemedi: ${error.message}`);
        return;
      }

      await loadAutomationStatus();
    } catch (error) {
      alert(
        `Saat güncellenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
      );
    } finally {
      setUpdatingSchedule(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          ISSmanager Entegrasyonu
        </h1>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        ISSmanager Entegrasyonu
      </h1>

      {/* Important Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Önemli: ISSmanager API Kısıtlaması
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                ISSmanager&apos;ın admin/bulk data API&apos;si bulunmamaktadır.
                Mevcut API sadece müşteri self-service işlemleri içindir.
              </p>
              <p className="mt-1">
                <strong>Bu nedenle:</strong> ISSmanager&apos;dan veri çekmek
                için manuel export/import işlemi kullanılmalıdır.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      {state !== 'NO_CONFIG' && config && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Bağlantı Durumu
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Config Adı
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{config.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Base URL</dt>
                <dd className="mt-1 text-sm text-gray-900">{config.baseUrl}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Durum</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      config.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : config.status === 'ERROR'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {config.status}
                  </span>
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
              {config.lastSyncAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Son Senkronizasyon
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(config.lastSyncAt).toLocaleString('tr-TR')}
                  </dd>
                </div>
              )}
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`mt-4 p-4 rounded-md ${
                  testResult.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <p className="text-sm font-medium">
                  {testResult.success ? '✅ Başarılı' : '❌ Başarısız'}
                </p>
                <p className="mt-1 text-sm">{testResult.message}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex space-x-3">
              {/* Test Connection Button */}
              <button
                onClick={handleTestConnection}
                disabled={testing || syncing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                    Test Ediliyor...
                  </>
                ) : (
                  <>🔌 Bağlantıyı Test Et</>
                )}
              </button>

              {/* Sync Button */}
              <button
                onClick={handleStartSync}
                disabled={state !== 'CONNECTION_READY' || syncing || testing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title={
                  state !== 'CONNECTION_READY'
                    ? 'Önce bağlantıyı test edin'
                    : ''
                }
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Senkronize Ediliyor...
                  </>
                ) : (
                  <>🔄 Senkronize Et</>
                )}
              </button>
            </div>

            {/* State Messages */}
            {state === 'CONFIG_UNVERIFIED' && (
              <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                ⚠️ Önce &quot;Bağlantıyı Test Et&quot; butonuna tıklayarak
                bağlantıyı doğrulayın
              </div>
            )}

            {state === 'SYNC_RUNNING' && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-md text-sm">
                ⏳ Senkronizasyon devam ediyor...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automation Section */}
      {state !== 'NO_CONFIG' && config && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
              Otomatik Export-Import
            </h3>

            {/* Automation Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Zamanlama Durumu
                </div>
                <div className="mt-2 flex items-center">
                  <span
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      automationSchedule?.isEnabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {automationSchedule?.isEnabled ? 'Aktif' : 'Devre Dışı'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Çalışma Saati
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {automationSchedule?.cronExpression
                    ? (() => {
                        const parts =
                          automationSchedule.cronExpression.split(' ');
                        const minute = parts[0];
                        const hour = parts[1];
                        return `Her gün ${hour}:${minute.padStart(2, '0')}`;
                      })()
                    : 'Her gün 18:00 (Varsayılan)'}
                </div>
              </div>

              {automationSchedule?.lastRunAt && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Son Çalışma
                  </div>
                  <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(automationSchedule.lastRunAt).toLocaleString(
                      'tr-TR'
                    )}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded ${
                        automationSchedule.lastRunStatus === 'COMPLETED'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {automationSchedule.lastRunStatus || 'Bilinmiyor'}
                    </span>
                  </div>
                </div>
              )}

              {automationSchedule?.nextScheduledRunAt && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Sonraki Çalışma
                  </div>
                  <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(
                      automationSchedule.nextScheduledRunAt
                    ).toLocaleString('tr-TR')}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleTriggerAutomation}
                disabled={triggeringAutomation}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {triggeringAutomation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Başlatılıyor...
                  </>
                ) : (
                  <>⚡ Şimdi Çek</>
                )}
              </button>

              <button
                onClick={handleToggleAutomation}
                disabled={updatingSchedule}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition ${
                  automationSchedule?.isEnabled
                    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus:ring-red-500'
                    : 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:ring-green-500'
                }`}
              >
                {updatingSchedule ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Güncelleniyor...
                  </>
                ) : automationSchedule?.isEnabled ? (
                  <>⏸️ Otomasyonu Durdur</>
                ) : (
                  <>▶️ Otomasyonu Başlat</>
                )}
              </button>

              <button
                onClick={() => {
                  const hour = prompt('Saat (0-23):', '18');
                  const minute = prompt('Dakika (0-59):', '0');
                  if (hour && minute) {
                    void handleUpdateScheduleTime(
                      parseInt(hour, 10),
                      parseInt(minute, 10)
                    );
                  }
                }}
                disabled={updatingSchedule}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                🕐 Saati Değiştir
              </button>
            </div>

            {/* Automation Jobs History */}
            {automationJobs.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Otomatik Çekim Geçmişi
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Tetikleme
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Başlangıç
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Kayıt
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Başarılı
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Başarısız
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {automationJobs.map((job) => (
                        <tr
                          key={job.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                job.status === 'COMPLETED'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : job.status === 'FAILED'
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                    : job.status === 'RUNNING' ||
                                        job.status === 'EXPORTING' ||
                                        job.status === 'IMPORTING'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              }`}
                            >
                              {job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <span
                              className={`px-2 py-0.5 inline-flex text-xs leading-4 font-medium rounded ${
                                job.triggerType === 'MANUAL'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {job.triggerType === 'MANUAL'
                                ? 'Manuel'
                                : 'Zamanlanmış'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {job.startedAt
                              ? new Date(job.startedAt).toLocaleString('tr-TR')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {job.recordsProcessed}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {job.recordsSucceeded}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {job.recordsFailed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Runs History */}
      {syncRuns.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Senkronizasyon Geçmişi
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlangıç
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bitiş
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlenen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başarılı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başarısız
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            run.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : run.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : run.status === 'RUNNING'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(run.startedAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {run.completedAt
                          ? new Date(run.completedAt).toLocaleString('tr-TR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {run.recordsProcessed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {run.recordsSucceeded}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {run.recordsFailed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Import Fallback */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Manuel Veri İmport (Yedek Yöntem)
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              ISSmanager müşteri verilerini manuel olarak aktarmak için
              aşağıdaki adımları izleyin:
            </p>
          </div>
          <div className="mt-5">
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                <strong>ISSmanager Admin Paneline Giriş:</strong> ISSmanager
                yönetim panelinize login olun
              </li>
              <li>
                <strong>Müşteri Listesi Export:</strong> Müşteri listesini
                CSV/Excel formatında export edin
              </li>
              <li>
                <strong>Gerekli Alanlar:</strong> Export dosyasının şu alanları
                içerdiğinden emin olun:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      abone_no
                    </code>{' '}
                    - Müşteri ID
                  </li>
                  <li>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      isim
                    </code>{' '}
                    - Müşteri adı
                  </li>
                  <li>
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      adres
                    </code>{' '}
                    - Tam adres (mahalle bilgisi için)
                  </li>
                </ul>
              </li>
              <li>
                <strong>Dosyayı Yükleyin:</strong> Export dosyasını &quot;Veri
                İmport&quot; sayfasından yükleyin
              </li>
            </ol>
          </div>
          <div className="mt-5 flex space-x-3">
            <button
              onClick={() => router.push('/dashboard/import')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              📥 Veri İmport Sayfasına Git
            </button>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              📈 Raporları Görüntüle
            </Link>
          </div>
        </div>
      </div>

      {/* No Config State */}
      {state === 'NO_CONFIG' && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              ISSmanager Bağlantısı Yapılandırılmadı
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                ISSmanager API bağlantısı henüz yapılandırılmamış. Bağlantıyı
                yapılandırmak için sistem yöneticinizle iletişime geçin veya
                manuel import kullanın.
              </p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => router.push('/dashboard/import')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                📥 Manuel İmport Kullan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
