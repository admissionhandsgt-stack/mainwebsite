"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { TablesInsert, Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, RefreshCw } from 'lucide-react';

type UgCollege = Tables<'ug_colleges'>;
type State = Tables<'mbbs_states'>;

const emptyCollege: TablesInsert<'ug_colleges'> = {
  college_name: '',
  city: '',
  state: '',
  college_type: 'Government',
  established_year: null,
  short_description: '',
  is_active: true
};

const UgCollegesManager = () => {
  const [colleges, setColleges] = useState<UgCollege[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [formData, setFormData] = useState<TablesInsert<'ug_colleges'>>(emptyCollege);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [collegesRes, statesRes] = await Promise.all([
      supabase.from('ug_colleges').select('*').order('college_name'),
      supabase.from('mbbs_states').select('*').order('name')
    ]);
    setIsLoading(false);

    if (collegesRes.error) {
      setError('Failed to fetch colleges: ' + collegesRes.error.message);
      toast.error('Failed to fetch colleges');
    } else {
      setColleges(collegesRes.data);
    }

    if (statesRes.data) {
      setStates(statesRes.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.college_name || !formData.city || !formData.state || !formData.college_type) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);

    if (editingId !== null) {
      const { error } = await supabase
        .from('ug_colleges')
        .update(formData)
        .eq('id', editingId);
      setIsLoading(false);
      if (error) {
        toast.error('Failed to update college');
        return;
      }
      toast.success('College updated successfully');
    } else {
      const { error } = await supabase
        .from('ug_colleges')
        .insert(formData);
      setIsLoading(false);
      if (error) {
        toast.error('Failed to create college: ' + error.message);
        return;
      }
      toast.success('College created successfully');
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleEdit = (college: UgCollege) => {
    setFormData({
      college_name: college.college_name,
      city: college.city,
      state: college.state,
      college_type: college.college_type,
      established_year: college.established_year,
      short_description: college.short_description,
      is_active: college.is_active,
    });
    setEditingId(college.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete college "${name}"?`)) return;
    setIsLoading(true);
    const { error } = await supabase.from('ug_colleges').delete().eq('id', id);
    setIsLoading(false);
    if (error) {
      toast.error('Failed to delete college');
      return;
    }
    toast.success('College deleted');
    fetchData();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const { error } = await supabase.from('ug_colleges').update({ is_active: !current }).eq('id', id);
    if (error) toast.error('Failed to update status');
    else fetchData();
  };

  const resetForm = () => {
    setFormData(emptyCollege);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
        <div>
          <h2 className="text-xl font-bold">UG State Colleges</h2>
          <p className="text-sm text-gray-500">Manage state-wise MBBS colleges</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add College</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>{editingId ? 'Edit College' : 'Add College'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>College Name *</Label>
                    <Input required value={formData.college_name} onChange={e => setFormData({...formData, college_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Select value={formData.state} onValueChange={(v) => setFormData({...formData, state: v})}>
                      <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                      <SelectContent>
                        {states.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={formData.college_type} onValueChange={(v) => setFormData({...formData, college_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Established Year</Label>
                  <Input type="number" value={formData.established_year || ''} onChange={e => setFormData({...formData, established_year: parseInt(e.target.value) || null})} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.short_description || ''} onChange={e => setFormData({...formData, short_description: e.target.value})} rows={3} />
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={!!formData.is_active} onCheckedChange={(v) => setFormData({...formData, is_active: v})} />
                  <Label>Active</Label>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save College
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3">College</th>
              <th className="px-6 py-3">Location</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{c.college_name}</td>
                <td className="px-6 py-4">{c.city}, {c.state}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.college_type === 'Government' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                    {c.college_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleStatus(c.id, c.is_active)} className={`text-xs px-2 py-1 rounded-full ${c.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(c.id, c.college_name)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {colleges.length === 0 && !isLoading && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No UG colleges found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UgCollegesManager;
