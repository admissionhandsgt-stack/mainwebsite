"use client";

import React, { useState, useEffect } from 'react';
import CollegeVisual from '@/components/ui/CollegeVisual';
import { listRows, createRow, updateRow, deleteRow, uploadImage } from '@/lib/adminApi';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, ImagePlus, Plus, Building2, MapPin, Users, Calendar, ShieldCheck, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export interface GenericCollege {
  id: number;
  slug: string;
  college_name: string;
  state: string;
  city: string | null;
  intake: number | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface GenericCollegeManagerProps {
  /** Admin API resource this tab edits, e.g. "colleges-ug". */
  resource: string;
  title: string;
  description: string;
}

const GenericCollegeManager: React.FC<GenericCollegeManagerProps> = ({ resource, title, description }) => {
  const [colleges, setColleges] = useState<GenericCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCollege, setSelectedCollege] = useState<GenericCollege | null>(null);
  const [newCollege, setNewCollege] = useState<Partial<GenericCollege>>({
    college_name: '',
    state: '',
    city: '',
    intake: 0,
    image_url: '',
    display_order: 100
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchColleges();
  }, [resource]);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      setColleges(await listRows<GenericCollege>(resource));
    } catch (err) {
      console.error(`Error fetching ${resource}:`, err);
      toast.error(`Failed to load data for ${title}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      // Validate file extension
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        toast.error("Invalid file format. Only JPG, JPEG, PNG, WEBP, and AVIF are allowed.");
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File is too large. Maximum allowed size is 5MB.");
        e.target.value = ''; // Reset input
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCollege = async () => {
    if (!newCollege.college_name || !newCollege.state) {
      toast.error("Please fill in College Name and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = newCollege.image_url || null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'colleges');
      }

      const slug = newCollege.college_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await createRow(resource, {
        college_name: newCollege.college_name,
        slug: slug,
        city: newCollege.city || null,
        state: newCollege.state,
        intake: newCollege.intake || 0,
        image_url: imageUrl,
        is_active: true,
        display_order: newCollege.display_order ?? ((colleges.length + 1) * 100)
      });
      
      toast.success("College added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchColleges();
    } catch (err: any) {
      console.error('Error adding college:', err);
      toast.error(`Failed to add college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCollege = async () => {
    if (!selectedCollege || !selectedCollege.college_name || !selectedCollege.state) {
      toast.error("Please fill in College Name and State");
      return;
    }

    try {
      setIsSaving(true);
      let imageUrl = selectedCollege.image_url;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, 'colleges');
      } else if (previewUrl === null) {
        imageUrl = null; // Explicitly remove the image
      }

      const slug = selectedCollege.college_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await updateRow(resource, selectedCollege.id, {
        college_name: selectedCollege.college_name,
        slug: slug,
        city: selectedCollege.city || null,
        state: selectedCollege.state,
        intake: selectedCollege.intake,
        image_url: imageUrl,
        display_order: selectedCollege.display_order
      });

      
      toast.success("College updated successfully");
      setIsEditDialogOpen(false);
      setSelectedCollege(null);
      setImageFile(null);
      setPreviewUrl(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error updating college:', err);
      toast.error(`Failed to update college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCollege = async () => {
    if (!selectedCollege) return;
    try {
      setIsDeleting(true);
      await deleteRow(resource, selectedCollege.id);
      toast.success("College deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedCollege(null);
      fetchColleges();
    } catch (err: any) {
      console.error('Error deleting college:', err);
      toast.error(`Failed to delete college: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setNewCollege({ college_name: '', state: '', city: '', intake: 0, image_url: '', display_order: (colleges.length + 1) * 100 });
    setImageFile(null);
    setPreviewUrl(null);
  };

  const filteredColleges = colleges.filter(u => 
    u.college_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 p-1">
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-emerald-500/10 opacity-60 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider">
              Management Portal
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              {title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Database</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {description}
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-full px-6 py-5 shadow-lg shadow-cyan-500/20 text-sm font-black transition-all border border-cyan-400/20">
                <Plus className="h-4 w-4" />
                <span>Add College</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-white border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-slate-900">Add New College</DialogTitle>
                  <p className="text-xs text-slate-500 font-medium">Enter details for the new institution</p>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">College Name *</Label>
                    <Input 
                      placeholder="e.g. AIIMS Delhi" 
                      value={newCollege.college_name || ''}
                      onChange={(e) => setNewCollege({...newCollege, college_name: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">State *</Label>
                      <Input 
                        placeholder="e.g. Delhi" 
                        value={newCollege.state || ''}
                        onChange={(e) => setNewCollege({...newCollege, state: e.target.value})}
                        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</Label>
                      <Input 
                        placeholder="e.g. New Delhi" 
                        value={newCollege.city || ''}
                        onChange={(e) => setNewCollege({...newCollege, city: e.target.value})}
                        className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Seats</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 150" 
                      value={newCollege.intake || ''}
                      onChange={(e) => setNewCollege({...newCollege, intake: parseInt(e.target.value) || 0})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Display Order</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 100" 
                      value={newCollege.display_order === undefined ? '' : newCollege.display_order}
                      onChange={(e) => setNewCollege({...newCollege, display_order: parseInt(e.target.value) || 0})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">College Image</Label>
                    
                    <div className="flex items-center gap-4">
                      {previewUrl ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4 text-white cursor-pointer" onClick={() => {setImageFile(null); setPreviewUrl(null);}} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                          <ImagePlus className="w-6 h-6" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <Label htmlFor="image-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-cyan-600 transition-colors">
                          <ImagePlus className="w-4 h-4" />
                          Choose Image
                        </Label>
                        <Input 
                          id="image-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                        />
                        <p className="text-[10px] text-slate-500 mt-2">Recommended: 800x600px or larger. Max 2MB.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleAddCollege} disabled={isSaving} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white">
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
              placeholder="Search by name or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-slate-200 rounded-xl focus-visible:ring-cyan-500"
            />
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto rounded-xl gap-2 border-slate-200">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600">Filters</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-500" />
            <p className="font-medium">Loading colleges...</p>
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Building2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No colleges found matching your search.</p>
            <Button variant="link" onClick={() => setSearchQuery('')} className="text-cyan-500 mt-2">Clear search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-slate-100 bg-slate-50/30">
            {filteredColleges.map((college, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={college.id} 
                className={`p-5 group hover:bg-white transition-all duration-300 relative ${
                  idx !== filteredColleges.length - 1 ? 'border-b md:border-b-0 border-slate-100' : ''
                } ${
                  idx % 3 !== 2 ? 'lg:border-r lg:border-slate-100' : ''
                } ${
                  idx % 2 !== 1 ? 'md:border-r md:border-slate-100 lg:border-r-0' : ''
                } ${
                  idx < filteredColleges.length - (filteredColleges.length % 3 || 3) ? 'lg:border-b lg:border-slate-100' : ''
                } ${
                  idx < filteredColleges.length - (filteredColleges.length % 2 || 2) ? 'md:border-b md:border-slate-100' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/*
                    The placeholder here was an AI-generated building signed
                    "ALL INDIA INSTITUTE OF MEDICAL SCIENCES, NEW DELHI", shown
                    against every college that has no picture — so the list said
                    AIIMS beside hundreds of rows and read as though a photo had
                    been set. The monogram says plainly that none has.
                  */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <CollegeVisual
                      name={college.college_name}
                      imageUrl={college.image_url}
                      sizes="56px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate mb-1" title={college.college_name}>{college.college_name}</h3>
                    <div className="flex gap-2 items-center mb-2">
                      <Badge variant="outline" className="text-[8px] px-1 py-0 border-cyan-200 text-cyan-600 bg-cyan-50 shrink-0">
                        Order: {college.display_order}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{college.city ? `${college.city}, ` : ''}{college.state}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-[10px] font-black tracking-wide">
                      <Users className="w-3 h-3" />
                      {college.intake} Seats
                    </div>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg shadow-sm border border-slate-200 bg-white hover:bg-slate-50 hover:text-cyan-600"
                    onClick={() => {
                      setSelectedCollege(college);
                      setPreviewUrl(college.image_url);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg shadow-sm border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600"
                    onClick={() => {
                      setSelectedCollege(college);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-0 max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900">Edit College</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Update details for {selectedCollege?.college_name}</p>
            </div>
          </div>
          
          <div className="p-6 space-y-5">
            {selectedCollege && (
              <div className="space-y-4">
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
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</Label>
                    <Input 
                      value={selectedCollege.city || ''}
                      onChange={(e) => setSelectedCollege({...selectedCollege, city: e.target.value})}
                      className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Seats</Label>
                  <Input 
                    type="number" 
                    value={selectedCollege.intake || ''}
                    onChange={(e) => setSelectedCollege({...selectedCollege, intake: parseInt(e.target.value) || 0})}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Display Order</Label>
                  <Input 
                    type="number" 
                    value={selectedCollege.display_order === undefined ? '' : selectedCollege.display_order}
                    onChange={(e) => setSelectedCollege({...selectedCollege, display_order: parseInt(e.target.value) || 0})}
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">College Image</Label>
                  <div className="flex items-center gap-4">
                    {previewUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4 text-white cursor-pointer" onClick={() => {
                            setImageFile(null);
                            setPreviewUrl(null);
                            setSelectedCollege(prev => prev ? { ...prev, image_url: null } : null);
                          }} />
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Label htmlFor="edit-image-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-cyan-600 transition-colors">
                        <ImagePlus className="w-4 h-4" />
                        Change Image
                      </Label>
                      <Input 
                        id="edit-image-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditCollege} disabled={isSaving} className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white">
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
            <h3 className="text-xl font-black text-slate-900">Delete College?</h3>
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

export default GenericCollegeManager;
