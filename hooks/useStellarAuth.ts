'use client';

import { useState, useCallback, useRef } from 'react';
import { authenticate } from '@/lib/stellar-auth';

interface AuthState {
  token: string | null;
  account: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useStellarAuth() {
  const [state, setState] = useState<AuthState>({
    token: null,
    account: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
  const tokenExpiryRef = useRef<number>(0);

  const login = useCallback(async (secretKey: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const { Keypair } = await import('stellar-sdk');
      const keypair = Keypair.fromSecret(secretKey);
      const account = keypair.publicKey();

      const result = await authenticate(secretKey);
      tokenExpiryRef.current = Date.now() + result.expires_in * 1000;

      setState({
        token: result.token,
        account,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return result.token;
    } catch (err: any) {
      setState(s => ({ ...s, isLoading: false, error: err.message }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setState({
      token: null,
      account: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    tokenExpiryRef.current = 0;
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!state.token) return {};
    // Auto-refresh if token expired
    if (Date.now() > tokenExpiryRef.current - 60_000) {
      // Token expired or about to expire — caller should re-auth
      return {};
    }
    return { Authorization: `Bearer ${state.token}` };
  }, [state.token]);

  const refreshToken = useCallback(async (secretKey: string) => {
    const result = await authenticate(secretKey);
    tokenExpiryRef.current = Date.now() + result.expires_in * 1000;
    setState(s => ({ ...s, token: result.token }));
    return result.token;
  }, []);

  return {
    ...state,
    login,
    logout,
    getAuthHeaders,
    refreshToken,
  };
}
