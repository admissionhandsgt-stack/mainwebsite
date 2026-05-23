"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, MapPin, ThumbsUp, ExternalLink } from 'lucide-react';

interface College {
  id: number;
  name: string;
  location: string;
  fees: string;
  rating: number;
  type: 'government' | 'private' | 'deemed';
  image: string;
  neetCutoff: string;
  seats: number;
  recognition: string[];
}

const collegesList: College[] = [
  {
    id: 1,
    name: 'Kasturba Medical College',
    location: 'Manipal, Karnataka',
    fees: '₹25-30 Lakhs/year',
    rating: 4.7,
    type: 'private',
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '500-550',
    seats: 25,
    recognition: ['NMC', 'WHO', 'FAIMER']
  },
  {
    id: 2,
    name: 'CMC Vellore',
    location: 'Vellore, Tamil Nadu',
    fees: '₹20-25 Lakhs/year',
    rating: 4.9,
    type: 'private',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '600+',
    seats: 15,
    recognition: ['NMC', 'WHO', 'FAIMER', 'NAAC A++']
  },
  {
    id: 3,
    name: 'AIIMS Delhi',
    location: 'New Delhi',
    fees: '₹15-20 Lakhs/year',
    rating: 5.0,
    type: 'government',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '650+',
    seats: 7,
    recognition: ['NMC', 'WHO', 'FAIMER', 'NAAC A++']
  },
  {
    id: 4,
    name: 'DY Patil Medical College',
    location: 'Pune, Maharashtra',
    fees: '₹20-25 Lakhs/year',
    rating: 4.5,
    type: 'deemed',
    image: 'https://images.unsplash.com/photo-1631248055158-edec7a3c072c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '500-550',
    seats: 30,
    recognition: ['NMC', 'WHO', 'FAIMER']
  },
  {
    id: 5,
    name: 'KMC Mangalore',
    location: 'Mangalore, Karnataka',
    fees: '₹25-30 Lakhs/year',
    rating: 4.6,
    type: 'private',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '520-570',
    seats: 20,
    recognition: ['NMC', 'WHO', 'FAIMER']
  },
  {
    id: 6,
    name: 'Seth GS Medical College',
    location: 'Mumbai, Maharashtra',
    fees: '₹15-20 Lakhs/year',
    rating: 4.8,
    type: 'government',
    image: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '580-630',
    seats: 10,
    recognition: ['NMC', 'WHO', 'FAIMER', 'NAAC A+']
  },
  {
    id: 7,
    name: 'Jawaharlal Nehru Medical College',
    location: 'Belgaum, Karnataka',
    fees: '₹18-22 Lakhs/year',
    rating: 4.4,
    type: 'private',
    image: 'https://images.unsplash.com/photo-1551601651-2a8c6c4d0c05?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '500-540',
    seats: 15,
    recognition: ['NMC', 'WHO', 'FAIMER']
  },
  {
    id: 8,
    name: 'St. John\'s Medical College',
    location: 'Bangalore, Karnataka',
    fees: '₹22-28 Lakhs/year',
    rating: 4.6,
    type: 'private',
    image: 'https://images.unsplash.com/photo-1581360742512-021d5b2157d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80',
    neetCutoff: '540-580',
    seats: 12,
    recognition: ['NMC', 'WHO', 'FAIMER', 'NAAC A']
  }
];

const NRICollegesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const getFilteredColleges = () => {
    let filtered = collegesList;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(college => 
        college.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        college.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(college => college.type === activeTab);
    }
    
    return filtered;
  };
  
  const filteredColleges = getFilteredColleges();

  return (
    <div className="flex flex-col">
      <div className="flex-grow">
        <section className="bg-gradient-to-r from-medical-50 to-teal-50 py-16">
          <div className="container-custom">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
                Top Medical Colleges with NRI Quota
              </h1>
              <p className="text-xl text-gray-700 text-center mb-8">
                Explore the best medical institutions offering seats under NRI quota across India
              </p>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by college name or location..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl shadow-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-medical-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-white">
          <div className="container-custom">
            <Tabs 
              defaultValue="all" 
              className="mb-8"
              onValueChange={setActiveTab}
            >
              <TabsList className="w-full max-w-2xl mx-auto grid grid-cols-4 mb-8">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-medical-100 data-[state=active]:text-medical-800"
                >
                  All Colleges
                </TabsTrigger>
                <TabsTrigger 
                  value="government" 
                  className="data-[state=active]:bg-medical-100 data-[state=active]:text-medical-800"
                >
                  Government
                </TabsTrigger>
                <TabsTrigger 
                  value="private" 
                  className="data-[state=active]:bg-medical-100 data-[state=active]:text-medical-800"
                >
                  Private
                </TabsTrigger>
                <TabsTrigger 
                  value="deemed" 
                  className="data-[state=active]:bg-medical-100 data-[state=active]:text-medical-800"
                >
                  Deemed
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value={activeTab} className="mt-0">
                {filteredColleges.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xl text-gray-600">No colleges found matching your search.</p>
                    <Button 
                      className="mt-4 bg-medical-500 hover:bg-medical-600 text-white" 
                      onClick={() => {
                        setSearchTerm('');
                        setActiveTab('all');
                      }}
                    >
                      Reset Search
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredColleges.map(college => (
                      <div key={college.id} className="bg-white rounded-xl shadow-md hover:shadow-lg overflow-hidden transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={college.image} 
                            alt={college.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold">{college.name}</h3>
                            <span className="bg-medical-100 text-medical-800 text-xs px-2 py-1 rounded-full uppercase">
                              {college.type}
                            </span>
                          </div>
                          
                          <div className="flex items-center mb-3 text-gray-600">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="text-sm">{college.location}</span>
                          </div>
                          
                          <div className="flex items-center mb-4">
                            <ThumbsUp className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="font-medium">{college.rating}/5</span>
                            <span className="text-sm text-gray-500 ml-2">College Rating</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-gray-500">NRI Quota Fees</p>
                              <p className="font-medium">{college.fees}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">NEET Cutoff</p>
                              <p className="font-medium">{college.neetCutoff}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">NRI Seats</p>
                              <p className="font-medium">{college.seats}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Recognition</p>
                              <p className="font-medium">{college.recognition.slice(0, 2).join(', ')}</p>
                            </div>
                          </div>
                          
                          <Button className="w-full bg-medical-50 border-medical-200 text-medical-700 hover:bg-medical-100 transition-colors" variant="outline">
                            View Details <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="mt-12 bg-gray-50 rounded-xl p-6 md:p-8 max-w-4xl mx-auto shadow-sm">
              <h3 className="text-2xl font-semibold mb-4 text-center">Need Personalized College Recommendations?</h3>
              <p className="text-center text-gray-600 mb-6">
                Our admission experts can help you identify the best colleges based on your profile, budget, and preferences.
              </p>
              <div className="flex justify-center">
                <Button className="bg-medical-500 hover:bg-medical-600 text-white">
                  Get Free Counseling
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NRICollegesPage;
