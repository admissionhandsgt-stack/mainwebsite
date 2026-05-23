
"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const OurVision = () => {
  return (
    <div className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-50/50 -z-10" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent opacity-20" />
      <div className="container-custom max-w-4xl text-center px-4">
        <motion.div 
          className="relative inline-block mb-4"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-medical-100 rounded-full blur-2xl opacity-30 animate-pulse" />
          <Sparkles className="w-10 h-10 text-medical-600 relative z-10" />
        </motion.div>
        
        <motion.h2 
          className="text-4xl md:text-5xl font-bold mb-6 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Our <span className="gradient-text">Vision</span>
        </motion.h2>
        
        <motion.div 
          className="relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 via-blue-100/30 to-blue-100/0 blur-xl" />
          <p className="relative z-10 text-xl md:text-2xl text-slate-800 leading-relaxed font-semibold px-4 md:px-8">
            To become India's most <span className="text-blue-600">reliable and ethical</span> medical admission consultancy — guiding students not just toward admission, but toward a lifetime of success in healthcare.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default OurVision;
