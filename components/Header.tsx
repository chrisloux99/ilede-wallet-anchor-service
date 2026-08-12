'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Wallet, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { href: '/', label: 'Home' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/deposit', label: 'Deposit' },
  { href: '/withdraw', label: 'Withdraw' },
  { href: '/send', label: 'Send' },
  { href: '/kyc', label: 'KYC' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-ngombe-bone/10 bg-ngombe-dark/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ngombe-terracotta to-ngombe-gold flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet className="w-4 h-4 text-ngombe-dark" />
          </div>
          <span className="text-xl font-black text-ngombe-bone tracking-tight">
            i<span className="text-ngombe-terracotta">Lede</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                pathname === link.href
                  ? 'text-ngombe-gold'
                  : 'text-ngombe-bone/60 hover:text-ngombe-bone hover:bg-ngombe-bone/5'
              )}
            >
              {link.label}
              {pathname === link.href && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-ngombe-terracotta to-ngombe-gold rounded-full"
                />
              )}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-ngombe-bone/60 hover:text-ngombe-bone"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-ngombe-bone/10 bg-ngombe-dark/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-6 py-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-lg text-sm font-semibold transition-all',
                    pathname === link.href
                      ? 'text-ngombe-gold bg-ngombe-gold/10'
                      : 'text-ngombe-bone/60 hover:text-ngombe-bone hover:bg-ngombe-bone/5'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
