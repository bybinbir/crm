'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ISSmanagerPage() {
  const router = useRouter();

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

      {/* Integration Method */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Veri Entegrasyon Yöntemi
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              ISSmanager müşteri verilerini CRM Analiz platformuna aktarmak için
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

      {/* Technical Details */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Teknik Detaylar
          </h3>
          <div className="mt-5">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Integration Tipi
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Export/Import (Manuel)
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Desteklenen Formatlar
                </dt>
                <dd className="mt-1 text-sm text-gray-900">CSV, Excel</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Maksimum Dosya Boyutu
                </dt>
                <dd className="mt-1 text-sm text-gray-900">10 MB</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Veri İşleme
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Otomatik alan eşleştirme, adres parsing
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Field Mapping Reference */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Alan Eşleştirme Referansı
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ISSmanager Alan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CRM Analiz Alan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gerekli
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notlar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    abone_no
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    External ID
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Evet
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    Benzersiz müşteri ID
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    isim
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Name
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Evet
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    Müşteri adı
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    adres
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Address
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Evet
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    Otomatik parse: mahalle, ilçe, şehir
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    email
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Email
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Hayır
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    İsteğe bağlı
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    telefon
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Phone
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Hayır
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    İsteğe bağlı
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    tarife
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Plan
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Hayır
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    Tarife/paket bilgisi
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    bakiye
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Balance
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Hayır
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    Hesap bakiyesi
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Example Address Format */}
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
              Adres Formatı Örneği
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="font-mono bg-white p-2 rounded">
                Güzeloba Mah. Lara Cd. No:7/7 Muratpaşa/Antalya
              </p>
              <p className="mt-2">
                <strong>Çıkarılan veriler:</strong>
              </p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>Mahalle: Güzeloba</li>
                <li>İlçe: Muratpaşa</li>
                <li>Şehir: Antalya</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
