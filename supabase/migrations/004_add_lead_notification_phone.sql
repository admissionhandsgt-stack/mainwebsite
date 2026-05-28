-- ============================================================
-- 004_add_lead_notification_phone.sql
-- Add lead_notification_phone column to contact_info table
-- ============================================================

ALTER TABLE public.contact_info 
ADD COLUMN IF NOT EXISTS lead_notification_phone TEXT DEFAULT '+919310301949';
