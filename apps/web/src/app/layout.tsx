import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM Analiz',
  description: 'ISSmanager CRM Analytics & Decision Support Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
