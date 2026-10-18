"use client";

import { useEffect, useState } from 'react';
import AlertForm from '@/components/admin/alerts/AlertForm';
import AlertList from '@/components/admin/alerts/AlertList';
import { useLiveAlerts } from '@/hooks/useLiveAlerts';
import { Loader2, Bell, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge, Button, Card, Drawer, EmptyState, Notice, PageHeader } from '@/components/admin/ui';

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
  const hiddenCount = alerts.length - activeCount;

  const wrappedHandleSubmit = async (e: React.FormEvent) => {
    await handleSubmit(e);
    setAddDialogOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Live alerts"
        description="The scrolling notice bar at the top of the site. Notices from official boards are added automatically; add your own here."
        actions={
          <>
            <Button variant="secondary" onClick={() => fetchAlerts()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add alert
            </Button>
          </>
        }
      />

      {error && (
        <Notice
          tone="danger"
          icon={AlertTriangle}
          title="Alerts did not load"
          className="mb-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => fetchAlerts()} disabled={isLoading}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      {isLoading && alerts.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500" aria-busy="true">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          Loading alerts…
        </div>
      ) : alerts.length === 0 ? (
        !error && (
          <Card>
            <EmptyState
              icon={Bell}
              title="No alerts yet"
              hint="Add one and it appears in the notice bar at the top of every page."
              action={
                <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add alert
                </Button>
              }
            />
          </Card>
        )
      ) : (
        <Card
          flush
          title="On the site"
          actions={
            <>
              <Badge tone="success">{activeCount} live</Badge>
              {hiddenCount > 0 && <Badge>{hiddenCount} hidden</Badge>}
            </>
          }
        >
          <AlertList
            alerts={alerts}
            onToggleActive={toggleActive}
            onEdit={startEdit}
            onDelete={deleteAlert}
          />
        </Card>
      )}

      {/* New alert */}
      <Drawer open={addDialogOpen} title="New alert" onClose={() => setAddDialogOpen(false)}>
        <AlertForm
          alert={newAlert}
          onSubmit={wrappedHandleSubmit}
          onChange={handleFormChange}
          onCancel={() => setAddDialogOpen(false)}
        />
      </Drawer>

      {/* Edit alert — closes itself once the hook clears editingAlert after a save */}
      <Drawer open={isEditing && !!editingAlert} title="Edit alert" onClose={cancelEdit}>
        {editingAlert && (
          <AlertForm
            alert={editingAlert}
            onSubmit={handleUpdate}
            onChange={handleEditFormChange}
            isEditing={true}
            onCancel={cancelEdit}
          />
        )}
      </Drawer>
    </div>
  );
};

export default LiveAlertsManager;
