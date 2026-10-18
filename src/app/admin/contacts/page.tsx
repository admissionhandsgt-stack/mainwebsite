"use client";

import ContactForm from '@/components/admin/contacts/ContactForm';
import { useContactInfo } from '@/hooks/useContactInfo';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button, Notice, PageHeader } from '@/components/admin/ui';

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
    <div>
      <PageHeader
        title="Contact details"
        description="The phone, WhatsApp and email behind every contact button on the site. A saved change reaches visitors within a few minutes."
        actions={
          <Button variant="secondary" onClick={fetchContactInfo} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {error && (
        <Notice
          tone="danger"
          icon={AlertTriangle}
          title="Contact details did not load"
          className="mb-4 max-w-3xl"
          action={
            <Button size="sm" variant="secondary" onClick={fetchContactInfo} disabled={isLoading}>
              Retry
            </Button>
          }
        >
          {error}. The form shows the site&apos;s built-in defaults until it loads.
        </Notice>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500" aria-busy="true">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Loading contact details…
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
