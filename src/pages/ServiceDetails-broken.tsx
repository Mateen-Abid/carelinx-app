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
        specialization: 'MD, Ophthalmologist - 20 yrs experience'
      }
    ]
  },
  'ultrasound': {
    name: 'Ultrasound',
    specialty: 'General Medicine',
    description: 'Our medical professionals provide comprehensive ultrasound imaging services for various diagnostic purposes. Safe, non-invasive procedures with immediate results and detailed analysis.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
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
        specialization: 'MD, Ultrasonographer - 10 yrs experience'
      }
    ]
  },
  'acne-treatment': {
    name: 'Acne Treatment',
    specialty: 'Dermatology',
    description: 'Our dermatologists provide comprehensive acne treatment services using the latest medical techniques and therapies. Personalized treatment plans to help clear your skin and prevent future breakouts.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '10:00 - 18:00',
      'Wed': '09:00 - 17:00',
      'Thu': '10:00 - 18:00',
      'Fri': '09:00 - 17:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      },
      {
        name: 'Dr. Michael Chen',
        specialization: 'MD, Dermatologist - 8 yrs experience'
      }
    ]
  },
  // Dermatology Services
  'laser-sessions': {
    name: 'Laser Sessions',
    specialty: 'Dermatology',
    description: 'Advanced laser therapy sessions for various skin conditions and cosmetic treatments. Our expert dermatologists use state-of-the-art laser technology for optimal results.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '10:00 - 18:00',
      'Wed': '09:00 - 17:00',
      'Thu': '10:00 - 18:00',
      'Fri': '09:00 - 17:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'MD, Dermatologist - 12 yrs experience'
      }
    ]
  },
  'plasma-sessions': {
    name: 'Plasma Sessions',
    specialty: 'Dermatology',
    description: 'Innovative plasma treatment sessions for skin rejuvenation and various dermatological conditions. Non-invasive procedures with excellent results.',
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
  'scar-treatments': {
    name: 'Scar Treatments',
    specialty: 'Dermatology',
    description: 'Comprehensive scar treatment services using advanced techniques to minimize and improve the appearance of scars. Personalized treatment plans for optimal results.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '789 Pine Street, Downtown',
    schedule: {
      'Mon': '10:00 - 17:00',
      'Tue': '11:00 - 18:00',
      'Wed': '10:00 - 17:00',
      'Thu': '11:00 - 18:00',
      'Fri': '10:00 - 17:00',
      'Sat': '10:00 - 15:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Michael Chang',
        specialization: 'MD, Dermatologist - 11 yrs experience'
      }
    ]
  },
  'fat-reduction': {
    name: 'Fat Reduction',
    specialty: 'Dermatology',
    description: 'Non-invasive fat reduction treatments using advanced technology. Safe and effective procedures for body contouring and aesthetic enhancement.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Amanda Wilson',
        specialization: 'MD, Cosmetic Dermatologist - 7 yrs experience'
      }
    ]
  },
  'cosmetic-injections': {
    name: 'Cosmetic Injections',
    specialty: 'Dermatology',
    description: 'Professional cosmetic injection services including Botox, fillers, and other aesthetic treatments. Expert application for natural-looking results.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '10:00 - 18:00',
      'Wed': '09:00 - 17:00',
      'Thu': '10:00 - 18:00',
      'Fri': '09:00 - 17:00',
      'Sat': '10:00 - 14:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Rachel Green',
        specialization: 'MD, Aesthetic Dermatologist - 10 yrs experience'
      }
    ]
  },
  // Dental Services
  'teeth-whitening': {
    name: 'Teeth Whitening',
    specialty: 'Dentistry',
    description: 'Professional teeth whitening services to brighten your smile. Safe and effective treatments using the latest whitening technology.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. James Miller',
        specialization: 'DDS, General Dentist - 15 yrs experience'
      }
    ]
  },
  'teeth-cleaning': {
    name: 'Teeth Cleaning',
    specialty: 'Dentistry',
    description: 'Professional dental cleaning services to maintain optimal oral health. Regular cleanings help prevent cavities and gum disease.',
    clinic: 'Willow Grove Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Lisa Thompson',
        specialization: 'DDS, Dental Hygienist - 8 yrs experience'
      }
    ]
  },
  'polishing-&-scaling': {
    name: 'Polishing & Scaling',
    specialty: 'Dentistry',
    description: 'Professional dental polishing and scaling services to remove plaque and tartar buildup. Essential for maintaining healthy teeth and gums.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '789 Pine Street, Downtown',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Robert Lee',
        specialization: 'DDS, Periodontist - 12 yrs experience'
      }
    ]
  },
  'dental-fillings': {
    name: 'Dental Fillings',
    specialty: 'Dentistry',
    description: 'High-quality dental filling services using modern materials. Restore damaged teeth with durable and aesthetic fillings.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Maria Rodriguez',
        specialization: 'DDS, Restorative Dentist - 10 yrs experience'
      }
    ]
  },
  'dentures': {
    name: 'Dentures',
    specialty: 'Dentistry',
    description: 'Custom-fitted denture services for complete or partial tooth replacement. Comfortable and natural-looking dentures to restore your smile.',
    clinic: 'Central Medical Center',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. David Kim',
        specialization: 'DDS, Prosthodontist - 18 yrs experience'
      }
    ]
  },
  'orthodontics': {
    name: 'Orthodontics',
    specialty: 'Dentistry',
    description: 'Comprehensive orthodontic services including braces and aligners. Straighten your teeth for a beautiful and healthy smile.',
    clinic: 'Willow Grove Clinic',
    clinicLogo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '456 Oak Avenue, Suburb',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Jennifer Park',
        specialization: 'DDS, Orthodontist - 14 yrs experience'
      }
    ]
  },
  'pediatric-dentistry': {
    name: 'Pediatric Dentistry',
    specialty: 'Dentistry',
    description: 'Specialized dental care for children and adolescents. Creating positive dental experiences for young patients with gentle and caring treatment.',
    clinic: 'Maple Leaf Center',
    clinicLogo: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '789 Pine Street, Downtown',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Sarah Martinez',
        specialization: 'DDS, Pediatric Dentist - 9 yrs experience'
      }
    ]
  },
  'root-canal-and-endodontics': {
    name: 'Root Canal & Endodontics',
    specialty: 'Dentistry',
    description: 'Expert root canal treatment and endodontic services to save damaged teeth. Advanced techniques for comfortable and effective treatment.',
    clinic: 'Cedar Medical',
    clinicLogo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '321 Elm Road, Uptown',
    schedule: {
      'Mon': '08:00 - 16:00',
      'Tue': '09:00 - 17:00',
      'Wed': '08:00 - 16:00',
      'Thu': '09:00 - 17:00',
      'Fri': '08:00 - 16:00',
      'Sat': '09:00 - 13:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Thomas Anderson',
        specialization: 'DDS, Endodontist - 16 yrs experience'
      }
    ]
  },
  // Additional services from Index.tsx
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
  'dark-circles-lightening': {
    name: 'Dark Circles Lightening',
    specialty: 'Facial Cleaning Services',
    description: 'Specialized treatment for reducing and lightening dark circles under the eyes. Effective solutions for brighter, more youthful appearance.',
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
    description: 'Fractional laser treatments for skin resurfacing and rejuvenation. Advanced technology for improved skin texture and appearance.',
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
    description: 'Professional chemical peeling treatments for skin renewal and improvement. Safe and effective peeling procedures.',
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
  'filler-injections': {
    name: 'Filler Injections',
    specialty: 'Dermatology',
    description: 'Professional dermal filler injections for facial enhancement and volume restoration. Expert application for natural-looking results.',
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
    description: 'Professional Botox injections for wrinkle reduction and facial rejuvenation. Safe and effective anti-aging treatments.',
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
    description: 'Carbon laser treatments for skin rejuvenation and pore refinement. Advanced laser technology for improved skin texture.',
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
    description: 'Cold peeling treatments for gentle skin exfoliation and renewal. Non-invasive approach for skin improvement.',
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
    description: 'Professional skin bleaching treatments for pigmentation and discoloration. Safe and effective lightening procedures.',
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
    description: 'Comprehensive skin rejuvenation treatments for youthful and healthy-looking skin. Multiple treatment options available.',
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
  },
  // Add remaining services systematically
  'fillings-conservative-dentistry': {
    name: 'Fillings & Conservative Dentistry',
    specialty: 'Dental',
    description: 'Conservative dental treatments including high-quality fillings to restore tooth function and appearance.',
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
        name: 'Dr. Khalil Ibrahim',
        specialization: 'DDS, Restorative Dentist - 15 yrs experience'
      }
    ]
  },
  'oral-health-care-department': {
    name: 'Oral Health Care Department',
    specialty: 'Dental',
    description: 'Comprehensive oral health care services including preventive treatments and oral hygiene education.',
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
        name: 'Dr. Khalil Ibrahim',
        specialization: 'DDS, General Dentist - 15 yrs experience'
      }
    ]
  },
  'cosmetic-veneers': {
    name: 'Cosmetic Veneers (Veneers)',
    specialty: 'Dental',
    description: 'High-quality cosmetic veneers to enhance your smile. Custom-designed porcelain veneers for natural-looking results.',
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
        name: 'Dr. Khalil Ibrahim',
        specialization: 'DDS, Cosmetic Dentist - 15 yrs experience'
      }
    ]
  },
  'dental-prosthetics-tooth-restorations': {
    name: 'Dental Prosthetics / Tooth Restorations',
    specialty: 'Dental',
    description: 'Comprehensive dental prosthetics and tooth restoration services for complete oral rehabilitation.',
    clinic: 'Union Medical Complex',
    clinicLogo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=40&h=40&fit=crop&crop=center&auto=format',
    address: '789 Healthcare Boulevard, Medical District',
    schedule: {
      'Mon': '09:00 - 17:00',
      'Tue': '09:00 - 17:00',
      'Wed': '09:00 - 17:00',
      'Thu': '09:00 - 17:00',
      'Fri': '09:00 - 17:00',
      'Sat': '09:00 - 15:00',
      'Sun': 'Closed'
    },
    doctors: [
      {
        name: 'Dr. Omar Al-Zahra',
        specialization: 'DDS, Prosthodontist - 18 yrs experience'
      }
    ]
  }
};
    ]
  },
  'scar-stretch-marks-removal': {
    name: 'Scar & Stretch Marks Removal',
    specialty: 'Dermatology',
    description: 'Comprehensive treatment for scars and stretch marks using advanced techniques. Effective solutions for skin improvement.',
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
    description: 'Advanced skin tightening and wrinkle removal treatments for anti-aging. Non-invasive procedures for youthful skin.',
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
  'gum-surgery-dental-implants': {
    name: 'Gum Surgery & Dental Implants',
    specialty: 'Dental',
    description: 'Specialized gum surgery and dental implant procedures. Expert surgical care for optimal results.',
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
        name: 'Dr. Khalil Ibrahim',
        specialization: 'DDS, Oral Surgeon - 15 yrs experience'
      }
    ]
  },
  'crowns-dental-prosthetics': {
    name: 'Crowns & Dental Prosthetics',
    specialty: 'Dental',
    description: 'High-quality dental crowns and prosthetics for tooth restoration. Custom-fitted solutions for optimal function.',
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
        name: 'Dr. Khalil Ibrahim',
        specialization: 'DDS, Prosthodontist - 15 yrs experience'
      }
    ]
  },
  'orthodontics-teeth-jaw-alignment': {
    name: 'Orthodontics (Teeth & Jaw Alignment)',
    specialty: 'Dental',
    description: 'Comprehensive orthodontic treatment for teeth and jaw alignment. Modern braces and alignment solutions.',
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
        name: 'Dr. Khalil Ibrahim',
        specialization: 'DDS, Orthodontist - 15 yrs experience'
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
    // Check if user is authenticated before allowing date selection
    if (!user) {
      // Store the intended action for after login
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        serviceId,
        date: format(date, 'yyyy-MM-dd'),
        returnTo: window.location.pathname
      }));
      setIsAuthPromptOpen(true);
      return;
    }
    
    setSelectedDate(date);
    setIsTimeSlotModalOpen(true);
  };

  const handleTimeSlotBook = async (timeSlot: string) => {
    // Double-check authentication before booking
    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }
    
    setSelectedTimeSlot(timeSlot);
    setIsTimeSlotModalOpen(false);
    
    // Create pending booking
    if (selectedDate && serviceData) {
      try {
        const bookingId = await addAppointment({
          doctorName: serviceData.doctors[0]?.name || 'Available Doctor',
          specialty: serviceData.name,
          clinic: serviceData.clinic,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: timeSlot,
          status: 'pending'
        });
        
        setPendingBookingId(bookingId);
        setIsBookingConfirmationOpen(true);
      } catch (error) {
        console.error('Error booking appointment:', error);
      }
    }
  };

  const handleConfirmBooking = async () => {
    if (pendingBookingId) {
      try {
        await confirmAppointment(pendingBookingId);
        setPendingBookingId('');
      } catch (error) {
        console.error('Error confirming appointment:', error);
      }
    }
  };

  // Generate time slots based on service schedule
  const getTimeSlots = (date: Date) => {
    const dayName = format(date, 'EEE');
    const schedule = serviceData.schedule[dayName];
    
    if (!schedule || schedule === 'Closed') return [];
    
    // Parse schedule like "09:00 - 13:00"
    const [startTime, endTime] = schedule.split(' - ');
    const slots = [];
    
    // Generate 30-minute slots
    let current = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    while (current < end) {
      slots.push(format(current, 'h:mma'));
      current.setMinutes(current.getMinutes() + 30);
    }
    
    return slots;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Blue Header Section with Clinic and Service Info */}
      <section className="bg-[#0C2243] text-white py-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Clinic Info */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <img
                src={serviceData.clinicLogo}
                alt={`${serviceData.clinic} logo`}
                className="w-6 h-6 rounded object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{serviceData.clinic}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{serviceData.address}</span>
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{serviceData.name}</h1>
            <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-medium mb-4">
              {serviceData.specialty}
            </div>
            <p className="text-gray-200 leading-relaxed max-w-2xl">
              {serviceData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Service Timing Section */}
      <section className="py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Service Timing</h2>
          
          {/* Calendar Component */}
          <div className="bg-white rounded-lg border p-6 max-w-md mx-auto">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              
              <h3 className="text-base font-medium text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-4">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                <div key={day} className="text-center py-3">
                  <span className="text-xs font-medium text-gray-500">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {(() => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const startDay = monthStart.getDay();
                const paddingDays = startDay === 0 ? 6 : startDay - 1;
                const paddedDays = [];
                
                for (let i = paddingDays; i > 0; i--) {
                  const paddingDate = new Date(monthStart);
                  paddingDate.setDate(paddingDate.getDate() - i);
                  paddedDays.push(paddingDate);
                }
                
                const calendarDays = [...paddedDays, ...allDaysInMonth];
                
                return calendarDays.map((date, index) => {
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const dayName = format(date, 'EEE');
                  const schedule = serviceData.schedule[dayName];
                  const isAvailable = schedule && schedule !== 'Closed' && isAfter(date, startOfDay(new Date()));

                  return (
                    <div key={index} className="aspect-square p-1">
                      <button
                        onClick={() => isAvailable && isCurrentMonth && handleDateSelect(date)}
                        disabled={!isAvailable || !isCurrentMonth}
                        className={`
                          w-full h-full rounded-full text-sm transition-all duration-200 flex items-center justify-center
                          ${!isCurrentMonth 
                            ? 'text-gray-300 cursor-not-allowed' 
                            : isAvailable
                              ? 'cursor-pointer bg-gray-100 text-gray-900 font-bold hover:bg-gray-200'
                              : 'text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        {format(date, 'd')}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Our Doctors Section */}
      <section className="py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Our Doctors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {serviceData.doctors.map((doctor, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{doctor.name}</h3>
                    <p className="text-sm text-gray-600">{doctor.specialization}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BookingConfirmationModal
        isOpen={isBookingConfirmationOpen}
        onClose={() => setIsBookingConfirmationOpen(false)}
        onConfirm={handleConfirmBooking}
        bookingDetails={{
          date: selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '',
          time: selectedTimeSlot,
          service: serviceData.name,
          clinic: serviceData.clinic
        }}
      />

      <TimeSlotModal
        isOpen={isTimeSlotModalOpen}
        onClose={() => setIsTimeSlotModalOpen(false)}
        selectedDate={selectedDate}
        timeSlots={selectedDate ? getTimeSlots(selectedDate) : []}
        onBookAppointment={handleTimeSlotBook}
      />

      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />
    </div>
  );
};

export default ServiceDetails;