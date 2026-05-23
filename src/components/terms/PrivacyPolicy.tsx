
import React from 'react';
import { motion } from 'framer-motion';
import TermsSection from './TermsSection';
import { 
  Info, 
  FileCheck, 
  Shield, 
  AlertTriangle, 
  FileText 
} from 'lucide-react';

interface PrivacyPolicyProps {
  currentDate: string;
}

const PrivacyPolicy = ({ currentDate }: PrivacyPolicyProps) => {
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
          Admission Hands ("we", "our", or "us") is committed to protecting your privacy. 
          This Privacy Policy outlines how we collect, use, disclose, and safeguard your 
          information when you visit our website and use our services.
        </p>
      </div>
      
      <div className="grid gap-4">
        <TermsSection id="info-collection" title="Information We Collect" icon={Info} index={1}>
          <p className="text-sm">We may collect the following types of personal data:</p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Contact Information: Name, email address, phone number</li>
            <li className="text-sm">Academic Details: Marksheets, NEET scores, educational background</li>
            <li className="text-sm">Demographic Information: Age, state, nationality, preferred colleges</li>
          </ul>
          <p className="mt-2 text-sm">We may also collect non-personal information such as:</p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">IP address</li>
            <li className="text-sm">Browser type</li>
            <li className="text-sm">Device information</li>
          </ul>
        </TermsSection>
        
        <TermsSection id="info-usage" title="How We Use Your Information" icon={FileCheck} index={2}>
          <p className="text-sm">Your information is used to:</p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Provide consultancy services</li>
            <li className="text-sm">Contact you with admission-related updates</li>
            <li className="text-sm">Respond to your inquiries</li>
            <li className="text-sm">Improve our services and user experience</li>
            <li className="text-sm">Comply with legal obligations</li>
          </ul>
        </TermsSection>
        
        <TermsSection id="info-sharing" title="Sharing of Information" icon={Shield} index={3}>
          <p className="text-sm">
            We do not sell or rent your personal information to third parties. 
            Information may only be shared with:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Partner consultants or institutions (with your consent)</li>
            <li className="text-sm">Legal authorities (if required by law)</li>
          </ul>
        </TermsSection>
        
        <TermsSection id="data-security" title="Data Security" icon={Shield} index={4}>
          <p className="text-sm">
            We use industry-standard measures to protect your data. However, no digital 
            method is 100% secure. We encourage you to take precautions while sharing 
            sensitive documents.
          </p>
        </TermsSection>
        
        <TermsSection id="cookies" title="Cookies" icon={Info} index={5}>
          <p className="text-sm">
            Our website may use cookies to enhance your browsing experience. 
            You can disable cookies in your browser settings at any time.
          </p>
        </TermsSection>
        
        <TermsSection id="third-party" title="Third-Party Links" icon={AlertTriangle} index={6}>
          <p className="text-sm">
            Our website may contain links to other sites. We are not responsible for 
            the privacy practices of those websites.
          </p>
        </TermsSection>
        
        <TermsSection id="your-rights" title="Your Rights" icon={FileCheck} index={7}>
          <p className="text-sm">You have the right to:</p>
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            <li className="text-sm">Access your data</li>
            <li className="text-sm">Request correction or deletion</li>
            <li className="text-sm">Withdraw consent (where applicable)</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, email us at info@admissionhands.com.
          </p>
        </TermsSection>
        
        <TermsSection id="policy-updates" title="Updates to Policy" icon={FileText} index={8}>
          <p className="text-sm">
            We may update this Privacy Policy from time to time. All changes will be 
            posted on this page with an updated effective date.
          </p>
        </TermsSection>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
