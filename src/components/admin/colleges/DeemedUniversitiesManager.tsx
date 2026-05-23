"use client";

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeemedUniversities } from '@/hooks/useCollegesData';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, ImagePlus, Plus, Building2, MapPin, Users, Calendar, ShieldCheck, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { DeemedUniversity } from '@/types/colleges';
import { motion, AnimatePresence } from 'framer-motion';

const DeemedUniversitiesManager = () => {
  const { universities, loading, error } = useDeemedUniversities();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUniversity, setSelectedUniversity] = useState<DeemedUniversity | null>(null);
  const [newUniversity, setNewUniversity] = useState<Partial<DeemedUniversity>>({
    name: '',
    location: '',
    seats: 0,
    image_url: ''
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleAddUniversity = async () => {
    if (!newUniversity.name || !newUniversity.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      
      let imageUrl = newUniversity.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800';
      
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('universities')
          .upload(fileName, imageFile);
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: publicUrl } = supabase.storage
          .from('universities')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl.publicUrl;
      }

      // Parse city and state from location input (format: "City, State")
      const locationParts = newUniversity.location.split(',');
      const city = locationParts.length > 1 ? locationParts[0].trim() : '';
      const state = locationParts.length > 1 ? locationParts[1].trim() : locationParts[0].trim();
      const slug = newUniversity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const { error } = await supabase
        .from('deemed_colleges')
        .insert({
          college_name: newUniversity.name,
          slug: slug,
          city: city || null,
          state: state,
          intake: newUniversity.seats || 0,
          image_url: imageUrl,
          source_type: 'deemed_mbbs',
          is_active: true,
          display_order: universities.length + 1
        }) as any;

      if (error) throw error;
      
      toast.success("College added successfully to deemed_colleges");
      setIsAddDialogOpen(false);
      
      // Reset form
      setNewUniversity({
        name: '',
        location: '',
        seats: 0,
        image_url: ''
      });
      setImageFile(null);
      setPreviewUrl(null);
      
      // Refresh page
      window.location.reload();
      
    } catch (err: any) {
      console.error('Error adding college:', err);
      toast.error(`Failed to add college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUniversity = async () => {
    if (!selectedUniversity) return;
    
    if (!selectedUniversity.name || !selectedUniversity.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      
      let imageUrl = selectedUniversity.image_url;
      
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('universities')
          .upload(fileName, imageFile);
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data: publicUrl } = supabase.storage
          .from('universities')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl.publicUrl;
      }

      // Parse city and state from location input (format: "City, State")
      const locationParts = selectedUniversity.location.split(',');
      const city = locationParts.length > 1 ? locationParts[0].trim() : '';
      const state = locationParts.length > 1 ? locationParts[1].trim() : locationParts[0].trim();
      const slug = selectedUniversity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const { error } = await supabase
        .from('deemed_colleges')
        .update({
          college_name: selectedUniversity.name,
          slug: slug,
          city: city || null,
          state: state,
          intake: selectedUniversity.seats,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', parseInt(selectedUniversity.id)) as any;

      if (error) throw error;
      
      toast.success("College updated successfully in deemed_colleges");
      setIsEditDialogOpen(false);
      setSelectedUniversity(null);
      setImageFile(null);
      setPreviewUrl(null);
      
      // Refresh page
      window.location.reload();
      
    } catch (err: any) {
      console.error('Error updating college:', err);
      toast.error(`Failed to update college: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUniversity = async () => {
    if (!selectedUniversity) return;

    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('deemed_colleges')
        .delete()
        .eq('id', parseInt(selectedUniversity.id)) as any;

      if (error) throw error;
      
      toast.success("College deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedUniversity(null);
      
      // Refresh page
      window.location.reload();
      
    } catch (err: any) {
      console.error('Error deleting college:', err);
      toast.error(`Failed to delete college: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter list by search query
  const filteredUniversities = universities.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 p-1">
      {/* Header Panel */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-emerald-500/10 opacity-60 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider">
              Management Portal
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              Deemed Colleges <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Database</span>
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              Create, update, and manage dynamic deemed colleges populated in the public MBBS explorer database.
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full px-6 py-5 shadow-lg shadow-blue-500/20 text-sm font-black transition-all border border-blue-400/20">
                <Plus className="h-4 w-4" />
                <span>Add Deemed College</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950/95 border border-slate-800 text-white backdrop-blur-xl max-w-lg rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-400" />
                  <span>Add New College</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 py-4 text-slate-300">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-bold text-slate-300">College Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Kasturba Medical College"
                    className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                    value={newUniversity.name}
                    onChange={(e) => setNewUniversity({...newUniversity, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-sm font-bold text-slate-300">Location (City, State)</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Manipal, Karnataka"
                    className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                    value={newUniversity.location}
                    onChange={(e) => setNewUniversity({...newUniversity, location: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seats" className="text-sm font-bold text-slate-300">Annual MBBS Intake (Seats)</Label>
                  <Input
                    id="seats"
                    type="number"
                    placeholder="e.g. 250"
                    className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                    value={newUniversity.seats?.toString() || "0"}
                    onChange={(e) => setNewUniversity({...newUniversity, seats: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="image" className="text-sm font-bold text-slate-300">Image URL</Label>
                  <Input
                    id="image"
                    placeholder="https://unsplash.com/..."
                    className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                    value={newUniversity.image_url || ''}
                    onChange={(e) => setNewUniversity({...newUniversity, image_url: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold text-slate-300">Or Upload Image</Label>
                  <div className="flex items-center gap-3">
                    <Label 
                      htmlFor="image-file" 
                      className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800 text-xs font-bold text-slate-400 transition-colors"
                    >
                      <ImagePlus className="h-4 w-4 text-blue-400" />
                      <span>Choose File</span>
                    </Label>
                    <Input
                      id="image-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    {previewUrl && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-10 w-16 overflow-hidden rounded-lg border border-slate-800 shrink-0"
                      >
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4 gap-2">
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-slate-400 hover:text-white rounded-full">Cancel</Button>
                <Button onClick={handleAddUniversity} disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full font-black text-white px-6">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : 'Save College'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Control panel & Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            type="text" 
            placeholder="Search by college name, city or state..." 
            className="pl-11 bg-white border-slate-200 text-slate-900 rounded-xl py-5 focus-visible:ring-blue-500 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Total: {filteredUniversities.length}
          </Badge>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 text-sm font-bold animate-pulse">Fetching deemed colleges database...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex flex-col gap-2">
          <h4 className="font-black text-lg">System Error</h4>
          <p className="text-sm font-medium">Failed to load colleges. Confirm your internet connection or table permissions.</p>
        </div>
      ) : filteredUniversities.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-8">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-700">No colleges matched your search</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Try checking for typos or clear search parameters.</p>
        </div>
      ) : (
        <motion.div 
          layout 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredUniversities.map((university) => (
              <motion.div
                layout
                key={university.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="group relative flex flex-col bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 h-full"
              >
                {/* Visual Top Bar Banner */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
                  <img 
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    src={university.image_url} 
                    alt={university.name} 
                  />
                  <div className="absolute top-4 right-4 z-20">
                    <Badge className="bg-slate-950/70 border border-slate-700 text-slate-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                      Seats: {university.seats}
                    </Badge>
                  </div>
                </div>

                {/* College Info */}
                <div className="p-6 flex flex-col flex-grow space-y-4">
                  <div className="space-y-2 flex-grow">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-tight">
                      {university.name}
                    </h3>
                    <div className="flex items-center text-xs font-bold text-slate-500">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" />
                      <span>{university.location}</span>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                      ID: {university.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedUniversity(university);
                          setPreviewUrl(null);
                          setImageFile(null);
                          setIsEditDialogOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-9 w-9 p-0 rounded-full"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedUniversity(university);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 w-9 p-0 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-950/95 border border-slate-800 text-white backdrop-blur-xl max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Pencil className="h-6 w-6 text-blue-400" />
              <span>Edit College Details</span>
            </DialogTitle>
          </DialogHeader>
          {selectedUniversity && (
            <div className="grid gap-5 py-4 text-slate-300">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-sm font-bold text-slate-300">College Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUniversity.name}
                  onChange={(e) => setSelectedUniversity({...selectedUniversity, name: e.target.value})}
                  className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-location" className="text-sm font-bold text-slate-300">Location (City, State)</Label>
                <Input
                  id="edit-location"
                  value={selectedUniversity.location}
                  onChange={(e) => setSelectedUniversity({...selectedUniversity, location: e.target.value})}
                  className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-seats" className="text-sm font-bold text-slate-300">Annual MBBS Intake (Seats)</Label>
                <Input
                  id="edit-seats"
                  type="number"
                  value={selectedUniversity.seats}
                  onChange={(e) => setSelectedUniversity({...selectedUniversity, seats: parseInt(e.target.value) || 0})}
                  className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-image-url" className="text-sm font-bold text-slate-300">Image URL</Label>
                <Input
                  id="edit-image-url"
                  value={selectedUniversity.image_url}
                  onChange={(e) => setSelectedUniversity({...selectedUniversity, image_url: e.target.value})}
                  className="bg-slate-900 border-slate-800 text-white rounded-xl py-5 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-slate-300">Or Upload New Image</Label>
                <div className="flex items-center gap-3">
                  <Label 
                    htmlFor="edit-image-file" 
                    className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800 text-xs font-bold text-slate-400 transition-colors"
                  >
                    <ImagePlus className="h-4 w-4 text-blue-400" />
                    <span>Choose File</span>
                  </Label>
                  <Input
                    id="edit-image-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {previewUrl ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-10 w-16 overflow-hidden rounded-lg border border-slate-800 shrink-0"
                    >
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </motion.div>
                  ) : (
                    <div className="h-10 w-16 overflow-hidden rounded-lg border border-slate-800 shrink-0">
                      <img src={selectedUniversity.image_url} alt="Current" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-slate-400 hover:text-white rounded-full">Cancel</Button>
            <Button onClick={handleEditUniversity} disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full font-black text-white px-6">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : 'Update College'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-slate-950 border border-slate-800 text-white backdrop-blur-xl rounded-3xl p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Are you sure you want to delete <span className="text-white font-bold">{selectedUniversity?.name}</span>? This college will be immediately removed from the deemed colleges database.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="text-slate-400 hover:text-white rounded-full">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUniversity} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-500 text-white rounded-full px-6 font-bold">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeemedUniversitiesManager;
