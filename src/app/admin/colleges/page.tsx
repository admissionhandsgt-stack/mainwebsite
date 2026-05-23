"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecommendedCollegesManager from '@/components/admin/colleges/RecommendedCollegesManager';
import DeemedUniversitiesManager from '@/components/admin/colleges/DeemedUniversitiesManager';
import UgCollegesManager from '@/components/admin/colleges/UgCollegesManager';
import { GraduationCap, Shield, MapPin } from 'lucide-react';

const CollegesManager: React.FC = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Colleges Management</h1>
      </div>

      <Tabs defaultValue="recommended">
        <TabsList className="grid w-full lg:w-[600px] grid-cols-3 mb-8">
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Recommended</span>
          </TabsTrigger>
          <TabsTrigger value="ug-state" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">State (UG)</span>
          </TabsTrigger>
          <TabsTrigger value="universities" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Deemed Univ</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommended">
          <RecommendedCollegesManager />
        </TabsContent>

        <TabsContent value="ug-state">
          <UgCollegesManager />
        </TabsContent>
        
        <TabsContent value="universities">
          <DeemedUniversitiesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollegesManager;
