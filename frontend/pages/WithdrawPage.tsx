import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, AlertCircle } from 'lucide-react';
import backend from '~backend/client';

export function WithdrawPage() {
  const [assetCode, setAssetCode] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destination, setDestination] = useState('');
  const [withdrawType, setWithdrawType] = useState('');
  const { toast } = useToast();

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      return backend.anchor.withdraw({
        asset_code: assetCode,
        type: withdrawType,
        dest: destination,
        account: accountId,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Initiated",
        description: `Withdrawal request created with ID: ${data.id}`,
      });
    },
    onError: (error) => {
      console.error('Withdrawal failed:', error);
      toast({
        title: "Error",
        description: "Failed to initiate withdrawal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !withdrawType || !destination) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    withdrawMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Withdraw Assets</h1>
        <p className="text-muted-foreground">
          Convert your digital assets back to fiat currency
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Withdrawal Request</span>
            </CardTitle>
            <CardDescription>
              Choose the asset you want to withdraw and provide destination details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset to Withdraw *</Label>
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
              <Label htmlFor="type">Withdrawal Type *</Label>
              <Select value={withdrawType} onValueChange={setWithdrawType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select withdrawal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_account">Bank Account</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                placeholder="Bank account number or routing details"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Your Stellar Account ID</Label>
              <Input
                id="account"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium">Withdrawal Information</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Minimum withdrawal: 1.0000000</li>
                    <li>• Maximum withdrawal: 10,000.0000000</li>
                    <li>• Fixed fee: 0.1000000</li>
                    <li>• Percentage fee: 0.1%</li>
                    <li>• Processing time: ~5 minutes</li>
                    <li>• KYC verification required for large amounts</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Initiate Withdrawal'
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      {withdrawMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Instructions</CardTitle>
            <CardDescription>
              Send your assets to the following address to complete the withdrawal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Transaction ID</Label>
                <p className="font-mono text-sm bg-muted p-2 rounded">
                  {withdrawMutation.data.id}
                </p>
              </div>
              <div>
                <Label>Send To Account</Label>
                <p className="font-mono text-sm bg-muted p-2 rounded">
                  {withdrawMutation.data.account_id}
                </p>
              </div>
              {withdrawMutation.data.memo && (
                <div>
                  <Label>Memo ({withdrawMutation.data.memo_type})</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    {withdrawMutation.data.memo}
                  </p>
                </div>
              )}
              {withdrawMutation.data.eta && (
                <div>
                  <Label>Estimated Time</Label>
                  <p className="text-sm">{withdrawMutation.data.eta} seconds</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
