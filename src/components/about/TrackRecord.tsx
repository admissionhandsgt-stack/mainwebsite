"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Medal, Users, BookOpen } from 'lucide-react';

const TrackRecord = () => {
  const achievements = [
    {
      icon: <CheckCircle className="w-8 h-8" />,
      value: "95%+",
      label: "Success Rate",
      description: "For Admissions",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Medal className="w-8 h-8" />,
      value: "12+",
      label: "Years Experience",
      description: "In Education Consultancy",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      value: "5000+",
      label: "Students Counseled",
      description: "Across India",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      value: "50+",
      label: "Partner Colleges",
      description: "Top Medical Institutions",
      gradient: "from-amber-500 to-orange-500"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-t from-gray-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-30 -z-10" />
      <div className="container-custom relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Our <span className="gradient-text">Track Record</span>
          </h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            We've built a reputation for excellence in medical admissions consultancy over the years.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {achievements.map((item, index) => (
            <motion.div
              key={index}
              className="group h-full"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="h-full bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 text-center border border-white/60 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-6 shadow-lg rotate-3 group-hover:rotate-0 transition-transform duration-500`}>
                  {item.icon}
                </div>
                <div className={`text-4xl font-black mb-2 bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                  {item.value}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{item.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrackRecord;
