import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { WalletPage } from './pages/WalletPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { KycPage } from './pages/KycPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

function AppInner() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <ErrorBoundary>
                <HomePage />
              </ErrorBoundary>
            } />
            <Route path="/wallet" element={
              <ErrorBoundary>
                <WalletPage />
              </ErrorBoundary>
            } />
            <Route path="/deposit" element={
              <ErrorBoundary>
                <DepositPage />
              </ErrorBoundary>
            } />
            <Route path="/withdraw" element={
              <ErrorBoundary>
                <WithdrawPage />
              </ErrorBoundary>
            } />
            <Route path="/kyc" element={
              <ErrorBoundary>
                <KycPage />
              </ErrorBoundary>
            } />
          </Routes>
        </main>
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppInner />
      </Router>
    </QueryClientProvider>
  );
}
