import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/QueryProvider';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'iLede Wallet - Zambia\'s Gateway to DeFi',
  description: 'Trade, save, and grow your wealth on the Stellar blockchain. Built for Zambia.',
  keywords: ['Zambia', 'DeFi', 'Stellar', 'wallet', 'iLede', 'cryptocurrency', 'Africa'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          <Header />
          <main className="pt-16">
            {children}
          </main>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
