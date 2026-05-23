
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContactInfo {
  id?: number;
  email: string;
  phone_number: string;
  whatsapp_number: string;
}

export const useContactInfo = () => {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: 'info@admissionhands.com',
    phone_number: '+919873133846',
    whatsapp_number: '+919873133846'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContactInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('contact_info')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setContactInfo(data);
      }
    } catch (err: any) {
      console.error('Error fetching contact info:', err);
      // If the error is because no rows found, we'll use the default values
      if (err.code !== 'PGRST116') {
        setError(err.message);
        toast.error('Failed to load contact information');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateContactInfo = async () => {
    try {
      let response;
      
      if (contactInfo.id) {
        // Update existing record
        response = await supabase
          .from('contact_info')
          .update({
            email: contactInfo.email,
            phone_number: contactInfo.phone_number,
            whatsapp_number: contactInfo.whatsapp_number
          })
          .eq('id', contactInfo.id);
      } else {
        // Insert new record
        response = await supabase
          .from('contact_info')
          .insert({
            email: contactInfo.email,
            phone_number: contactInfo.phone_number,
            whatsapp_number: contactInfo.whatsapp_number
          });
      }
      
      if (response.error) throw response.error;
      
      toast.success('Contact information updated successfully');
      fetchContactInfo();
      return true;
    } catch (err: any) {
      console.error('Error updating contact info:', err);
      setError(err.message);
      toast.error('Failed to update contact information');
      return false;
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    return await updateContactInfo();
  };

  useEffect(() => {
    fetchContactInfo();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:contact_info')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_info' }, (payload) => {
        // When contact info changes in DB, refresh it
        fetchContactInfo();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    contactInfo,
    isLoading,
    error,
    handleFormChange,
    handleSubmit,
    fetchContactInfo
  };
};
