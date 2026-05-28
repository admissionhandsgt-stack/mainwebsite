import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { 
      name, 
      phone, 
      rank, 
      preferred_branch, 
      preferred_state, 
      quota_interest, 
      internship_status, 
      source_page = 'PG Page' 
    } = payload

    if (!name || !phone) {
      return new Response(JSON.stringify({ error: 'Name and Phone are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 1. Insert lead into pg_leads table
    const { data, error: insertError } = await supabaseClient
      .from('pg_leads')
      .insert([
        {
          name: name.trim(),
          phone: phone.trim(),
          rank: rank ? parseInt(rank, 10) : null,
          preferred_branch: preferred_branch ? preferred_branch.trim() : null,
          preferred_state: preferred_state ? preferred_state.trim() : null,
          quota_interest: quota_interest ? quota_interest.trim() : null,
          internship_status: internship_status ? internship_status.trim() : null,
          source_page: source_page.trim(),
          lead_status: 'New'
        }
      ])
      .select()

    if (insertError) {
      console.error('Database insertion error:', insertError)
      throw insertError
    }

    // 2. Trigger WhatsApp API if configured
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const recipient = Deno.env.get('WHATSAPP_RECIPIENT_NUMBER') || '919310301949'

    if (whatsappToken && whatsappPhoneId) {
      const messageText = `🩺 *NEW PG LEAD RECEIVED*

👤 *Name:* ${name}
📞 *Phone:* ${phone}
🏆 *NEET PG Rank:* ${rank || 'Not Provided'}
🧠 *Preferred Branch:* ${preferred_branch || 'Not Specified'}
📍 *Preferred State:* ${preferred_state || 'Not Specified'}
🎯 *Quota Interest:* ${quota_interest || 'Not Specified'}
📅 *Internship:* ${internship_status || 'Not Specified'}

Source: ${source_page}
Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`

      const whatsappRes = await fetch(`https://graph.facebook.com/v19.0/${whatsappPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { body: messageText }
        })
      })

      if (!whatsappRes.ok) {
        console.error('WhatsApp Dispatch Error:', await whatsappRes.text())
      } else {
        console.log('WhatsApp notification successfully dispatched to advisory team')
      }
    } else {
      console.log('WhatsApp credentials not set in environment. Notification skipped.')
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
