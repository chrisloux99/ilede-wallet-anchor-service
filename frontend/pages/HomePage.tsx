import React from 'react';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to <span className="text-primary">iLede Wallet</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your gateway to the Stellar ecosystem. Seamlessly manage iLede Coins and USDC with enterprise-grade security and compliance.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link to="/wallet" className="flex items-center space-x-2">
              <span>Create Wallet</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/deposit">Start Trading</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Why Choose iLede Wallet?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built on Stellar's fast and secure network, with full compliance and regulatory support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Enterprise Security</CardTitle>
              <CardDescription>
                Multi-signature security, KYC compliance, and regulatory adherence for institutional-grade protection.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Lightning Fast</CardTitle>
              <CardDescription>
                Transactions settle in 3-5 seconds on the Stellar network with minimal fees.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Global Access</CardTitle>
              <CardDescription>
                Send and receive payments worldwide with support for multiple fiat currencies and stablecoins.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Assets Section */}
      <section className="space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Supported Assets</h2>
          <p className="text-muted-foreground">
            Trade and manage multiple digital assets with seamless fiat on/off-ramping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  iL
                </div>
                <span>iLede Coin</span>
              </CardTitle>
              <CardDescription>
                The native digital asset of the iLede ecosystem with a total supply of 2 billion tokens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Supply:</span>
                  <span>2,000,000,000 iLede</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Circulating:</span>
                  <span>1,200,000,000 iLede</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  $
                </div>
                <span>USD Coin (USDC)</span>
              </CardTitle>
              <CardDescription>
                Fully collateralized US dollar stablecoin for stable value transactions and trading pairs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peg:</span>
                  <span>1:1 USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issuer:</span>
                  <span>Centre</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
