import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Save, Mail, Phone, MessageCircle } from 'lucide-react';

interface ContactFormData {
  id?: number;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  lead_notification_phone: string;
}

interface ContactFormProps {
  contact: ContactFormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: string) => void;
}

const ContactForm = ({ contact, onSubmit, onChange }: ContactFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-4">
      <div className="bg-white/60 backdrop-blur-md border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-3 group md:col-span-2">
            <Label htmlFor="email" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
              Primary Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
              <Input
                id="email"
                type="email"
                value={contact.email}
                onChange={(e) => onChange('email', e.target.value)}
                placeholder="contact@admissionhands.com"
                required
                className="pl-12 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300 h-12"
              />
            </div>
          </div>
          
          <div className="space-y-3 group">
            <Label htmlFor="phone_number" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
              Office Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
              <Input
                id="phone_number"
                value={contact.phone_number}
                onChange={(e) => onChange('phone_number', e.target.value)}
                placeholder="+91 98731 33846"
                required
                className="pl-12 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl transition-all duration-300 h-12"
              />
            </div>
            <p className="text-xs text-gray-400 ml-1">Format: +919873133846 (Include country code)</p>
          </div>
          
          <div className="space-y-3 group">
            <Label htmlFor="whatsapp_number" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
              WhatsApp Support Line
            </Label>
            <div className="relative">
              <MessageCircle className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
              <Input
                id="whatsapp_number"
                value={contact.whatsapp_number}
                onChange={(e) => onChange('whatsapp_number', e.target.value)}
                placeholder="+91 98731 33846"
                required
                className="pl-12 bg-white/50 border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 rounded-xl transition-all duration-300 h-12"
              />
            </div>
            <p className="text-xs text-gray-400 ml-1">Format: +919873133846 (Used for chat links)</p>
          </div>

          <div className="space-y-3 group">
            <Label htmlFor="lead_notification_phone" className="text-gray-700 font-medium text-sm ml-1 group-focus-within:text-medical-600 transition-colors">
              Callback Leads Alert Number (WhatsApp)
            </Label>
            <div className="relative">
              <MessageCircle className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                id="lead_notification_phone"
                value={contact.lead_notification_phone || ''}
                onChange={(e) => onChange('lead_notification_phone', e.target.value)}
                placeholder="+91 98731 33846"
                required
                className="pl-12 bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all duration-300 h-12"
              />
            </div>
            <p className="text-xs text-gray-400 ml-1">Format: +919873133846 (counselor number to receive PG leads alerts)</p>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 text-white shadow-md shadow-medical-500/20 rounded-xl px-8 h-12 transition-all duration-300 border-0"
            >
              <Save className="w-5 h-5 mr-2" />
              Update Contact Configuration
            </Button>
          </motion.div>
        </div>
      </div>
    </form>
  );
};

export default ContactForm;
