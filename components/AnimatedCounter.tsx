'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  color?: string;
}

function Counter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => `${prefix}${Math.round(latest)}${suffix}`);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 2,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [count, value]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export default function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  label,
  color = '#d4a843',
}: AnimatedCounterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="text-5xl md:text-6xl font-bold mb-2" style={{ color }}>
        <Counter value={value} suffix={suffix} prefix={prefix} />
      </div>
      <p className="text-ngombe-bone/60 text-sm uppercase tracking-widest">{label}</p>
    </motion.div>
  );
}
