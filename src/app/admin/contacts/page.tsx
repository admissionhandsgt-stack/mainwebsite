"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import ContactForm from '@/components/admin/contacts/ContactForm';
import { useContactInfo } from '@/hooks/useContactInfo';
import { Loader2, RefreshCw, Phone, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const ContactManager = () => {
  const {
    contactInfo,
    isLoading,
    error,
    handleFormChange,
    handleSubmit,
    fetchContactInfo
  } = useContactInfo();

  // useContactInfo already calls fetchContactInfo on mount via useEffect

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Information</h1>
          <p className="text-sm text-gray-500 mt-1">Update phone, WhatsApp, and email shown across the website</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchContactInfo}
          disabled={isLoading}
          className="rounded-xl border-gray-200"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 bg-blue-50/80 border border-blue-100 text-blue-700 px-5 py-4 rounded-2xl text-sm"
      >
        <Phone className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold">Live Contact Configuration</p>
          <p className="text-blue-600 mt-0.5">Changes here update all call, WhatsApp, and email buttons across the entire website in real-time.</p>
        </div>
      </motion.div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-400" />
          <p className="text-gray-500 text-sm">Loading contact information...</p>
        </div>
      ) : (
        <ContactForm
          contact={contactInfo}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
        />
      )}
    </div>
  );
};

export default ContactManager;
