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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Your Stellar Wallet</h1>
          <p className="text-muted-foreground">
            Your wallet has been created and funded with the initial airdrop
          </p>
        </div>

        <div className="grid gap-6">
          {/* Wallet Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Wallet Details</span>
              </CardTitle>
              <CardDescription>
                Keep your secret key safe and never share it with anyone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Account ID (Public Key)</Label>
                <div className="flex space-x-2">
                  <Input
                    value={walletData.account_id}
                    readOnly
                    className="font-mono text-sm"
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
                <Label>Secret Key</Label>
                <div className="flex space-x-2">
                  <Input
                    value={walletData.secret_key}
                    readOnly
                    type="password"
                    className="font-mono text-sm"
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
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Airdrop Completed</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Transaction: {walletData.airdrop_transaction_hash}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
              <CardDescription>
                Your current asset balances on the Stellar network
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balanceData ? (
                <div className="space-y-3">
                  {balanceData.balances.map((balance, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">
                          {balance.asset_type === 'native' ? 'XLM' : balance.asset_code}
                        </span>
                        {balance.asset_issuer && (
                          <p className="text-xs text-muted-foreground">
                            Issuer: {balance.asset_issuer.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-lg">{balance.balance}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading balances...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Your Wallet</h1>
        <p className="text-muted-foreground">
          Create a new Stellar wallet and receive your initial airdrop of XLM and iLede Coin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Creation</CardTitle>
          <CardDescription>
            Provide your contact information to create your wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">Important Security Notice</p>
                <p className="mt-1">
                  Your secret key will be displayed only once. Make sure to save it securely 
                  before leaving this page.
                </p>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createWalletMutation.mutate()}
            disabled={createWalletMutation.isPending}
          >
            {createWalletMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Wallet...
              </>
            ) : (
              'Create Wallet'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
