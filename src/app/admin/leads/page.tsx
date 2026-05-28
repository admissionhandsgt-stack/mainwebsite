"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  RefreshCw, 
  Inbox, 
  Search, 
  CheckSquare, 
  AlertCircle, 
  Phone, 
  Mail, 
  Award, 
  MapPin, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface PGLead {
  id: string;
  name: string;
  phone: string;
  rank: number | null;
  preferred_branch: string | null;
  preferred_state: string | null;
  quota_interest: string | null;
  internship_status: string | null;
  source_page: string;
  lead_status: string;
  is_read: boolean;
  created_at: string;
}

interface GenericLead {
  id: string;
  name: string;
  phone: string;
  rank: string | null;
  source: string | null;
  is_read: boolean;
  created_at: string;
}

export default function LeadsManager() {
  const [activeTab, setActiveTab] = useState<'pg' | 'generic'>('pg');
  const [pgLeads, setPgLeads] = useState<PGLead[]>([]);
  const [genericLeads, setGenericLeads] = useState<GenericLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected lead for detail modal
  const [selectedPgLead, setSelectedPgLead] = useState<PGLead | null>(null);
  const [selectedGenericLead, setSelectedGenericLead] = useState<GenericLead | null>(null);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch PG Leads (latest first)
      const { data: pgData, error: pgError } = await (supabase as any)
        .from('pg_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (pgError) {
        console.warn('Could not load pg_leads table. Falling back to empty array.', pgError.message);
      } else if (pgData) {
        setPgLeads(pgData as unknown as PGLead[]);
      }

      // 2. Fetch Generic Leads (latest first)
      const { data: genData, error: genError } = await (supabase as any)
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (genError) {
        console.warn('Could not load leads table. Falling back to empty array.', genError.message);
      } else if (genData) {
        setGenericLeads(genData as unknown as GenericLead[]);
      }
    } catch (err: any) {
      console.error('Unexpected error loading leads:', err);
      toast.error('Failed to load leads from database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Mark PG Lead as Read/Unread
  const togglePgLeadReadStatus = async (leadId: string, currentStatus: boolean, closeDialog = false) => {
    try {
      const { error } = await (supabase as any)
        .from('pg_leads')
        .update({ is_read: !currentStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Update state locally
      setPgLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, is_read: !currentStatus } : lead
      ));

      if (selectedPgLead && selectedPgLead.id === leadId) {
        setSelectedPgLead(prev => prev ? { ...prev, is_read: !currentStatus } : null);
      }

      toast.success(currentStatus ? 'Marked lead as unread' : 'Marked lead as read');
      if (closeDialog) {
        setSelectedPgLead(null);
      }
    } catch (err: any) {
      console.error('Error updating read status:', err);
      toast.error('Failed to update read status');
    }
  };

  // Mark Generic Lead as Read/Unread
  const toggleGenericLeadReadStatus = async (leadId: string, currentStatus: boolean, closeDialog = false) => {
    try {
      const { error } = await (supabase as any)
        .from('leads')
        .update({ is_read: !currentStatus })
        .eq('id', leadId);

      if (error) throw error;

      // Update state locally
      setGenericLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, is_read: !currentStatus } : lead
      ));

      if (selectedGenericLead && selectedGenericLead.id === leadId) {
        setSelectedGenericLead(prev => prev ? { ...prev, is_read: !currentStatus } : null);
      }

      toast.success(currentStatus ? 'Marked lead as unread' : 'Marked lead as read');
      if (closeDialog) {
        setSelectedGenericLead(null);
      }
    } catch (err: any) {
      console.error('Error updating read status:', err);
      toast.error('Failed to update read status');
    }
  };

  // Delete PG Lead
  const deletePgLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const { error } = await (supabase as any)
        .from('pg_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setPgLeads(prev => prev.filter(lead => lead.id !== leadId));
      setSelectedPgLead(null);
      toast.success('Lead deleted successfully');
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      toast.error('Failed to delete lead');
    }
  };

  // Delete Generic Lead
  const deleteGenericLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const { error } = await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setGenericLeads(prev => prev.filter(lead => lead.id !== leadId));
      setSelectedGenericLead(null);
      toast.success('Lead deleted successfully');
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      toast.error('Failed to delete lead');
    }
  };

  // Handle row click: Open details & automatically mark as read
  const handleOpenPgLead = (lead: PGLead) => {
    setSelectedPgLead(lead);
    if (!lead.is_read) {
      togglePgLeadReadStatus(lead.id, false);
    }
  };

  const handleOpenGenericLead = (lead: GenericLead) => {
    setSelectedGenericLead(lead);
    if (!lead.is_read) {
      toggleGenericLeadReadStatus(lead.id, false);
    }
  };

  // Filtering leads based on search query
  const filteredPgLeads = pgLeads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lead.phone.includes(searchQuery) ||
    (lead.preferred_branch && lead.preferred_branch.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (lead.rank && String(lead.rank).includes(searchQuery))
  );

  const filteredGenericLeads = genericLeads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lead.phone.includes(searchQuery) ||
    (lead.source && lead.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (lead.rank && String(lead.rank).includes(searchQuery))
  );

  // Statistics
  const totalPgUnread = pgLeads.filter(l => !l.is_read).length;
  const totalGenericUnread = genericLeads.filter(l => !l.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads & Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Review admissions intake callbacks and inquiries</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLeads}
          disabled={isLoading}
          className="rounded-xl border-gray-200 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Lists
        </Button>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-gray-200 pb-px">
        <button
          onClick={() => { setActiveTab('pg'); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === 'pg' 
              ? 'border-medical-500 text-medical-600' 
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          PG Advisory Callback Leads
          {totalPgUnread > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-150 text-red-700 rounded-full font-black">
              {totalPgUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('generic'); setSearchQuery(''); }}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === 'generic' 
              ? 'border-medical-500 text-medical-600' 
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Generic Website Leads
          {totalGenericUnread > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-150 text-red-700 rounded-full font-black">
              {totalGenericUnread}
            </span>
          )}
        </button>
      </div>

      {/* Filter and Search */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400 group-focus-within:text-medical-500 transition-colors" />
        <Input
          placeholder="Search by name, phone, rank, or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-11 bg-white/50 border-gray-200 focus:border-medical-500 focus:ring-medical-500/20 rounded-xl h-11"
        />
      </div>

      {/* Leads List rendering */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-500" />
          <p className="text-gray-500 text-sm">Querying database logs...</p>
        </div>
      ) : activeTab === 'pg' ? (
        // Render PG Leads
        filteredPgLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-semibold">No PG Leads Found</p>
            <p className="text-xs text-gray-400 mt-1">Queries submitted on the PG MD/MS page will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {filteredPgLeads.map((lead, idx) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleOpenPgLead(lead)}
                  className={`border transition-all duration-300 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    lead.is_read 
                      ? 'bg-white/60 border-gray-100 hover:border-gray-200' 
                      : 'bg-blue-50/20 border-blue-100 hover:border-blue-200/80 shadow-md shadow-blue-50/5'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate max-w-xs">{lead.name}</h3>
                      {!lead.is_read && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 rounded-md">
                          New
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(lead.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {lead.phone}
                      </span>
                      {lead.rank && (
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <Award className="w-3.5 h-3.5 text-blue-500" />
                          Rank: AIR {lead.rank.toLocaleString()}
                        </span>
                      )}
                      {lead.preferred_branch && (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-lg font-bold">
                          {lead.preferred_branch}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        togglePgLeadReadStatus(lead.id, lead.is_read); 
                      }}
                      className="rounded-xl h-9 hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                    >
                      {lead.is_read ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
                      {lead.is_read ? 'Mark Unread' : 'Mark Read'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        deletePgLead(lead.id); 
                      }}
                      className="rounded-xl h-9 hover:bg-red-50 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      ) : (
        // Render Generic Leads
        filteredGenericLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200 text-center">
            <Inbox className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-semibold">No Website Leads Found</p>
            <p className="text-xs text-gray-400 mt-1">Contact forms and generic leads will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {filteredGenericLeads.map((lead, idx) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleOpenGenericLead(lead)}
                  className={`border transition-all duration-300 rounded-2xl p-5 shadow-sm hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    lead.is_read 
                      ? 'bg-white/60 border-gray-100 hover:border-gray-200' 
                      : 'bg-blue-50/20 border-blue-100 hover:border-blue-200/80 shadow-md shadow-blue-50/5'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate max-w-xs">{lead.name}</h3>
                      {!lead.is_read && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 rounded-md">
                          New
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(lead.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {lead.phone}
                      </span>
                      {lead.rank && (
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-gray-400" />
                          Rank: {lead.rank}
                        </span>
                      )}
                      {lead.source && (
                        <span className="text-[10.5px] text-slate-450 italic max-w-md truncate">
                          Source: {lead.source}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        toggleGenericLeadReadStatus(lead.id, lead.is_read); 
                      }}
                      className="rounded-xl h-9 hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                    >
                      {lead.is_read ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
                      {lead.is_read ? 'Mark Unread' : 'Mark Read'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        deleteGenericLead(lead.id); 
                      }}
                      className="rounded-xl h-9 hover:bg-red-50 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      {/* PG Lead Details Dialog */}
      <Dialog open={selectedPgLead !== null} onOpenChange={(open) => !open && setSelectedPgLead(null)}>
        {selectedPgLead && (
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader className="border-b border-gray-100 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🩺 PG Advisory Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100/50">
                <div className="col-span-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Full Name</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedPgLead.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Mobile Number</span>
                  <a href={`tel:${selectedPgLead.phone}`} className="font-bold text-medical-600 hover:underline text-xs flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {selectedPgLead.phone}
                  </a>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">NEET PG Rank</span>
                  <span className="font-bold text-gray-900 text-xs flex items-center gap-1 mt-0.5">
                    <Award className="w-3.5 h-3.5 text-blue-500" />
                    {selectedPgLead.rank ? `AIR ${selectedPgLead.rank.toLocaleString()}` : 'Not Provided'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Preferred Specialty:</span>
                  <span className="text-xs font-bold text-gray-900">{selectedPgLead.preferred_branch || 'Not Specified'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Preferred States:</span>
                  <span className="text-xs font-bold text-gray-900 max-w-[200px] text-right truncate" title={selectedPgLead.preferred_state || ''}>
                    {selectedPgLead.preferred_state || 'Not Specified'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Counselling Quota:</span>
                  <span className="text-xs font-bold text-gray-900">{selectedPgLead.quota_interest || 'Not Specified'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Internship Status:</span>
                  <span className="text-xs font-bold text-gray-900">{selectedPgLead.internship_status || 'Not Specified'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Source Page:</span>
                  <span className="text-xs font-bold text-gray-900">{selectedPgLead.source_page}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Submitted On:</span>
                  <span className="text-xs font-bold text-gray-900">{new Date(selectedPgLead.created_at).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 pt-4 mt-6">
              <Button
                onClick={() => togglePgLeadReadStatus(selectedPgLead.id, selectedPgLead.is_read, true)}
                className="flex-1 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 border-0 hover:from-medical-700 hover:to-medical-600"
              >
                <Check className="w-4 h-4 mr-2" />
                {selectedPgLead.is_read ? 'Mark Unread' : 'Mark Read'}
              </Button>
              <Button
                variant="outline"
                onClick={() => deletePgLead(selectedPgLead.id)}
                className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Generic Lead Details Dialog */}
      <Dialog open={selectedGenericLead !== null} onOpenChange={(open) => !open && setSelectedGenericLead(null)}>
        {selectedGenericLead && (
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader className="border-b border-gray-100 pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                📋 Website Lead Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-100/50">
                <div className="col-span-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Full Name</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedGenericLead.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Mobile Number</span>
                  <a href={`tel:${selectedGenericLead.phone}`} className="font-bold text-medical-600 hover:underline text-xs flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {selectedGenericLead.phone}
                  </a>
                </div>
                {selectedGenericLead.rank && (
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">NEET Rank</span>
                    <span className="font-bold text-gray-900 text-xs flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5 text-gray-500" />
                      {selectedGenericLead.rank}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 px-1">
                {selectedGenericLead.source && (
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-2">
                    <span className="text-xs text-gray-500 font-medium">Source / Parameters:</span>
                    <span className="text-xs font-semibold text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {selectedGenericLead.source}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs text-gray-500 font-medium">Submitted On:</span>
                  <span className="text-xs font-bold text-gray-900">{new Date(selectedGenericLead.created_at).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 pt-4 mt-6">
              <Button
                onClick={() => toggleGenericLeadReadStatus(selectedGenericLead.id, selectedGenericLead.is_read, true)}
                className="flex-1 rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 border-0 hover:from-medical-700 hover:to-medical-600"
              >
                <Check className="w-4 h-4 mr-2" />
                {selectedGenericLead.is_read ? 'Mark Unread' : 'Mark Read'}
              </Button>
              <Button
                variant="outline"
                onClick={() => deleteGenericLead(selectedGenericLead.id)}
                className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
