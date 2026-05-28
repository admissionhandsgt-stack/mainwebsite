"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, RefreshCw, Loader2, ImageIcon, Search, Pencil, Trash2,
  ImagePlus, Eye, EyeOff, LayoutGrid, Star, FileImage, Film
} from 'lucide-react';

interface MediaAsset {
  id: string;
  media_key: string;
  title: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  alt_text: string | null;
  section_type: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

type SectionTypeFilter = 'all' | 'hero' | 'content' | 'college' | 'marketing';

const SECTION_TYPES: SectionTypeFilter[] = ['all', 'hero', 'content', 'college', 'marketing'];

const sectionBadgeColors: Record<string, string> = {
  hero: 'bg-purple-100 text-purple-700',
  content: 'bg-blue-100 text-blue-700',
  college: 'bg-emerald-100 text-emerald-700',
  marketing: 'bg-amber-100 text-amber-700',
};

const defaultFormState = {
  media_key: '',
  title: '',
  alt_text: '',
  section_type: 'content',
  display_order: 0,
  is_active: true,
};

const MediaManager = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<SectionTypeFilter>('all');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState(defaultFormState);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await (supabase as any)
        .from('media_assets')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setAssets((data as MediaAsset[]) || []);
    } catch (err: any) {
      console.error('Error fetching media assets:', err);
      setError(err.message || 'Failed to load media assets');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File, sectionType: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const filePath = `${sectionType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await (supabase as any).storage.from('media-assets').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = (supabase as any).storage.from('media-assets').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'desktop') {
      setDesktopFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setDesktopPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setMobileFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMobilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview(null);
    setMobilePreview(null);
    setEditingAsset(null);
  };

  const handleAdd = async () => {
    if (!formData.media_key.trim()) {
      toast.error('Media Key is required');
      return;
    }

    try {
      setIsSaving(true);
      let desktopUrl: string | null = null;
      let mobileUrl: string | null = null;

      if (desktopFile) {
        desktopUrl = await uploadFile(desktopFile, formData.section_type);
      }
      if (mobileFile) {
        mobileUrl = await uploadFile(mobileFile, formData.section_type);
      }

      const { error } = await (supabase as any).from('media_assets').insert({
        media_key: formData.media_key,
        title: formData.title || null,
        image_url: desktopUrl || '',
        mobile_image_url: mobileUrl,
        alt_text: formData.alt_text || null,
        section_type: formData.section_type,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      if (error) throw error;
      toast.success('Media asset added successfully');
      setAddDialogOpen(false);
      resetForm();
      fetchAssets();
    } catch (err: any) {
      console.error('Error adding media asset:', err);
      toast.error(`Failed to add: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingAsset) return;
    if (!formData.media_key.trim()) {
      toast.error('Media Key is required');
      return;
    }

    try {
      setIsSaving(true);
      let desktopUrl = editingAsset.image_url;
      let mobileUrl = editingAsset.mobile_image_url;

      if (desktopFile) {
        desktopUrl = await uploadFile(desktopFile, formData.section_type);
      }
      if (mobileFile) {
        mobileUrl = await uploadFile(mobileFile, formData.section_type);
      }

      const { error } = await (supabase as any)
        .from('media_assets')
        .update({
          media_key: formData.media_key,
          title: formData.title || null,
          image_url: desktopUrl,
          mobile_image_url: mobileUrl,
          alt_text: formData.alt_text || null,
          section_type: formData.section_type,
          display_order: formData.display_order,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAsset.id);

      if (error) throw error;
      toast.success('Media asset updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchAssets();
    } catch (err: any) {
      console.error('Error updating media asset:', err);
      toast.error(`Failed to update: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error } = await (supabase as any).from('media_assets').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Media asset deleted successfully');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchAssets();
    } catch (err: any) {
      console.error('Error deleting media asset:', err);
      toast.error(`Failed to delete: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (asset: MediaAsset) => {
    try {
      const { error } = await (supabase as any)
        .from('media_assets')
        .update({ is_active: !asset.is_active, updated_at: new Date().toISOString() })
        .eq('id', asset.id);
      if (error) throw error;
      toast.success(`Asset ${asset.is_active ? 'deactivated' : 'activated'}`);
      fetchAssets();
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  const openEditDialog = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setFormData({
      media_key: asset.media_key,
      title: asset.title || '',
      alt_text: asset.alt_text || '',
      section_type: asset.section_type,
      display_order: asset.display_order,
      is_active: asset.is_active,
    });
    setDesktopPreview(asset.image_url);
    setMobilePreview(asset.mobile_image_url);
    setDesktopFile(null);
    setMobileFile(null);
    setEditDialogOpen(true);
  };

  // Filtered assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.media_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = sectionFilter === 'all' || a.section_type === sectionFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const activeCount = assets.filter((a) => a.is_active).length;
  const heroCount = assets.filter((a) => a.section_type === 'hero').length;
  const contentCount = assets.filter((a) => a.section_type === 'content').length;

  const renderForm = (isEdit: boolean) => (
    <div className="p-6 space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Media Key *</Label>
          <Input
            placeholder="e.g. hero-homepage-banner"
            value={formData.media_key}
            onChange={(e) => setFormData({ ...formData, media_key: e.target.value })}
            className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Title</Label>
          <Input
            placeholder="e.g. Homepage Hero Banner"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Section Type</Label>
            <select
              value={formData.section_type}
              onChange={(e) => setFormData({ ...formData, section_type: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical-500 transition-colors"
            >
              <option value="hero">Hero</option>
              <option value="content">Content</option>
              <option value="college">College</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Display Order</Label>
            <Input
              type="number"
              placeholder="0"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Alt Text</Label>
          <Input
            placeholder="Descriptive alt text for accessibility"
            value={formData.alt_text}
            onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
            className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        {/* Desktop Image Upload */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Desktop Image</Label>
          <div className="flex items-center gap-4">
            {desktopPreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={desktopPreview} alt="Desktop preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4 text-white cursor-pointer" onClick={() => { setDesktopFile(null); setDesktopPreview(null); }} />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <ImagePlus className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor={`desktop-upload-${isEdit ? 'edit' : 'add'}`} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <ImagePlus className="w-4 h-4" />
                {isEdit ? 'Change Image' : 'Choose Image'}
              </Label>
              <Input
                id={`desktop-upload-${isEdit ? 'edit' : 'add'}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'desktop')}
              />
              <p className="text-[10px] text-slate-500 mt-2">Recommended: 1920x1080px. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Mobile Image Upload */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Mobile Image (Optional)</Label>
          <div className="flex items-center gap-4">
            {mobilePreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mobilePreview} alt="Mobile preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4 text-white cursor-pointer" onClick={() => { setMobileFile(null); setMobilePreview(null); }} />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <ImagePlus className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor={`mobile-upload-${isEdit ? 'edit' : 'add'}`} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <ImagePlus className="w-4 h-4" />
                {isEdit ? 'Change Mobile' : 'Choose Mobile'}
              </Label>
              <Input
                id={`mobile-upload-${isEdit ? 'edit' : 'add'}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'mobile')}
              />
              <p className="text-[10px] text-slate-500 mt-2">Recommended: 768x1024px. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id={`active-toggle-${isEdit ? 'edit' : 'add'}`}
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-medical-600 focus:ring-medical-500"
          />
          <Label htmlFor={`active-toggle-${isEdit ? 'edit' : 'add'}`} className="text-sm font-medium text-slate-700 cursor-pointer">
            Active (visible on website)
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Assets</h1>
          <p className="text-sm text-gray-500 mt-1">Manage images and media used across the website</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAssets()}
            disabled={isLoading}
            className="rounded-xl border-gray-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 border-0 shadow-md shadow-medical-500/20">
                <Plus className="h-4 w-4 mr-2" />
                Add Media
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-white border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-medical-100 flex items-center justify-center">
                  <ImagePlus className="w-5 h-5 text-medical-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">Add New Media Asset</DialogTitle>
                  <p className="text-xs text-slate-500 font-medium">Upload and configure a new media asset</p>
                </div>
              </div>
              {renderForm(false)}
              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAdd} disabled={isSaving} className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 text-white">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Add Asset'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: assets.length, icon: ImageIcon, color: 'text-medical-600 bg-medical-50' },
          { label: 'Active', value: activeCount, icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Hero Images', value: heroCount, icon: Star, color: 'text-purple-600 bg-purple-50' },
          { label: 'Content', value: contentCount, icon: FileImage, color: 'text-blue-600 bg-blue-50' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by key or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 rounded-xl focus-visible:ring-medical-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {SECTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSectionFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  sectionFilter === type
                    ? 'bg-medical-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isLoading && assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-400" />
          <p className="text-gray-500 text-sm">Loading media assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200">
          <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No media assets found</p>
          <p className="text-sm text-gray-400 mt-1">
            {assets.length > 0 ? 'Try adjusting your filters' : 'Add your first media asset to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[60px_1fr_1fr_120px_80px_80px_140px] gap-4 items-center px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Preview</span>
            <span>Media Key</span>
            <span>Title</span>
            <span>Type</span>
            <span>Status</span>
            <span>Order</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Table Rows */}
          <AnimatePresence>
            {filteredAssets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="grid grid-cols-1 md:grid-cols-[60px_1fr_1fr_120px_80px_80px_140px] gap-3 md:gap-4 items-center px-5 py-4 border-b border-slate-100 hover:bg-white/80 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  {asset.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.image_url}
                      alt={asset.alt_text || asset.media_key}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Media Key */}
                <div className="min-w-0">
                  <p className="text-sm font-mono font-semibold text-slate-900 truncate">{asset.media_key}</p>
                  <p className="text-xs text-slate-400 md:hidden">{asset.title || '—'}</p>
                </div>

                {/* Title */}
                <div className="hidden md:block min-w-0">
                  <p className="text-sm text-slate-600 truncate">{asset.title || '—'}</p>
                </div>

                {/* Section Type Badge */}
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${sectionBadgeColors[asset.section_type] || 'bg-gray-100 text-gray-700'}`}>
                    {asset.section_type}
                  </span>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${asset.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-slate-500 md:hidden">{asset.is_active ? 'Active' : 'Inactive'}</span>
                </div>

                {/* Display Order */}
                <div>
                  <span className="text-sm text-slate-500 font-medium">{asset.display_order}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 hover:text-blue-600"
                    onClick={() => openEditDialog(asset)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-slate-100"
                    onClick={() => toggleActive(asset)}
                    title={asset.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {asset.is_active ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-500" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                    onClick={() => { setDeleteTarget(asset); setDeleteDialogOpen(true); }}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[550px] bg-white border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Edit Media Asset</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Update {editingAsset?.media_key}</p>
            </div>
          </div>
          {renderForm(true)}
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving} className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 text-white">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-2xl border-slate-200">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Delete Media Asset?</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to delete <span className="font-bold text-slate-900">{deleteTarget?.media_key}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaManager;
