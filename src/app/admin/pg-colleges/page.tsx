"use client";

import React from 'react';
import dynamic from 'next/dynamic';

const PGCollegeManager = dynamic(
  () => import('@/components/admin/colleges/PGCollegeManager'),
  {
    loading: () => (
      <div className="space-y-4 animate-pulse p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    ),
  }
);

const PgCollegesPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <PGCollegeManager />
    </div>
  );
};

export default PgCollegesPage;
