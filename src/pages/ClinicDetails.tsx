import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';

// Mock data for services and doctors
const services = [
  {
    name: 'ECG',
    doctor: 'Dr. Ali Akbar',
    specialization: 'Ultrasonographer',
    timing: '09:00 AM - 1:00 PM | Mon-Sat',
    available: true,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face&auto=format'
  },
  {
    name: 'X-Ray',
    doctor: 'Dr. Zaha Ali',
    specialization: 'Cardiologist',
    timing: '09:00 AM - 1:00 PM | Mon-Sat',
    available: true,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Brain Scan',
    doctor: 'Dr. Tom Yaeghn',
    specialization: 'Neurologist',
    timing: '01:00 PM - 5:00 PM | Mon-Sat',
    available: true,
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=80&h=80&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Retinal Care',
    doctor: 'Dr. Tom Yaeghn',
    specialization: 'Retinologist',
    timing: '11:00 AM - 4:00 PM | Tue-Sat',
    available: true,
    image: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=80&h=80&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Ultrasound',
    doctor: 'Dr. Tom Yaeghn',
    specialization: 'Ultrasonographer',
    timing: '03:00 PM - 6:00 PM | Tue-Sat',
    available: true,
    image: 'https://images.unsplash.com/photo-1594824735912-67b476d5b591?w=80&h=80&fit=crop&crop=face&auto=format'
  },
  {
    name: 'ECG',
    doctor: 'Dr. Ali Akbar',
    specialization: 'Ultrasonographer',
    timing: '09:00 AM - 1:00 PM | Mon-Sat',
    available: true,
    image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=80&h=80&fit=crop&crop=face&auto=format'
  }
];

const doctors = [
  {
    name: 'Dr. Shahia Murphy',
    specialization: 'General Medicine',
    available: true,
    timing: '9:00 AM - 10:00 PM',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Dr. Ali Akbar',
    specialization: 'Radiology Care',
    available: true,
    timing: '9:00 AM - 10:00 PM',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Dr. Ali Akbar',
    specialization: 'Radiology',
    available: true,
    timing: '9:00 AM - 5:00 PM',
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Dr. House',
    specialization: 'Dermatology',
    available: true,
    timing: '9:00 AM - 7:00 PM',
    image: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=150&h=150&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Dr. Ali Akbar',
    specialization: 'General Medicine',
    available: true,
    timing: '9:00 AM - 10:00 PM',
    image: 'https://images.unsplash.com/photo-1594824735912-67b476d5b591?w=150&h=150&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Dr. Ali Akbar',
    specialization: 'General Medicine',
    available: true,
    timing: '9:00 AM - 10:00 PM',
    image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=150&h=150&fit=crop&crop=face&auto=format'
  },
  {
    name: 'Dr. Ali Akbar',
    specialization: 'General Medicine',
    available: true,
    timing: '8:00 PM - 9:00 PM',
    image: 'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=150&h=150&fit=crop&crop=face&auto=format'
  }
];

const ClinicDetails = () => {
  const { clinicId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left side - Clinic Info */}
            <div className="lg:w-1/3">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-6 h-64 relative overflow-hidden" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop&auto=format)', backgroundSize: 'cover', backgroundPosition: 'center'}}>
                <div className="absolute inset-0 bg-white/70 rounded-lg"></div>
                <div className="relative z-10">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Central Medical Center</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>456 Oak Avenue, Suburb</span>
                </div>
              </div>
                </div>
              </div>
            
            {/* Right side - Hero Image */}
            <div className="lg:w-2/3">
              <div className="bg-gradient-to-r from-purple-200 via-blue-200 to-teal-200 rounded-lg h-64 flex items-center justify-center overflow-hidden">
                <img
                  src="/lovable-uploads/65b7f82d-e75f-41b9-b51b-d2012af0f3e8.png"
                  alt="Medical Center Illustration"
                  className="w-full h-full object-cover"
                />
              </div>
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
                  <img
                    src={service.image}
                    alt={service.doctor}
                    className="w-12 h-12 rounded-full object-cover mb-2"
                  />
                  <p className="text-sm font-medium text-gray-900">{service.doctor}</p>
                  <p className="text-xs text-gray-600 mb-2">{service.specialization}</p>
                  <p className="text-xs text-gray-500 mb-3">{service.timing}</p>
                  <Button size="sm" className="w-full">
                    Book Appointment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Doctors Section */}
      <section className="py-12 px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {doctors.map((doctor, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 flex flex-col h-full">
                <div className="text-center flex-1">
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-16 h-16 rounded-lg object-cover mx-auto mb-3"
                  />
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{doctor.name}</h3>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">{doctor.specialization}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Available</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{doctor.timing}</p>
                </div>
                <Button size="sm" className="w-full mt-auto">
                  Book Appointment
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location & Info Section */}
      <section className="py-12 px-8 bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Vumo - Bangalore</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold">5.0</span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-gray-600">(100)</span>
              </div>
              <span className="text-green-600">• Closed opens soon at 9:00am</span>
              <span className="text-gray-600">• NO Rihul, Bangalore</span>
              <span className="text-gray-600">• 15 people recently book appt.</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Address</h4>
                <p className="text-sm text-gray-600">
                  1st Floor, Icon Mall, 25th, 13th Main Rd,<br />
                  Indiranagar, Bengaluru, Karnataka 560038
                </p>
                <Button variant="link" className="p-0 h-auto text-blue-600 text-sm">
                  Get directions
                </Button>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Hours</h4>
                <div className="text-sm text-gray-600">
                  <p className="flex justify-between">
                    <span>Closed</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Tue - Sun</span>
                    <span>6:00 AM – 07:30 pm</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Mode of payment</h4>
                <p className="text-sm text-gray-600">
                  Cash, Debit Card, Credit Card<br />
                  UPI
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button>Book Appointment</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClinicDetails;