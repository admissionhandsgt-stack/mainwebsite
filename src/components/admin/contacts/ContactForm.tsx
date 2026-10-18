import { Save } from 'lucide-react';
import { Button, Card, Field, INPUT, INPUT_H } from '@/components/admin/ui';

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

const input = `${INPUT} ${INPUT_H}`;
const PHONE_HINT = 'With the country code, e.g. +919873133846.';

const ContactForm = ({ contact, onSubmit, onChange }: ContactFormProps) => {
  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
      <Card title="On the website" description="Every call, WhatsApp and email button on the site uses these.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email address" htmlFor="email" className="sm:col-span-2">
            <input
              id="email"
              type="email"
              value={contact.email}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="contact@admissionhands.com"
              required
              className={input}
            />
          </Field>

          <Field label="Phone number" htmlFor="phone_number" hint={PHONE_HINT}>
            <input
              id="phone_number"
              type="tel"
              value={contact.phone_number}
              onChange={(e) => onChange('phone_number', e.target.value)}
              placeholder="+91 98731 33846"
              required
              className={`${input} tabular-nums`}
            />
          </Field>

          <Field label="WhatsApp number" htmlFor="whatsapp_number" hint={`${PHONE_HINT} Used for the chat links.`}>
            <input
              id="whatsapp_number"
              type="tel"
              value={contact.whatsapp_number}
              onChange={(e) => onChange('whatsapp_number', e.target.value)}
              placeholder="+91 98731 33846"
              required
              className={`${input} tabular-nums`}
            />
          </Field>
        </div>
      </Card>

      <Card title="Lead alerts" description="Not shown on the site. New enquiries are sent to this WhatsApp number.">
        <Field label="Alert number (WhatsApp)" htmlFor="lead_notification_phone" hint={`${PHONE_HINT} Use a counsellor's number.`} className="sm:max-w-sm">
          <input
            id="lead_notification_phone"
            type="tel"
            value={contact.lead_notification_phone || ''}
            onChange={(e) => onChange('lead_notification_phone', e.target.value)}
            placeholder="+91 98731 33846"
            required
            className={`${input} tabular-nums`}
          />
        </Field>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          <Save className="h-4 w-4" />
          Save contact details
        </Button>
      </div>
    </form>
  );
};

export default ContactForm;
