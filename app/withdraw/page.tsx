'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowUpFromLine, ArrowLeft, CheckCircle } from 'lucide-react';
import { authenticate } from '@/lib/stellar-auth';
import Link from 'next/link';

function WithdrawPageContent() {
  const searchParams = useSearchParams();
  const [assetCode, setAssetCode] = useState('iLede');
  const [type, setType] = useState('bank_account');
  const [dest, setDest] = useState('');
  const [account, setAccount] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isAuthing, setIsAuthing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const urlAccount = searchParams.get('account');
    const urlToken = searchParams.get('token');
    if (urlAccount) setAccount(urlAccount);
    if (urlToken) setAuthToken(urlToken);
  }, [searchParams]);

  const handleAuth = async () => {
    if (!secretKey) return;
    setIsAuthing(true);
    try {
      const result = await authenticate(secretKey);
      setAuthToken(result.token);
      const { Keypair } = await import('stellar-sdk');
      const kp = Keypair.fromSecret(secretKey);
      setAccount(kp.publicKey());
      toast({ title: 'Authenticated', description: 'SEP-10 auth successful.' });
    } catch (err: any) {
      toast({ title: 'Auth Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsAuthing(false);
    }
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error('Authentication required.');
      const params = new URLSearchParams({ asset_code: assetCode, type, dest });
      if (account) params.set('account', account);
      const res = await fetch(`/api/withdraw?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Withdrawal failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'Withdrawal Initiated', description: `Transaction ID: ${data.id}` });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-gold/20 border border-ngombe-gold/30 mb-4">
              <ArrowUpFromLine className="w-12 h-12 text-ngombe-gold" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              <span className="ngombe-gradient-text">Withdraw</span>
            </h1>
            <p className="text-ngombe-bone/60">Initiate a withdrawal via SEP-6</p>
          </div>

          <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
            <div className="p-6 space-y-5">
              {/* Auth section */}
              {!authToken && (
                <div className="space-y-3 p-4 rounded-xl bg-ngombe-ochre/10 border border-ngombe-ochre/20">
                  <Label className="text-ngombe-bone/70 text-sm font-medium">Authenticate with your secret key</Label>
                  <Input
                    type="password"
                    placeholder="S..."
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30"
                  />
                  <button
                    onClick={handleAuth}
                    disabled={isAuthing || !secretKey}
                    className="w-full py-2 rounded-lg bg-ngombe-ochre/20 border border-ngombe-ochre/30 text-ngombe-ochre font-semibold text-sm hover:bg-ngombe-ochre/30 disabled:opacity-50 transition-all"
                  >
                    {isAuthing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Authenticate'}
                  </button>
                </div>
              )}

              {authToken && (
                <div className="p-3 rounded-lg bg-ngombe-forest/10 border border-ngombe-forest/20 text-ngombe-forest text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Authenticated
                </div>
              )}

              {/* Asset select */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Asset</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['iLede', 'USDC'].map((asset) => (
                    <button
                      key={asset}
                      onClick={() => setAssetCode(asset)}
                      className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                        assetCode === asset
                          ? 'bg-ngombe-terracotta/20 border-2 border-ngombe-terracotta/50 text-ngombe-terracotta'
                          : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50 hover:border-ngombe-bone/20'
                      }`}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Withdrawal type */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Withdrawal Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'bank_account', label: 'Bank' },
                    { value: 'cash', label: 'Cash' },
                    { value: 'mobile_money', label: 'Mobile' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={`py-3 rounded-xl font-semibold text-xs transition-all ${
                        type === t.value
                          ? 'bg-ngombe-gold/20 border-2 border-ngombe-gold/50 text-ngombe-gold'
                          : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50 hover:border-ngombe-bone/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="dest" className="text-ngombe-bone/70 text-sm font-medium">Destination</Label>
                <Input
                  id="dest"
                  placeholder="Account number or address"
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-gold/50"
                />
              </div>

              {/* Stellar account */}
              <div className="space-y-2">
                <Label htmlFor="account" className="text-ngombe-bone/70 text-sm font-medium">Stellar Account ID (Optional)</Label>
                <Input
                  id="account"
                  placeholder="G..."
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-gold/50"
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending || !dest || !authToken}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-gold to-ngombe-terracotta text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
              >
                {withdrawMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Withdraw'
                )}
              </button>

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-ngombe-gold/10 border border-ngombe-gold/20"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-ngombe-gold mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ngombe-gold">Withdrawal Initiated!</p>
                      <p className="text-xs text-ngombe-bone/50 mt-1">Send to: {result.account_id}</p>
                      <p className="text-xs text-ngombe-bone/50">Memo: {result.memo} ({result.memo_type})</p>
                      <p className="text-xs text-ngombe-bone/50">ETA: {result.eta} seconds</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function WithdrawPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ngombe-dark flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-ngombe-gold" /></div>}>
      <WithdrawPageContent />
    </Suspense>
  );
}
