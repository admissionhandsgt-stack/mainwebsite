"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Phone, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useContactInfo } from '@/hooks/useContactInfo';

const CTA: React.FC = () => {
  const { contactInfo } = useContactInfo();
  const phoneNumber = contactInfo?.phone_number || "+919873133846";

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.message) {
      toast.error("All fields are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-form', {
        body: {
          type: 'contact',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
        },
      });
      if (error) throw error;
      toast.success("Message sent! We'll get back to you shortly.");
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const perks = [
    'Personalized admission strategy',
    'Expert guidance on college selection',
    'End-to-end application support',
    'Interview & document preparation',
  ];

  return (
    <section id="contact" className="relative py-20 overflow-hidden mesh-gradient">
      {/* Decorative orbs */}
      <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-teal-500/15 blur-[80px] pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="flex flex-col lg:flex-row items-start gap-12">

          {/* Left side */}
          <div className="flex-1 text-white">
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="inline-block text-teal-300 font-semibold text-sm uppercase tracking-widest mb-3"
            >
              Free Consultation
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold leading-tight mb-5"
              style={{ fontFamily: "var(--font-jakarta), system-ui, sans-serif" }}
            >
              Ready to Begin Your{" "}
              <span className="bg-gradient-to-r from-blue-300 to-teal-300 bg-clip-text text-transparent">
                Medical Journey?
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-blue-100/80 mb-8 text-base leading-relaxed max-w-lg"
            >
              Take the first step towards your MBBS dream. Schedule a free consultation with our admission experts today.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-3 mb-10"
            >
              {perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-teal-300 flex-shrink-0" />
                  <span className="text-white/85 text-sm">{perk}</span>
                </div>
              ))}
            </motion.div>

            <motion.a
              href={`tel:${phoneNumber}`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="group inline-flex items-center gap-2.5 glass text-white hover:bg-white/20 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5"
            >
              <Phone size={18} className="text-teal-300 group-hover:scale-110 transition-transform" />
              Call Now: {phoneNumber}
            </motion.a>
          </div>

          {/* Right side – Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full lg:w-[440px] bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-500" />
            <div className="p-8">
              <h3
                className="text-2xl font-bold text-gray-900 mb-1"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                Send Us a Message
              </h3>
              <p className="text-gray-500 text-sm mb-6">We typically respond within 24 hours.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { id: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
                  { id: 'email', label: 'Email Address', type: 'email', placeholder: 'you@email.com' },
                  { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 98765 43210' },
                ].map(field => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={field.type}
                      id={field.id}
                      value={formData[field.id as keyof typeof formData]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 hover:border-gray-300"
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your admission goals…"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 hover:border-gray-300 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-300"
                >
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending…</>
                  ) : (
                    <><Send size={16} /> Send Message</>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default CTA;
