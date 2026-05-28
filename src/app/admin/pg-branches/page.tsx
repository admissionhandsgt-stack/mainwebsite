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
  Plus, RefreshCw, Loader2, Search, Pencil, Trash2,
  ImagePlus, Eye, EyeOff, Stethoscope, Scissors, Activity,
  GraduationCap, Hash
} from 'lucide-react';

interface PgBranch {
  id: string;
  branch_name: string;
  category: string;
  short_description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const categoryConfig: Record<string, { label: string; badge: string; icon: typeof Stethoscope }> = {
  clinical: { label: 'Clinical', badge: 'bg-blue-100 text-blue-700', icon: Stethoscope },
  surgical: { label: 'Surgical', badge: 'bg-rose-100 text-rose-700', icon: Scissors },
  non_clinical: { label: 'Non-Clinical', badge: 'bg-emerald-100 text-emerald-700', icon: Activity },
};

const defaultFormState = {
  branch_name: '',
  category: 'clinical',
  short_description: '',
  display_order: 0,
  is_active: true,
};

const PgBranchesManager = () => {
  const [branches, setBranches] = useState<PgBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState(defaultFormState);
  const [editingBranch, setEditingBranch] = useState<PgBranch | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PgBranch | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await (supabase as any)
        .from('pg_branches')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setBranches((data as PgBranch[]) || []);
    } catch (err: any) {
      console.error('Error fetching PG branches:', err);
      setError(err.message || 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadIcon = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const filePath = `branches/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await (supabase as any).storage.from('media-assets').upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = (supabase as any).storage.from('media-assets').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setIconPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData(defaultFormState);
    setIconFile(null);
    setIconPreview(null);
    setEditingBranch(null);
  };

  const handleAdd = async () => {
    if (!formData.branch_name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    try {
      setIsSaving(true);
      let iconUrl: string | null = null;

      if (iconFile) {
        iconUrl = await uploadIcon(iconFile);
      }

      const { error } = await (supabase as any).from('pg_branches').insert({
        branch_name: formData.branch_name,
        category: formData.category,
        short_description: formData.short_description || null,
        icon_url: iconUrl,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      if (error) throw error;
      toast.success('Branch added successfully');
      setAddDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (err: any) {
      console.error('Error adding branch:', err);
      toast.error(`Failed to add: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingBranch) return;
    if (!formData.branch_name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    try {
      setIsSaving(true);
      let iconUrl = editingBranch.icon_url;

      if (iconFile) {
        iconUrl = await uploadIcon(iconFile);
      }

      const { error } = await (supabase as any)
        .from('pg_branches')
        .update({
          branch_name: formData.branch_name,
          category: formData.category,
          short_description: formData.short_description || null,
          icon_url: iconUrl,
          display_order: formData.display_order,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingBranch.id);

      if (error) throw error;
      toast.success('Branch updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (err: any) {
      console.error('Error updating branch:', err);
      toast.error(`Failed to update: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error } = await (supabase as any).from('pg_branches').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Branch deleted successfully');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchBranches();
    } catch (err: any) {
      console.error('Error deleting branch:', err);
      toast.error(`Failed to delete: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleActive = async (branch: PgBranch) => {
    try {
      const { error } = await (supabase as any)
        .from('pg_branches')
        .update({ is_active: !branch.is_active, updated_at: new Date().toISOString() })
        .eq('id', branch.id);
      if (error) throw error;
      toast.success(`Branch ${branch.is_active ? 'deactivated' : 'activated'}`);
      fetchBranches();
    } catch (err: any) {
      toast.error('Failed to toggle status');
    }
  };

  const openEditDialog = (branch: PgBranch) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      category: branch.category,
      short_description: branch.short_description || '',
      display_order: branch.display_order,
      is_active: branch.is_active,
    });
    setIconPreview(branch.icon_url);
    setIconFile(null);
    setEditDialogOpen(true);
  };

  // Filtered branches
  const filteredBranches = branches.filter((b) =>
    b.branch_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const activeCount = branches.filter((b) => b.is_active).length;
  const clinicalCount = branches.filter((b) => b.category === 'clinical').length;
  const surgicalCount = branches.filter((b) => b.category === 'surgical').length;

  const renderForm = (isEdit: boolean) => (
    <div className="p-6 space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Branch Name *</Label>
          <Input
            placeholder="e.g. General Medicine"
            value={formData.branch_name}
            onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
            className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</Label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical-500 transition-colors"
            >
              <option value="clinical">Clinical</option>
              <option value="surgical">Surgical</option>
              <option value="non_clinical">Non-Clinical</option>
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
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Short Description</Label>
          <textarea
            placeholder="Brief description of this branch..."
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical-500 transition-colors resize-none"
          />
        </div>

        {/* Icon Upload */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Branch Icon</Label>
          <div className="flex items-center gap-4">
            {iconPreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={iconPreview} alt="Icon preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4 text-white cursor-pointer" onClick={() => { setIconFile(null); setIconPreview(null); }} />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <ImagePlus className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <Label htmlFor={`icon-upload-${isEdit ? 'edit' : 'add'}`} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                <ImagePlus className="w-4 h-4" />
                {isEdit ? 'Change Icon' : 'Choose Icon'}
              </Label>
              <Input
                id={`icon-upload-${isEdit ? 'edit' : 'add'}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleIconChange}
              />
              <p className="text-[10px] text-slate-500 mt-2">Recommended: 128x128px. SVG or PNG.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">PG Branches</h1>
          <p className="text-sm text-gray-500 mt-1">Manage postgraduate medical branches and specializations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBranches()}
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
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-white border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-medical-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-medical-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">Add New Branch</DialogTitle>
                  <p className="text-xs text-slate-500 font-medium">Add a new PG medical specialization</p>
                </div>
              </div>
              {renderForm(false)}
              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAdd} disabled={isSaving} className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 text-white">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Add Branch'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Branches', value: branches.length, icon: GraduationCap, color: 'text-medical-600 bg-medical-50' },
          { label: 'Active', value: activeCount, icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Clinical', value: clinicalCount, icon: Stethoscope, color: 'text-blue-600 bg-blue-50' },
          { label: 'Surgical', value: surgicalCount, icon: Scissors, color: 'text-rose-600 bg-rose-50' },
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

      {/* Search Bar */}
      <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200 rounded-xl focus-visible:ring-medical-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      {isLoading && branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-400" />
          <p className="text-gray-500 text-sm">Loading branches...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200">
          <GraduationCap className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No branches found</p>
          <p className="text-sm text-gray-400 mt-1">
            {branches.length > 0 ? 'Try adjusting your search' : 'Add your first PG branch to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredBranches.map((branch, idx) => {
              const config = categoryConfig[branch.category] || categoryConfig.clinical;
              const CategoryIcon = config.icon;
              return (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative"
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                      {branch.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={branch.icon_url}
                          alt={branch.branch_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>';
                          }}
                        />
                      ) : (
                        <CategoryIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate mb-1">{branch.branch_name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${config.badge}`}>
                          {config.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${branch.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <span className="text-[10px] text-slate-400">{branch.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      {branch.short_description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{branch.short_description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                        <Hash className="w-3 h-3" />
                        <span>Order: {branch.display_order}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (hover) */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-lg shadow-sm border border-slate-200 bg-white hover:bg-slate-50 hover:text-blue-600"
                      onClick={() => openEditDialog(branch)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-lg shadow-sm border border-slate-200 bg-white hover:bg-slate-50"
                      onClick={() => toggleActive(branch)}
                      title={branch.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {branch.is_active ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-500" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-lg shadow-sm border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600"
                      onClick={() => { setDeleteTarget(branch); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
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
              <DialogTitle className="text-xl font-bold text-slate-900">Edit Branch</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Update {editingBranch?.branch_name}</p>
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
            <h3 className="text-xl font-bold text-slate-900">Delete Branch?</h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to delete <span className="font-bold text-slate-900">{deleteTarget?.branch_name}</span>? This action cannot be undone.
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

export default PgBranchesManager;
