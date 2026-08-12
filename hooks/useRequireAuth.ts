'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasStoredWallet } from '@/lib/crypto';

export function useRequireAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('wallet_authenticated');
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    } else if (hasStoredWallet()) {
      // Has wallet but not unlocked — redirect to login
      router.replace('/wallet');
    } else {
      // No wallet at all — redirect to create
      router.replace('/wallet');
    }
  }, [router]);

  return isAuthenticated;
}
