'use client';

import { motion } from 'framer-motion';

export default function NgombePatternDivider() {
  return (
    <div className="relative py-16 overflow-hidden">
      {/* Geometric pattern band */}
      <div className="flex justify-center items-center gap-4">
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            viewport={{ once: true }}
            className="relative"
          >
            <svg width="60" height="60" viewBox="0 0 60 60" className="opacity-40">
              <path
                d="M30 5L55 30L30 55L5 30Z"
                fill="none"
                stroke={i % 2 === 0 ? '#c45a2c' : '#d4a843'}
                strokeWidth="1.5"
              />
              <circle
                cx="30"
                cy="30"
                r="8"
                fill="none"
                stroke={i % 3 === 0 ? '#2a5a1e' : '#c45a2c'}
                strokeWidth="1"
              />
              <circle cx="30" cy="30" r="2" fill="#d4a843" />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Horizontal lines */}
      <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-ngombe-terracotta/30 to-transparent" />
      </div>
    </div>
  );
}
