'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, ArrowDownToLine } from 'lucide-react';

type Status = 'loading' | 'confirm' | 'processing' | 'completed' | 'error';

function DepositInteractiveContent() {
  const searchParams = useSearchParams();
  const txId = searchParams.get('id');
  const account = searchParams.get('account');

  const [status, setStatus] = useState<Status>('loading');
  const [amount, setAmount] = useState('');
  const [assetCode, setAssetCode] = useState('iLede');
  const [error, setError] = useState('');
  const [txResult, setTxResult] = useState<any>(null);

  // Notify parent window (wallet) of completion
  const notifyParent = useCallback((data: any) => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'deposit_complete', transaction_id: txId, ...data },
        '*'
      );
    }
  }, [txId]);

  useEffect(() => {
    if (txId && account) {
      setStatus('confirm');
    } else {
      setError('Missing transaction ID or account');
      setStatus('error');
    }
  }, [txId, account]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStatus('processing');
    setError('');

    try {
      // Call the deposit API to execute on-chain transfer
      const res = await fetch(`/api/deposit?asset_code=${assetCode}&account=${account}&amount=${amount}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Deposit failed');
      }

      const result = await res.json();
      setTxResult(result);
      setStatus('completed');
      notifyParent({ status: 'completed', ...result });
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      notifyParent({ status: 'error', error: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-forest/20 border border-ngombe-forest/30">
              <ArrowDownToLine className="w-12 h-12 text-ngombe-forest" />
            </div>
            <h1 className="text-3xl font-black text-ngombe-bone">Deposit iLede</h1>
            {txId && <p className="text-sm text-ngombe-bone/50 font-mono">TX: {txId}</p>}
          </div>

          {/* Content card */}
          <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm p-6 space-y-5">
            {status === 'loading' && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-ngombe-terracotta" />
              </div>
            )}

            {status === 'confirm' && (
              <>
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
                            : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50'
                        }`}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-ngombe-bone/70 text-sm font-medium">Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone"
                  />
                </div>

                <div className="p-3 rounded-lg bg-ngombe-dark/50 border border-ngombe-bone/10">
                  <p className="text-xs text-ngombe-bone/50">Depositing to: <span className="font-mono text-ngombe-gold">{account?.slice(0, 12)}...</span></p>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-ngombe-terracotta/10 border border-ngombe-terracotta/20 text-ngombe-terracotta text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <button
                  onClick={handleDeposit}
                  disabled={!amount}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-forest to-ngombe-terracotta text-ngombe-bone font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Confirm Deposit
                </button>
              </>
            )}

            {status === 'processing' && (
              <div className="text-center py-8 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-ngombe-terracotta mx-auto" />
                <p className="text-ngombe-bone/60">Processing your deposit on Stellar...</p>
              </div>
            )}

            {status === 'completed' && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="h-12 w-12 text-ngombe-forest mx-auto" />
                <p className="text-lg font-bold text-ngombe-bone">Deposit Complete!</p>
                {txResult?.stellar_transaction_id && (
                  <p className="text-xs text-ngombe-bone/50 font-mono break-all">
                    TX: {txResult.stellar_transaction_id}
                  </p>
                )}
                <p className="text-sm text-ngombe-bone/50">This window will close shortly.</p>
                {typeof window !== 'undefined' && setTimeout(() => window.close(), 3000)}
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="h-12 w-12 text-ngombe-terracotta mx-auto" />
                <p className="text-lg font-bold text-ngombe-bone">Error</p>
                <p className="text-sm text-ngombe-bone/60">{error}</p>
                <button
                  onClick={() => { setStatus('confirm'); setError(''); }}
                  className="px-6 py-2 rounded-lg bg-ngombe-terracotta/20 border border-ngombe-terracotta/30 text-ngombe-terracotta font-semibold"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function DepositInteractivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ngombe-dark flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-ngombe-terracotta" /></div>}>
      <DepositInteractiveContent />
    </Suspense>
  );
}
