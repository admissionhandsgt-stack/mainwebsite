"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionWrapperProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  bgWhite?: boolean;
}

const fadeIn = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] 
    } 
  }
};

export const SectionWrapper = ({ id, className, children, bgWhite = true }: SectionWrapperProps) => {
  return (
    <section 
      id={id} 
      className={cn(
        "py-16 md:py-24 relative overflow-hidden",
        bgWhite ? "bg-white" : "bg-slate-50",
        className
      )}
    >
      <div className="container-custom relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
};
