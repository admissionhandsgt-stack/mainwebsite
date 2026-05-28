"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Map, Plus, Pencil, Trash2, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type MBBSState = Tables<'mbbs_states'>;

const emptyState: TablesInsert<'mbbs_states'> = {
  name: '',
  slug: '',
  image_url: '',
  colleges_count: 0,
  content: '',
  is_active: true
};

const MBBSStateManager = () => {
  const [states, setStates] = useState<MBBSState[]>([]);
  const [formData, setFormData] = useState<TablesInsert<'mbbs_states'>>(emptyState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('mbbs_states')
      .select('*')
      .order('name');
    setIsLoading(false);

    if (error) {
      setError('Failed to fetch states');
      toast.error('Failed to fetch states');
      return;
    }
    if (data) setStates(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and Slug are required');
      return;
    }

    setIsLoading(true);

    if (editingId !== null) {
      // Update
      const { error } = await supabase
        .from('mbbs_states')
        .update(formData)
        .eq('id', editingId);
      setIsLoading(false);
      if (error) {
        toast.error('Failed to update state');
        return;
      }
      toast.success('State updated successfully');
    } else {
      // Insert
      const { error } = await supabase
        .from('mbbs_states')
        .insert(formData)
        .select()
        .single();
      setIsLoading(false);
      if (error) {
        toast.error('Failed to create state');
        return;
      }
      toast.success('State created successfully');
    }

    setDialogOpen(false);
    resetForm();
    fetchStates();
  };

  const handleEdit = (state: MBBSState) => {
    setFormData({
      name: state.name,
      slug: state.slug,
      image_url: state.image_url || '',
      colleges_count: state.colleges_count || 0,
      content: state.content || '',
      is_active: state.is_active ?? true,
    });
    setEditingId(state.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete state "${name}"? This cannot be undone.`)) return;
    setIsLoading(true);
    const { error } = await supabase.from('mbbs_states').delete().eq('id', id);
    setIsLoading(false);
    if (error) {
      toast.error('Failed to delete state');
      return;
    }
    toast.success('State deleted');
    fetchStates();
  };

  const toggleStatus = async (id: number, current: boolean) => {
    const { error } = await supabase
      .from('mbbs_states')
      .update({ is_active: !current })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    fetchStates();
  };

  const resetForm = () => {
    setFormData(emptyState);
    setEditingId(null);
  };

  const activeCount = states.filter(s => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MBBS States</h1>
          <p className="text-sm text-gray-500 mt-1">Manage Indian states shown on the MBBS India page</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchStates} disabled={isLoading} className="rounded-xl border-gray-200">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 border-0 shadow-md shadow-medical-500/20">
                <Plus className="h-4 w-4 mr-2" />
                Add State
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingId ? 'Edit State' : 'Add New State'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">State Name *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: editingId ? formData.slug : e.target.value.toLowerCase().replace(/\s+/g, '-')
                      })}
                      placeholder="e.g. Maharashtra"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g. maharashtra"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="colleges_count">Number of Colleges</Label>
                  <Input
                    id="colleges_count"
                    type="number"
                    value={formData.colleges_count || 0}
                    onChange={(e) => setFormData({ ...formData, colleges_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="content">Content / Description</Label>
                  <Textarea
                    id="content"
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    placeholder="Brief description of MBBS opportunities in this state..."
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Switch
                    id="is_active"
                    checked={!!formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">Active (visible on website)</Label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isLoading} className="flex-1 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 border-0">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingId ? 'Save Changes' : 'Create State'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-xl">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total States', value: states.length, icon: Map, color: 'text-medical-600 bg-medical-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Inactive', value: states.length - activeCount, icon: XCircle, color: 'text-gray-500 bg-gray-50' },
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

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* States Grid */}
      {isLoading && states.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-400" />
          <p className="text-gray-500 text-sm">Loading states...</p>
        </div>
      ) : states.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200">
          <Map className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No states added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {states.map((state, i) => (
              <motion.div
                key={state.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {state.image_url && (
                  <div className="h-32 overflow-hidden">
                    <img src={state.image_url} alt={state.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className={`h-1 ${state.is_active ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{state.name}</h3>
                      <p className="text-xs text-gray-400 font-mono">{state.slug}</p>
                    </div>
                    <button
                      onClick={() => toggleStatus(state.id, !!state.is_active)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${
                        state.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {state.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {state.colleges_count !== null && (
                    <p className="text-sm text-gray-600 mb-3">{state.colleges_count} colleges</p>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(state)}
                      className="flex-1 rounded-lg text-xs border-gray-200 hover:border-medical-300 hover:text-medical-600"
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(state.id, state.name)}
                      disabled={isLoading}
                      className="rounded-lg text-xs border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default MBBSStateManager;
