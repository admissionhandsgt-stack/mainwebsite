"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  FileCheck, 
  Award
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const services = [
  {
    icon: <GraduationCap className="h-6 w-6 text-white" />,
    title: "MBBS Admissions Counseling",
    description: "Expert guidance for admission to government, private, and deemed medical colleges through state and all-India counselling."
  },
  {
    icon: <BookOpen className="h-6 w-6 text-white" />,
    title: "PG Medical Admissions",
    description: "Specialized counseling for MD/MS aspirants for the next step in their medical career."
  },
  {
    icon: <FileCheck className="h-6 w-6 text-white" />,
    title: "Documentation Support",
    description: "Comprehensive assistance with application forms, certificates, and other required documents."
  },
  {
    icon: <Award className="h-6 w-6 text-white" />,
    title: "Career Counseling",
    description: "Personalized guidance to help students make informed decisions about their medical career path."
  }
];

const SpecializedServices = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: { 
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="py-12 md:py-24 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-slate-50/50 -z-10" />
      <div className="absolute top-0 right-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-100/20 rounded-full blur-[80px] md:blur-[100px]" />
      <div className="absolute bottom-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-teal-100/20 rounded-full blur-[80px] md:blur-[100px]" />

      <div className="container-custom text-center mb-10 md:mb-16 relative z-10">
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-blue-600 font-bold text-[10px] md:text-sm uppercase tracking-[0.2em] mb-3 md:mb-4 block"
        >
          Our Expertise
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-3xl md:text-5xl font-bold text-slate-900 mb-4 md:mb-6 tracking-tight"
        >
          Our <span className="gradient-text">Specialized</span> Services
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-600 max-w-2xl mx-auto text-sm md:text-lg"
        >
          We offer comprehensive support for medical admissions at all levels with personalized care.
        </motion.p>
      </div>
      
      <motion.div 
        className="container-custom"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {services.map((service, index) => (
            <motion.div 
              key={index}
              variants={cardVariants}
            >
              <div className="h-full relative group">
                {/* Neon Glow under tile */}
                <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/20 to-teal-600/20 rounded-2xl md:rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="h-full relative glass rounded-2xl md:rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col border border-white/40">
                  <div className="p-5 md:p-8 pb-0">
                    <div className="bg-gradient-to-br from-blue-600 to-teal-600 w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                      {React.cloneElement(service.icon as React.ReactElement, { className: "w-5 h-5 md:w-6 md:h-6 text-white" })}
                    </div>
                    <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-3 text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
                      {service.title}
                    </h3>
                  </div>
                  <div className="p-5 md:p-8 pt-2 md:pt-4">
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base">{service.description}</p>
                    <div className="h-1.5 w-12 bg-blue-100 rounded-full mt-4 md:mt-6 group-hover:w-full group-hover:bg-blue-600 transition-all duration-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default SpecializedServices;
