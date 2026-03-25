'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@crmanaliz/ui';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center gap-8 max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          CRM Analiz
        </h1>
        <p className="text-xl text-gray-600">
          ISSmanager CRM Analytics & Decision Support Platform
        </p>
        <div className="flex gap-4 mt-4">
          <Link href={isAuthenticated ? '/dashboard' : '/login'}>
            <Button variant="primary" size="lg">
              Dashboard
            </Button>
          </Link>
          <Link href={isAuthenticated ? '/dashboard/integrations' : '/login'}>
            <Button variant="secondary" size="lg">
              Entegrasyonlar
            </Button>
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Mahalle Kalite Skoru</h3>
            <p className="text-sm text-gray-600">
              Mahalle bazlı müşteri kalite analizi ve skorlama
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Personel Verimliliği</h3>
            <p className="text-sm text-gray-600">
              Personel performans izleme ve raporlama
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Karar Destek</h3>
            <p className="text-sm text-gray-600">
              Yönetici karar destek sistemleri ve analitik
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
