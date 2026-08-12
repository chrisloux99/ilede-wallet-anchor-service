'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowDownToLine, ArrowLeft, CheckCircle } from 'lucide-react';
import { authenticate } from '@/lib/stellar-auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Link from 'next/link';

function DepositPageContent() {
  const isAuthed = useRequireAuth();
  const searchParams = useSearchParams();
  const [assetCode, setAssetCode] = useState('iLede');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isAuthing, setIsAuthing] = useState(false);
  const { toast } = useToast();

  if (!isAuthed) return null;

  // Read account and token from URL params (passed from wallet page)
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
      // Extract public key from secret
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

  const depositMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error('Authentication required. Enter your secret key or connect from wallet.');
      const params = new URLSearchParams({ asset_code: assetCode, account });
      if (amount) params.set('amount', amount);
      const res = await fetch(`/api/deposit?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Deposit failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'Deposit Initiated', description: `Transaction ID: ${data.id}` });
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
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-forest/20 border border-ngombe-forest/30 mb-4">
              <ArrowDownToLine className="w-12 h-12 text-ngombe-forest" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              <span className="ngombe-gradient-text">Deposit</span>
            </h1>
            <p className="text-ngombe-bone/60">Initiate a deposit transaction via SEP-6</p>
          </div>

          <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm overflow-hidden">
            <div className="p-6 space-y-5">
              {/* Auth section - show if not authenticated */}
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

              {/* Account */}
              <div className="space-y-2">
                <Label htmlFor="account" className="text-ngombe-bone/70 text-sm font-medium">Stellar Account ID</Label>
                <Input
                  id="account"
                  placeholder="G..."
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-ngombe-bone/70 text-sm font-medium">Amount (Optional)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-terracotta/50"
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => depositMutation.mutate()}
                disabled={depositMutation.isPending || !account || !authToken}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-forest to-ngombe-terracotta text-ngombe-bone font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
              >
                {depositMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Deposit'
                )}
              </button>

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-ngombe-forest/10 border border-ngombe-forest/20"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-ngombe-forest mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ngombe-forest">Deposit Initiated!</p>
                      <p className="text-xs text-ngombe-bone/50 mt-1">ID: {result.id}</p>
                      <p className="text-xs text-ngombe-bone/50 mt-1">{result.how}</p>
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

export default function DepositPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ngombe-dark flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-ngombe-terracotta" /></div>}>
      <DepositPageContent />
    </Suspense>
  );
}
