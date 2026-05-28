/**
 * whatsappService.ts
 * Server-side service to trigger WhatsApp alerts for new admissions leads.
 * Supports sending notifications to multiple comma-separated numbers in parallel.
 */
import { createClient } from '@supabase/supabase-js';

interface LeadNotificationPayload {
  name: string;
  phone: string;
  rank?: string | number;
  preferred_branch?: string;
  preferred_state?: string;
  quota_interest?: string;
  internship_status?: string;
  source: string;
}

// Dynamically fetch target recipient phone numbers from Supabase contact_info settings
async function getRecipientNumbers(): Promise<string[]> {
  let recipientString = '';

  if (process.env.WHATSAPP_RECIPIENT_NUMBER) {
    recipientString = process.env.WHATSAPP_RECIPIENT_NUMBER;
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        const supabase = createClient(url, key);
        const { data, error } = await supabase
          .from('contact_info')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          recipientString = (data.lead_notification_phone || data.whatsapp_number || '') as string;
        }
      } catch (err) {
        console.error('[WhatsApp Alert] Error loading recipient from contact_info table:', err);
      }
    }
  }

  // If empty, fall back to default number
  if (!recipientString.trim()) {
    return ['919310301949'];
  }

  // Split by comma and normalize each number
  return recipientString
    .split(',')
    .map(num => num.trim().replace(/[+\s-]/g, ''))
    .filter(num => num.length >= 10);
}

export async function sendWhatsAppNotification(lead: LeadNotificationPayload): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const provider = process.env.WHATSAPP_PROVIDER || 'meta';
  
  // Resolve recipient numbers dynamically
  const recipients = await getRecipientNumbers();

  const messageText = `🩺 *NEW PG ADVISORY LEAD*

👤 *Name:* ${lead.name}
📞 *Phone:* ${lead.phone}
🏆 *NEET PG Rank:* ${lead.rank || 'Not Provided'}
🧠 *Branch:* ${lead.preferred_branch || 'Not Specified'}
📍 *States:* ${lead.preferred_state || 'Not Specified'}
🎯 *Quota:* ${lead.quota_interest || 'Not Specified'}
📅 *Internship:* ${lead.internship_status || 'Not Specified'}

Source: ${lead.source}
Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  // Safe logging fallback when keys are absent
  if (!token && provider !== 'webhook') {
    console.warn(
      `[WhatsApp Alert] Credentials missing. Targets: [${recipients.join(', ')}]. Lead: Name="${lead.name}", Rank="${lead.rank}"`
    );
    return false;
  }

  try {
    if (provider === 'meta' && phoneNumberId) {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      
      const sendPromises = recipients.map(async (to) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: to,
              type: 'text',
              text: { body: messageText },
            }),
          });

          if (!res.ok) {
            console.error(`[WhatsApp Alert] Meta API error for number ${to}:`, await res.text());
            return false;
          }
          console.log(`[WhatsApp Alert] Alert successfully sent to ${to} via Meta Cloud API`);
          return true;
        } catch (e) {
          console.error(`[WhatsApp Alert] Failed to send to ${to}:`, e);
          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      return results.some(r => r === true);
    } 
    
    if (provider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
      
      if (!accountSid || !twilioToken) {
        console.error('[WhatsApp Alert] Twilio Account SID or Auth Token missing.');
        return false;
      }

      const basicAuth = Buffer.from(`${accountSid}:${twilioToken}`).toString('base64');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const sendPromises = recipients.map(async (to) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: fromNumber,
              To: `whatsapp:+${to}`,
              Body: messageText,
            }),
          });

          if (!res.ok) {
            console.error(`[WhatsApp Alert] Twilio error for number ${to}:`, await res.text());
            return false;
          }
          console.log(`[WhatsApp Alert] Alert successfully sent to ${to} via Twilio`);
          return true;
        } catch (e) {
          console.error(`[WhatsApp Alert] Failed to send to ${to} via Twilio:`, e);
          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      return results.some(r => r === true);
    }

    if (provider === 'webhook' && process.env.WHATSAPP_WEBHOOK_URL) {
      const url = process.env.WHATSAPP_WEBHOOK_URL;
      
      const sendPromises = recipients.map(async (to) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient: to,
              message: messageText,
              lead,
            }),
          });

          if (!res.ok) {
            console.error(`[WhatsApp Alert] Webhook error status for ${to}:`, res.status);
            return false;
          }
          console.log(`[WhatsApp Alert] Alert successfully sent to ${to} via Webhook`);
          return true;
        } catch (e) {
          console.error(`[WhatsApp Alert] Failed to send to ${to} via Webhook:`, e);
          return false;
        }
      });

      const results = await Promise.all(sendPromises);
      return results.some(r => r === true);
    }

    console.warn('[WhatsApp Alert] Provider configured but config parameters are incomplete.');
    return false;
  } catch (err) {
    console.error('[WhatsApp Alert] Request error:', err);
    return false;
  }
}
