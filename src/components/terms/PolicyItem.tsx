
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

interface PolicyItemProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  index?: number;
}

const PolicyItem = ({ title, children, className, index = 0 }: PolicyItemProps) => {
  const variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2 + i * 0.05,
        duration: 0.4
      }
    })
  };

  return (
    <motion.div 
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200",
        className
      )}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={index}
      variants={variants}
    >
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="text-sm text-gray-600 leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
};

export default PolicyItem;
