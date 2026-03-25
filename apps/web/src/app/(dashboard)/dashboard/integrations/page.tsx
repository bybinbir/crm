'use client';
import Link from 'next/link';

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <Link href="/dashboard/integrations/issmanager" className="block hover:bg-gray-50 transition">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">ISSmanager</h3>
            <p className="mt-1 text-sm text-gray-500">CRM system integration for customer data sync</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
