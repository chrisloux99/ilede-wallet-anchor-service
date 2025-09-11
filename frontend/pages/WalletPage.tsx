import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Wallet, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import backend from '~backend/client';

export function WalletPage() {
  const [walletData, setWalletData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { toast } = useToast();

  const createWalletMutation = useMutation({
    mutationFn: async () => {
      return backend.wallet.create({ email, phone });
    },
    onSuccess: (data) => {
      setWalletData(data);
      toast({
        title: "Wallet Created Successfully!",
        description: "Your new Stellar wallet has been created and funded with the initial airdrop.",
      });
    },
    onError: (error) => {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Error",
        description: "Failed to create wallet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['balance', walletData?.account_id],
    queryFn: () => backend.wallet.balance({ account_id: walletData.account_id }),
    enabled: !!walletData?.account_id,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (walletData) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.3)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.3)_0%,transparent_50%),radial-gradient(circle_at_40%_40%,rgba(0,0,0,0.3)_0%,transparent_50%)]">
        </div>
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(34,197,94,0.1),rgba(249,115,22,0.1),rgba(0,0,0,0.1),rgba(34,197,94,0.1))]">
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 p-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-orange-500 to-black bg-clip-text text-transparent">
              Welcome to Your Stellar Wallet! 🚀
            </h1>
            <p className="text-lg text-foreground/80">
              Great news! Your wallet is live and ready to go. We've also sent you some starter funds to get you rolling.
            </p>
          </div>

        <div className="grid gap-6">
          {/* Wallet Details */}
          <Card className="backdrop-blur-sm bg-background/70 border-green-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-700 dark:text-green-300">
                <Wallet className="h-6 w-6" />
                <span>Your Wallet Credentials</span>
              </CardTitle>
              <CardDescription className="text-base">
                These are your wallet keys - think of them like your bank account details. Your secret key is like your PIN, so keep it super safe! 🔐
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-green-700 dark:text-green-300 font-medium">Account ID (Your Public Address)</Label>
                <p className="text-sm text-muted-foreground mb-2">This is like your wallet's public address - safe to share when receiving payments</p>
                <div className="flex space-x-2">
                  <Input
                    value={walletData.account_id}
                    readOnly
                    className="font-mono text-sm bg-green-50/50 dark:bg-green-950/30 border-green-200/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(walletData.account_id, 'Account ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-orange-700 dark:text-orange-300 font-medium">Secret Key (Keep This Private!)</Label>
                <p className="text-sm text-muted-foreground mb-2">This is your private key - never share this with anyone, ever! It's like the key to your safe.</p>
                <div className="flex space-x-2">
                  <Input
                    value={walletData.secret_key}
                    readOnly
                    type="password"
                    className="font-mono text-sm bg-orange-50/50 dark:bg-orange-950/30 border-orange-200/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(walletData.secret_key, 'Secret Key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {walletData.airdrop_transaction_hash && (
                <div className="p-4 bg-gradient-to-r from-green-100 to-green-50 dark:from-green-950 dark:to-green-900 rounded-lg border border-green-200/50">
                  <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">🎉 Free Tokens Delivered!</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your starter funds have been sent! Transaction ID: <span className="font-mono">{walletData.airdrop_transaction_hash}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Balances */}
          <Card className="backdrop-blur-sm bg-background/70 border-orange-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-300">Your Current Balance</CardTitle>
              <CardDescription className="text-base">
                Here's what you've got in your wallet right now. These numbers update in real-time! 💰
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balanceData ? (
                <div className="space-y-3">
                  {balanceData.balances.map((balance, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50/50 to-green-50/50 dark:from-orange-950/30 dark:to-green-950/30 rounded-lg border border-orange-200/30"
                    >
                      <div>
                        <span className="font-semibold text-lg">
                          {balance.asset_type === 'native' ? 'XLM (Stellar Lumens)' : balance.asset_code}
                        </span>
                        {balance.asset_issuer && (
                          <p className="text-sm text-muted-foreground">
                            Issued by: {balance.asset_issuer.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-xl font-bold text-green-600 dark:text-green-400">{balance.balance}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-orange-600 dark:text-orange-400">Checking your balance...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.3)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.3)_0%,transparent_50%),radial-gradient(circle_at_40%_40%,rgba(0,0,0,0.3)_0%,transparent_50%)]">
      </div>
      <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(34,197,94,0.1),rgba(249,115,22,0.1),rgba(0,0,0,0.1),rgba(34,197,94,0.1))]">
      </div>
      
      <div className="relative z-10 max-w-md mx-auto space-y-6 p-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-orange-500 to-black bg-clip-text text-transparent">
            Let's Get You Set Up! 🎯
          </h1>
          <p className="text-lg text-foreground/80">
            Ready to join the Stellar network? We'll create your wallet and send you some free tokens to get started!
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-background/70 border-green-200/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300 text-xl">Quick Setup</CardTitle>
            <CardDescription className="text-base">
              Just add your contact info (totally optional) and we'll create your shiny new wallet! ✨
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-green-700 dark:text-green-300">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-green-50/50 dark:bg-green-950/30 border-green-200/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-orange-700 dark:text-orange-300">Phone Number (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-orange-50/50 dark:bg-orange-950/30 border-orange-200/50"
              />
            </div>

            <div className="p-4 bg-gradient-to-r from-orange-100 to-red-50 dark:from-orange-950 dark:to-red-900 rounded-lg border border-orange-200/50">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  <p className="font-semibold">🔒 Heads Up - This Is Important!</p>
                  <p className="mt-1">
                    Your secret key will only show once, so make sure to copy and save it somewhere safe before you leave this page. Think of it like your master password!
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-white font-semibold py-3 text-lg"
              onClick={() => createWalletMutation.mutate()}
              disabled={createWalletMutation.isPending}
            >
              {createWalletMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Your Wallet...
                </>
              ) : (
                '🚀 Create My Wallet'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
