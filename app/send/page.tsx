'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowRightLeft, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authenticate } from '@/lib/stellar-auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Link from 'next/link';

function SendPageContent() {
  const isAuthed = useRequireAuth();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthing, setIsAuthing] = useState(false);

  const [sendAsset, setSendAsset] = useState('iLede');
  const [sendAmount, setSendAmount] = useState('');
  const [destAsset, setDestAsset] = useState('USDC');
  const [destAccount, setDestAccount] = useState('');
  const [result, setResult] = useState<any>(null);

  const { toast } = useToast();

  if (!isAuthed) return null;

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

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error('Authentication required.');
      if (!sendAmount || parseFloat(sendAmount) <= 0) throw new Error('Invalid amount');
      if (!destAccount) throw new Error('Destination account required');

      const res = await fetch('/api/transactions/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          send_asset: sendAsset,
          send_amount: sendAmount,
          destination_asset: destAsset,
          destination_account: destAccount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Send failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: 'Payment Sent!', description: `Transaction ID: ${data.id}` });
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
              <ArrowRightLeft className="w-12 h-12 text-ngombe-forest" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              <span className="ngombe-gradient-text">Cross-Border</span> Send
            </h1>
            <p className="text-ngombe-bone/60">Send assets across borders via SEP-31</p>
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

              {/* Send asset */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Send Asset</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['iLede', 'USDC'].map((asset) => (
                    <button
                      key={asset}
                      onClick={() => setSendAsset(asset)}
                      className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                        sendAsset === asset
                          ? 'bg-ngombe-terracotta/20 border-2 border-ngombe-terracotta/50 text-ngombe-terracotta'
                          : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50'
                      }`}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Amount to Send</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone"
                />
              </div>

              {/* Destination asset */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Destination Asset</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['USDC', 'iLede'].map((asset) => (
                    <button
                      key={asset}
                      onClick={() => setDestAsset(asset)}
                      className={`py-3 rounded-xl font-semibold text-sm transition-all ${
                        destAsset === asset
                          ? 'bg-ngombe-gold/20 border-2 border-ngombe-gold/50 text-ngombe-gold'
                          : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50'
                      }`}
                    >
                      {asset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination account */}
              <div className="space-y-2">
                <Label className="text-ngombe-bone/70 text-sm font-medium">Destination Stellar Account</Label>
                <Input
                  placeholder="G..."
                  value={destAccount}
                  onChange={(e) => setDestAccount(e.target.value)}
                  className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone"
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !authToken || !sendAmount || !destAccount}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-forest to-ngombe-gold text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
              >
                {sendMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  'Send Cross-Border'
                )}
              </button>

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border ${
                    result.status === 'completed'
                      ? 'bg-ngombe-forest/10 border-ngombe-forest/20'
                      : 'bg-ngombe-terracotta/10 border-ngombe-terracotta/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-ngombe-forest mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-ngombe-terracotta mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ngombe-bone">
                        {result.status === 'completed' ? 'Payment Sent!' : 'Status: ' + result.status}
                      </p>
                      <p className="text-xs text-ngombe-bone/50 mt-1">ID: {result.id}</p>
                      {result.stellar_transaction_id && (
                        <p className="text-xs text-ngombe-bone/50 font-mono break-all">TX: {result.stellar_transaction_id}</p>
                      )}
                      {result.amount_out && (
                        <p className="text-xs text-ngombe-bone/50">Delivered: {result.amount_out} {destAsset}</p>
                      )}
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

export default function SendPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ngombe-dark flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-ngombe-forest" /></div>}>
      <SendPageContent />
    </Suspense>
  );
}
