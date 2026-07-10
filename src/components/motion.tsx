"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

interface MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.5, delay, ease: "easeOut" },
  }),
};

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: (delay: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] },
  }),
};

const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] },
  },
};

export function MotionDiv({
  children,
  className,
  delay = 0,
  variant = "fadeUp",
}: MotionProps & { variant?: "fadeUp" | "fadeIn" | "scaleIn" | "slideInLeft" }) {
  const variants = {
    fadeUp: fadeUpVariants,
    fadeIn: fadeInVariants,
    scaleIn: scaleInVariants,
    slideInLeft: slideInLeftVariants,
  }[variant];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      custom={delay}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({
  children,
  className,
}: MotionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionStaggerItem({
  children,
  className,
}: MotionProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function MotionCountUp({ target, className }: { target: number; className?: string }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {target}
      </motion.span>
    </motion.span>
  );
}
