import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import AboutHero from '@/components/about/AboutHero';
import OurVision from '@/components/about/OurVision';
import TrackRecord from '@/components/about/TrackRecord';

import { CONTACT_INFO } from '@/lib/constants';

const AboutContact = () => {
  return (
    <div className="flex flex-col flex-grow bg-slate-50">
      <div className="flex-grow">
        <AboutHero />
        <TrackRecord />
        <OurVision />
        
        {/* Contact Information & Map Section */}
        <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-blue-50 to-white">
          <div className="container-custom">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We're here to help you with your medical admission journey. Reach out to us for expert guidance.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                <h3 className="text-xl font-bold mb-6">Get in Touch</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-medical-50 p-3 rounded-full">
                      <Phone className="h-5 w-5 text-medical-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Phone</h4>
                      <a href={`tel:${CONTACT_INFO.phone}`} className="text-medical-600 hover:text-medical-700 transition-colors">
                        {CONTACT_INFO.phone}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-medical-50 p-3 rounded-full">
                      <Mail className="h-5 w-5 text-medical-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Email</h4>
                      <a href={`mailto:${CONTACT_INFO.email}`} className="text-medical-600 hover:text-medical-700 transition-colors">
                        {CONTACT_INFO.email}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-medical-50 p-3 rounded-full">
                      <MapPin className="h-5 w-5 text-medical-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Address</h4>
                      <p className="text-gray-600">
                        {CONTACT_INFO.address}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h4 className="font-medium text-gray-900 mb-3">Office Hours</h4>
                  <div className="space-y-1 text-gray-600">
                    <p>Monday to Saturday: 10:00 AM - 7:00 PM</p>
                    <p>Sunday: By appointment only</p>
                  </div>
                </div>
              </div>
              
              {/* Google Map */}
              <div className="h-[400px] rounded-xl overflow-hidden shadow-md border border-gray-100">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.0154924824307!2d77.3701033!3d28.6303843!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce5f55555555%3A0xd6e6726c5fb03344!2sBhutani%20City%20Center%2C%20Sector%2032%2C%20Noida%2C%20Uttar%20Pradesh%20201301!5e0!3m2!1sen!2sin!4v1652888888888!5m2!1sen!2sin" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="AdmissionHands Office Location"
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutContact;
