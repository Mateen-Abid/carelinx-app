// New clinic and service data structure
export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  doctorName: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  type: string;
  logo: string;
  timing: string;
  daysOpen: string;
  doctorCount: string;
  categories: {
    [categoryName: string]: ServiceItem[];
  };
}

export const clinicsData: Clinic[] = [
  {
    id: 'panorama-medical',
    name: 'Panorama Medical Clinic',
    address: '123 Medical Plaza, Downtown',
    type: '',
    logo: '/src/assets/P.svg',
    timing: '9:00 AM – 6:00 PM',
    daysOpen: 'Mon – Sat',
    doctorCount: '15 Doctors available',
    categories: {
      'Dermatology': [
        { id: 'acne-treatment', name: 'Acne Treatment', category: 'Dermatology', doctorName: 'Dr. Sarah Ahmed' },
        { id: 'skin-consultation', name: 'Skin Consultation', category: 'Dermatology', doctorName: 'Dr. Michael Chen' },
        { id: 'mole-removal', name: 'Mole Removal', category: 'Dermatology', doctorName: 'Dr. Sarah Ahmed' },
        { id: 'skin-cancer-screening', name: 'Skin Cancer Screening', category: 'Dermatology', doctorName: 'Dr. Michael Chen' },
        { id: 'psoriasis-treatment', name: 'Psoriasis Treatment', category: 'Dermatology', doctorName: 'Dr. Sarah Ahmed' },
        { id: 'eczema-treatment', name: 'Eczema Treatment', category: 'Dermatology', doctorName: 'Dr. Michael Chen' },
        { id: 'dermatitis-treatment', name: 'Dermatitis Treatment', category: 'Dermatology', doctorName: 'Dr. Sarah Ahmed' },
        { id: 'skin-biopsy', name: 'Skin Biopsy', category: 'Dermatology', doctorName: 'Dr. Michael Chen' }
      ],
      'Dental': [
        { id: 'teeth-whitening', name: 'Teeth Whitening', category: 'Dental', doctorName: 'Dr. Abdullah Hassan' },
        { id: 'teeth-cleaning', name: 'Teeth Cleaning', category: 'Dental', doctorName: 'Dr. Abdullah Hassan' },
        { id: 'polishing-scaling', name: 'Polishing & Scaling', category: 'Dental', doctorName: 'Dr. Abdullah Hassan' },
        { id: 'dental-fillings', name: 'Dental Fillings', category: 'Dental', doctorName: 'Dr. Abdullah Hassan' },
        { id: 'dentures', name: 'Dentures', category: 'Dental', doctorName: 'Dr. Abdullah Hassan' },
        { id: 'orthodontics', name: 'Orthodontics', category: 'Dental', doctorName: 'Dr. Abdullah Hassan' }
      ]
    }
  },
  {
    id: 'esan-clinic',
    name: 'Esan Clinic',
    address: '456 Health Avenue, Medical District',
    type: '',
    logo: '/src/assets/E.svg',
    timing: '8:00 AM – 8:00 PM',
    daysOpen: 'Mon – Sun',
    doctorCount: '25 Doctors available',
    categories: {
      'Dermatology': [
        { id: 'laser-hair-removal', name: 'Laser Hair Removal', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'filler-injections', name: 'Filler Injections', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'botox-injections', name: 'Botox Injections', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'carbon-laser', name: 'Carbon Laser', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'cold-peeling', name: 'Cold Peeling', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'bleaching', name: 'Bleaching', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'skin-rejuvenation', name: 'Skin Rejuvenation', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'scar-stretch-marks-removal', name: 'Scar & Stretch Marks Removal', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' },
        { id: 'skin-tightening-wrinkle-removal', name: 'Skin Tightening & Wrinkle Removal', category: 'Dermatology', doctorName: 'Dr. Fatima Al-Zahra' }
      ],
      'Dental': [
        { id: 'gum-surgery-dental-implants', name: 'Gum Surgery & Dental Implants', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'crowns-dental-prosthetics', name: 'Crowns & Dental Prosthetics', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'orthodontics-teeth-jaw', name: 'Orthodontics (Teeth & Jaw Alignment)', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'root-canal-endodontics', name: 'Root Canal & Endodontics', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'fillings-conservative-dentistry', name: 'Fillings & Conservative Dentistry', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'oral-health-care-department', name: 'Oral Health Care Department', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'pediatric-dentistry', name: 'Pediatric Dentistry', category: 'Dental', doctorName: 'Dr. Omar Khalil' },
        { id: 'cosmetic-veneers', name: 'Cosmetic Veneers (Veneers)', category: 'Dental', doctorName: 'Dr. Omar Khalil' }
      ]
    }
  },
  {
    id: 'union-medical-complex',
    name: 'Union Medical Complex Clinic',
    address: '789 Union Street, Central City',
    type: '',
    logo: '/src/assets/U.svg',
    timing: '7:00 AM – 9:00 PM',
    daysOpen: 'Mon – Sat',
    doctorCount: '20 Doctors available',
    categories: {
      'Dental': [
        { id: 'dental-prosthetics-tooth-restorations', name: 'Dental Prosthetics / Tooth Restorations', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'oral-dental-surgery', name: 'Oral and Dental Surgery', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'intraoral-camera-service', name: 'Intraoral Camera Service', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'laser-teeth-whitening', name: 'Laser Teeth Whitening', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'root-canal-treatment', name: 'Root Canal Treatment', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'pediatric-dental-treatment', name: 'Pediatric Dental Treatment', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'gum-treatment-periodontal-care', name: 'Gum Treatment / Periodontal Care', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'orthodontics-union', name: 'Orthodontics', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'hollywood-smile', name: 'Hollywood Smile', category: 'Dental', doctorName: 'Dr. Aisha Rahman' },
        { id: 'cosmetic-fillings', name: 'Cosmetic Fillings', category: 'Dental', doctorName: 'Dr. Aisha Rahman' }
      ]
    }
  },
  {
    id: 'oracare-clinic',
    name: 'Oracare Clinic',
    address: '321 Dental Plaza, Healthcare District',
    type: '',
    logo: '/src/assets/O.svg',
    timing: '8:00 AM – 7:00 PM',
    daysOpen: 'Mon – Fri',
    doctorCount: '30 Doctors available',
    categories: {
      'Orthodontics': [
        { id: 'clear-aligners', name: 'Clear Aligners', category: 'Orthodontics', doctorName: 'Dr. Youssef Al-Mansouri' },
        { id: 'metal-braces', name: 'Metal Braces', category: 'Orthodontics', doctorName: 'Dr. Youssef Al-Mansouri' },
        { id: 'surgical-orthodontics', name: 'Surgical Orthodontics', category: 'Orthodontics', doctorName: 'Dr. Youssef Al-Mansouri' },
        { id: 'auxiliary-orthodontics', name: 'Auxiliary Orthodontics', category: 'Orthodontics', doctorName: 'Dr. Youssef Al-Mansouri' },
        { id: 'pediatric-orthodontics', name: 'Pediatric Orthodontics', category: 'Orthodontics', doctorName: 'Dr. Youssef Al-Mansouri' },
        { id: 'temporary-anchorage-devices', name: 'Temporary Anchorage Devices (TADs)', category: 'Orthodontics', doctorName: 'Dr. Youssef Al-Mansouri' }
      ],
      'Dental Implants': [
        { id: 'bone-grafting', name: 'Bone Grafting', category: 'Dental Implants', doctorName: 'Dr. Khalid Al-Rashid' },
        { id: 'sinus-lifting', name: 'Sinus Lifting', category: 'Dental Implants', doctorName: 'Dr. Khalid Al-Rashid' },
        { id: 'biohorizons-dental-implants', name: 'Biohorizons Dental Implants (USA)', category: 'Dental Implants', doctorName: 'Dr. Khalid Al-Rashid' },
        { id: 'peri-implantitis-treatment', name: 'Peri-implantitis Treatment', category: 'Dental Implants', doctorName: 'Dr. Khalid Al-Rashid' },
        { id: 'dental-implant-removal', name: 'Dental Implant Removal', category: 'Dental Implants', doctorName: 'Dr. Khalid Al-Rashid' },
        { id: 'straumann-dental-implants', name: 'Straumann Dental Implants (Switzerland)', category: 'Dental Implants', doctorName: 'Dr. Khalid Al-Rashid' }
      ],
      'Pediatric Dentistry': [
        { id: 'preventive-care', name: 'Preventive Care', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'crowns-damaged-teeth', name: 'Crowns for Damaged Teeth', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'emergency-trauma-management', name: 'Emergency Trauma Management', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'early-caries-management', name: 'Early Caries Management', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'fillings-pulp-therapy', name: 'Fillings & Pulp Therapy', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'care-special-needs-children', name: 'Care for Special Needs Children', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'jaw-growth-monitoring', name: 'Jaw Growth Monitoring', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' },
        { id: 'dental-examination-assessment', name: 'Dental Examination & Assessment', category: 'Pediatric Dentistry', doctorName: 'Dr. Layla Al-Mahmoud' }
      ],
      'Fixed & Removable Prosthodontics': [
        { id: 'complete-partial-removable-dentures', name: 'Complete & Partial Removable Dentures', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'implant-supported-fixed-prosthesis', name: 'Implant-Supported Fixed Prosthesis', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'implant-supported-removable-prosthesis', name: 'Implant-Supported Removable Prosthesis', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'full-partial-crowns', name: 'Full & Partial Crowns', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'post-core-restorations', name: 'Post and Core for Restorations', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'dental-bridges', name: 'Dental Bridges', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'in-office-teeth-whitening', name: 'In-Office Teeth Whitening', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'at-home-teeth-whitening', name: 'At-Home Teeth Whitening', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' },
        { id: 'porcelain-veneers', name: 'Porcelain Veneers', category: 'Fixed & Removable Prosthodontics', doctorName: 'Dr. Nasser Al-Hassan' }
      ],
      'Restorative & Cosmetic Dentistry': [
        { id: 'cosmetic-fillings-restorative', name: 'Cosmetic Fillings', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' },
        { id: 'tooth-reconstruction', name: 'Tooth Reconstruction', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' },
        { id: 'dental-crowns-cosmetic', name: 'Dental Crowns', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' },
        { id: 'aesthetic-veneers', name: 'Aesthetic Veneers', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' },
        { id: 'in-office-whitening-cosmetic', name: 'In-Office Whitening', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' },
        { id: 'take-home-whitening', name: 'Take-Home Whitening', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' },
        { id: 'stain-removal-without-preparation', name: 'Stain Removal Without Tooth Preparation', category: 'Restorative & Cosmetic Dentistry', doctorName: 'Dr. Mariam Al-Zahra' }
      ],
      'Root Canal & Endodontics': [
        { id: 'root-canal-treatment-all-teeth', name: 'Root Canal Treatment for All Teeth', category: 'Root Canal & Endodontics', doctorName: 'Dr. Ahmed Al-Sabah' },
        { id: 'emergency-root-canal-treatment', name: 'Emergency Root Canal Treatment', category: 'Root Canal & Endodontics', doctorName: 'Dr. Ahmed Al-Sabah' },
        { id: 'retreatment-failed-root-canals', name: 'Retreatment of Failed Root Canals', category: 'Root Canal & Endodontics', doctorName: 'Dr. Ahmed Al-Sabah' },
        { id: 'removal-intracanal-posts', name: 'Removal of Intracanal Posts', category: 'Root Canal & Endodontics', doctorName: 'Dr. Ahmed Al-Sabah' },
        { id: 'abscess-treatment', name: 'Abscess Treatment', category: 'Root Canal & Endodontics', doctorName: 'Dr. Ahmed Al-Sabah' }
      ],
      'Periodontal Treatment': [
        { id: 'gum-disease-periodontal-pocket-treatment', name: 'Gum Disease & Periodontal Pocket Treatment', category: 'Periodontal Treatment', doctorName: 'Dr. Zainab Al-Mutairi' },
        { id: 'scaling-stain-removal', name: 'Scaling and Stain Removal', category: 'Periodontal Treatment', doctorName: 'Dr. Zainab Al-Mutairi' },
        { id: 'surgical-gummy-smile-correction', name: 'Surgical Gummy Smile Correction', category: 'Periodontal Treatment', doctorName: 'Dr. Zainab Al-Mutairi' },
        { id: 'gum-contouring-depigmentation-laser', name: 'Gum Contouring and Depigmentation with Laser', category: 'Periodontal Treatment', doctorName: 'Dr. Zainab Al-Mutairi' },
        { id: 'tooth-splinting', name: 'Tooth Splinting', category: 'Periodontal Treatment', doctorName: 'Dr. Zainab Al-Mutairi' }
      ],
      'Oral & Maxillofacial Surgery': [
        { id: 'simple-surgical-tooth-extractions', name: 'Simple & Surgical Tooth Extractions', category: 'Oral & Maxillofacial Surgery', doctorName: 'Dr. Tariq Al-Mahmoud' },
        { id: 'orthognathic-jaw-surgery', name: 'Orthognathic (Jaw) Surgery', category: 'Oral & Maxillofacial Surgery', doctorName: 'Dr. Tariq Al-Mahmoud' },
        { id: 'removal-cysts-lipomas', name: 'Removal of Cysts (Lipomas/Fatty Masses)', category: 'Oral & Maxillofacial Surgery', doctorName: 'Dr. Tariq Al-Mahmoud' },
        { id: 'correction-congenital-malformations', name: 'Correction of Congenital Malformations', category: 'Oral & Maxillofacial Surgery', doctorName: 'Dr. Tariq Al-Mahmoud' },
        { id: 'salivary-gland-tumor-treatment', name: 'Salivary Gland Tumor Treatment', category: 'Oral & Maxillofacial Surgery', doctorName: 'Dr. Tariq Al-Mahmoud' },
        { id: 'oral-facial-aesthetic-surgery', name: 'Oral & Facial Aesthetic Surgery', category: 'Oral & Maxillofacial Surgery', doctorName: 'Dr. Tariq Al-Mahmoud' }
      ],
      'General Dentistry': [
        { id: 'dental-checkup-diagnosis', name: 'Dental Check-up & Diagnosis', category: 'General Dentistry', doctorName: 'Dr. Hala Al-Rashid' },
        { id: 'conservative-dental-treatment', name: 'Conservative Dental Treatment', category: 'General Dentistry', doctorName: 'Dr. Hala Al-Rashid' },
        { id: 'emergency-dental-care', name: 'Emergency Dental Care', category: 'General Dentistry', doctorName: 'Dr. Hala Al-Rashid' },
        { id: 'dental-cleaning-general', name: 'Dental Cleaning', category: 'General Dentistry', doctorName: 'Dr. Hala Al-Rashid' },
        { id: 'root-canal-therapy-general', name: 'Root Canal Therapy', category: 'General Dentistry', doctorName: 'Dr. Hala Al-Rashid' },
        { id: 'tooth-extraction-general', name: 'Tooth Extraction', category: 'General Dentistry', doctorName: 'Dr. Hala Al-Rashid' }
      ]
    }
  }
];

// Helper function to get all services across all clinics
export const getAllServices = (): ServiceItem[] => {
  const allServices: ServiceItem[] = [];
  
  clinicsData.forEach(clinic => {
    Object.values(clinic.categories).forEach(services => {
      allServices.push(...services);
    });
  });
  
  return allServices;
};

// Helper function to get all categories
export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  
  clinicsData.forEach(clinic => {
    Object.keys(clinic.categories).forEach(category => {
      categories.add(category);
    });
  });
  
  return Array.from(categories);
};

// Helper function to get clinic by service ID
export const getClinicByServiceId = (serviceId: string): Clinic | null => {
  for (const clinic of clinicsData) {
    for (const services of Object.values(clinic.categories)) {
      if (services.find(service => service.id === serviceId)) {
        return clinic;
      }
    }
  }
  return null;
};

// Helper function to get service by ID
export const getServiceById = (serviceId: string): ServiceItem | null => {
  for (const clinic of clinicsData) {
    for (const services of Object.values(clinic.categories)) {
      const service = services.find(service => service.id === serviceId);
      if (service) {
        return service;
      }
    }
  }
  return null;
};