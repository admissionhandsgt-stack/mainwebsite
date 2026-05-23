
import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageSquare, Users } from 'lucide-react';
import { CONTACT_INFO } from '@/lib/constants';

const ContactSection = () => {
  return (
    <div className="rounded-xl overflow-hidden bg-gradient-to-tr from-gray-50 to-blue-50 border border-gray-100 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {/* Left Column: Contact Details */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-medical-500 to-medical-700 text-white">
          <h3 className="text-xl font-bold mb-6 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            <span>Get in Touch</span>
          </h3>
          
          <div className="space-y-6">
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white/10 p-2.5 rounded-full">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold">Phone</h4>
                <p className="text-sm opacity-90">{CONTACT_INFO.phone}</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white/10 p-2.5 rounded-full">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold">Email</h4>
                <p className="text-sm opacity-90">{CONTACT_INFO.email}</p>
                <p className="text-xs opacity-75 mt-0.5">We respond within 24 hours</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-white/10 p-2.5 rounded-full">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold">Office Address</h4>
                <p className="text-sm opacity-90">{CONTACT_INFO.address}</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-white/10 p-2.5 rounded-full">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold">Follow Us</h4>
                <div className="flex gap-3 mt-2">
                  <a href="#" className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                    </svg>
                  </a>
                  <a href="#" className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="#" className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Right Column: Disclaimer and Map */}
        <div className="col-span-1 md:col-span-2 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Disclaimer</h3>
              <div className="text-sm text-gray-600 space-y-2 bg-white/70 p-4 rounded-lg border border-gray-100">
                <p>
                  Admission Hands provides consultancy and guidance for MBBS admissions in 
                  India. While we aim to offer the most reliable information:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-600">
                  <li>We do not guarantee admission to any college or course.</li>
                  <li>
                    Admission is subject to NEET score, government policies, college seat 
                    availability, and student eligibility.
                  </li>
                  <li>We are not directly affiliated with any medical college or government body.</li>
                  <li>Information may change without notice.</li>
                  <li>
                    Users are advised to independently verify all official information.
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="h-full">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3503.2268261648328!2d77.3573996!3d28.5907125!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce5bcc094c767%3A0xf6c07f794253ec1c!2sLogix%20City%20Centre%20Mall!5e0!3m2!1sen!2sin!4v1672651998671!5m2!1sen!2sin"
                className="w-full h-full min-h-[250px] rounded-lg border-0 shadow-sm"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Office Location"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
