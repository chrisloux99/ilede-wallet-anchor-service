'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { generateWalletKeys, storeKeysSecurely } from '@/lib/crypto';
import { authenticate } from '@/lib/stellar-auth';
import Link from 'next/link';

export default function WalletPage() {
  const [walletData, setWalletData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const createWalletMutation = useMutation({
    mutationFn: async () => {
      setFieldErrors({});

      // Validate password
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

      // Sign and submit trustline XDR if provided
      if (result.trustline_xdr) {
        try {
          const { TransactionBuilder } = await import('stellar-sdk');
          const networkPassphrase = 'Test SDF Network ; September 2015';
          const tx = TransactionBuilder.fromXDR(result.trustline_xdr, networkPassphrase) as any;
          const { Keypair } = await import('stellar-sdk');
          const keypair = Keypair.fromSecret(keys.secretKey);
          tx.sign(keypair);

          const horizonUrl = 'https://horizon-testnet.stellar.org';
          const { Horizon } = await import('stellar-sdk');
          const server = new Horizon.Server(horizonUrl);
          await server.submitTransaction(tx);
          result.trustline_submitted = true;
        } catch (trustErr: any) {
          console.error('Trustline submission failed:', trustErr);
          result.trustline_submitted = false;
          result.trustline_error = trustErr.message;
        }
      }

      // Perform SEP-10 auth to get JWT
      try {
        const authResult = await authenticate(keys.secretKey);
        setAuthToken(authResult.token);
        result.authenticated = true;
      } catch (authErr: any) {
        console.error('SEP-10 auth failed:', authErr);
        result.authenticated = false;
      }

      return { ...result, keys };
    },
    onSuccess: (data) => {
      setWalletData(data);
      setFieldErrors({});
      const messages = ['Wallet created and funded.'];
      if (data.trustline_submitted) messages.push('Trustline established.');
      if (data.authenticated) messages.push('Authenticated with anchor.');
      toast({ title: 'Wallet Created!', description: messages.join(' ') });
    },
    onError: (error: any) => {
      handleError(error, { title: 'Failed to create wallet' });
    },
  });

  const { data: balanceData } = useQuery({
    queryKey: ['balance', walletData?.account_id],
    queryFn: async () => {
      const res = await fetch(`/api/wallet/${walletData.account_id}/balance`);
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    enabled: !!walletData?.account_id,
    refetchInterval: 10000,
  });

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
  };

  if (walletData) {
    return (
      <div className="min-h-screen bg-ngombe-dark ngombe-pattern p-6">
        <div className="max-w-3xl mx-auto space-y-8 pt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Success header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-forest/20 border border-ngombe-forest/30 mb-4">
              <CheckCircle className="w-12 h-12 text-ngombe-forest" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              Welcome to Your <span className="ngombe-gradient-text">Wallet</span>
            </h1>
            <p className="text-ngombe-bone/60 text-lg">Your wallet is live and funded on Stellar testnet.</p>
          </motion.div>

          {/* Wallet credentials card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-6 border-b border-ngombe-bone/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-ngombe-terracotta/20">
                  <Wallet className="w-5 h-5 text-ngombe-terracotta" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ngombe-bone">Wallet Credentials</h2>
                  <p className="text-sm text-ngombe-bone/50">Your secret key is encrypted with your password and stored in your browser.</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Public key */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Account ID (Public)</Label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-ngombe-dark border border-ngombe-bone/10 font-mono text-sm text-ngombe-gold truncate">
                    {walletData.account_id}
                  </div>
                  <button
                    onClick={() => copyToClipboard(walletData.account_id, 'Account ID')}
                    className="p-3 rounded-xl border border-ngombe-bone/10 hover:border-ngombe-terracotta/50 hover:bg-ngombe-terracotta/10 text-ngombe-bone/60 hover:text-ngombe-terracotta transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Secret key */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Secret Key (Keep Private!)</Label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl bg-ngombe-dark border border-ngombe-bone/10 font-mono text-sm text-ngombe-terracotta truncate">
                    {showSecret ? (walletData.keys?.secretKey || 'Generated client-side') : '••••••••••••••••••••••••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-3 rounded-xl border border-ngombe-bone/10 hover:border-ngombe-gold/50 hover:bg-ngombe-gold/10 text-ngombe-bone/60 hover:text-ngombe-gold transition-all"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(walletData.keys?.secretKey || '', 'Secret Key')}
                    className="p-3 rounded-xl border border-ngombe-bone/10 hover:border-ngombe-terracotta/50 hover:bg-ngombe-terracotta/10 text-ngombe-bone/60 hover:text-ngombe-terracotta transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Security notice */}
              <div className="p-4 rounded-xl bg-ngombe-forest/10 border border-ngombe-forest/20">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-ngombe-forest mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ngombe-forest">Enhanced Security</p>
                    <p className="text-xs text-ngombe-bone/50 mt-1">
                      Your secret key was generated and encrypted on your device with your password. It never leaves your browser.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="grid grid-cols-3 gap-3">
                {/* Airdrop */}
                <div className={`p-3 rounded-xl border ${walletData.airdrop_transaction_hash ? 'bg-ngombe-gold/10 border-ngombe-gold/20' : 'bg-ngombe-dark border-ngombe-bone/10'}`}>
                  <div className="flex items-center gap-2">
                    {walletData.airdrop_transaction_hash ? (
                      <CheckCircle className="w-4 h-4 text-ngombe-gold" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-ngombe-bone/40" />
                    )}
                    <span className="text-xs font-semibold text-ngombe-bone">XLM Funded</span>
                  </div>
                </div>

                {/* Trustline */}
                <div className={`p-3 rounded-xl border ${walletData.trustline_submitted ? 'bg-ngombe-forest/10 border-ngombe-forest/20' : 'bg-ngombe-terracotta/10 border-ngombe-terracotta/20'}`}>
                  <div className="flex items-center gap-2">
                    {walletData.trustline_submitted ? (
                      <CheckCircle className="w-4 h-4 text-ngombe-forest" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-ngombe-terracotta" />
                    )}
                    <span className="text-xs font-semibold text-ngombe-bone">Trustline</span>
                  </div>
                </div>

                {/* Auth */}
                <div className={`p-3 rounded-xl border ${walletData.authenticated ? 'bg-ngombe-forest/10 border-ngombe-forest/20' : 'bg-ngombe-ochre/10 border-ngombe-ochre/20'}`}>
                  <div className="flex items-center gap-2">
                    {walletData.authenticated ? (
                      <CheckCircle className="w-4 h-4 text-ngombe-forest" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-ngombe-ochre" />
                    )}
                    <span className="text-xs font-semibold text-ngombe-bone">Authenticated</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Balance card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-6 border-b border-ngombe-bone/10">
              <h2 className="text-lg font-bold text-ngombe-bone">Your Balance</h2>
            </div>
            <div className="p-6">
              {balanceData ? (
                <div className="space-y-3">
                  {balanceData.balances.map((balance: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 rounded-xl bg-ngombe-dark/50 border border-ngombe-bone/5"
                    >
                      <div>
                        <span className="font-bold text-lg text-ngombe-bone">
                          {balance.asset_type === 'native' ? 'XLM' : balance.asset_code}
                        </span>
                        {balance.asset_issuer && (
                          <p className="text-xs text-ngombe-bone/40 font-mono mt-1">
                            {balance.asset_issuer.slice(0, 12)}...
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-2xl font-black text-ngombe-gold">
                        {parseFloat(balance.balance).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-ngombe-terracotta" />
                  <span className="ml-3 text-ngombe-bone/50">Checking balance...</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Action links */}
          {authToken && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4"
            >
              <Link href={`/deposit?account=${walletData.account_id}&token=${encodeURIComponent(authToken)}`}>
                <div className="p-4 rounded-xl border border-ngombe-forest/20 bg-ngombe-forest/5 hover:bg-ngombe-forest/10 transition-all text-center cursor-pointer">
                  <span className="font-bold text-ngombe-forest">Deposit iLede</span>
                </div>
              </Link>
              <Link href={`/withdraw?account=${walletData.account_id}&token=${encodeURIComponent(authToken)}`}>
                <div className="p-4 rounded-xl border border-ngombe-gold/20 bg-ngombe-gold/5 hover:bg-ngombe-gold/10 transition-all text-center cursor-pointer">
                  <span className="font-bold text-ngombe-gold">Withdraw</span>
                </div>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-terracotta/20 border border-ngombe-terracotta/30 mb-4">
              <Wallet className="w-12 h-12 text-ngombe-terracotta" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              Create Your <span className="ngombe-gradient-text">Wallet</span>
            </h1>
            <p className="text-ngombe-bone/60">
              Join the Stellar network and get free starter tokens!
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-ngombe-bone/10">
              <h2 className="text-lg font-bold text-ngombe-bone">Quick Setup</h2>
              <p className="text-sm text-ngombe-bone/50 mt-1">Set a password to encrypt your keys, then create your wallet.</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-ngombe-bone/70 text-sm font-medium">Wallet Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50"
                />
                {fieldErrors.password && (
                  <p className="text-xs text-ngombe-terracotta">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-ngombe-bone/70 text-sm font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-ngombe-terracotta">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ngombe-bone/70 text-sm font-medium">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-ngombe-bone/70 text-sm font-medium">Phone (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+260 XXX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50"
                />
              </div>

              {/* Warning */}
              <div className="p-4 rounded-xl bg-ngombe-ochre/10 border border-ngombe-ochre/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-ngombe-ochre mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ngombe-ochre">Important!</p>
                    <p className="text-xs text-ngombe-bone/50 mt-1">
                      Your secret key will only show once. Save it somewhere safe before leaving this page. Your password encrypts the key in your browser — if you forget it, you lose access.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error display */}
              {createWalletMutation.error && (
                <ErrorDisplay error={createWalletMutation.error} onRetry={() => createWalletMutation.mutate()} />
              )}

              {/* Submit button */}
              <button
                onClick={() => createWalletMutation.mutate()}
                disabled={createWalletMutation.isPending || !password || !confirmPassword}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-terracotta to-ngombe-gold text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
              >
                {createWalletMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Wallet...
                  </span>
                ) : (
                  'Create My Wallet'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
