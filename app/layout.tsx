import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "crmanaliz — binbirnet",
  description: "binbirnet operatörü için CRM analiz panosu.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
