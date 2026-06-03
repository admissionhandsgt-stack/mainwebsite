"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, ImagePlus, Plus, Building2, MapPin, Users, Calendar, ShieldCheck, Search, Filter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';

export interface PGCollege {
  id: string;
  college_name: string;
  city: string;
  state: string;
  college_type: string;
  ownership: string | null;
  year_established: number | null;
  total_pg_seats: number;
  key_specialties: string[];
  short_description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const PGCollegeManager: React.FC = () => {
  const [colleges, setColleges] = useState<PGCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [selectedCollege, setSelectedCollege] = useState<PGCollege | null>(null);
  const [specialtiesText, setSpecialtiesText] = useState('');
  
  const [newCollege, setNewCollege] = useState<Partial<PGCollege>>({
    college_name: '',
    city: '',
    state: '',
    college_type: 'Government',
    ownership: '',
    year_established: new Date().getFullYear() - 10,
    total_pg_seats: 0,
    key_specialties: [],
    short_description: '',
    image_url: '',
    is_active: true
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pg_colleges')
        .select('*')
        .order('college_name');
        
      if (error) throw error;
      setColleges((data as PGCollege[]) || []);
    } catch (err: any) {
      console.error('Error fetching pg_colleges:', err);
      toast.error('Failed to load PG colleges');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCollege = async () => {
    if (!newCollege.college_name || !newCollege.state || !newCollege.city) {
      toast.error("Please fill in College Name, City, and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = newCollege.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800';
      
      if (imageFile) {
        const fileName = `pg-${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('colleges').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('colleges').getPublicUrl(fileName);
        imageUrl = publicUrl.publicUrl;
      }

      const specialties = specialtiesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const { error } = await supabase.from('pg_colleges').insert({
        college_name: newCollege.college_name,
        city: newCollege.city,
        state: newCollege.state,
        college_type: newCollege.college_type || 'Government',
        ownership: newCollege.ownership || null,
        year_established: newCollege.year_established || null,
        total_pg_seats: newCollege.total_pg_seats || 0,
        key_specialties: specialties,
        short_description: newCollege.short_description || null,
        image_url: imageUrl,
        is_active: newCollege.is_active ?? true
      });

      if (error) throw error;
      
      toast.success("PG College added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchColleges();
    } catch (err: any) {
      console.error('Error adding PG college:', err);
      toast.error(`Failed to add college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCollege = async () => {
    if (!selectedCollege || !selectedCollege.college_name || !selectedCollege.state || !selectedCollege.city) {
      toast.error("Please fill in College Name, City, and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = selectedCollege.image_url;
      
      if (imageFile) {
        const fileName = `pg-${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('colleges').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('colleges').getPublicUrl(fileName);
        imageUrl = publicUrl.publicUrl;
      }

      const specialties = specialtiesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const { error } = await supabase.from('pg_colleges').update({
        college_name: selectedCollege.college_name,
        city: selectedCollege.city,
        state: selectedCollege.state,
        college_type: selectedCollege.college_type,
        ownership: selectedCollege.ownership || null,
        year_established: selectedCollege.year_established || null,
        total_pg_seats: selectedCollege.total_pg_seats,
        key_specialties: specialties,
        short_description: selectedCollege.short_description || null,
        image_url: imageUrl,
        is_active: selectedCollege.is_active,
        updated_at: new Date().toISOString()
      }).eq('id', selectedCollege.id);

      if (error) throw error;
      
      toast.success("PG College updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCollege(null);
      setImageFile(null);
      setPreviewUrl(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error updating PG college:', err);
      toast.error(`Failed to update college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCollege = async () => {
    if (!selectedCollege) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase.from('pg_colleges').delete().eq('id', selectedCollege.id);
      if (error) throw error;
      toast.success("College deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCollege(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error deleting PG college:', err);
      toast.error(`Failed to delete college: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setNewCollege({
      college_name: '',
      city: '',
      state: '',
      college_type: 'Government',
      ownership: '',
      year_established: new Date().getFullYear() - 10,
      total_pg_seats: 0,
      key_specialties: [],
      short_description: '',
      image_url: '',
      is_active: true
    });
    setSpecialtiesText('');
    setImageFile(null);
    setPreviewUrl(null);
  };

  const filteredColleges = colleges.filter(u => {
    const matchesSearch = u.college_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesType = typeFilter === 'all' || u.college_type.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 p-1">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-emerald-500/10 opacity-60 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider">
              Management Portal
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              PG Colleges <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Database</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Manage the list of PG medical colleges offering MD/MS seats in India.
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if(open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full px-6 py-5 shadow-lg shadow-blue-500/20 text-sm font-black transition-all border border-blue-400/20">
                <Plus className="h-4 w-4" />
                <span>Add PG College</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-900">Add New PG College</DialogTitle>
                  <p className="text-xs text-slate-500 font-medium">Enter details for the new MD/MS institution</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">College Name *</Label>
                  <Input 
                    placeholder="e.g. Kasturba Medical College" 
                    value={newCollege.college_name || ''}
                    onChange={(e) => setNewCollege({...newCollege, college_name: e.target.value})}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">State *</Label>
                    <Input 
                      placeholder="e.g. Karnataka" 
                      value={newCollege.state || ''}
                      onChange={(e) => setNewCollege({...newCollege, state: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City *</Label>
                    <Input 
                      placeholder="e.g. Mangalore" 
                      value={newCollege.city || ''}
                      onChange={(e) => setNewCollege({...newCollege, city: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">College Type</Label>
                    <select 
                      value={newCollege.college_type || 'Government'}
                      onChange={(e) => setNewCollege({...newCollege, college_type: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium focus:bg-white outline-none"
                    >
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                      <option value="Deemed">Deemed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ownership</Label>
                    <Input 
                      placeholder="e.g. Trust, Government" 
                      value={newCollege.ownership || ''}
                      onChange={(e) => setNewCollege({...newCollege, ownership: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Year Est.</Label>
                    <Input 
                      type="number"
                      placeholder="e.g. 1953" 
                      value={newCollege.year_established || ''}
                      onChange={(e) => setNewCollege({...newCollege, year_established: parseInt(e.target.value) || null})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total PG Seats</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 120" 
                      value={newCollege.total_pg_seats || ''}
                      onChange={(e) => setNewCollege({...newCollege, total_pg_seats: parseInt(e.target.value) || 0})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch 
                      id="new-active"
                      checked={newCollege.is_active ?? true}
                      onCheckedChange={(checked) => setNewCollege({...newCollege, is_active: checked})}
                    />
                    <Label htmlFor="new-active" className="text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer">Is Active / Visible</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Specialties (Comma Separated)</Label>
                  <Input 
                    placeholder="e.g. MD General Medicine, MS General Surgery, MD Paediatrics" 
                    value={specialtiesText}
                    onChange={(e) => setSpecialtiesText(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Short Description</Label>
                  <Textarea 
                    placeholder="Brief description about the college campus or specialties..." 
                    value={newCollege.short_description || ''}
                    onChange={(e) => setNewCollege({...newCollege, short_description: e.target.value})}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors min-h-[60px]"
                  />
                </div>
                
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">College Image</Label>
                  <div className="flex items-center gap-4">
                    {previewUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4 text-white cursor-pointer" onClick={() => {setImageFile(null); setPreviewUrl(null);}} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <Label htmlFor="image-upload-pg" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        <ImagePlus className="w-4 h-4" />
                        Choose Image
                      </Label>
                      <Input 
                        id="image-upload-pg" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                      <p className="text-[10px] text-slate-500 mt-2">Recommended: 800x600px. Max 2MB.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAddCollege} disabled={isSaving} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Add College'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by PG college name or state..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 rounded-xl focus-visible:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="Government">Government</option>
              <option value="Private">Private</option>
              <option value="Deemed">Deemed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p className="font-medium">Loading PG colleges...</p>
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Building2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No PG colleges found matching search criteria.</p>
            <Button variant="link" onClick={() => { setSearchQuery(''); setTypeFilter('all'); }} className="text-blue-500 mt-2">Clear filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-slate-100 bg-slate-50/30">
            {filteredColleges.map((college, idx) => (
              <div 
                key={college.id} 
                className="p-5 bg-white border-b border-r border-slate-100 hover:bg-slate-50/60 transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={college.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800'} 
                        alt={college.college_name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm font-black text-slate-900 truncate" title={college.college_name}>
                          {college.college_name}
                        </h3>
                        {!college.is_active && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-200 text-red-500 bg-red-50 shrink-0">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{college.city}, {college.state}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge className="bg-blue-50 text-blue-700 border-0 hover:bg-blue-100 text-[9px] py-0 px-1.5 font-bold">
                          {college.college_type}
                        </Badge>
                        {college.ownership && (
                          <Badge className="bg-slate-100 text-slate-600 border-0 hover:bg-slate-200 text-[9px] py-0 px-1.5 font-bold">
                            {college.ownership}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {college.short_description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-3 mb-2 font-medium">
                      {college.short_description}
                    </p>
                  )}
                  
                  {college.key_specialties && college.key_specialties.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Specialties ({college.key_specialties.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {college.key_specialties.slice(0, 3).map((spec, i) => (
                          <span key={i} className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1 text-slate-600 font-bold max-w-[120px] truncate" title={spec}>
                            {spec}
                          </span>
                        ))}
                        {college.key_specialties.length > 3 && (
                          <span className="text-[9px] text-slate-400 font-bold pl-1">
                            +{college.key_specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-wide">
                    <Users className="w-3 h-3 text-emerald-600" />
                    {college.total_pg_seats} PG Seats
                  </div>
                  
                  {college.year_established && (
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Est. {college.year_established}
                    </div>
                  )}
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 p-1 rounded-lg shadow-sm border border-slate-200">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-md text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                    onClick={() => {
                      setSelectedCollege(college);
                      setSpecialtiesText(college.key_specialties.join(', '));
                      setPreviewUrl(college.image_url);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-md text-slate-600 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setSelectedCollege(college);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900">Edit PG College</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Update details for {selectedCollege?.college_name}</p>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {selectedCollege && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">College Name *</Label>
                  <Input 
                    value={selectedCollege.college_name}
                    onChange={(e) => setSelectedCollege({...selectedCollege, college_name: e.target.value})}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">State *</Label>
                    <Input 
                      value={selectedCollege.state}
                      onChange={(e) => setSelectedCollege({...selectedCollege, state: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City *</Label>
                    <Input 
                      value={selectedCollege.city}
                      onChange={(e) => setSelectedCollege({...selectedCollege, city: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">College Type</Label>
                    <select 
                      value={selectedCollege.college_type}
                      onChange={(e) => setSelectedCollege({...selectedCollege, college_type: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-sm font-medium focus:bg-white outline-none"
                    >
                      <option value="Government">Government</option>
                      <option value="Private">Private</option>
                      <option value="Deemed">Deemed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ownership</Label>
                    <Input 
                      value={selectedCollege.ownership || ''}
                      onChange={(e) => setSelectedCollege({...selectedCollege, ownership: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Year Est.</Label>
                    <Input 
                      type="number"
                      value={selectedCollege.year_established || ''}
                      onChange={(e) => setSelectedCollege({...selectedCollege, year_established: parseInt(e.target.value) || null})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total PG Seats</Label>
                    <Input 
                      type="number" 
                      value={selectedCollege.total_pg_seats}
                      onChange={(e) => setSelectedCollege({...selectedCollege, total_pg_seats: parseInt(e.target.value) || 0})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch 
                      id="edit-active"
                      checked={selectedCollege.is_active}
                      onCheckedChange={(checked) => setSelectedCollege({...selectedCollege, is_active: checked})}
                    />
                    <Label htmlFor="edit-active" className="text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer">Is Active / Visible</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Specialties (Comma Separated)</Label>
                  <Input 
                    value={specialtiesText}
                    onChange={(e) => setSpecialtiesText(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Short Description</Label>
                  <Textarea 
                    value={selectedCollege.short_description || ''}
                    onChange={(e) => setSelectedCollege({...selectedCollege, short_description: e.target.value})}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white min-h-[60px]"
                  />
                </div>
                
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">College Image</Label>
                  <div className="flex items-center gap-4">
                    {previewUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Label htmlFor="edit-image-upload-pg" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        <ImagePlus className="w-4 h-4" />
                        Change Image
                      </Label>
                      <Input 
                        id="edit-image-upload-pg" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditCollege} disabled={isSaving} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-3xl border-slate-200">
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Delete PG College?</h3>
            <p className="text-sm text-slate-500 font-medium">
              Are you sure you want to delete <span className="font-bold text-slate-900">{selectedCollege?.college_name}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-100">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl bg-red-600 hover:bg-red-700" onClick={handleDeleteCollege} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PGCollegeManager;
