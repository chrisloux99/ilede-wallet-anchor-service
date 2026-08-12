'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, ArrowUpFromLine, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type Status = 'loading' | 'instructions' | 'waiting' | 'completed' | 'error';

function WithdrawInteractiveContent() {
  const searchParams = useSearchParams();
  const txId = searchParams.get('id');
  const account = searchParams.get('account');
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>('loading');
  const [amount, setAmount] = useState('');
  const [assetCode, setAssetCode] = useState('iLede');
  const [destType, setDestType] = useState('bank_account');
  const [dest, setDest] = useState('');
  const [error, setError] = useState('');
  const [withdrawResult, setWithdrawResult] = useState<any>(null);

  const notifyParent = useCallback((data: any) => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'withdraw_complete', transaction_id: txId, ...data },
        '*'
      );
    }
  }, [txId]);

  useEffect(() => {
    if (txId && account) {
      setStatus('instructions');
    } else {
      setError('Missing transaction ID or account');
      setStatus('error');
    }
  }, [txId, account]);

  // Auto-close window after completion
  useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => window.close(), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
  };

  const handleWithdraw = async () => {
    if (!dest || !amount || parseFloat(amount) <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    setStatus('waiting');
    setError('');

    try {
      const params = new URLSearchParams({
        asset_code: assetCode,
        type: destType,
        dest,
        account: account || '',
        amount,
      });

      const res = await fetch(`/api/withdraw?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Withdrawal failed');
      }

      const result = await res.json();
      setWithdrawResult(result);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      notifyParent({ status: 'error', error: err.message });
    }
  };

  const handleConfirmSent = async () => {
    setStatus('completed');
    notifyParent({ status: 'pending_anchor', transaction_id: txId });
  };

  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-gold/20 border border-ngombe-gold/30">
              <ArrowUpFromLine className="w-12 h-12 text-ngombe-gold" />
            </div>
            <h1 className="text-3xl font-black text-ngombe-bone">Withdraw</h1>
            {txId && <p className="text-sm text-ngombe-bone/50 font-mono">TX: {txId}</p>}
          </div>

          {/* Content card */}
          <div className="rounded-2xl border border-ngombe-bone/10 bg-ngombe-charcoal/50 backdrop-blur-sm p-6 space-y-5">
            {status === 'loading' && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-ngombe-gold" />
              </div>
            )}

            {status === 'instructions' && (
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
                            ? 'bg-ngombe-gold/20 border-2 border-ngombe-gold/50 text-ngombe-gold'
                            : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50'
                        }`}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

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
                        onClick={() => setDestType(t.value)}
                        className={`py-3 rounded-xl font-semibold text-xs transition-all ${
                          destType === t.value
                            ? 'bg-ngombe-gold/20 border-2 border-ngombe-gold/50 text-ngombe-gold'
                            : 'border-2 border-ngombe-bone/10 text-ngombe-bone/50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-ngombe-bone/70 text-sm font-medium">Destination</Label>
                  <Input
                    placeholder="Account number or address"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone"
                  />
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

                {error && (
                  <div className="p-3 rounded-lg bg-ngombe-terracotta/10 border border-ngombe-terracotta/20 text-ngombe-terracotta text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                <button
                  onClick={handleWithdraw}
                  disabled={!dest || !amount}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-gold to-ngombe-terracotta text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Start Withdrawal
                </button>
              </>
            )}

            {status === 'waiting' && withdrawResult && (
              <>
                <div className="p-4 rounded-xl bg-ngombe-ochre/10 border border-ngombe-ochre/20 space-y-3">
                  <p className="text-sm font-semibold text-ngombe-ochre">Send tokens to complete withdrawal</p>
                  <p className="text-xs text-ngombe-bone/50">Send <span className="font-bold text-ngombe-bone">{amount} {assetCode}</span> to:</p>

                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-ngombe-dark border border-ngombe-bone/10 font-mono text-xs text-ngombe-gold truncate">
                      {withdrawResult.instructions?.send_to}
                    </div>
                    <button
                      onClick={() => copyToClipboard(withdrawResult.instructions?.send_to || '')}
                      className="p-2 rounded-lg border border-ngombe-bone/10 hover:border-ngombe-gold/50 text-ngombe-bone/60"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-ngombe-dark border border-ngombe-bone/10 font-mono text-xs text-ngombe-bone truncate">
                      Memo: {withdrawResult.memo}
                    </div>
                    <button
                      onClick={() => copyToClipboard(withdrawResult.memo || '')}
                      className="p-2 rounded-lg border border-ngombe-bone/10 hover:border-ngombe-gold/50 text-ngombe-bone/60"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-ngombe-terracotta font-semibold">Important: Include the memo or funds may be lost!</p>
                </div>

                <button
                  onClick={handleConfirmSent}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-gold to-ngombe-terracotta text-ngombe-dark font-bold text-lg hover:opacity-90 transition-all"
                >
                  I&apos;ve Sent the Tokens
                </button>
              </>
            )}

            {status === 'completed' && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle className="h-12 w-12 text-ngombe-forest mx-auto" />
                <p className="text-lg font-bold text-ngombe-bone">Withdrawal Submitted</p>
                <p className="text-sm text-ngombe-bone/50">Your withdrawal is being processed. You can close this window.</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="h-12 w-12 text-ngombe-terracotta mx-auto" />
                <p className="text-lg font-bold text-ngombe-bone">Error</p>
                <p className="text-sm text-ngombe-bone/60">{error}</p>
                <button
                  onClick={() => { setStatus('instructions'); setError(''); }}
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

export default function WithdrawInteractivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ngombe-dark flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-ngombe-gold" /></div>}>
      <WithdrawInteractiveContent />
    </Suspense>
  );
}
