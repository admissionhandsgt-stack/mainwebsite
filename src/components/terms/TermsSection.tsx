
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface TermsSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  index?: number;
}

const TermsSection = ({ id, title, icon: Icon, children, index = 0 }: TermsSectionProps) => {
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  return (
    <motion.section 
      id={id} 
      className="space-y-3 mb-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      custom={index}
      variants={variants}
    >
      <div className="flex items-center gap-2 pb-1 border-b border-gray-200">
        <div className="bg-medical-50 p-1.5 rounded-md">
          <Icon className="h-4 w-4 text-medical-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>
      <div className="space-y-3 text-gray-700 pl-1">
        {children}
      </div>
    </motion.section>
  );
};

export default TermsSection;
