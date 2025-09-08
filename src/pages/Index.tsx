import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ServicesFilter from '@/components/ServicesFilter';
import ServiceCard from '@/components/ServiceCard';
import ClinicCard from '@/components/ClinicCard';
import BottomNavigation from '@/components/BottomNavigation';
import SearchInput from '@/components/SearchInput';
import { BookingModal } from '@/components/BookingModal';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'services' | 'clinics'>('services');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const serviceCards = [
    // Panorama Medical Clinic - Facial Cleaning Services
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Laser Sessions",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Plasma Sessions",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Scar Treatments",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Fat Reduction",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Cosmetic Injections",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Dark Circles Lightening",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Fractional Laser Sessions",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Chemical Peeling Sessions",
      specialty: "Facial Cleaning Services",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    // Panorama Medical Clinic - Dental
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Teeth Whitening",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Teeth Cleaning",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Polishing & Scaling",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Dental Fillings",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Dentures",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      serviceName: "Orthodontics",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    // Esan Clinic - Dermatology
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Laser Hair Removal",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Filler Injections",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Botox Injections",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Carbon Laser",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Cold Peeling",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Bleaching",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Skin Rejuvenation",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Scar & Stretch Marks Removal",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Skin Tightening & Wrinkle Removal",
      specialty: "Dermatology",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    // Esan Clinic - Dental
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Gum Surgery & Dental Implants",
      specialty: "Dental",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Crowns & Dental Prosthetics",
      specialty: "Dental",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Orthodontics (Teeth & Jaw Alignment)",
      specialty: "Dental",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Root Canal & Endodontics",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Fillings & Conservative Dentistry",
      specialty: "Dental",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Oral Health Care Department",
      specialty: "Dental",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Pediatric Dentistry",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      serviceName: "Cosmetic Veneers (Veneers)",
      specialty: "Dental",
      timeSchedule: "8:00 AM – 7:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    // Union Medical Complex Clinic - Dental
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Dental Prosthetics / Tooth Restorations",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Oral and Dental Surgery",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Intraoral Camera Service",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Laser Teeth Whitening",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Root Canal Treatment",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Pediatric Dental Treatment",
      specialty: "Pediatric Dentistry",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Gum Treatment / Periodontal Care",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Orthodontics",
      specialty: "Orthodontics",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Hollywood Smile",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      serviceName: "Cosmetic Fillings",
      specialty: "Dental",
      timeSchedule: "9:00 AM – 5:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Orthodontics
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Clear Aligners",
      specialty: "Orthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Metal Braces",
      specialty: "Orthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Surgical Orthodontics",
      specialty: "Orthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Auxiliary Orthodontics",
      specialty: "Orthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Pediatric Orthodontics",
      specialty: "Orthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Temporary Anchorage Devices (TADs)",
      specialty: "Orthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Dental Implants
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Bone Grafting",
      specialty: "Dental Implants",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Sinus Lifting",
      specialty: "Dental Implants",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Biohorizons Dental Implants (USA)",
      specialty: "Dental Implants",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Peri-implantitis Treatment",
      specialty: "Dental Implants",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Dental Implant Removal",
      specialty: "Dental Implants",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Straumann Dental Implants (Switzerland)",
      specialty: "Dental Implants",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Pediatric Dentistry
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Preventive Care",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Crowns for Damaged Teeth",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Emergency Trauma Management",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Early Caries Management",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Fillings & Pulp Therapy",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Care for Special Needs Children",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Jaw Growth Monitoring",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Dental Examination & Assessment",
      specialty: "Pediatric Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Fixed & Removable Prosthodontics
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Complete & Partial Removable Dentures",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Implant-Supported Fixed Prosthesis",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Implant-Supported Removable Prosthesis",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Full & Partial Crowns",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Post and Core for Restorations",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Dental Bridges",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "In-Office Teeth Whitening",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "At-Home Teeth Whitening",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Porcelain Veneers",
      specialty: "Fixed & Removable Prosthodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Restorative & Cosmetic Dentistry
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Cosmetic Fillings",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Tooth Reconstruction",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Dental Crowns",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Aesthetic Veneers",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "In-Office Whitening",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Take-Home Whitening",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Stain Removal Without Tooth Preparation",
      specialty: "Restorative & Cosmetic Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Root Canal & Endodontics
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Root Canal Treatment for All Teeth",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Emergency Root Canal Treatment",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Retreatment of Failed Root Canals",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Removal of Intracanal Posts",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Abscess Treatment",
      specialty: "Root Canal & Endodontics",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Periodontal Treatment
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Gum Disease & Periodontal Pocket Treatment",
      specialty: "Periodontal Treatment",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Scaling and Stain Removal",
      specialty: "Periodontal Treatment",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Surgical Gummy Smile Correction",
      specialty: "Periodontal Treatment",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Gum Contouring and Depigmentation with Laser",
      specialty: "Periodontal Treatment",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Tooth Splinting",
      specialty: "Periodontal Treatment",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    // Oracare Clinic - Oral & Maxillofacial Surgery
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Simple & Surgical Tooth Extractions",
      specialty: "Oral & Maxillofacial Surgery",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Orthognathic (Jaw) Surgery",
      specialty: "Oral & Maxillofacial Surgery",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Removal of Cysts (Lipomas/Fatty Masses)",
      specialty: "Oral & Maxillofacial Surgery",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Correction of Congenital Malformations",
      specialty: "Oral & Maxillofacial Surgery",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Salivary Gland Tumor Treatment",
      specialty: "Oral & Maxillofacial Surgery",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Oral & Facial Aesthetic Surgery",
      specialty: "Oral & Maxillofacial Surgery",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    },
    // Oracare Clinic - General Dentistry
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Dental Check-up & Diagnosis",
      specialty: "General Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Conservative Dental Treatment",
      specialty: "General Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Emergency Dental Care",
      specialty: "General Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Dental Cleaning",
      specialty: "General Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Root Canal Therapy",
      specialty: "General Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      serviceName: "Tooth Extraction",
      specialty: "General Dentistry",
      timeSchedule: "8:00 AM – 6:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    }
  ];

  const clinicCards = [
    {
      name: "Panorama Medical Clinic",
      address: "123 Medical District, City Center",
      type: "Medical Clinic",
      services: [
        { name: "Facial Cleaning Services", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0678807531022174230ccdef75b23ab0e00ebd73?placeholderIfAbsent=true" },
        { name: "Dental", icon: "https://api.builder.io/api/v1/image/assets/TEMP/4e372a066ba413333951a22ee2b3141eb45645d6?placeholderIfAbsent=true" }
      ],
      doctorCount: "8 Doctors available",
      daysOpen: "Mon – Sat",
      timing: "9:00 AM – 6:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/eababc4cfc9b8dff4a46e824ad2fb21e1453b080?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true"
    },
    {
      name: "Esan Clinic",
      address: "456 Health Avenue, Medical Center",
      type: "Clinic",
      services: [
        { name: "Dermatology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/f51781fee441fbe2c5816df27e7258e6f8a00b92?placeholderIfAbsent=true" },
        { name: "Dental", icon: "https://api.builder.io/api/v1/image/assets/TEMP/b2d1ef3b4e58b8f7649ec48acfb93ca0a3e9ae32?placeholderIfAbsent=true" }
      ],
      doctorCount: "12 Doctors available",
      daysOpen: "Mon – Sat",
      timing: "8:00 AM – 7:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/2eb4771432582a9a78fd15f6acf0415df0cd933b?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/526777c9061a4c3515d51b72c418673fd2d49d66?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5cae8cfaf36687f1dba212d0868d625367a19974?placeholderIfAbsent=true"
    },
    {
      name: "Union Medical Complex Clinic",
      address: "789 Union Street, Healthcare District",
      type: "Medical Complex",
      services: [
        { name: "Dental", icon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true" }
      ],
      doctorCount: "6 Doctors available",
      daysOpen: "Mon – Fri",
      timing: "9:00 AM – 5:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/0eda78af93b2aa8948c7d7bc8f142cbb7bb940cb?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/faa7f0a43558699e2c5d63340e5ec1ec32f3efe9?placeholderIfAbsent=true"
    },
    {
      name: "Oracare Clinic",
      address: "321 Dental Plaza, Specialist Center",
      type: "Dental Clinic",
      services: [
        { name: "Orthodontics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0678807531022174230ccdef75b23ab0e00ebd73?placeholderIfAbsent=true" },
        { name: "Dental Implants", icon: "https://api.builder.io/api/v1/image/assets/TEMP/4e372a066ba413333951a22ee2b3141eb45645d6?placeholderIfAbsent=true" },
        { name: "Pediatric Dentistry", icon: "https://api.builder.io/api/v1/image/assets/TEMP/f67b415b2fad6be12e05e6f7da32bf13402850bc?placeholderIfAbsent=true" },
        { name: "General Dentistry", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0254cc92113d67bb61b90eecb83e3db232fd2248?placeholderIfAbsent=true" },
        { name: "More", icon: "https://api.builder.io/api/v1/image/assets/TEMP/11ed68343948aed58a8dee6e931125145ce5e8a7?placeholderIfAbsent=true" }
      ],
      doctorCount: "15 Doctors available",
      daysOpen: "Mon – Sat",
      timing: "8:00 AM – 6:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/e497bc291b663898a61854b8c0ee6a78ec503465?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true"
    }
  ];

  // Mapping for service categories to match the specialty names
  const serviceMapping: { [key: string]: string[] } = {
    'all': [],
    'facial-cleaning-services': ['Facial Cleaning Services'],
    'dental': ['Dental'],
    'dentistry': ['Dental'],
    'dermatology': ['Dermatology'],
    'orthodontics': ['Orthodontics'],
    'dental-implants': ['Dental Implants'],
    'pediatric-dentistry': ['Pediatric Dentistry'],
    'fixed-removable-prosthodontics': ['Fixed & Removable Prosthodontics'],
    'restorative-cosmetic-dentistry': ['Restorative & Cosmetic Dentistry'],
    'root-canal-endodontics': ['Root Canal & Endodontics'],
    'periodontal-treatment': ['Periodontal Treatment'],
    'oral-maxillofacial-surgery': ['Oral & Maxillofacial Surgery'],
    'general-dentistry': ['General Dentistry'],
    // Facial Cleaning Services subcategories
    'laser-sessions': ['Facial Cleaning Services'],
    'plasma-sessions': ['Facial Cleaning Services'],
    'scar-treatments': ['Facial Cleaning Services'],
    'fat-reduction': ['Facial Cleaning Services'],
    'cosmetic-injections': ['Facial Cleaning Services'],
    'dark-circles-lightening': ['Facial Cleaning Services'],
    'fractional-laser-sessions': ['Facial Cleaning Services'],
    'chemical-peeling-sessions': ['Facial Cleaning Services'],
    // Dental subcategories
    'teeth-whitening': ['Dental'],
    'teeth-cleaning': ['Dental'],
    'polishing-scaling': ['Dental'],
    'dental-fillings': ['Dental'],
    'dentures': ['Dental'],
    'orthodontics-teeth-jaw': ['Dental'],
    // Dermatology subcategories
    'laser-hair-removal': ['Dermatology'],
    'filler-injections': ['Dermatology'],
    'botox-injections': ['Dermatology'],
    'carbon-laser': ['Dermatology'],
    'cold-peeling': ['Dermatology'],
    'bleaching': ['Dermatology'],
    'skin-rejuvenation': ['Dermatology'],
    'scar-stretch-marks-removal': ['Dermatology'],
    'skin-tightening-wrinkle-removal': ['Dermatology'],
    // Orthodontics subcategories
    'clear-aligners': ['Orthodontics'],
    'metal-braces': ['Orthodontics'],
    'surgical-orthodontics': ['Orthodontics'],
    'auxiliary-orthodontics': ['Orthodontics'],
    'pediatric-orthodontics': ['Orthodontics'],
    'temporary-anchorage-devices': ['Orthodontics'],
    // Dental Implants subcategories
    'bone-grafting': ['Dental Implants'],
    'sinus-lifting': ['Dental Implants'],
    'biohorizons-dental-implants': ['Dental Implants'],
    'peri-implantitis-treatment': ['Dental Implants'],
    'dental-implant-removal': ['Dental Implants'],
    'straumann-dental-implants': ['Dental Implants'],
    // Pediatric Dentistry subcategories
    'preventive-care': ['Pediatric Dentistry'],
    'crowns-for-damaged-teeth': ['Pediatric Dentistry'],
    'emergency-trauma-management': ['Pediatric Dentistry'],
    'early-caries-management': ['Pediatric Dentistry'],
    'fillings-pulp-therapy': ['Pediatric Dentistry'],
    'care-for-special-needs-children': ['Pediatric Dentistry'],
    'jaw-growth-monitoring': ['Pediatric Dentistry'],
    'dental-examination-assessment': ['Pediatric Dentistry'],
    // Fixed & Removable Prosthodontics subcategories
    'complete-partial-removable-dentures': ['Fixed & Removable Prosthodontics'],
    'implant-supported-fixed-prosthesis': ['Fixed & Removable Prosthodontics'],
    'implant-supported-removable-prosthesis': ['Fixed & Removable Prosthodontics'],
    'full-partial-crowns': ['Fixed & Removable Prosthodontics'],
    'post-and-core-for-restorations': ['Fixed & Removable Prosthodontics'],
    'dental-bridges': ['Fixed & Removable Prosthodontics'],
    'in-office-teeth-whitening': ['Fixed & Removable Prosthodontics'],
    'at-home-teeth-whitening': ['Fixed & Removable Prosthodontics'],
    'porcelain-veneers': ['Fixed & Removable Prosthodontics'],
    // Restorative & Cosmetic Dentistry subcategories
    'cosmetic-fillings': ['Restorative & Cosmetic Dentistry'],
    'tooth-reconstruction': ['Restorative & Cosmetic Dentistry'],
    'dental-crowns': ['Restorative & Cosmetic Dentistry'],
    'aesthetic-veneers': ['Restorative & Cosmetic Dentistry'],
    'in-office-whitening': ['Restorative & Cosmetic Dentistry'],
    'take-home-whitening': ['Restorative & Cosmetic Dentistry'],
    'stain-removal-without-tooth-preparation': ['Restorative & Cosmetic Dentistry'],
    // Root Canal & Endodontics subcategories
    'root-canal-treatment-for-all-teeth': ['Root Canal & Endodontics'],
    'emergency-root-canal-treatment': ['Root Canal & Endodontics'],
    'retreatment-of-failed-root-canals': ['Root Canal & Endodontics'],
    'removal-of-intracanal-posts': ['Root Canal & Endodontics'],
    'abscess-treatment': ['Root Canal & Endodontics'],
    // Periodontal Treatment subcategories
    'gum-disease-periodontal-pocket-treatment': ['Periodontal Treatment'],
    'scaling-and-stain-removal': ['Periodontal Treatment'],
    'surgical-gummy-smile-correction': ['Periodontal Treatment'],
    'gum-contouring-and-depigmentation-with-laser': ['Periodontal Treatment'],
    'tooth-splinting': ['Periodontal Treatment'],
    // Oral & Maxillofacial Surgery subcategories
    'simple-surgical-tooth-extractions': ['Oral & Maxillofacial Surgery'],
    'orthognathic-jaw-surgery': ['Oral & Maxillofacial Surgery'],
    'removal-of-cysts-lipomas-fatty-masses': ['Oral & Maxillofacial Surgery'],
    'correction-of-congenital-malformations': ['Oral & Maxillofacial Surgery'],
    'salivary-gland-tumor-treatment': ['Oral & Maxillofacial Surgery'],
    'oral-facial-aesthetic-surgery': ['Oral & Maxillofacial Surgery'],
    // General Dentistry subcategories
    'dental-check-up-diagnosis': ['General Dentistry'],
    'conservative-dental-treatment': ['General Dentistry'],
    'emergency-dental-care': ['General Dentistry'],
    'dental-cleaning': ['General Dentistry'],
    'root-canal-therapy': ['General Dentistry'],
    'tooth-extraction': ['General Dentistry']
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Clear search query when "All" is selected to reset all filters
    if (categoryId === 'all') {
      setSearchQuery('');
    }
  };

  const handleClinicBooking = (clinicName: string) => {
    setSelectedClinic(clinicName);
    setIsBookingModalOpen(true);
  };

  // Convert timeSchedule string to schedule object
  const parseTimeSchedule = (timeSchedule: string): Record<string, string> => {
    const schedule: Record<string, string> = {
      'Sun': 'Closed',
      'Mon': 'Closed',
      'Tue': 'Closed', 
      'Wed': 'Closed',
      'Thu': 'Closed',
      'Fri': 'Closed',
      'Sat': 'Closed'
    };

    // Parse schedule like "9:00 AM – 1:00 PM • Mon–Sat"
    const parts = timeSchedule.split(' • ');
    if (parts.length === 2) {
      const timeRange = parts[0].replace(/\s/g, '').replace('–', '-');
      const days = parts[1];
      
      // Convert time format from "9:00AM-1:00PM" to "09:00 - 13:00"
      const convertTime = (time: string) => {
        return time.replace(/(\d{1,2}):(\d{2})(AM|PM)/g, (match, hour, minute, period) => {
          let h = parseInt(hour);
          if (period === 'PM' && h !== 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          return h.toString().padStart(2, '0') + ':' + minute;
        });
      };
      
      const convertedTimeRange = convertTime(timeRange);
      
      // Parse day range like "Mon–Sat" or "Tue–Sat"
      if (days.includes('–')) {
        const [startDay, endDay] = days.split('–');
        const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const startIndex = dayOrder.indexOf(startDay);
        const endIndex = dayOrder.indexOf(endDay);
        
        if (startIndex !== -1 && endIndex !== -1) {
          for (let i = startIndex; i <= endIndex; i++) {
            schedule[dayOrder[i]] = convertedTimeRange;
          }
        }
      }
    }
    
    return schedule;
  };

  // Get schedule for selected clinic
  const getSelectedClinicSchedule = (): Record<string, string> => {
    const clinicService = serviceCards.find(card => card.clinicName === selectedClinic);
    return clinicService ? parseTimeSchedule(clinicService.timeSchedule) : {};
  };

  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date);
    // You can add booking logic here
  };

  const handleOptionSelect = (option: any) => {
    setSelectedCategory(option.id);
    setSearchQuery(''); // Clear search when selecting from dropdown
  };

  // Filter service cards based on selected category and search query
  const filteredServiceCards = useMemo(() => {
    let filtered = serviceCards;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      const allowedSpecialties = serviceMapping[selectedCategory] || [];
      filtered = filtered.filter(card => 
        allowedSpecialties.includes(card.specialty)
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(card =>
        card.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.clinicName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [selectedCategory, searchQuery, serviceCards]);

  // Show all clinic cards (no filtering needed)
  const filteredClinicCards = clinicCards;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-0">{/* Added bottom padding for mobile nav */}
      <Header />
      <HeroSection 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />
      
      <main>


        
        {/* Services Section - only show when services is selected */}
        {viewMode === 'services' && (
          <section className="flex w-full flex-col items-stretch mt-2 sm:mt-4 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8">
            <div className="w-full max-w-7xl mx-auto">
              {/* Search Bar above title */}
              <div className="mb-4 w-full">
                <SearchInput
                  placeholder="Search by service, clinic, or doctor's name"
                  onSearch={setSearchQuery}
                  onOptionSelect={handleOptionSelect}
                  selectedCategory={selectedCategory}
                />
              </div>
              
              <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px] mb-4">
                Services & Specialists
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                {filteredServiceCards.map((card, index) => (
                  <ServiceCard
                    key={index}
                    {...card}
                    isSpecial={index === 6}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Clinics Section - only show when clinics is selected */}
        {viewMode === 'clinics' && (
          <section className="flex w-full flex-col items-stretch mt-2 sm:mt-4 px-4 sm:px-6 lg:px-8 pb-20 sm:pb-8">
            <div id="clinic-section" className="w-full max-w-7xl mx-auto">
              <h2 className="text-xl sm:text-2xl text-black font-normal tracking-[-1px] mb-4">
                Clinics
              </h2>
              
              
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                 {filteredClinicCards.map((clinic, index) => (
                   <ClinicCard 
                     key={index} 
                     {...clinic} 
                     onBookingClick={() => handleClinicBooking(clinic.name)}
                   />
                 ))}
               </div>
            </div>
          </section>
        )}
      </main>
      
      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation 
        viewMode={viewMode} 
        onViewModeChange={setViewMode} 
      />

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        clinicName={selectedClinic}
        serviceSchedule={getSelectedClinicSchedule()}
      />
    </div>
  );
};

export default Index;
