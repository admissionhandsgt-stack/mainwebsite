/**
 * Telling the team a lead came in.
 *
 * **This was silently doing nothing.** It supported Meta Cloud API, Twilio and
 * a generic webhook, every one of which needs an environment variable, and
 * none of those were ever set on the server. So every enquiry since go-live
 * logged `[WhatsApp Alert] Credentials missing` and stopped there — including
 * a real candidate at 08:49 on 2026-09-25 whom nobody was told about. The form
 * worked, the row was written, `/admin/leads` showed it, and the alert was a
 * line in journalctl.
 *
 * Our own WAHA gateway is paired and working and costs nothing, so it is now
 * tried first and the paid providers are the fallback rather than the only
 * option. Nothing has to be configured for alerts to work; the gateway that
 * already sends sign-in codes sends these too.
 *
 * Order: gateway, then Meta, then Twilio, then a webhook. The first one that
 * is actually configured wins, and if none is, that is now a loud failure in
 * the error log rather than a warning nobody reads.
 */
import { getContactInfo } from '@/lib/content';
import { sendText, gatewayConfigured } from '@/lib/waGateway';
import { logError } from '@/lib/logger';

interface LeadNotificationPayload {
  name: string;
  phone: string;
  rank?: string | number;
  preferred_branch?: string;
  preferred_state?: string;
  quota_interest?: string;
  internship_status?: string;
  /** The counselling profile — see lib/counsellingProfile.ts. */
  category?: string;
  attempt?: string;
  budget_max?: number;
  mbbs_college?: string;
  /** What is still unknown, so a counsellor knows what to open the call with. */
  missing?: string[];
  source: string;
}

/** ₹4,200,000 reads as "up to ₹42.00 L", which is how the team talks. */
function money(v: number | undefined): string | undefined {
  if (v == null) return undefined;
  if (v >= 10000000) return `up to ₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `up to ₹${(v / 100000).toFixed(2)} L`;
  return `up to ₹${v.toLocaleString('en-IN')}`;
}

// Who gets alerted: the env override wins, otherwise the number the admin
// set under Contacts.
async function getRecipientNumbers(): Promise<string[]> {
  let recipientString = '';

  if (process.env.WHATSAPP_RECIPIENT_NUMBER) {
    recipientString = process.env.WHATSAPP_RECIPIENT_NUMBER;
  } else {
    try {
      const contact = await getContactInfo();
      recipientString = contact?.leadNotificationPhone || contact?.whatsappNumber || '';
    } catch (err) {
      console.error('[WhatsApp Alert] Error loading recipient from contact_info:', err);
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

  // Only the lines that have something in them. A message where five fields
  // out of eight say "Not Specified" reads as a system fault rather than as an
  // enquiry, and it buries the phone number — the one thing a counsellor
  // actually needs in order to act.
  const detail = [
    ['Rank', lead.rank],
    ['Category', lead.category],
    ['Attempt', lead.attempt],
    ['Branch', lead.preferred_branch],
    ['Domicile', lead.preferred_state],
    ['Budget', money(lead.budget_max)],
    ['MBBS from', lead.mbbs_college],
    ['Quota', lead.quota_interest],
    ['Internship', lead.internship_status],
  ]
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  // Naming the gaps earns its line: a counsellor who knows the budget is missing
  // opens with it, instead of discovering halfway through that the shortlist
  // they have just read out is unaffordable.
  const gaps = (lead.missing ?? []).filter(Boolean);

  const messageText =
    `*New enquiry — ${lead.name}*\n\n` +
    `📞 ${lead.phone}\n` +
    (detail ? `\n${detail}\n` : '') +
    (gaps.length ? `\n_Still to ask: ${gaps.join(', ')}_\n` : '') +
    `\n${lead.source}\n` +
    `${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

  /**
   * Our own gateway first.
   *
   * It is already paired, it costs nothing per message, and the recipients are
   * the same two staff numbers every time — which is ordinary traffic, not the
   * stranger-blasting pattern that gets a number restricted.
   *
   * `WHATSAPP_PROVIDER` set explicitly skips this, so an operator who has
   * bought Meta or Twilio access can pin it.
   */
  if (!process.env.WHATSAPP_PROVIDER && (await gatewayConfigured())) {
    const results = await Promise.all(
      recipients.map(async (to) => {
        const r = await sendText(to, messageText);
        if (!r.sent) {
          logError(new Error(`Lead alert to ${to} failed: ${r.error}`), {
            route: 'whatsappService',
          });
        }
        return r.sent;
      }),
    );
    if (results.some(Boolean)) return true;
    // Fall through: a gateway that is down should not stop a configured paid
    // provider from being tried.
  }

  if (!token && provider !== 'webhook') {
    // Loud, because this is a lead nobody has been told about. It used to be a
    // console.warn, which is how it went unnoticed from go-live until someone
    // asked where the alerts were going.
    logError(
      new Error(
        `Lead alert could not be delivered — no WhatsApp gateway and no provider credentials. ` +
          `Lead: ${lead.name} / ${lead.phone} (${lead.source})`,
      ),
      { route: 'whatsappService' },
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
