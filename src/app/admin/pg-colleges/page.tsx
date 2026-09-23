"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Shield, MapPin } from 'lucide-react';

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

const GenericCollegeManager = dynamic(
  () => import('@/components/admin/colleges/GenericCollegeManager'),
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">PG Colleges Management</h1>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full lg:w-[600px] grid-cols-3 mb-8">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">All Colleges</span>
          </TabsTrigger>
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Recommended</span>
          </TabsTrigger>
          <TabsTrigger value="universities" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Deemed</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <PGCollegeManager />
        </TabsContent>

        <TabsContent value="recommended">
          <GenericCollegeManager 
            resource="colleges-pg-recommended" 
            title="PG Recommended Colleges" 
            description="Manage the list of highly recommended PG MD/MS colleges shown on the frontend." 
          />
        </TabsContent>

        <TabsContent value="universities">
          <GenericCollegeManager 
            resource="colleges-pg-deemed" 
            title="PG Deemed Colleges" 
            description="Manage deemed universities for PG MD/MS admissions." 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PgCollegesPage;
