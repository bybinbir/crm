'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import api from '@/lib/api';

type SourceType =
  | 'CSV_UPLOAD'
  | 'EXCEL_UPLOAD'
  | 'ISSMANAGER_EXPORT'
  | 'DATABASE_EXPORT'
  | 'MANUAL_ENTRY';

interface UploadResult {
  batchId: string;
  fileName: string;
  rowsParsed: number;
  rowsImported: number;
  rowsFailed: number;
  status: string;
}

export default function ImportPage() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>('ISSMANAGER_EXPORT');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Lütfen bir dosya seçin');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', sourceType);

      const response = await api.post<UploadResult>(
        '/api/v1/imports/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess(response.data);
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById(
        'file-input'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: unknown) {
      const errorMessage =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
          ? err.response.data.message
          : 'Dosya yükleme başarısız';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Veri İmport</h1>
      </div>

      {/* Instructions */}
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
            <h3 className="text-sm font-medium text-blue-800">
              ISSmanager Veri İmport Talimatları
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ol className="list-decimal list-inside space-y-1">
                <li>ISSmanager admin paneline giriş yapın</li>
                <li>Müşteri listesini CSV/Excel formatında export edin</li>
                <li>
                  Export dosyasının şu alanları içermesi gerekir:{' '}
                  <strong>abone_no</strong>, <strong>isim</strong>,{' '}
                  <strong>adres</strong>
                </li>
                <li>Dosyayı aşağıdaki formdan yükleyin</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Dosya Yükleme</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Veri Kaynağı
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ISSMANAGER_EXPORT">ISSmanager Export</option>
            <option value="CSV_UPLOAD">Generic CSV Upload</option>
            <option value="EXCEL_UPLOAD">Excel Upload</option>
            <option value="DATABASE_EXPORT">Database Export</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            ISSmanager&apos;dan export edilen dosyalar için &quot;ISSmanager
            Export&quot; seçin
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Dosya Seçin
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
          <p className="mt-1 text-sm text-gray-500">
            CSV veya Excel dosyası (Maksimum 10MB)
          </p>
        </div>

        {file && (
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-sm text-gray-700">
              <strong>Seçilen dosya:</strong> {file.name}
            </p>
            <p className="text-sm text-gray-500">
              Boyut: {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        <div className="flex space-x-4 pt-4">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? 'Yükleniyor...' : 'Yükle ve İşle'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                İmport Başarılı!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt className="font-medium">Dosya:</dt>
                  <dd>{success.fileName}</dd>
                  <dt className="font-medium">Toplam Satır:</dt>
                  <dd>{success.rowsParsed}</dd>
                  <dt className="font-medium">Başarılı:</dt>
                  <dd className="text-green-800">{success.rowsImported}</dd>
                  <dt className="font-medium">Başarısız:</dt>
                  <dd className="text-red-600">{success.rowsFailed}</dd>
                  <dt className="font-medium">Durum:</dt>
                  <dd>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        success.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {success.status}
                    </span>
                  </dd>
                </dl>
              </div>
              <button
                onClick={() => router.push('/dashboard/reports')}
                className="mt-3 text-sm text-green-700 underline hover:text-green-900"
              >
                Raporlara Git →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Mapping Reference */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          ISSmanager Alan Eşleştirmesi
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ISSmanager Alan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Açıklama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gerekli
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  abone_no
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  Abone numarası (benzersiz ID)
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  Evet
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  isim
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">Müşteri adı</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  Evet
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  adres
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  Tam adres (mahalle bilgisi için parse edilir)
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  Evet
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  email
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  E-posta adresi
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  İsteğe bağlı
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  telefon
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  Telefon numarası
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  İsteğe bağlı
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  tarife
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  Tarife/Paket adı
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  İsteğe bağlı
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  bakiye
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  Hesap bakiyesi
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  İsteğe bağlı
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
