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

const GenericCollegeManager = dynamic(
  () => import('@/components/admin/colleges/GenericCollegeManager'),
  { loading: () => <ListSkeleton /> }
);

type TabId = 'recommended' | 'universities' | 'all';

/** Each tab is its own table; the manager is the same component pointed at a different resource. */
const LISTS: Record<TabId, { resource: string; title: string; description: string }> = {
  recommended: {
    resource: 'colleges-recommended',
    title: 'Recommended colleges',
    description: 'The MBBS colleges the site recommends.',
  },
  universities: {
    resource: 'colleges-deemed',
    title: 'Deemed universities',
    description: 'Deemed universities for MBBS admission.',
  },
  all: {
    resource: 'colleges-ug',
    title: 'All UG colleges',
    description: 'The full list of UG MBBS colleges.',
  },
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'universities', label: 'Deemed' },
  { id: 'all', label: 'All colleges' },
];

const CollegesManager: React.FC = () => {
  const [tab, setTab] = useState<TabId>('recommended');
  // Bumped by "Add college"; the open tab's list opens its add form.
  const [addSignal, setAddSignal] = useState(0);
  const list = LISTS[tab];

  return (
    <div>
      <PageHeader
        title="UG colleges"
        description="The MBBS college lists shown on the site. Each tab is a separate list with its own order."
        actions={
          <Button variant="primary" onClick={() => setAddSignal((n) => n + 1)}>
            <Plus className="h-4 w-4" /> Add college
          </Button>
        }
      >
        <Tabs<TabId> items={TABS} value={tab} onChange={setTab} />
      </PageHeader>

      {/* key: a tab switch mounts a fresh list, as the old tab panels did. */}
      <GenericCollegeManager
        key={tab}
        resource={list.resource}
        title={list.title}
        description={list.description}
        addSignal={addSignal}
      />
    </div>
  );
};

export default CollegesManager;
