import { supabase } from '@/integrations/supabase/client';

export interface MediaAsset {
  id: string;
  media_key: string;
  title: string | null;
  image_url: string;
  mobile_image_url: string | null;
  alt_text: string | null;
  section_type: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getMediaAsset(mediaKey: string): Promise<MediaAsset | null> {
  const { data, error } = await (supabase as any)
    .from('media_assets')
    .select('*')
    .eq('media_key', mediaKey)
    .single();
  if (error) return null;
  
  // If explicitly set to inactive in DB, return 'none' for image URLs to signal the UI not to render/fallback
  if (!data.is_active) {
    return {
      ...data,
      image_url: 'none',
      mobile_image_url: 'none'
    } as MediaAsset;
  }
  
  return data as MediaAsset;
}

export async function getMediaAssets(sectionType?: string): Promise<MediaAsset[]> {
  let query = (supabase as any)
    .from('media_assets')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (sectionType) query = query.eq('section_type', sectionType);
  const { data } = await query;
  return (data as MediaAsset[]) || [];
}

export async function uploadMediaFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await (supabase as any).storage
    .from('media-assets')
    .upload(fileName, file, { upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data: { publicUrl } } = (supabase as any).storage.from('media-assets').getPublicUrl(data.path);
  return publicUrl;
}
