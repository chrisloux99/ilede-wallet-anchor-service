import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserCheck, CheckCircle, Clock, XCircle } from 'lucide-react';
import backend from '~backend/client';

export function KycPage() {
  const [accountId, setAccountId] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    phone_number: '',
    id_type: '',
    id_country_code: '',
    id_issue_date: '',
    id_expiration_date: '',
    id_number: '',
  });
  const { toast } = useToast();

  const { data: customerData, refetch } = useQuery({
    queryKey: ['customer', accountId],
    queryFn: () => backend.kyc.customer({ account: accountId }),
    enabled: !!accountId,
  });

  const submitKycMutation = useMutation({
    mutationFn: async () => {
      return backend.kyc.submit({
        account: accountId,
        ...formData,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "KYC Submitted",
        description: "Your KYC information has been submitted for review.",
      });
      refetch();
    },
    onError: (error) => {
      console.error('KYC submission failed:', error);
      toast({
        title: "Error",
        description: "Failed to submit KYC information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast({
        title: "Error",
        description: "Please provide your Stellar account ID.",
        variant: "destructive",
      });
      return;
    }
    submitKycMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
      case 'in_review':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <UserCheck className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'pending':
      case 'in_review':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'rejected':
        return 'text-red-600 bg-red-50 dark:bg-red-950';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">KYC Verification</h1>
        <p className="text-muted-foreground">
          Complete your identity verification to access all anchor services
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Lookup</CardTitle>
          <CardDescription>
            Enter your Stellar account ID to check your KYC status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={() => refetch()} disabled={!accountId}>
              Check Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {customerData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(customerData.status)}
              <span>KYC Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(customerData.status)}`}>
              {customerData.status.replace('_', ' ').toUpperCase()}
            </div>
            {customerData.message && (
              <p className="mt-3 text-sm text-muted-foreground">
                {customerData.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {customerData?.status === 'pending' && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Provide your personal information for identity verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_address">Email Address *</Label>
                <Input
                  id="email_address"
                  type="email"
                  value={formData.email_address}
                  onChange={(e) => handleInputChange('email_address', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="id_type">ID Type *</Label>
                <Select value={formData.id_type} onValueChange={(value) => handleInputChange('id_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="national_id">National ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_country_code">ID Country *</Label>
                  <Input
                    id="id_country_code"
                    placeholder="US"
                    value={formData.id_country_code}
                    onChange={(e) => handleInputChange('id_country_code', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_number">ID Number *</Label>
                  <Input
                    id="id_number"
                    value={formData.id_number}
                    onChange={(e) => handleInputChange('id_number', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id_issue_date">Issue Date</Label>
                  <Input
                    id="id_issue_date"
                    type="date"
                    value={formData.id_issue_date}
                    onChange={(e) => handleInputChange('id_issue_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_expiration_date">Expiration Date</Label>
                  <Input
                    id="id_expiration_date"
                    type="date"
                    value={formData.id_expiration_date}
                    onChange={(e) => handleInputChange('id_expiration_date', e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitKycMutation.isPending}
              >
                {submitKycMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit KYC Information'
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
