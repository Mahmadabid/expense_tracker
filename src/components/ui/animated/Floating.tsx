'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FloatingProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function Floating({ children, delay = 0, className = '' }: FloatingProps) {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-10, 10, -10] }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
