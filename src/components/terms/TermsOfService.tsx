"use client";

import React from 'react';
import { motion } from 'framer-motion';
import TermsSection from './TermsSection';
import { 
  Info, 
  FileCheck, 
  Library, 
  File, 
  AlertTriangle, 
  Shield, 
  FileText 
} from 'lucide-react';

interface TermsOfServiceProps {
  currentDate: string;
}

const TermsOfService = ({ currentDate }: TermsOfServiceProps) => {
  return (
    <div className="space-y-4">
      <motion.div 
        className="text-center mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="block text-xs text-gray-500 mb-1">Effective Date</span>
        <span className="text-medical-600 font-semibold">{currentDate}</span>
      </motion.div>
      
      <div className="prose prose-sm max-w-none">
        <p className="text-base text-center text-gray-700 mb-4 max-w-2xl mx-auto">
          Welcome to Admission Hands. By accessing or using our website and services, 
          you agree to comply with and be bound by the following Terms and Conditions. 
          Please read them carefully.
        </p>
      </div>
      
      <div className="grid gap-4">
        <TermsSection id="introduction" title="Introduction" icon={Info} index={1}>
          <p className="text-sm">
            Admission Hands ("we", "our", or "us") provides consultancy services for MBBS and MD/MS admissions in India. These terms govern your use of our website (www.admissionhands.com) and all associated services. By engaging with our services, you accept these terms in full.
          </p>
        </TermsSection>
        
        <TermsSection id="scope" title="Scope of Services" icon={Library} index={2}>
          <p className="text-sm">We assist students and parents with:</p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Medical admissions guidance (MBBS, MD/MS) across India</li>
            <li className="text-sm">College selection and preference planning based on NEET scores</li>
            <li className="text-sm">Counseling registration and application processing support</li>
            <li className="text-sm">Documentation verification and submission assistance</li>
          </ul>
        </TermsSection>
        
        <TermsSection id="disclaimer" title="Counselling Disclaimer" icon={AlertTriangle} index={3}>
          <p className="text-sm font-semibold text-red-600 mb-2">Important Notice Regarding Admissions:</p>
          <p className="text-sm">
            Admission Hands is an independent educational consultancy. We are NOT affiliated with the Medical Counseling Committee (MCC), National Medical Commission (NMC), or any government regulatory body. 
          </p>
          <p className="text-sm mt-2">
            <strong>We do not guarantee admission or "sell" medical seats.</strong> All admissions are strictly based on merit, NEET scores, and the official counseling processes conducted by authorized state and central bodies. Our role is strictly advisory and supportive.
          </p>
        </TermsSection>
        
        <TermsSection id="fees" title="Payment & Refund Policy" icon={File} index={4}>
          <p className="text-sm">
            Our consultancy fees are structured based on the level of service required and will be clearly communicated in writing before engagement. 
          </p>
          <ul className="list-disc pl-4 space-y-0.5 mt-2">
            <li className="text-sm">A non-refundable registration fee is required to initiate our services.</li>
            <li className="text-sm">Once services have commenced (including counseling guidance, document preparation, or preference list generation), fees paid are strictly non-refundable.</li>
            <li className="text-sm">Any fees paid directly to counseling authorities (MCC, State bodies) or colleges are governed by their respective refund policies. We are not responsible for refunds from third parties.</li>
          </ul>
        </TermsSection>

        <TermsSection id="responsibilities" title="User Responsibilities" icon={FileCheck} index={5}>
          <p className="text-sm">As a client, you agree to and are responsible for:</p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Providing accurate, authentic, and complete personal, academic, and category/quota information.</li>
            <li className="text-sm">Meeting all deadlines for form submissions, fee payments, and document uploads as notified by counseling authorities.</li>
            <li className="text-sm">Checking official portals regularly for updates, even while using our services.</li>
            <li className="text-sm">The consequences of submitting false or forged documents, which may result in immediate termination of our services and legal action by authorities.</li>
          </ul>
        </TermsSection>
        
        <TermsSection id="privacy" title="Data Privacy" icon={Shield} index={6}>
          <p className="text-sm">
            We handle your personal data (including NEET scores, contact details, and academic records) with the utmost confidentiality. Your data is used exclusively to provide admission guidance and is not sold to third-party marketers. We implement standard security measures to protect your information. 
          </p>
        </TermsSection>
        
        <TermsSection id="liability" title="Limitation of Liability" icon={Shield} index={7}>
          <p className="text-sm">
            Admission Hands shall not be held liable for:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Rejection of application due to low merit, incorrect documentation, or failure to meet eligibility criteria.</li>
            <li className="text-sm">Technical failures or delays on official counseling portals.</li>
            <li className="text-sm">Changes in government rules, seat matrix, fee structures, or counseling procedures made by NMC/MCC mid-process.</li>
          </ul>
        </TermsSection>
        
        <TermsSection id="intellectual" title="Intellectual Property" icon={FileText} index={8}>
          <p className="text-sm">
            All content on this site, including text, graphics, logos, and images, is the property of Admission Hands and may not be reused or republished without written permission.
          </p>
        </TermsSection>
        
        <TermsSection id="modifications" title="Modifications" icon={FileText} index={9}>
          <p className="text-sm">
            We reserve the right to update these Terms at any time. Continued use of our website and services after changes implies acceptance of the new terms.
          </p>
        </TermsSection>
      </div>
    </div>
  );
};

export default TermsOfService;
