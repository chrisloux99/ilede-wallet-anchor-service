import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, Home, Download, Upload, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">iL</span>
          </div>
          <span className="text-xl font-bold">iLede Wallet</span>
        </Link>

        <nav className="flex items-center space-x-1">
          <Button
            variant={isActive('/') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
          </Button>

          <Button
            variant={isActive('/wallet') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/wallet" className="flex items-center space-x-2">
              <Wallet className="h-4 w-4" />
              <span>Wallet</span>
            </Link>
          </Button>

          <Button
            variant={isActive('/deposit') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/deposit" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Deposit</span>
            </Link>
          </Button>

          <Button
            variant={isActive('/withdraw') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/withdraw" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Withdraw</span>
            </Link>
          </Button>

          <Button
            variant={isActive('/kyc') ? 'default' : 'ghost'}
            size="sm"
            asChild
          >
            <Link to="/kyc" className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4" />
              <span>KYC</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
