'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface NgombeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: 'terracotta' | 'forest' | 'gold';
  delay?: number;
}

const colorMap = {
  terracotta: {
    bg: 'bg-ngombe-terracotta/10',
    border: 'border-ngombe-terracotta/30',
    icon: 'text-ngombe-terracotta',
    hover: 'hover:border-ngombe-terracotta/60',
    glow: 'hover:shadow-[0_0_30px_rgba(196,90,44,0.2)]',
  },
  forest: {
    bg: 'bg-ngombe-forest/10',
    border: 'border-ngombe-forest/30',
    icon: 'text-ngombe-forest',
    hover: 'hover:border-ngombe-forest/60',
    glow: 'hover:shadow-[0_0_30px_rgba(42,90,30,0.2)]',
  },
  gold: {
    bg: 'bg-ngombe-gold/10',
    border: 'border-ngombe-gold/30',
    icon: 'text-ngombe-gold',
    hover: 'hover:border-ngombe-gold/60',
    glow: 'hover:shadow-[0_0_30px_rgba(212,168,67,0.2)]',
  },
};

export default function NgombeCard({
  icon: Icon,
  title,
  description,
  color = 'terracotta',
  delay = 0,
}: NgombeCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className={`relative group p-8 rounded-2xl border ${colors.bg} ${colors.border} ${colors.hover} ${colors.glow} backdrop-blur-sm transition-all duration-500`}
    >
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 -translate-y-16 translate-x-16 rotate-45 ${colors.bg} opacity-50`} />
      </div>

      {/* Icon */}
      <div className={`inline-flex p-3 rounded-xl ${colors.bg} mb-6`}>
        <Icon className={`w-8 h-8 ${colors.icon}`} />
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-ngombe-bone mb-3">{title}</h3>
      <p className="text-ngombe-bone/60 leading-relaxed">{description}</p>

      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-current to-transparent ${colors.icon} opacity-20 group-hover:opacity-40 transition-opacity`} />
    </motion.div>
  );
}
