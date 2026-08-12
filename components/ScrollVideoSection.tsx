'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollVideoSectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function ScrollVideoSection({ children, className = '' }: ScrollVideoSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setVideoProgress(latest);
      if (videoRef.current) {
        const duration = videoRef.current.duration;
        if (duration) {
          videoRef.current.currentTime = latest * duration;
        }
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Video background with scroll control */}
      <motion.div
        style={{ scale }}
        className="absolute inset-0 z-0"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          poster="/images/ngombe-poster.jpg"
        >
          <source src="/videos/ngombe-scroll.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay with Ngombe pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="absolute inset-0 ngombe-pattern opacity-30" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ opacity, y }}
        className="relative z-10"
      >
        {children}
      </motion.div>

      {/* Scroll progress indicator */}
      <div className="fixed top-0 left-0 w-full h-1 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-ngombe-terracotta via-ngombe-gold to-ngombe-forest"
          style={{ width: `${videoProgress * 100}%` }}
        />
      </div>
    </div>
  );
}
