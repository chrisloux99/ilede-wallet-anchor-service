'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, Clock, XCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { authenticate } from '@/lib/stellar-auth';
import Link from 'next/link';

function KycPageContent() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthing, setIsAuthing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email_address: '', phone_number: '',
    id_type: 'passport', id_country_code: 'ZM', id_number: '',
  });
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

  const { data: kycStatus, isLoading: checkingStatus, refetch } = useQuery({
    queryKey: ['kyc', account],
    queryFn: async () => {
      const res = await fetch(`/api/customer?account=${account}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to check KYC status');
      return res.json();
    },
    enabled: false,
  });

  const submitKyc = useMutation({
    mutationFn: async () => {
      if (!authToken) throw new Error('Authentication required.');
      const res = await fetch('/api/customer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ account, ...formData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'KYC submission failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'KYC Submitted', description: 'Your information has been submitted for review.' });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-ngombe-forest" />;
      case 'pending': case 'submitted': return <Clock className="h-5 w-5 text-ngombe-gold" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-ngombe-terracotta" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-ngombe-dark ngombe-pattern flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-ngombe-bone/60 hover:text-ngombe-bone transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center space-y-3">
            <div className="inline-flex p-4 rounded-2xl bg-ngombe-ochre/20 border border-ngombe-ochre/30 mb-4">
              <ShieldCheck className="w-12 h-12 text-ngombe-ochre" />
            </div>
            <h1 className="text-4xl font-black text-ngombe-bone">
              <span className="ngombe-gradient-text">KYC</span> Verification
            </h1>
            <p className="text-ngombe-bone/60">Check or submit your identity verification (SEP-12)</p>
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

              {/* Account lookup */}
              <div className="space-y-2">
                <Label htmlFor="account" className="text-ngombe-bone/70 text-sm font-medium">Stellar Account ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="account"
                    placeholder="G..."
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="flex-1 bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-ochre/50"
                  />
                  <button
                    onClick={() => refetch()}
                    disabled={!account || checkingStatus || !authToken}
                    className="px-4 py-2 rounded-xl bg-ngombe-ochre/20 border border-ngombe-ochre/30 text-ngombe-ochre font-semibold text-sm hover:bg-ngombe-ochre/30 disabled:opacity-50 transition-all"
                  >
                    {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                  </button>
                </div>
              </div>

              {/* Status display */}
              {kycStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border border-ngombe-bone/10 bg-ngombe-dark/50"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(kycStatus.status)}
                    <span className="font-bold text-ngombe-bone capitalize">{kycStatus.status}</span>
                  </div>
                  {kycStatus.message && (
                    <p className="text-sm text-ngombe-bone/50 mt-2">{kycStatus.message}</p>
                  )}
                </motion.div>
              )}

              {/* KYC Form */}
              {(!kycStatus || kycStatus.status === 'pending' || kycStatus.status === 'not_found') && account && authToken && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-ngombe-bone/70 text-sm font-medium">First Name</Label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone focus:border-ngombe-ochre/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-ngombe-bone/70 text-sm font-medium">Last Name</Label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone focus:border-ngombe-ochre/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-ngombe-bone/70 text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      value={formData.email_address}
                      onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                      className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone focus:border-ngombe-ochre/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-ngombe-bone/70 text-sm font-medium">Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+260 XXX XXX XXX"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-ochre/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-ngombe-bone/70 text-sm font-medium">ID Type</Label>
                      <div className="space-y-2">
                        {[
                          { value: 'national_id', label: 'National ID' },
                          { value: 'passport', label: 'Passport' },
                          { value: 'drivers_license', label: "Driver's License" },
                        ].map((t) => (
                          <button
                            key={t.value}
                            onClick={() => setFormData({ ...formData, id_type: t.value })}
                            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
                              formData.id_type === t.value
                                ? 'bg-ngombe-ochre/20 border border-ngombe-ochre/50 text-ngombe-ochre'
                                : 'border border-ngombe-bone/10 text-ngombe-bone/50 hover:border-ngombe-bone/20'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-ngombe-bone/70 text-sm font-medium">Country</Label>
                      <Input
                        placeholder="ZM"
                        value={formData.id_country_code}
                        onChange={(e) => setFormData({ ...formData, id_country_code: e.target.value })}
                        className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone placeholder:text-ngombe-bone/30 focus:border-ngombe-ochre/50"
                      />
                      <div className="space-y-2">
                        <Label className="text-ngombe-bone/70 text-sm font-medium">ID Number</Label>
                        <Input
                          value={formData.id_number}
                          onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                          className="bg-ngombe-dark border-ngombe-bone/10 text-ngombe-bone focus:border-ngombe-ochre/50"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => submitKyc.mutate()}
                    disabled={submitKyc.isPending || !formData.first_name || !formData.last_name}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-ngombe-ochre to-ngombe-terracotta text-ngombe-dark font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-all ngombe-glow"
                  >
                    {submitKyc.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      'Submit KYC'
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function KycPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ngombe-dark flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-ngombe-ochre" /></div>}>
      <KycPageContent />
    </Suspense>
  );
}
