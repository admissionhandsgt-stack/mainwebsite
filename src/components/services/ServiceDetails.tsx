
"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const ServiceDetails = () => {
  // Add loading state for better performance
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Defer non-critical animations until after page load
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  const packages = [
    {
      title: "Comprehensive Admission Package",
      color: "from-medical-500 to-medical-600",
      features: [
        "Personalized college selection strategy",
        "Merit-based admission probability analysis",
        "Complete application process management",
        "State & All India counseling guidance",
        "Document verification & submission",
        "Seat allocation assistance",
        "Fee payment coordination",
        "Documentation requirement checklist"
      ]
    },
    {
      title: "Premium Counseling Package",
      color: "from-teal-500 to-teal-600",
      features: [
        "All services of Comprehensive Package",
        "Expert choice filling for best colleges",
        "Detailed fee structure breakdown",
        "24/7 dedicated admission counselor",
        "Multi-state application handling",
        "College campus virtual tour arrangement",
        "Post-admission support services",
        "Career guidance & placement assistance"
      ]
    }
  ];

  // Set up conditional animation to improve performance
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <section className="py-16 lg:py-24 relative overflow-hidden" id="service-packages">
      <div className="absolute inset-0 bg-slate-50/30 -z-10" />
      <h2 className="text-3xl md:text-5xl font-bold mb-10 lg:mb-14 text-slate-900 text-center tracking-tight">
        Our <span className="gradient-text">Service</span> Packages
      </h2>
      
      <div className="px-4 max-w-5xl mx-auto">
        {isLoaded ? (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 w-full"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {packages.map((pkg, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="h-full"
              >
                <div className="h-full relative group">
                  <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
                  
                  <div className="h-full relative glass-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-white/60">
                    <div className={`bg-gradient-to-r ${pkg.color} p-6 lg:p-10 text-white relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
                      <h3 className="text-2xl lg:text-3xl font-bold mb-2 relative z-10">{pkg.title}</h3>
                      <div className="h-1.5 w-16 bg-white/40 rounded-full relative z-10"></div>
                    </div>
                    <div className="p-8 lg:p-10 space-y-6 bg-white/40 backdrop-blur-sm">
                      <ul className="space-y-4">
                        {pkg.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-4 group/item">
                            <div className="mt-1 p-0.5 rounded-full bg-blue-100 ring-4 ring-blue-50 group-hover/item:bg-blue-600 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 group-hover/item:text-white" />
                            </div>
                            <span className="text-base lg:text-lg text-slate-700 font-medium group-hover/item:text-slate-900 transition-colors">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 w-full">
            {packages.map((pkg, index) => (
              <div key={index} className="h-full">
                <Card className="h-full overflow-hidden border-none">
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-r ${pkg.color} p-4 lg:p-6 text-white`}>
                      <h3 className="text-xl font-bold mb-1">{pkg.title}</h3>
                      <div className="h-1 w-12 bg-white/50 rounded"></div>
                    </div>
                    <div className="p-4 lg:p-6 space-y-3 bg-white">
                      <ul className="space-y-2 lg:space-y-3">
                        {pkg.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm lg:text-base text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceDetails;
