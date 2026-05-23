import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadData {
  name: string;
  email?: string;
  phone: string;
  message?: string;
  source: 'callback' | 'contact' | 'service_inquiry';
  neetScore?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    
    // Defensive extraction to handle inconsistent frontend naming
    const data: LeadData = {
      name: rawData.name || rawData.fullName || "Inquiry",
      email: rawData.email,
      phone: rawData.phone || rawData.mobile || "Not provided",
      message: rawData.message || rawData.comments || "",
      neetScore: rawData.neetScore,
      source: rawData.source || 'contact'
    };
    
    // 1. Log to database
    const { error: dbError } = await supabase
      .from('leads')
      .insert([{
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message || (data.neetScore ? `NEET Score: ${data.neetScore}` : ''),
        source: data.source
      }]);

    if (dbError) {
      console.error("Database logging error:", dbError);
    }

    // 2. Prepare Premium Email
    const emailContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #0f1a3d 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Admission Inquiry</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${data.source.toUpperCase()} - Received via AdmissionHands</p>
        </div>
        
        <div style="padding: 32px; background: white;">
          <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Applicant Name</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0f172a;">${data.name}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <div style="padding: 16px; background: #f8fafc; border-radius: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Mobile Number</p>
              <p style="margin: 0; font-size: 16px; font-weight: 500;">${data.phone}</p>
            </div>
            <div style="padding: 16px; background: #f8fafc; border-radius: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">NEET Score</p>
              <p style="margin: 0; font-size: 16px; font-weight: 500;">${data.neetScore || 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 12px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Email Address</p>
            <p style="margin: 0; font-size: 16px; font-weight: 500;">${data.email || 'Not provided'}</p>
          </div>

          <div style="margin-bottom: 32px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Message / Comments</p>
            <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #334155; background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px;">
              ${data.message || "No additional comments provided."}
            </p>
          </div>

          <div style="text-align: center;">
            <a href="tel:${data.phone}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Call Applicant</a>
          </div>
        </div>
        
        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This inquiry was captured by AdmissionHands AI System.</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} AdmissionHands. All rights reserved.</p>
        </div>
      </div>
    `;
    
    const emailResponse = await resend.emails.send({
      from: "AdmissionHands Leads <onboarding@resend.dev>",
      to: ["admissionhandss@gmail.com"],
      subject: `Lead: ${data.name} [${data.source.toUpperCase()}]`,
      html: emailContent,
      reply_to: data.email || undefined
    });

    console.log("Email sending response:", emailResponse);

    return new Response(JSON.stringify({ success: true, message: "Lead captured successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error processing lead:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process lead", details: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
