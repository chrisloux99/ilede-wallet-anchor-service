'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Wallet,
  ArrowDownUp,
  Shield,
  Zap,
  Globe,
  Lock,
  TrendingUp,
  Users,
  ChevronDown,
} from 'lucide-react';
import NgombeCard from '@/components/NgombeCard';
import NgombePatternDivider from '@/components/NgombePatternDivider';
import AnimatedCounter from '@/components/AnimatedCounter';

const NgombeScene = dynamic(() => import('@/components/NgombeScene'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-ngombe-dark" />,
});

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);

  return (
    <div className="grain-overlay">
      {/* HERO SECTION */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 3D Background */}
        <NgombeScene />

        {/* Ngombe pattern overlay */}
        <div className="absolute inset-0 ngombe-pattern opacity-20 z-[1]" />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-ngombe-dark/30 via-transparent to-ngombe-dark z-[2]" />

        {/* Hero Content */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ngombe-gold/30 bg-ngombe-gold/10 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-ngombe-forest animate-pulse" />
            <span className="text-sm text-ngombe-gold font-medium">Powered by Stellar Network</span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 tracking-tight"
          >
            <span className="ngombe-gradient-text">iLede</span>
            <br />
            <span className="text-ngombe-bone">Wallet</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl md:text-2xl text-ngombe-bone/70 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Zambia&apos;s gateway to decentralized finance. Trade, save, and grow your wealth on the Stellar blockchain.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link
              href="/wallet"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-ngombe-dark bg-gradient-to-r from-ngombe-terracotta to-ngombe-gold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 ngombe-glow"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Create Wallet
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-ngombe-gold to-ngombe-terracotta opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>

            <Link
              href="/deposit"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-ngombe-bone border-2 border-ngombe-bone/20 rounded-xl hover:border-ngombe-terracotta/50 hover:bg-ngombe-terracotta/10 transition-all duration-300"
            >
              <ArrowDownUp className="w-5 h-5 mr-2" />
              Start Trading
            </Link>

            <Link
              href="/send"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-ngombe-bone border-2 border-ngombe-forest/20 rounded-xl hover:border-ngombe-forest/50 hover:bg-ngombe-forest/10 transition-all duration-300"
            >
              <Globe className="w-5 h-5 mr-2" />
              Cross-Border Send
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex flex-col items-center gap-2 text-ngombe-bone/40"
            >
              <span className="text-xs uppercase tracking-widest">Scroll to explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <NgombePatternDivider />

      {/* STATS SECTION */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedCounter value={10000} suffix="+" label="Wallets Created" color="#c45a2c" />
            <AnimatedCounter value={500} prefix="$" suffix="K" label="Volume Traded" color="#d4a843" />
            <AnimatedCounter value={99.9} suffix="%" label="Uptime" color="#2a5a1e" />
            <AnimatedCounter value={50} suffix="ms" label="Avg Latency" color="#cc8833" />
          </div>
        </div>
      </section>

      <NgombePatternDivider />

      {/* FEATURES SECTION */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-ngombe-bone mb-4">
              Built for <span className="ngombe-gradient-text">Zambia</span>
            </h2>
            <p className="text-ngombe-bone/60 text-lg max-w-2xl mx-auto">
              Financial tools designed for the Zambian market, powered by world-class blockchain technology.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NgombeCard
              icon={Shield}
              title="Bank-Grade Security"
              description="Your keys are generated and encrypted on your device. They never touch our servers."
              color="terracotta"
              delay={0.1}
            />
            <NgombeCard
              icon={Zap}
              title="Instant Settlements"
              description="Send and receive payments in seconds with Stellar's 5-second finality."
              color="gold"
              delay={0.2}
            />
            <NgombeCard
              icon={Globe}
              title="Cross-Border Payments"
              description="Send money anywhere in the world with minimal fees through the Stellar network."
              color="forest"
              delay={0.3}
            />
            <NgombeCard
              icon={TrendingUp}
              title="Earn & Grow"
              description="Stake your iLede tokens and earn rewards while supporting the network."
              color="gold"
              delay={0.4}
            />
            <NgombeCard
              icon={Lock}
              title="Self-Custody"
              description="You hold your keys, you hold your funds. No intermediaries, no counterparty risk."
              color="terracotta"
              delay={0.5}
            />
            <NgombeCard
              icon={Users}
              title="Community Governed"
              description="iLede is built by Zambians, for Zambians. Community-driven development and governance."
              color="forest"
              delay={0.6}
            />
          </div>
        </div>
      </section>

      <NgombePatternDivider />

      {/* HOW IT WORKS */}
      <section className="relative py-24 px-6 ngombe-hide-pattern">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-ngombe-bone mb-4">
              How It <span className="ngombe-gradient-text">Works</span>
            </h2>
          </motion.div>

          <div className="space-y-12">
            {[
              {
                step: '01',
                title: 'Create Your Wallet',
                description: 'Generate a secure Stellar keypair directly in your browser. Your secret key never leaves your device.',
                color: '#c45a2c',
              },
              {
                step: '02',
                title: 'Fund Your Account',
                description: 'Receive free XLM and iLede tokens to get started. Deposit more via bank transfer or mobile money.',
                color: '#d4a843',
              },
              {
                step: '03',
                title: 'Trade & Transact',
                description: 'Send, receive, and trade tokens instantly. Access DeFi features like staking and lending.',
                color: '#2a5a1e',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true }}
                className="flex items-start gap-6"
              >
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-ngombe-bone mb-2">{item.title}</h3>
                  <p className="text-ngombe-bone/60 text-lg">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <NgombePatternDivider />

      {/* FINAL CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-black text-ngombe-bone mb-6">
              Join the <span className="ngombe-gradient-text">Movement</span>
            </h2>
            <p className="text-xl text-ngombe-bone/60 mb-12 max-w-2xl mx-auto">
              Be part of Zambia&apos;s financial revolution. Create your wallet in seconds.
            </p>
            <Link
              href="/wallet"
              className="inline-flex items-center justify-center px-12 py-5 text-xl font-black text-ngombe-dark bg-gradient-to-r from-ngombe-terracotta via-ngombe-gold to-ngombe-forest rounded-2xl ngombe-glow hover:scale-105 transition-transform duration-300"
            >
              Get Started Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ngombe-bone/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ngombe-terracotta to-ngombe-gold flex items-center justify-center">
              <Wallet className="w-5 h-5 text-ngombe-dark" />
            </div>
            <span className="text-xl font-black text-ngombe-bone">iLede</span>
          </div>
          <p className="text-ngombe-bone/40 text-sm">
            Built on Stellar &bull; Made in Zambia &bull; &copy; 2026 iLede Wallet
          </p>
        </div>
      </footer>
    </div>
  );
}
