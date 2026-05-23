
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Clock, BookOpen } from 'lucide-react';

const WhyChooseUs = () => {
  const features = [
    {
      icon: <TrendingUp className="h-6 w-6 text-teal-600" />,
      title: "Experience & Network",
      description: "12+ years of specialized experience with affiliations to leading medical colleges",
      bgColor: "bg-teal-50",
      delay: 0,
    },
    {
      icon: <Shield className="h-6 w-6 text-blue-600" />,
      title: "Expert Guidance",
      description: "Personalized counseling from professionals with deep understanding of the admission processes",
      bgColor: "bg-blue-50",
      delay: 0.1,
    },
    {
      icon: <Clock className="h-6 w-6 text-purple-600" />,
      title: "Timely Updates",
      description: "Real-time updates on college options, fees, and admission deadlines",
      bgColor: "bg-purple-50",
      delay: 0.2,
    },
    {
      icon: <BookOpen className="h-6 w-6 text-medical-600" />,
      title: "Comprehensive Support",
      description: "End-to-end assistance from counseling to admission confirmation",
      bgColor: "bg-medical-50",
      delay: 0.3,
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-medical-600 font-medium text-sm uppercase tracking-wider">Our Expertise</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">What Sets Us Apart</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our unique approach to medical admissions consultancy has helped thousands of students achieve their dreams
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: feature.delay }}
              viewport={{ once: true }}
            >
              <div className={`rounded-full w-12 h-12 flex items-center justify-center mb-4 ${feature.bgColor}`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          className="mt-12 p-6 bg-gradient-to-r from-medical-50 to-blue-50 rounded-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="text-center max-w-3xl mx-auto">
            <h3 className="text-xl font-semibold text-medical-800 mb-4">Our Commitment</h3>
            <p className="text-gray-700">
              At AdmissionHands, we are dedicated to offering transparent, ethical guidance that supports your medical education journey. 
              We work tirelessly to stay updated with the latest admission trends and regulations to give you the most accurate information 
              and advice.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
