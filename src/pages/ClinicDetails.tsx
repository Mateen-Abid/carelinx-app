import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { BookingModal } from '@/components/BookingModal';

// Mock data for services and doctors
const services = [
  {
    name: 'ECG',
    doctor: 'Dr. Ali Akbar',
    specialization: 'Ultrasonographer',
    timing: '09:00 AM - 1:00 PM | Mon-Sat',
    available: true,
    
  },
  {
    name: 'X-Ray',
    doctor: 'Dr. Zaha Ali',
    specialization: 'Cardiologist',
    timing: '09:00 AM - 1:00 PM | Mon-Sat',
    available: true,
    
  },
  {
    name: 'Brain Scan',
    doctor: 'Dr. Tom Yaeghn',
    specialization: 'Neurologist',
    timing: '01:00 PM - 5:00 PM | Mon-Sat',
    available: true,
    
  },
  {
    name: 'Retinal Care',
    doctor: 'Dr. Tom Yaeghn',
    specialization: 'Retinologist',
    timing: '11:00 AM - 4:00 PM | Tue-Sat',
    available: true,
    
  },
  {
    name: 'Ultrasound',
    doctor: 'Dr. Tom Yaeghn',
    specialization: 'Ultrasonographer',
    timing: '03:00 PM - 6:00 PM | Tue-Sat',
    available: true,
    
  },
  {
    name: 'ECG',
    doctor: 'Dr. Ali Akbar',
    specialization: 'Ultrasonographer',
    timing: '09:00 AM - 1:00 PM | Mon-Sat',
    available: true,
    
  }
];


const ClinicDetails = () => {
  const { clinicId } = useParams();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  // Real clinic data mapping based on the Index page data
  const clinicData = {
    'central-medical-center': {
      name: 'Central Medical Center',
      address: '456 Oak Avenue, Suburb',
      description: 'A comprehensive healthcare facility providing quality medical services with state-of-the-art equipment and experienced medical professionals dedicated to your health and wellness.'
    },
    'green-valley-hospital': {
      name: 'Green Valley Hospital',
      address: '789 Maple Street, Townsville',
      description: 'Modern hospital offering advanced medical care with specialized departments and 24/7 emergency services, committed to delivering exceptional patient care in a comfortable environment.'
    },
    'sunrise-health-clinic': {
      name: 'Sunrise Health Clinic',
      address: '321 Pine Road, Village',
      description: 'Community-focused healthcare clinic providing personalized medical services with a team of caring professionals dedicated to maintaining your health and preventing illness.'
    },
    'sunset-medical-center': {
      name: 'Sunset Medical Center',
      address: '144 Maple Drive, City',
      description: 'Full-service medical center offering comprehensive healthcare solutions with cutting-edge technology and a multidisciplinary approach to patient care and treatment.'
    },
    'lakeside-wellness-center': {
      name: 'Lakeside Wellness Center',
      address: '267 River Lane, Town',
      description: 'Holistic wellness center combining traditional medical care with preventive health services, focusing on overall well-being and lifestyle medicine for optimal health outcomes.'
    }
  };

  const currentClinic = clinicData[clinicId as keyof typeof clinicData] || {
    name: 'Medical Center',
    address: 'Location not specified',
    description: 'Professional healthcare services available for your medical needs.'
  };

  const handleBookAppointment = (doctorName?: string) => {
    setSelectedDoctor(doctorName || 'Dr. Ishfaq');
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="max-w-3xl">
            {/* Clinic Info */}
            <div className="bg-white border rounded-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{currentClinic.name}</h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{currentClinic.address}</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{currentClinic.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services & Specialists Section */}
      <section className="py-12 px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Services & Specialists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm font-medium text-gray-900">{service.doctor}</p>
                  <p className="text-xs text-gray-600 mb-2">{service.specialization}</p>
                  <p className="text-xs text-gray-500 mb-3">{service.timing}</p>
                  <Button size="sm" className="w-full" onClick={() => handleBookAppointment(service.doctor)}>
                    Book Appointment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location & Info Section */}
      <section className="py-12 px-8 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-3 sm:p-4 lg:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Vumo - Bangalore</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg font-bold">5.0</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-600 text-sm sm:text-base">(100)</span>
              </div>
              <div className="flex flex-col gap-1 text-xs sm:text-sm">
                <span className="text-green-600">• Closed opens soon at 9:00am</span>
                <span className="text-gray-600">• NO Rihul, Bangalore</span>
                <span className="text-gray-600">• 15 people recently book appt.</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Address</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  1st Floor, Icon Mall, 25th, 13th Main Rd,<br />
                  Indiranagar, Bengaluru, Karnataka 560038
                </p>
                <Button variant="link" className="p-0 h-auto text-blue-600 text-xs sm:text-sm mt-1">
                  Get directions
                </Button>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Hours</h4>
                <div className="text-xs sm:text-sm text-gray-600">
                  <p className="flex justify-between">
                    <span>Closed</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Tue - Sun</span>
                    <span className="text-right">6:00 AM – 07:30 pm</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Mode of payment</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Cash, Debit Card, Credit Card<br />
                  UPI
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
              <Button onClick={() => handleBookAppointment()} className="w-full sm:w-auto">Book Appointment</Button>
            </div>
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        doctorName={selectedDoctor}
        clinicName={currentClinic.name}
      />
    </div>
  );
};

export default ClinicDetails;