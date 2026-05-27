"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenericCollegeManager from '@/components/admin/colleges/GenericCollegeManager';
import { GraduationCap, Shield, MapPin } from 'lucide-react';

const CollegesManager: React.FC = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">UG Colleges Management</h1>
      </div>

      <Tabs defaultValue="recommended">
        <TabsList className="grid w-full lg:w-[600px] grid-cols-3 mb-8">
          <TabsTrigger value="recommended" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Recommended</span>
          </TabsTrigger>
          <TabsTrigger value="universities" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Deemed</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">All Colleges</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recommended">
          <GenericCollegeManager 
            tableName="ug_recommended_colleges" 
            title="UG Recommended Colleges" 
            description="Manage the list of highly recommended MBBS colleges shown on the frontend." 
          />
        </TabsContent>

        <TabsContent value="universities">
          <GenericCollegeManager 
            tableName="deemed_colleges" 
            title="UG Deemed Colleges" 
            description="Manage deemed universities for MBBS admissions." 
          />
        </TabsContent>
        
        <TabsContent value="all">
          <GenericCollegeManager 
            tableName="ug_all_colleges" 
            title="UG All Colleges" 
            description="Manage the comprehensive database of all UG MBBS colleges." 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollegesManager;
