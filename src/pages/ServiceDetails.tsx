import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { BookingModal } from '@/components/BookingModal';

// Service data with descriptions and timing
const serviceDetailsData = {
  'ecg': {
    name: 'ECG',
    specialty: 'Cardiology',
    description: 'Our cardiologists provide personalized ECG monitoring plans to help assess heart rhythm and detect irregular heartbeats. Suitable for all patients with cardiovascular concerns, with comprehensive analysis and treatment options available.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '10:00 - 14:30',
      'Tue': '11:00 - 14:30', 
      'Wed': '12:00 - 14:30',
      'Thu': '10:00 - 14:30',
      'Fri': '11:00 - 14:30',
      'Sat': '13:00 - 16:30',
      'Sun': '13:00 - 16:30'
    },
    doctors: [
      {
        name: 'Dr. Ali Ashar',
        specialization: 'MD, Cardiologist - 8 yrs experience',
        
      },
      {
        name: 'Dr. Maya Patel',
        specialization: 'MD, Cardiologist - 10 yrs experience',
        
      }
    ]
  },
  'x-ray': {
    name: 'X-Ray',
    specialty: 'Radiology',
    description: 'Our radiologists provide comprehensive X-ray imaging services to help diagnose various medical conditions. State-of-the-art equipment ensures accurate results with minimal radiation exposure.',
    clinic: 'Willow Grove Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 13:00',
      'Tue': '10:00 - 14:00', 
      'Wed': '09:00 - 13:00',
      'Thu': '10:00 - 14:00',
      'Fri': '09:00 - 13:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'MD, Radiologist - 12 yrs experience',
        
      }
    ]
  },
  'brain-scans': {
    name: 'Brain Scans',
    specialty: 'Neurology',
    description: 'Our neurologists provide advanced brain imaging and scanning services to help diagnose neurological conditions. Comprehensive analysis with detailed reports and treatment recommendations.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': 'Closed',
      'Tue': '11:00 - 16:00', 
      'Wed': '12:00 - 16:00',
      'Thu': '11:00 - 16:00',
      'Fri': '12:00 - 16:00',
      'Sat': '13:00 - 16:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Tom Yaeghn',
        specialization: 'MD, Neurologist - 15 yrs experience',
        
      },
      {
        name: 'Dr. Lisa Chen',
        specialization: 'MD, Neurologist - 8 yrs experience',
        
      }
    ]
  },
  'retinal-care': {
    name: 'Retinal Care',
    specialty: 'Ophthalmology',
    description: 'Our ophthalmologists provide specialized retinal care services to help maintain and improve eye health. Comprehensive eye examinations with advanced diagnostic equipment.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 15:00',
      'Tue': '09:00 - 15:00', 
      'Wed': '08:00 - 15:00',
      'Thu': '09:00 - 15:00',
      'Fri': '08:00 - 15:00',
      'Sat': 'Closed',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Michael Roberts',
        specialization: 'MD, Ophthalmologist - 20 yrs experience',
        
      }
    ]
  },
  'ultrasound': {
    name: 'Ultrasound',
    specialty: 'General Medicine',
    description: 'Our medical professionals provide comprehensive ultrasound imaging services for various diagnostic purposes. Safe, non-invasive procedures with immediate results and detailed analysis.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 15:00',
      'Tue': '09:00 - 15:00', 
      'Wed': '08:00 - 15:00',
      'Thu': '09:00 - 15:00',
      'Fri': '08:00 - 15:00',
      'Sat': 'Closed',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Jennifer White',
        specialization: 'MD, Ultrasonographer - 10 yrs experience',
        
      }
    ]
  }
};

const ServiceDetails = () => {
  const { serviceId } = useParams();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  const serviceData = serviceDetailsData[serviceId as keyof typeof serviceDetailsData];

  if (!serviceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Service Not Found</h1>
          <p className="text-gray-600 mt-2">The requested service could not be found.</p>
        </div>
      </div>
    );
  }

  const handleBookAppointment = () => {
    setSelectedDoctor(serviceData.doctors[0]?.name || 'Available Doctor');
    setIsBookingModalOpen(true);
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="max-w-3xl">
            {/* Service Info */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={serviceData.clinicLogo}
                  alt={`${serviceData.clinic} logo`}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{serviceData.name}</h1>
                  <p className="text-green-600 font-medium">{serviceData.specialty}</p>
                  <p className="text-gray-600 text-sm">{serviceData.clinic}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{serviceData.address}</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{serviceData.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Timing Section */}
      <section className="py-8 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Timing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {days.map((day) => (
              <div key={day} className="text-center">
                <div className="bg-gray-100 rounded-lg p-3 mb-2">
                  <span className="font-medium text-gray-900">{day}</span>
                </div>
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  serviceData.schedule[day] === 'Closed' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-[rgba(0,255,162,0.2)] text-green-700'
                }`}>
                  {serviceData.schedule[day]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Doctors Section */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {serviceData.doctors.map((doctor, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{doctor.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{doctor.specialization}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Single Book Now Button for the Service */}
          <div className="text-center mt-8">
            <Button 
              size="lg"
              onClick={() => handleBookAppointment()}
              className="px-12 py-4 text-lg font-semibold"
            >
              Book Now - {serviceData.name}
            </Button>
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        doctorName={selectedDoctor}
        clinicName={serviceData.clinic}
      />
    </div>
  );
};

export default ServiceDetails;