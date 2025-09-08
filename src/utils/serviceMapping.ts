// Utility function to convert service names to URL-friendly slugs
export const createServiceSlug = (serviceName: string): string => {
  return serviceName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

// Complete mapping of all services from Index.tsx to their corresponding database keys
export const serviceNameToSlugMap: { [key: string]: string } = {
  // Facial Cleaning Services - Panorama Medical Clinic
  'Laser Sessions': 'facial-laser-sessions',
  'Plasma Sessions': 'facial-plasma-sessions',
  'Scar Treatments': 'scar-treatments',
  'Fat Reduction': 'fat-reduction',
  'Cosmetic Injections': 'cosmetic-injections',
  'Dark Circles Lightening': 'dark-circles-lightening',
  'Fractional Laser Sessions': 'fractional-laser-sessions',
  'Chemical Peeling Sessions': 'chemical-peeling-sessions',
  
  // Dental Services - Panorama Medical Clinic
  'Teeth Whitening': 'teeth-whitening',
  'Teeth Cleaning': 'teeth-cleaning',
  'Polishing & Scaling': 'polishing-scaling',
  'Dental Fillings': 'dental-fillings',
  'Dentures': 'dentures',
  'Orthodontics': 'orthodontics',
  
  // Dermatology - Esan Clinic
  'Laser Hair Removal': 'laser-hair-removal',
  'Filler Injections': 'filler-injections',
  'Botox Injections': 'botox-injections',
  'Carbon Laser': 'carbon-laser',
  'Cold Peeling': 'cold-peeling',
  'Bleaching': 'bleaching',
  'Skin Rejuvenation': 'skin-rejuvenation',
  'Scar & Stretch Marks Removal': 'scar-stretch-marks-removal',
  'Skin Tightening & Wrinkle Removal': 'skin-tightening-wrinkle-removal',
  
  // Additional Dental Services from other clinics
  'Gum Surgery & Dental Implants': 'gum-surgery-dental-implants',
  'Crowns & Dental Prosthetics': 'crowns-dental-prosthetics',
  'Orthodontics (Teeth & Jaw Alignment)': 'orthodontics-teeth-jaw-alignment',
  'Root Canal & Endodontics': 'root-canal-and-endodontics',
  'Fillings & Conservative Dentistry': 'fillings-conservative-dentistry',
  'Oral Health Care Department': 'oral-health-care-department',
  'Pediatric Dentistry': 'pediatric-dentistry',
  'Cosmetic Veneers (Veneers)': 'cosmetic-veneers',
  'Dental Prosthetics / Tooth Restorations': 'dental-prosthetics-tooth-restorations',
  'Oral and Dental Surgery': 'oral-dental-surgery',
  'Intraoral Camera Service': 'intraoral-camera-service',
  'Laser Teeth Whitening': 'laser-teeth-whitening',
  'Root Canal Treatment': 'root-canal-treatment',
  'Pediatric Dental Treatment': 'pediatric-dental-treatment',
  'Gum Treatment / Periodontal Care': 'gum-treatment-periodontal-care',
  'Hollywood Smile': 'hollywood-smile',
  'Cosmetic Fillings': 'cosmetic-fillings',
  
  // General medical services
  'ECG': 'ecg',
  'X-Ray': 'x-ray',
  'Brain Scans': 'brain-scans',
  'Retinal Care': 'retinal-care',
  'Ultrasound': 'ultrasound',
  'Acne Treatment': 'acne-treatment'
};