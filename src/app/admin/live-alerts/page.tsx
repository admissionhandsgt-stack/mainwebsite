"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AlertForm from '@/components/admin/alerts/AlertForm';
import AlertList from '@/components/admin/alerts/AlertList';
import { useLiveAlerts } from '@/hooks/useLiveAlerts';
import { Loader2, Bell, Plus, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const LiveAlertsManager = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const {
    alerts,
    newAlert,
    editingAlert,
    isEditing,
    error,
    isLoading,
    handleSubmit,
    handleUpdate,
    toggleActive,
    deleteAlert,
    handleFormChange,
    handleEditFormChange,
    resetForm,
    fetchAlerts,
    startEdit,
    cancelEdit
  } = useLiveAlerts();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const activeCount = alerts.filter(a => a.is_active).length;

  const wrappedHandleSubmit = async (e: React.FormEvent) => {
    await handleSubmit(e);
    setAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage real-time notification banners shown to visitors</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAlerts()}
            disabled={isLoading}
            className="rounded-xl border-gray-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-medical-600 to-medical-500 hover:from-medical-700 hover:to-medical-600 border-0 shadow-md shadow-medical-500/20">
                <Plus className="h-4 w-4 mr-2" />
                Add Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create New Alert</DialogTitle>
              </DialogHeader>
              <AlertForm
                alert={newAlert}
                onSubmit={wrappedHandleSubmit}
                onChange={handleFormChange}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Alerts', value: alerts.length, icon: Bell, color: 'text-medical-600 bg-medical-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Inactive', value: alerts.length - activeCount, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Edit Form (inline) */}
      {isEditing && editingAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-md border border-medical-100 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Edit Alert</h2>
            <Button variant="ghost" size="sm" onClick={cancelEdit} className="rounded-xl">
              Cancel
            </Button>
          </div>
          <AlertForm
            alert={editingAlert}
            onSubmit={handleUpdate}
            onChange={handleEditFormChange}
            isEditing={true}
          />
        </motion.div>
      )}

      {/* Alert List */}
      {isLoading && alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-medical-400" />
          <p className="text-gray-500 text-sm">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-2xl border border-dashed border-gray-200">
          <Bell className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No alerts yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first alert to show it on the website</p>
        </div>
      ) : (
        <AlertList
          alerts={alerts}
          onToggleActive={toggleActive}
          onEdit={startEdit}
          onDelete={deleteAlert}
        />
      )}
    </div>
  );
};

export default LiveAlertsManager;
