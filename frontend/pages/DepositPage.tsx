import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Download, AlertCircle } from 'lucide-react';
import backend from '~backend/client';

export function DepositPage() {
  const [assetCode, setAssetCode] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const { toast } = useToast();

  const depositMutation = useMutation({
    mutationFn: async () => {
      return backend.anchor.deposit({
        asset_code: assetCode,
        account: accountId,
        amount: amount || undefined,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Initiated",
        description: `Deposit request created with ID: ${data.id}`,
      });
    },
    onError: (error) => {
      console.error('Deposit failed:', error);
      toast({
        title: "Error",
        description: "Failed to initiate deposit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !accountId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    depositMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Deposit Assets</h1>
        <p className="text-muted-foreground">
          Deposit fiat currency to receive digital assets on the Stellar network
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Deposit Request</span>
            </CardTitle>
            <CardDescription>
              Choose the asset you want to deposit and provide your Stellar account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset to Deposit *</Label>
              <Select value={assetCode} onValueChange={setAssetCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iLede">iLede Coin</SelectItem>
                  <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Stellar Account ID *</Label>
              <Input
                id="account"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Optional)</Label>
              <Input
                id="amount"
                type="number"
                step="0.0000001"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Deposit Information</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Minimum deposit: 1.0000000</li>
                    <li>• Maximum deposit: 10,000.0000000</li>
                    <li>• Fixed fee: 0.1000000</li>
                    <li>• Percentage fee: 0.1%</li>
                    <li>• Processing time: ~5 minutes</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={depositMutation.isPending}
            >
              {depositMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Initiate Deposit'
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {depositMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Deposit Instructions</CardTitle>
            <CardDescription>
              Follow these instructions to complete your deposit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Transaction ID</Label>
                <p className="font-mono text-sm bg-muted p-2 rounded">
                  {depositMutation.data.id}
                </p>
              </div>
              <div>
                <Label>Instructions</Label>
                <p className="text-sm">{depositMutation.data.how}</p>
              </div>
              {depositMutation.data.eta && (
                <div>
                  <Label>Estimated Time</Label>
                  <p className="text-sm">{depositMutation.data.eta} seconds</p>
                </div>
              )}
              {depositMutation.data.extra_info?.message && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {depositMutation.data.extra_info.message}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
