'use client';

import React from 'react';
import { MapPin, GraduationCap, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { CONTACT_INFO } from '@/lib/constants';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface CollegeCardProps {
  collegeName: string;
  city: string;
  state: string;
  collegeType?: string; 
  specialties?: string[];
  description: string | null;
  imageUrl?: string | null;
  yearEstablished?: number | null;
  universityBody?: string;
  offersMbbs?: boolean;
  // CRO Tags
  isHighDemand?: boolean;
  isTopChoice?: boolean;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Government: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Private: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  Deemed: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
};

export function CollegeCard({
  collegeName, city, state, collegeType, specialties, description, imageUrl, yearEstablished,
  universityBody, isHighDemand, isTopChoice
}: CollegeCardProps) {
  const style = collegeType ? (TYPE_STYLES[collegeType] || TYPE_STYLES.Private) : TYPE_STYLES.Deemed;
  
  // WhatsApp Link for CRO
  const whatsappMsg = `Hi, I'm interested in ${collegeName}, ${city}. Please share fee details and my admission chances.`;
  const whatsappUrl = `https://wa.me/${CONTACT_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 overflow-hidden flex flex-col h-full"
    >
      {/* Image Section */}
      <div className="relative h-60 overflow-hidden">
        <img
          src={imageUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1000&auto=format&fit=crop'}
          alt={collegeName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-70" />
        
        {/* CRO Badges on Image */}
        <div className="absolute top-5 left-5 flex flex-col gap-2">
          {isHighDemand && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider shadow-xl">
              <TrendingUp className="w-3.5 h-3.5" />
              High Demand
            </span>
          )}
          {isTopChoice && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider shadow-xl">
              <Sparkles className="w-3.5 h-3.5" />
              Top Choice
            </span>
          )}
        </div>

        {/* Type Badge on Image */}
        {collegeType && (
          <div className="absolute top-5 right-5">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md bg-white/90 ${style.text} shadow-lg`}>
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              {collegeType}
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-8 pb-4 flex-grow space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {collegeName}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-semibold">
            <MapPin className="w-4 h-4 shrink-0 text-blue-500" />
            <span>{city}, {state}</span>
          </div>
        </div>

        {/* Informative Description */}
        {description && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
            <p className="text-slate-600 text-sm leading-relaxed font-medium">
              {description}
            </p>
          </div>
        )}

        {/* Quick Info Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Established</p>
              <p className="text-slate-900 font-bold text-xs">{yearEstablished || 'N/A'}</p>
            </div>
          </div>
          
          {universityBody && (
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Affiliation</p>
              <p className="text-blue-600 font-bold text-xs">{universityBody.split(' ')[0]}</p>
            </div>
          )}
        </div>

        {/* Branches */}
        {specialties && specialties.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {specialties.slice(0, 3).map((spec, i) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-blue-50/50 text-blue-600 text-[10px] font-black border border-blue-100/50 uppercase tracking-tight">
                {spec}
              </span>
            ))}
            {specialties.length > 3 && (
              <span className="text-[10px] text-slate-400 font-bold self-center">+ {specialties.length - 3} More</span>
            )}
          </div>
        )}
      </div>

      {/* CTA Section - Single High-Conversion WhatsApp Button */}
      <div className="p-8 pt-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white text-base font-black px-6 py-5 rounded-2xl hover:bg-[#128C7E] transition-all shadow-xl shadow-green-600/20 active:scale-[0.95] group"
        >
          <WhatsAppIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Chat with Expert
        </a>
      </div>
    </motion.div>
  );
}
