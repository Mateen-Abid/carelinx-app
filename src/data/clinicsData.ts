// New clinic and service data structure
export interface ServiceItem {
  id: string;
  name: string;
  category: string;
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
    type: 'Medical Clinic',
    logo: '/src/assets/P.svg',
    timing: '9:00 AM – 6:00 PM',
    daysOpen: 'Mon – Sat',
    doctorCount: '15 Doctors available',
    categories: {
      'Facial Cleaning Services': [
        { id: 'laser-sessions', name: 'Laser Sessions', category: 'Facial Cleaning Services' },
        { id: 'plasma-sessions', name: 'Plasma Sessions', category: 'Facial Cleaning Services' },
        { id: 'scar-treatments', name: 'Scar Treatments', category: 'Facial Cleaning Services' },
        { id: 'fat-reduction', name: 'Fat Reduction', category: 'Facial Cleaning Services' },
        { id: 'cosmetic-injections', name: 'Cosmetic Injections', category: 'Facial Cleaning Services' },
        { id: 'dark-circles-lightening', name: 'Dark Circles Lightening', category: 'Facial Cleaning Services' },
        { id: 'fractional-laser-sessions', name: 'Fractional Laser Sessions', category: 'Facial Cleaning Services' },
        { id: 'chemical-peeling-sessions', name: 'Chemical Peeling Sessions', category: 'Facial Cleaning Services' }
      ],
      'Dental': [
        { id: 'teeth-whitening', name: 'Teeth Whitening', category: 'Dental' },
        { id: 'teeth-cleaning', name: 'Teeth Cleaning', category: 'Dental' },
        { id: 'polishing-scaling', name: 'Polishing & Scaling', category: 'Dental' },
        { id: 'dental-fillings', name: 'Dental Fillings', category: 'Dental' },
        { id: 'dentures', name: 'Dentures', category: 'Dental' },
        { id: 'orthodontics', name: 'Orthodontics', category: 'Dental' }
      ]
    }
  },
  {
    id: 'esan-clinic',
    name: 'Esan Clinic',
    address: '456 Health Avenue, Medical District',
    type: 'Specialized Clinic',
    logo: '/src/assets/E.svg',
    timing: '8:00 AM – 8:00 PM',
    daysOpen: 'Mon – Sun',
    doctorCount: '25 Doctors available',
    categories: {
      'Dermatology': [
        { id: 'laser-hair-removal', name: 'Laser Hair Removal', category: 'Dermatology' },
        { id: 'filler-injections', name: 'Filler Injections', category: 'Dermatology' },
        { id: 'botox-injections', name: 'Botox Injections', category: 'Dermatology' },
        { id: 'carbon-laser', name: 'Carbon Laser', category: 'Dermatology' },
        { id: 'cold-peeling', name: 'Cold Peeling', category: 'Dermatology' },
        { id: 'bleaching', name: 'Bleaching', category: 'Dermatology' },
        { id: 'skin-rejuvenation', name: 'Skin Rejuvenation', category: 'Dermatology' },
        { id: 'scar-stretch-marks-removal', name: 'Scar & Stretch Marks Removal', category: 'Dermatology' },
        { id: 'skin-tightening-wrinkle-removal', name: 'Skin Tightening & Wrinkle Removal', category: 'Dermatology' }
      ],
      'Dental': [
        { id: 'gum-surgery-dental-implants', name: 'Gum Surgery & Dental Implants', category: 'Dental' },
        { id: 'crowns-dental-prosthetics', name: 'Crowns & Dental Prosthetics', category: 'Dental' },
        { id: 'orthodontics-teeth-jaw', name: 'Orthodontics (Teeth & Jaw Alignment)', category: 'Dental' },
        { id: 'root-canal-endodontics', name: 'Root Canal & Endodontics', category: 'Dental' },
        { id: 'fillings-conservative-dentistry', name: 'Fillings & Conservative Dentistry', category: 'Dental' },
        { id: 'oral-health-care-department', name: 'Oral Health Care Department', category: 'Dental' },
        { id: 'pediatric-dentistry', name: 'Pediatric Dentistry', category: 'Dental' },
        { id: 'cosmetic-veneers', name: 'Cosmetic Veneers (Veneers)', category: 'Dental' }
      ]
    }
  },
  {
    id: 'union-medical-complex',
    name: 'Union Medical Complex Clinic',
    address: '789 Union Street, Central City',
    type: 'Medical Complex',
    logo: '/src/assets/U.svg',
    timing: '7:00 AM – 9:00 PM',
    daysOpen: 'Mon – Sat',
    doctorCount: '20 Doctors available',
    categories: {
      'Dental': [
        { id: 'dental-prosthetics-tooth-restorations', name: 'Dental Prosthetics / Tooth Restorations', category: 'Dental' },
        { id: 'oral-dental-surgery', name: 'Oral and Dental Surgery', category: 'Dental' },
        { id: 'intraoral-camera-service', name: 'Intraoral Camera Service', category: 'Dental' },
        { id: 'laser-teeth-whitening', name: 'Laser Teeth Whitening', category: 'Dental' },
        { id: 'root-canal-treatment', name: 'Root Canal Treatment', category: 'Dental' },
        { id: 'pediatric-dental-treatment', name: 'Pediatric Dental Treatment', category: 'Dental' },
        { id: 'gum-treatment-periodontal-care', name: 'Gum Treatment / Periodontal Care', category: 'Dental' },
        { id: 'orthodontics-union', name: 'Orthodontics', category: 'Dental' },
        { id: 'hollywood-smile', name: 'Hollywood Smile', category: 'Dental' },
        { id: 'cosmetic-fillings', name: 'Cosmetic Fillings', category: 'Dental' }
      ]
    }
  },
  {
    id: 'oracare-clinic',
    name: 'Oracare Clinic',
    address: '321 Dental Plaza, Healthcare District',
    type: 'Dental Clinic',
    logo: '/src/assets/O.svg',
    timing: '8:00 AM – 7:00 PM',
    daysOpen: 'Mon – Fri',
    doctorCount: '30 Doctors available',
    categories: {
      'Orthodontics': [
        { id: 'clear-aligners', name: 'Clear Aligners', category: 'Orthodontics' },
        { id: 'metal-braces', name: 'Metal Braces', category: 'Orthodontics' },
        { id: 'surgical-orthodontics', name: 'Surgical Orthodontics', category: 'Orthodontics' },
        { id: 'auxiliary-orthodontics', name: 'Auxiliary Orthodontics', category: 'Orthodontics' },
        { id: 'pediatric-orthodontics', name: 'Pediatric Orthodontics', category: 'Orthodontics' },
        { id: 'temporary-anchorage-devices', name: 'Temporary Anchorage Devices (TADs)', category: 'Orthodontics' }
      ],
      'Dental Implants': [
        { id: 'bone-grafting', name: 'Bone Grafting', category: 'Dental Implants' },
        { id: 'sinus-lifting', name: 'Sinus Lifting', category: 'Dental Implants' },
        { id: 'biohorizons-dental-implants', name: 'Biohorizons Dental Implants (USA)', category: 'Dental Implants' },
        { id: 'peri-implantitis-treatment', name: 'Peri-implantitis Treatment', category: 'Dental Implants' },
        { id: 'dental-implant-removal', name: 'Dental Implant Removal', category: 'Dental Implants' },
        { id: 'straumann-dental-implants', name: 'Straumann Dental Implants (Switzerland)', category: 'Dental Implants' }
      ],
      'Pediatric Dentistry': [
        { id: 'preventive-care', name: 'Preventive Care', category: 'Pediatric Dentistry' },
        { id: 'crowns-damaged-teeth', name: 'Crowns for Damaged Teeth', category: 'Pediatric Dentistry' },
        { id: 'emergency-trauma-management', name: 'Emergency Trauma Management', category: 'Pediatric Dentistry' },
        { id: 'early-caries-management', name: 'Early Caries Management', category: 'Pediatric Dentistry' },
        { id: 'fillings-pulp-therapy', name: 'Fillings & Pulp Therapy', category: 'Pediatric Dentistry' },
        { id: 'care-special-needs-children', name: 'Care for Special Needs Children', category: 'Pediatric Dentistry' },
        { id: 'jaw-growth-monitoring', name: 'Jaw Growth Monitoring', category: 'Pediatric Dentistry' },
        { id: 'dental-examination-assessment', name: 'Dental Examination & Assessment', category: 'Pediatric Dentistry' }
      ],
      'Fixed & Removable Prosthodontics': [
        { id: 'complete-partial-removable-dentures', name: 'Complete & Partial Removable Dentures', category: 'Fixed & Removable Prosthodontics' },
        { id: 'implant-supported-fixed-prosthesis', name: 'Implant-Supported Fixed Prosthesis', category: 'Fixed & Removable Prosthodontics' },
        { id: 'implant-supported-removable-prosthesis', name: 'Implant-Supported Removable Prosthesis', category: 'Fixed & Removable Prosthodontics' },
        { id: 'full-partial-crowns', name: 'Full & Partial Crowns', category: 'Fixed & Removable Prosthodontics' },
        { id: 'post-core-restorations', name: 'Post and Core for Restorations', category: 'Fixed & Removable Prosthodontics' },
        { id: 'dental-bridges', name: 'Dental Bridges', category: 'Fixed & Removable Prosthodontics' },
        { id: 'in-office-teeth-whitening', name: 'In-Office Teeth Whitening', category: 'Fixed & Removable Prosthodontics' },
        { id: 'at-home-teeth-whitening', name: 'At-Home Teeth Whitening', category: 'Fixed & Removable Prosthodontics' },
        { id: 'porcelain-veneers', name: 'Porcelain Veneers', category: 'Fixed & Removable Prosthodontics' }
      ],
      'Restorative & Cosmetic Dentistry': [
        { id: 'cosmetic-fillings-restorative', name: 'Cosmetic Fillings', category: 'Restorative & Cosmetic Dentistry' },
        { id: 'tooth-reconstruction', name: 'Tooth Reconstruction', category: 'Restorative & Cosmetic Dentistry' },
        { id: 'dental-crowns-cosmetic', name: 'Dental Crowns', category: 'Restorative & Cosmetic Dentistry' },
        { id: 'aesthetic-veneers', name: 'Aesthetic Veneers', category: 'Restorative & Cosmetic Dentistry' },
        { id: 'in-office-whitening-cosmetic', name: 'In-Office Whitening', category: 'Restorative & Cosmetic Dentistry' },
        { id: 'take-home-whitening', name: 'Take-Home Whitening', category: 'Restorative & Cosmetic Dentistry' },
        { id: 'stain-removal-without-preparation', name: 'Stain Removal Without Tooth Preparation', category: 'Restorative & Cosmetic Dentistry' }
      ],
      'Root Canal & Endodontics': [
        { id: 'root-canal-treatment-all-teeth', name: 'Root Canal Treatment for All Teeth', category: 'Root Canal & Endodontics' },
        { id: 'emergency-root-canal-treatment', name: 'Emergency Root Canal Treatment', category: 'Root Canal & Endodontics' },
        { id: 'retreatment-failed-root-canals', name: 'Retreatment of Failed Root Canals', category: 'Root Canal & Endodontics' },
        { id: 'removal-intracanal-posts', name: 'Removal of Intracanal Posts', category: 'Root Canal & Endodontics' },
        { id: 'abscess-treatment', name: 'Abscess Treatment', category: 'Root Canal & Endodontics' }
      ],
      'Periodontal Treatment': [
        { id: 'gum-disease-periodontal-pocket-treatment', name: 'Gum Disease & Periodontal Pocket Treatment', category: 'Periodontal Treatment' },
        { id: 'scaling-stain-removal', name: 'Scaling and Stain Removal', category: 'Periodontal Treatment' },
        { id: 'surgical-gummy-smile-correction', name: 'Surgical Gummy Smile Correction', category: 'Periodontal Treatment' },
        { id: 'gum-contouring-depigmentation-laser', name: 'Gum Contouring and Depigmentation with Laser', category: 'Periodontal Treatment' },
        { id: 'tooth-splinting', name: 'Tooth Splinting', category: 'Periodontal Treatment' }
      ],
      'Oral & Maxillofacial Surgery': [
        { id: 'simple-surgical-tooth-extractions', name: 'Simple & Surgical Tooth Extractions', category: 'Oral & Maxillofacial Surgery' },
        { id: 'orthognathic-jaw-surgery', name: 'Orthognathic (Jaw) Surgery', category: 'Oral & Maxillofacial Surgery' },
        { id: 'removal-cysts-lipomas', name: 'Removal of Cysts (Lipomas/Fatty Masses)', category: 'Oral & Maxillofacial Surgery' },
        { id: 'correction-congenital-malformations', name: 'Correction of Congenital Malformations', category: 'Oral & Maxillofacial Surgery' },
        { id: 'salivary-gland-tumor-treatment', name: 'Salivary Gland Tumor Treatment', category: 'Oral & Maxillofacial Surgery' },
        { id: 'oral-facial-aesthetic-surgery', name: 'Oral & Facial Aesthetic Surgery', category: 'Oral & Maxillofacial Surgery' }
      ],
      'General Dentistry': [
        { id: 'dental-checkup-diagnosis', name: 'Dental Check-up & Diagnosis', category: 'General Dentistry' },
        { id: 'conservative-dental-treatment', name: 'Conservative Dental Treatment', category: 'General Dentistry' },
        { id: 'emergency-dental-care', name: 'Emergency Dental Care', category: 'General Dentistry' },
        { id: 'dental-cleaning-general', name: 'Dental Cleaning', category: 'General Dentistry' },
        { id: 'root-canal-therapy-general', name: 'Root Canal Therapy', category: 'General Dentistry' },
        { id: 'tooth-extraction-general', name: 'Tooth Extraction', category: 'General Dentistry' }
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