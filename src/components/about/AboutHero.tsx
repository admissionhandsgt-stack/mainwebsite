
"use client";

import React from 'react';
import { motion } from 'framer-motion';

const AboutHero: React.FC = () => {
  return (
    <section className="relative py-24 min-h-[50vh] flex items-center overflow-hidden mesh-gradient">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/images/hero/neet-counselling-students.png" 
          alt="Indian Medical Students"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-slate-900/40" />
      </div>

      {/* Decorative blurred orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none z-1" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-teal-500/15 blur-[100px] pointer-events-none z-1" />
      
      <div className="container-custom max-w-5xl mx-auto pb-10 relative z-10">
        <div className="text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">Who <span className="gradient-text">We Are</span></h1>
            <p className="text-xl md:text-2xl text-blue-100/90 max-w-3xl mx-auto leading-relaxed font-medium">
              With 12+ years of experience, Admission Hands is a reliable partner in your medical admission journey.
            </p>
          </motion.div>
        </div>
        
        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="glass rounded-[2rem] p-8 text-center border border-white/20 card-hover group">
            <div className="rounded-2xl w-16 h-16 flex items-center justify-center bg-blue-600 shadow-lg shadow-blue-500/30 text-white mb-6 mx-auto group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Trusted Advisors</h3>
            <p className="text-blue-100/70 leading-relaxed font-medium">Over 12 years of dedicated service with proven results in medical admissions across India.</p>
          </div>
          
          <div className="glass rounded-[2rem] p-8 text-center border border-white/20 card-hover group">
            <div className="rounded-2xl w-16 h-16 flex items-center justify-center bg-teal-600 shadow-lg shadow-teal-500/30 text-white mb-6 mx-auto group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Expert Counselors</h3>
            <p className="text-blue-100/70 leading-relaxed font-medium">25+ specialized counselors with in-depth knowledge of medical education.</p>
          </div>
          
          <div className="glass rounded-[2rem] p-8 text-center border border-white/20 card-hover group">
            <div className="rounded-2xl w-16 h-16 flex items-center justify-center bg-indigo-600 shadow-lg shadow-indigo-500/30 text-white mb-6 mx-auto group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Ethical Standards</h3>
            <p className="text-blue-100/70 leading-relaxed font-medium">Committed to transparency and student-centric approach in every consultation.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutHero;
