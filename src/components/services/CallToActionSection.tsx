
import React from 'react';
import { RequestCallbackForm } from './RequestCallbackForm';
import ServiceDetails from './ServiceDetails';

const CallToActionSection = () => {
  return (
    <section className="py-12 bg-gradient-to-b from-white to-medical-50">
      <div className="container-custom">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <ServiceDetails />
          </div>
          <div>
            <div className="bg-white shadow-lg rounded-lg p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-4 text-center text-black">Request a Callback</h3>
              <RequestCallbackForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;
