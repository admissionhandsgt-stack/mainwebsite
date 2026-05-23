"use client";

import React from 'react';
import { CheckCircle, Download, FileText, AlertTriangle } from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';

const NRIDocumentsPage = () => {
  const CTA = useCTA();
  return (
    <div className="flex flex-col">
      <div className="flex-grow">
        <section className="bg-gradient-to-r from-medical-50 to-blue-50 py-16">
          <div className="container-custom">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Essential Documents for NRI Quota Admission
              </h1>
              <p className="text-xl text-gray-700 mb-8">
                Complete guide to documentation requirements for NRI, NRI-sponsored, OCI/PIO, and foreign national candidates
              </p>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-white">
          <div className="container-custom max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="bg-gray-50 p-6 rounded-xl shadow-sm mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 border-b pb-2">Category Guide</h3>
                    <ul className="space-y-3">
                      <li>
                        <a href="#essential" className="text-medical-600 hover:text-medical-800 font-medium flex items-center transition-colors group">
                          <span className="w-2 h-2 bg-medical-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></span>
                          Essential Documents
                        </a>
                      </li>
                      <li>
                        <a href="#category-wise" className="text-medical-600 hover:text-medical-800 font-medium flex items-center transition-colors group">
                          <span className="w-2 h-2 bg-medical-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></span>
                          Category-wise List
                        </a>
                      </li>
                      <li>
                        <a href="#financial" className="text-medical-600 hover:text-medical-800 font-medium flex items-center transition-colors group">
                          <span className="w-2 h-2 bg-medical-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></span>
                          Financial Proofs
                        </a>
                      </li>
                      <li>
                        <a href="#translation" className="text-medical-600 hover:text-medical-800 font-medium flex items-center transition-colors group">
                          <span className="w-2 h-2 bg-medical-500 rounded-full mr-2 group-hover:scale-125 transition-transform"></span>
                          Translation Rules
                        </a>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-medical-50 p-6 rounded-xl border border-medical-100 shadow-sm">
                    <h3 className="text-lg font-semibold mb-3 text-medical-900">Need Help?</h3>
                    <p className="text-gray-700 mb-5 text-sm leading-relaxed">
                      Our experts can help you prepare the right documents for your NRI quota application and avoid rejections.
                    </p>
                    <button 
                      onClick={CTA.call}
                      className="bg-medical-600 text-white w-full text-center px-4 py-2.5 rounded-lg inline-block hover:bg-medical-700 transition-all font-medium"
                    >
                      Get Assistance
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2 space-y-16">
                <div id="essential" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-medical-100 text-gray-900">1. Essential Documents for All</h2>
                  <div className="space-y-8">
                    <div className="flex gap-5 items-start">
                      <div className="bg-medical-50 text-medical-600 p-3 rounded-lg flex-shrink-0">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">Academic Records</h4>
                        <ul className="mt-3 space-y-3">
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">10th & 12th Mark Sheets and Certificates</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div id="category-wise" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-medical-100 text-gray-900">2. Category-Specific Requirements</h2>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold mb-4 text-medical-700">Non-Resident Indian (NRI)</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">NRI Status Certificate from the Indian Embassy</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div id="financial" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-medical-100 text-gray-900">3. Financial Capacity Proof</h2>
                  <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                    <li className="flex items-start gap-3">
                      <div className="bg-white p-1 rounded border border-blue-200">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-gray-800 font-medium">6 Months NRI Bank Statement</span>
                    </li>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NRIDocumentsPage;
