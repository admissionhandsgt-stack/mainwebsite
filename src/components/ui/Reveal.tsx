"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait before this element starts. Use to stagger siblings. */
  delay?: number;
  /** Distance travelled, in px. Keep small — motion should be felt, not watched. */
  y?: number;
  className?: string;
  /** Render as a different element when the parent is a list or grid. */
  as?: "div" | "section" | "li" | "article";
}

/**
 * Scroll reveal used across marketing sections.
 *
 * Deliberately restrained: a short rise and fade, once, the first time the
 * element comes into view. It never replays on scroll-up, and it renders the
 * final state immediately when the visitor has asked for reduced motion — so
 * content is never hidden behind an animation that will not run.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, delay: reduce ? 0 : delay, ease: [0.2, 0, 0, 1] },
    },
  };

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </MotionTag>
  );
}
