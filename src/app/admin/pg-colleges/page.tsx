"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { PageHeader, Tabs, Button } from '@/components/admin/ui';

function ListSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-100 px-5 py-4">
        <div className="h-4 w-40 rounded bg-slate-100" />
        <div className="h-3 w-72 max-w-full rounded bg-slate-100" />
      </div>
      <div className="space-y-3 p-5">
        <div className="h-10 rounded-lg bg-slate-100" />
        <div className="h-10 rounded-lg bg-slate-100" />
        <div className="h-10 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

const PGCollegeManager = dynamic(
  () => import('@/components/admin/colleges/PGCollegeManager'),
  { loading: () => <ListSkeleton /> }
);

const GenericCollegeManager = dynamic(
  () => import('@/components/admin/colleges/GenericCollegeManager'),
  { loading: () => <ListSkeleton /> }
);

type TabId = 'all' | 'recommended' | 'universities';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All colleges' },
  { id: 'recommended', label: 'Recommended' },
  { id: 'universities', label: 'Deemed' },
];

const PgCollegesPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>('all');
  // Bumped by "Add college"; the open tab's list opens its add form.
  const [addSignal, setAddSignal] = useState(0);

  return (
    <div>
      <PageHeader
        title="PG colleges"
        description="The MD/MS college lists shown on the site. Each tab is a separate list with its own order."
        actions={
          <Button variant="primary" onClick={() => setAddSignal((n) => n + 1)}>
            <Plus className="h-4 w-4" /> Add college
          </Button>
        }
      >
        <Tabs<TabId> items={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      {/* key: a tab switch mounts a fresh list, as the old tab panels did. */}
      {tab === 'all' && <PGCollegeManager key="all" addSignal={addSignal} />}

      {tab === 'recommended' && (
        <GenericCollegeManager
          key="recommended"
          resource="colleges-pg-recommended"
          title="Recommended colleges"
          description="The MD/MS colleges the site recommends. Curated by hand."
          addSignal={addSignal}
        />
      )}

      {tab === 'universities' && (
        <GenericCollegeManager
          key="universities"
          resource="colleges-pg-deemed"
          title="Deemed universities"
          description="Deemed universities for MD/MS admission. Curated by hand."
          addSignal={addSignal}
        />
      )}
    </div>
  );
};

export default PgCollegesPage;
