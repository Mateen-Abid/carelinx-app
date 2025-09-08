import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import BookingConfirmationModal from '@/components/BookingConfirmationModal';
import TimeSlotModal from '@/components/TimeSlotModal';
import { AuthPromptModal } from '@/components/AuthPromptModal';
import ServiceCalendar from '@/components/ServiceCalendar';
import { useBooking } from '@/contexts/BookingContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Service data with descriptions and timing
const serviceDatabase = {
  'ecg': {
    name: 'ECG',
    specialty: 'Cardiology',
    description: 'Our cardiologists provide personalized ECG monitoring plans to help assess heart rhythm and detect irregular heartbeats. Suitable for all patients with cardiovascular concerns, with comprehensive analysis and treatment options available.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 13:00',
      'Tue': '10:00 - 14:00', 
      'Wed': '09:00 - 13:00',
      'Thu': '10:00 - 14:30',
      'Fri': '11:00 - 14:30',
      'Sat': '13:00 - 16:30',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ali Ashar',
        specialization: 'MD, Cardiologist - 8 yrs experience'
      },
      {
        name: 'Dr. Maya Patel',
        specialization: 'MD, Cardiologist - 10 yrs experience'
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
        specialization: 'MD, Radiologist - 12 yrs experience'
      }
    ]
  },
  'brain-scans': {
    name: 'Brain Scans',
    specialty: 'Neurology',
    description: 'Our neurologists provide advanced brain imaging and scanning services to help diagnose neurological conditions. Comprehensive analysis with detailed reports and treatment recommendations.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '789 Pine Street, Downtown',
    schedule: {
      'Mon': '10:00 - 15:00',
      'Tue': '11:00 - 16:00',
      'Wed': '10:00 - 15:00',
      'Thu': '11:00 - 16:00',
      'Fri': '12:00 - 16:00',
      'Sat': '13:00 - 16:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Tom Yaeghn',
        specialization: 'MD, Neurologist - 15 yrs experience'
      },
      {
        name: 'Dr. Lisa Chen',
        specialization: 'MD, Neurologist - 8 yrs experience'
      }
    ]
  },
  'retinal-care': {
    name: 'Retinal Care',
    specialty: 'Ophthalmology',
    description: 'Our ophthalmologists provide specialized retinal care services to help maintain and improve eye health. Comprehensive eye examinations with advanced diagnostic equipment.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
    schedule: {
      'Mon': '09:00 - 16:00',
      'Tue': '10:00 - 17:00',
      'Wed': '09:00 - 16:00',
      'Thu': '10:00 - 17:00',
      'Fri': '09:00 - 16:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Emily Davis',
        specialization: 'MD, Ophthalmologist - 9 yrs experience'
      }
    ]
  },
  'ultrasound': {
    name: 'Ultrasound',
    specialty: 'General Medicine',
    description: 'Comprehensive ultrasound imaging services for diagnostic purposes. Non-invasive imaging technology for various medical conditions and health monitoring.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 15:00',
      'Tue': '09:00 - 16:00',
      'Wed': '08:00 - 15:00',
      'Thu': '09:00 - 16:00',
      'Fri': '08:00 - 15:00',
      'Sat': '10:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Michael Roberts',
        specialization: 'MD, Radiologist - 11 yrs experience'
      }
    ]
  },
  'acne-treatment': {
    name: 'Acne Treatment',
    specialty: 'Dermatology',
    description: 'Specialized acne treatment services using the latest dermatological techniques. Comprehensive treatment plans for all types of acne and skin conditions.',
    clinic: 'Willow Grove Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 16:00',
      'Tue': '10:00 - 17:00',
      'Wed': '09:00 - 16:00',
      'Thu': '10:00 - 17:00',
      'Fri': '09:00 - 16:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Emily Davis',
        specialization: 'MD, Dermatologist - 9 yrs experience'
      }
    ]
  },
  'laser-hair-removal': {
    name: 'Laser Hair Removal',
    specialty: 'Dermatology',
    description: 'Professional laser hair removal services using advanced technology. Safe and effective hair removal treatments for all skin types with long-lasting results.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  },
  'facial-laser-sessions': {
    name: 'Laser Sessions',
    specialty: 'Facial Cleaning Services',
    description: 'Advanced laser therapy sessions for various skin conditions. Professional treatment using state-of-the-art laser technology.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      }
    ]
  },
  'facial-plasma-sessions': {
    name: 'Plasma Sessions',
    specialty: 'Facial Cleaning Services',
    description: 'Plasma therapy sessions for skin rejuvenation and treatment. Advanced plasma technology for effective results.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      }
    ]
  },
  'scar-treatments': {
    name: 'Scar Treatments',
    specialty: 'Facial Cleaning Services',
    description: 'Comprehensive scar treatment services using advanced techniques to minimize and improve the appearance of scars.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      }
    ]
  },
  'fat-reduction': {
    name: 'Fat Reduction',
    specialty: 'Facial Cleaning Services',
    description: 'Non-invasive fat reduction treatments using advanced technology. Safe and effective procedures for body contouring.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Aesthetic Dermatologist - 12 yrs experience'
      }
    ]
  },
  'cosmetic-injections': {
    name: 'Cosmetic Injections',
    specialty: 'Facial Cleaning Services',
    description: 'Professional cosmetic injection services including Botox, fillers, and other aesthetic treatments.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Aesthetic Dermatologist - 12 yrs experience'
      }
    ]
  },
  'dark-circles-lightening': {
    name: 'Dark Circles Lightening',
    specialty: 'Facial Cleaning Services',
    description: 'Specialized treatment for reducing and lightening dark circles under the eyes.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Aesthetic Dermatologist - 12 yrs experience'
      }
    ]
  },
  'fractional-laser-sessions': {
    name: 'Fractional Laser Sessions',
    specialty: 'Facial Cleaning Services',
    description: 'Fractional laser treatments for skin resurfacing and rejuvenation.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      }
    ]
  },
  'chemical-peeling-sessions': {
    name: 'Chemical Peeling Sessions',
    specialty: 'Facial Cleaning Services',
    description: 'Professional chemical peeling treatments for skin renewal and improvement.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      }
    ]
  },
  'teeth-whitening': {
    name: 'Teeth Whitening',
    specialty: 'Dental',
    description: 'Professional teeth whitening services to brighten your smile.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'DDS, General Dentist - 8 yrs experience'
      }
    ]
  },
  'teeth-cleaning': {
    name: 'Teeth Cleaning',
    specialty: 'Dental',
    description: 'Professional dental cleaning services to maintain optimal oral health.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'DDS, General Dentist - 8 yrs experience'
      }
    ]
  },
  'polishing-scaling': {
    name: 'Polishing & Scaling',
    specialty: 'Dental',
    description: 'Professional dental polishing and scaling services to remove plaque and tartar buildup.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'DDS, General Dentist - 8 yrs experience'
      }
    ]
  },
  'dental-fillings': {
    name: 'Dental Fillings',
    specialty: 'Dental',
    description: 'High-quality dental filling services using modern materials.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'DDS, Restorative Dentist - 8 yrs experience'
      }
    ]
  },
  'dentures': {
    name: 'Dentures',
    specialty: 'Dental',
    description: 'Custom-fitted denture services for complete or partial tooth replacement.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'DDS, Prosthodontist - 8 yrs experience'
      }
    ]
  },
  'orthodontics': {
    name: 'Orthodontics',
    specialty: 'Dental',
    description: 'Comprehensive orthodontic services including braces and aligners.',
    clinic: 'Panorama Medical Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '123 Medical District, City Center',
    schedule: {
      'Mon': '09:00 - 18:00',
      'Tue': '09:00 - 18:00',
      'Wed': '09:00 - 18:00',
      'Thu': '09:00 - 18:00',
      'Fri': '09:00 - 18:00',
      'Sat': '09:00 - 18:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ishfaq',
        specialization: 'DDS, Orthodontist - 8 yrs experience'
      }
    ]
  },
  'filler-injections': {
    name: 'Filler Injections',
    specialty: 'Dermatology',
    description: 'Professional dermal filler injections for facial enhancement.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Aesthetic Dermatologist - 10 yrs experience'
      }
    ]
  },
  'botox-injections': {
    name: 'Botox Injections',
    specialty: 'Dermatology',
    description: 'Professional Botox injections for wrinkle reduction and facial rejuvenation.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Aesthetic Dermatologist - 10 yrs experience'
      }
    ]
  },
  'carbon-laser': {
    name: 'Carbon Laser',
    specialty: 'Dermatology',
    description: 'Carbon laser treatments for skin rejuvenation and pore refinement.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  },
  'cold-peeling': {
    name: 'Cold Peeling',
    specialty: 'Dermatology',
    description: 'Cold peeling treatments for gentle skin exfoliation and renewal.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  },
  'bleaching': {
    name: 'Bleaching',
    specialty: 'Dermatology',
    description: 'Professional skin bleaching treatments for pigmentation and discoloration.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  },
  'skin-rejuvenation': {
    name: 'Skin Rejuvenation',
    specialty: 'Dermatology',
    description: 'Comprehensive skin rejuvenation treatments for youthful and healthy-looking skin.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  },
  'scar-stretch-marks-removal': {
    name: 'Scar & Stretch Marks Removal',
    specialty: 'Dermatology',
    description: 'Comprehensive treatment for scars and stretch marks using advanced techniques.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  },
  'skin-tightening-wrinkle-removal': {
    name: 'Skin Tightening & Wrinkle Removal',
    specialty: 'Dermatology',
    description: 'Advanced skin tightening and wrinkle removal treatments for anti-aging.',
    clinic: 'Esan Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Health Avenue, Medical Center',
    schedule: {
      'Mon': '08:00 - 19:00',
      'Tue': '08:00 - 19:00',
      'Wed': '08:00 - 19:00',
      'Thu': '08:00 - 19:00',
      'Fri': '08:00 - 19:00',
      'Sat': '08:00 - 19:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Ahmed Al-Rashid',
        specialization: 'MD, Dermatologist - 10 yrs experience'
      }
    ]
  }
};

const ServiceDetails = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addAppointment, confirmAppointment } = useBooking();
  const [isBookingConfirmationOpen, setIsBookingConfirmationOpen] = useState(false);
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [pendingBookingId, setPendingBookingId] = useState<string>('');
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const serviceData = serviceDatabase[serviceId as keyof typeof serviceDatabase];

  if (!serviceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Service not found</h1>
          <p className="text-gray-600 mt-2">The requested service could not be found.</p>
        </div>
      </div>
    );
  }

  const handleBookAppointment = () => {
    setIsBookingConfirmationOpen(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsTimeSlotModalOpen(true);
  };

  const handleTimeSlotSelect = (timeSlot: string, doctor: string) => {
    setSelectedTimeSlot(timeSlot);
    setSelectedDoctor(doctor);
    setIsTimeSlotModalOpen(false);
    
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    
    handleConfirmBooking(doctor, timeSlot);
  };

  const handleConfirmBooking = async (doctor: string, timeSlot: string) => {
    if (!selectedDate || !user) return;

    try {
      const bookingId = await addAppointment({
        clinic: serviceData.clinic,
        service: serviceData.name,
        specialty: serviceData.specialty,
        date: selectedDate,
        time: timeSlot,
        doctor: doctor
      });
      
      setPendingBookingId(bookingId);
      setIsBookingConfirmationOpen(true);
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  const handleConfirmAppointment = async () => {
    if (pendingBookingId) {
      await confirmAppointment(pendingBookingId);
      setIsBookingConfirmationOpen(false);
      
      // Reset form
      setSelectedDate(null);
      setSelectedTimeSlot('');
      setSelectedDoctor('');
      setPendingBookingId('');
    }
  };

  const generateTimeSlots = (day: string) => {
    const schedule = serviceData.schedule[day];
    if (!schedule || schedule === 'Closed') return [];
    
    const [start, end] = schedule.split(' - ');
    const slots = [];
    
    // Generate slots every hour
    let currentHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    
    while (currentHour < endHour) {
      slots.push(`${currentHour.toString().padStart(2, '0')}:00`);
      currentHour++;
    }
    
    return slots;
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const getDaySchedule = (date: Date) => {
    const dayName = format(date, 'EEE');
    return serviceData.schedule[dayName] || 'Closed';
  };

  const isDateAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    if (!isAfter(date, today) && !isSameMonth(date, today)) return false;
    
    const schedule = getDaySchedule(date);
    return schedule !== 'Closed';
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={serviceData.clinicLogo}
                alt={serviceData.clinic}
                className="w-16 h-16 rounded-full object-cover border-2 border-white"
              />
              <div>
                <h1 className="text-2xl font-bold">{serviceData.name}</h1>
                <p className="text-blue-100">{serviceData.clinic}</p>
                <p className="text-blue-100 text-sm">{serviceData.address}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {serviceData.specialty}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">About This Service</h2>
              <p className="text-gray-600 leading-relaxed">{serviceData.description}</p>
            </div>

            {/* Doctors */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Doctors</h2>
              <div className="grid gap-4">
                {serviceData.doctors.map((doctor, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {doctor.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                      <p className="text-gray-600 text-sm">{doctor.specialization}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Appointment</h2>
              
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {format(currentDate, 'MMMM yyyy')}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevMonth}
                    className="p-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextMonth}
                    className="p-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                
                {calendarDays.map((date, index) => {
                  const isAvailable = isDateAvailable(date);
                  const schedule = getDaySchedule(date);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => isAvailable && handleDateSelect(date)}
                      disabled={!isAvailable}
                      className={`
                        p-2 text-sm rounded-lg transition-colors
                        ${isAvailable 
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }
                        ${selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                          ? 'bg-blue-600 text-white'
                          : ''
                        }
                      `}
                    >
                      <div>{format(date, 'd')}</div>
                      <div className="text-xs">{schedule !== 'Closed' ? schedule : 'Closed'}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Book Appointment Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleBookAppointment}
                size="lg"
                className="px-8 py-3"
              >
                Book Appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BookingConfirmationModal
        isOpen={isBookingConfirmationOpen}
        onClose={() => setIsBookingConfirmationOpen(false)}
        onConfirm={handleConfirmAppointment}
        bookingDetails={{
          clinic: serviceData.clinic,
          service: serviceData.name,
          date: selectedDate,
          time: selectedTimeSlot,
          doctor: selectedDoctor
        }}
      />

      <TimeSlotModal
        isOpen={isTimeSlotModalOpen}
        onClose={() => setIsTimeSlotModalOpen(false)}
        onSelectTimeSlot={handleTimeSlotSelect}
        selectedDate={selectedDate}
        timeSlots={selectedDate ? generateTimeSlots(format(selectedDate, 'EEE')) : []}
        doctors={serviceData.doctors}
      />

      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />
    </div>
  );
};

export default ServiceDetails;