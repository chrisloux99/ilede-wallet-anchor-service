'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Wallet,
  Copy,
  CheckCircle,
  AlertCircle,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  LogOut,
  ArrowDownUp,
  Send,
  History,
} from 'lucide-react';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import {
  generateWalletKeys,
  storeKeysSecurely,
  retrieveKeysSecurely,
  hasStoredWallet,
  clearWallet,
  type WalletKeys,
} from '@/lib/crypto';
import { authenticate } from '@/lib/stellar-auth';
import Link from 'next/link';

type View = 'checking' | 'login' | 'create' | 'dashboard';

export default function WalletPage() {
  const [view, setView] = useState<View>('checking');
  const [walletData, setWalletData] = useState<{ account_id: string; keys: WalletKeys } | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState(false);
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    setView(hasStoredWallet() ? 'login' : 'create');
  }, []);

  const loginMutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});
      if (!password) {
        setFieldErrors({ password: 'Password is required' });
        throw new Error('Password is required');
      }
      const keys = await retrieveKeysSecurely(password);
      // Try SEP-10 auth, but don't fail the login if it's unavailable
      try {
        const authResult = await authenticate(keys.secretKey);
        setAuthToken(authResult.token);
      } catch {
        // Auth endpoint may not be configured — dashboard still works
      }
      return { account_id: keys.publicKey, keys };
    },
    onSuccess: (data) => {
      setWalletData(data);
      setView('dashboard');
      toast({ title: 'Welcome back!', description: 'Wallet unlocked successfully.' });
    },
    onError: (error: any) => {
      if (error.message?.includes('decrypt') || error.message?.includes('OperationError')) {
        setFieldErrors({ password: 'Wrong password' });
      } else {
        handleError(error, { title: 'Login failed' });
      }
    },
  });

  const createWalletMutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});
      if (!password || password.length < 8) {
        setFieldErrors({ password: 'Password must be at least 8 characters' });
        throw new Error('Password must be at least 8 characters');
      }
      if (password !== confirmPassword) {
        setFieldErrors({ confirmPassword: 'Passwords do not match' });
        throw new Error('Passwords do not match');
      }

      const keys = generateWalletKeys();
      await storeKeysSecurely(keys, password);

      const res = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
          public_key: keys.publicKey,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error?.field_errors) setFieldErrors(err.error.field_errors);
        throw new Error(err.error?.message || 'Failed to create wallet');
      }

      const result = await res.json();

      // Sign and submit trustline XDR
      if (result.trustline_xdr) {
        try {
          const { TransactionBuilder, Keypair, Horizon } = await import('stellar-sdk');
          const networkPassphrase = 'Test SDF Network ; September 2015';
          const tx = TransactionBuilder.fromXDR(result.trustline_xdr, networkPassphrase) as any;
          tx.sign(Keypair.fromSecret(keys.secretKey));
          const server = new Horizon.Server('https://horizon-testnet.stellar.org');
          await server.submitTransaction(tx);
          result.trustline_submitted = true;
        } catch (trustErr: any) {
          console.error('Trustline submission failed:', trustErr);
          result.trustline_submitted = false;
        }
      }

      // SEP-10 auth
      try {
        const authResult = await authenticate(keys.secretKey);
        setAuthToken(authResult.token);
        result.authenticated = true;
      } catch {
        result.authenticated = false;
      }

      return { ...result, keys };
    },
    onSuccess: (data) => {
      setWalletData(data);
      setView('dashboard');
      setFieldErrors({});
      toast({ title: 'Wallet Created!', description: 'Your wallet is live and funded.' });
    },
    onError: (error: any) => {
      handleError(error, { title: 'Failed to create wallet' });
    },
  });

  const logout = useCallback(() => {
    clearWallet();
    setWalletData(null);
    setAuthToken(null);
    setPassword('');
    setView('create');
    toast({ title: 'Logged out', description: 'Wallet locked. Create or unlock to continue.' });
  }, [toast]);

  // --- Dashboard view ---
  if (view === 'dashboard' && walletData) {
    return (
      <DashboardView
        walletData={walletData}
        authToken={authToken}
        showSecret={showSecret}
        setShowSecret={setShowSecret}
        onLogout={logout}
      />
    );
  }

  // --- Loading state ---
  if (view === 'checking') {
    return (
      <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ngombe-terracotta" />
      </div>
    );
  }

  // --- Login view ---
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>

            <div className="text-center space-y-3">
              <div className="inline-flex p-4 rounded-2xl bg-ngombe-gold/20 border border-ngombe-gold/30 mb-4">
                <Wallet className="w-12 h-12 text-ngombe-gold" />
              </div>
              <h1 className="text-4xl font-black text-ngombe-bone">
                Unlock Your <span className="ngombe-gradient-text">Wallet</span>
              </h1>
              <p className="text-ngombe-bone/60">Enter your password to decrypt your keys.</p>
            </div>

            <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-ngombe-bone/70 text-sm font-medium">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your wallet password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loginMutation.mutate()}
                    className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-gold/50"
                  />
                  {fieldErrors.password && <p className="text-xs text-ngombe-terracotta">{fieldErrors.password}</p>}
                </div>

                {loginMutation.error && !fieldErrors.password && (
                  <ErrorDisplay error={loginMutation.error} onRetry={() => loginMutation.mutate()} />
                )}

                <button
                  onClick={() => loginMutation.mutate()}
                  disabled={loginMutation.isPending || !password}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-gold to-ngombe-terracotta text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Unlocking...
                    </span>
                  ) : 'Unlock Wallet'}
                </button>

                <button
                  onClick={() => { setView('create'); setPassword(''); setFieldErrors({}); }}
                  className="w-full py-3 rounded-xl border border-ngombe-bone/10 text-ngombe-bone/60 hover:text-ngombe-bone hover:border-ngombe-bone/20 transition-all text-sm"
                >
                  Create a new wallet instead
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- Create view ---
  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-terracotta/20 border border-ngombe-terracotta/30 mb-4">
              <Wallet className="w-12 h-12 text-ngombe-terracotta" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              Create Your <span className="ngombe-gradient-text">Wallet</span>
            </h1>
            <p className="text-ngombe-bone/60">Join the Stellar network and get free starter tokens!</p>
          </div>

          <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-ngombe-bone/10">
              <h2 className="text-lg font-bold text-ngombe-bone">Quick Setup</h2>
              <p className="text-sm text-ngombe-bone/50 mt-1">Set a password to encrypt your keys, then create your wallet.</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-ngombe-bone/70 text-sm font-medium">Wallet Password</Label>
                <Input id="password" type="password" placeholder="Min 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50" />
                {fieldErrors.password && <p className="text-xs text-ngombe-terracotta">{fieldErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-ngombe-bone/70 text-sm font-medium">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Re-enter password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50" />
                {fieldErrors.confirmPassword && <p className="text-xs text-ngombe-terracotta">{fieldErrors.confirmPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ngombe-bone/70 text-sm font-medium">Email (Optional)</Label>
                <Input id="email" type="email" placeholder="your@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-ngombe-bone/70 text-sm font-medium">Phone (Optional)</Label>
                <Input id="phone" type="tel" placeholder="+260 XXX XXX XXX" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50" />
              </div>

              <div className="p-4 rounded-xl bg-ngombe-ochre/10 border border-ngombe-ochre/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-ngombe-ochre mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ngombe-ochre">Important!</p>
                    <p className="text-xs text-ngombe-bone/50 mt-1">
                      Your secret key will only show once. Save it somewhere safe. Your password encrypts the key in your browser — if you forget it, you lose access.
                    </p>
                  </div>
                </div>
              </div>

              {createWalletMutation.error && (
                <ErrorDisplay error={createWalletMutation.error} onRetry={() => createWalletMutation.mutate()} />
              )}

              <button
                onClick={() => createWalletMutation.mutate()}
                disabled={createWalletMutation.isPending || !password || !confirmPassword}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-terracotta to-ngombe-gold text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
              >
                {createWalletMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Creating Wallet...
                  </span>
                ) : 'Create My Wallet'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// --- Dashboard sub-component ---
function DashboardView({
  walletData,
  authToken,
  showSecret,
  setShowSecret,
  onLogout,
}: {
  walletData: { account_id: string; keys: WalletKeys };
  authToken: string | null;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  onLogout: () => void;
}) {
  const { toast } = useToast();

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance', walletData.account_id],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/${walletData.account_id}/balance`);
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern p-6">
      <div className="max-w-3xl mx-auto space-y-8 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <button onClick={onLogout} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-ngombe-bone/10 text-ngombe-bone/60 hover:text-ngombe-terracotta hover:border-ngombe-terracotta/30 transition-all text-sm">
            <LogOut className="w-4 h-4" /> Lock Wallet
          </button>
        </div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex p-4 rounded-2xl bg-ngombe-forest/20 border border-ngombe-forest/30 mb-4">
            <CheckCircle className="w-12 h-12 text-ngombe-forest" />
          </div>
          <h1 className="text-4xl font-black text-ngombe-bone">
            Your <span className="ngombe-gradient-text">Dashboard</span>
          </h1>
          <p className="text-ngombe-bone/60 text-lg font-mono truncate max-w-lg mx-auto">
            {walletData.account_id}
          </p>
        </motion.div>

        {/* Balance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-ngombe-bone/10">
            <h2 className="text-lg font-bold text-ngombe-bone">Balance</h2>
          </div>
          <div className="p-6">
            {balanceLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-ngombe-terracotta" />
                <span className="ml-3 text-ngombe-bone/50">Loading...</span>
              </div>
            ) : balanceData?.balances?.length ? (
              <div className="space-y-3">
                {balanceData.balances.map((b: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-ngombe-dark/50 border border-ngombe-bone/5">
                    <div>
                      <span className="font-bold text-lg text-ngombe-bone">
                        {b.asset_type === 'native' ? 'XLM' : b.asset_code}
                      </span>
                      {b.asset_issuer && (
                        <p className="text-xs text-ngombe-bone/40 font-mono mt-1">{b.asset_issuer.slice(0, 12)}...</p>
                      )}
                    </div>
                    <span className="font-mono text-2xl font-black text-ngombe-gold">
                      {parseFloat(b.balance).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-ngombe-bone/50 py-8">No balances found.</p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href={`/deposit?account=${walletData.account_id}${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`}
            className="p-4 rounded-xl border border-ngombe-forest/20 bg-ngombe-forest/5 hover:bg-ngombe-forest/10 transition-all text-center">
            <ArrowDownUp className="w-5 h-5 text-ngombe-forest mx-auto mb-2" />
            <span className="text-sm font-bold text-ngombe-forest">Deposit</span>
          </Link>
          <Link href={`/withdraw?account=${walletData.account_id}${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`}
            className="p-4 rounded-xl border border-ngombe-gold/20 bg-ngombe-gold/5 hover:bg-ngombe-gold/10 transition-all text-center">
            <ArrowDownUp className="w-5 h-5 text-ngombe-gold mx-auto mb-2" />
            <span className="text-sm font-bold text-ngombe-gold">Withdraw</span>
          </Link>
          <Link href={`/send?account=${walletData.account_id}${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`}
            className="p-4 rounded-xl border border-ngombe-terracotta/20 bg-ngombe-terracotta/5 hover:bg-ngombe-terracotta/10 transition-all text-center">
            <Send className="w-5 h-5 text-ngombe-terracotta mx-auto mb-2" />
            <span className="text-sm font-bold text-ngombe-terracotta">Send</span>
          </Link>
          <Link href={`/wallet#credentials`}
            className="p-4 rounded-xl border border-ngombe-bone/10 bg-ngombe-bone/5 hover:bg-ngombe-bone/10 transition-all text-center">
            <Shield className="w-5 h-5 text-ngombe-bone/60 mx-auto mb-2" />
            <span className="text-sm font-bold text-ngombe-bone/60">Keys</span>
          </Link>
        </motion.div>

        {/* Credentials (collapsed) */}
        <motion.div id="credentials" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-ngombe-bone/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-ngombe-terracotta/20">
                <Wallet className="w-5 h-5 text-ngombe-terracotta" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ngombe-bone">Wallet Keys</h2>
                <p className="text-sm text-ngombe-bone/50">Your secret key is encrypted in your browser.</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-ngombe-bone/70 text-sm font-medium">Public Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 rounded-xl bg-ngombe-dark border border-ngombe-bone/10 font-mono text-sm text-ngombe-gold truncate">
                  {walletData.account_id}
                </div>
                <button onClick={() => copyToClipboard(walletData.account_id, 'Public Key')}
                  className="p-3 rounded-xl border border-ngombe-bone/10 hover:border-ngombe-terracotta/50 hover:bg-ngombe-terracotta/10 text-ngombe-bone/60 hover:text-ngombe-terracotta transition-all">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-ngombe-bone/70 text-sm font-medium">Secret Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 rounded-xl bg-ngombe-dark border border-ngombe-bone/10 font-mono text-sm text-ngombe-terracotta truncate">
                  {showSecret ? walletData.keys.secretKey : '••••••••••••••••••••••••••••••••'}
                </div>
                <button onClick={() => setShowSecret(!showSecret)}
                  className="p-3 rounded-xl border border-ngombe-bone/10 hover:border-ngombe-gold/50 hover:bg-ngombe-gold/10 text-ngombe-bone/60 hover:text-ngombe-gold transition-all">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copyToClipboard(walletData.keys.secretKey, 'Secret Key')}
                  className="p-3 rounded-xl border border-ngombe-bone/10 hover:border-ngombe-terracotta/50 hover:bg-ngombe-terracotta/10 text-ngombe-bone/60 hover:text-ngombe-terracotta transition-all">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-ngombe-forest/10 border border-ngombe-forest/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-ngombe-forest mt-0.5 flex-shrink-0" />
                <p className="text-xs text-ngombe-bone/50">
                  Your secret key is encrypted with your password and stored locally. Never share it with anyone.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
