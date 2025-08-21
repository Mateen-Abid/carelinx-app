import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ServicesFilter from '@/components/ServicesFilter';
import ServiceCard from '@/components/ServiceCard';
import ClinicCard from '@/components/ClinicCard';

const Index = () => {
  const serviceCards = [
    {
      clinicName: "Central Medical Center",
      address: "456 Oak Avenue, Suburb",
      serviceName: "ECG",
      specialty: "Cardiologist",
      timeSchedule: "9:00 AM – 1:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/3eba5b80760cad1e903ec218bff4bbc5e6657151?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/de0ff59b32803763263a3ee001bd0a8d93830146?placeholderIfAbsent=true"
    },
    {
      clinicName: "Willow Grove Clinic",
      address: "456 Oak Avenue, Suburb",
      serviceName: "X-Ray",
      specialty: "Cardiologist",
      timeSchedule: "9:00 AM – 1:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/01168c3ef0e4f5d3a553a609724c5788a35f3338?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/1363bccdfe0551b35e6864044b3c04f7955c05cc?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fe1f48e298b5d5935a1497c688af45a202d5fd1d?placeholderIfAbsent=true"
    },
    {
      clinicName: "Maple Leaf Center",
      address: "456 Oak Avenue, Suburb",
      serviceName: "Brain Scans",
      specialty: "Neurology",
      timeSchedule: "11:00 AM – 4:00 PM • Tue–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/b32e79093777398252b538f29c56d6c3703971b0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/f497f709c4f622587a853dae6e3ab218eeddcdd9?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/71b169a0b04713839d08e2448c9ba93cf8d77765?placeholderIfAbsent=true"
    },
    {
      clinicName: "Cedar Medical",
      address: "456 Oak Avenue, Suburb",
      serviceName: "Retinal Care",
      specialty: "Radiologist",
      timeSchedule: "8:00 AM – 3:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/98f642929a4c5963f7039d165a12bcbcdef809e6?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/fba9f5c34174e55cebc5ae70ca57a34463363641?placeholderIfAbsent=true"
    },
    {
      clinicName: "Cedar Medical",
      address: "456 Oak Avenue, Suburb",
      serviceName: "Ultrasound",
      specialty: "Ultrasonographer",
      timeSchedule: "8:00 AM – 3:00 PM • Mon–Fri",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5eafa4583b40a9e3f4eca31a09124a4cd4b653e0?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/12f78639ed398eea08bacccf51d5b1703fdb88be?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/ae8c431b709a8da187d4b49d77f470f1b8e19975?placeholderIfAbsent=true"
    },
    {
      clinicName: "Central Medical Center",
      address: "456 Oak Avenue, Suburb",
      serviceName: "ECG",
      specialty: "Cardiologist",
      timeSchedule: "9:00 AM – 1:00 PM • Mon–Sat",
      serviceIcon: "https://api.builder.io/api/v1/image/assets/TEMP/0a65e481a18b05309845cc62fc429d3b42e45f65?placeholderIfAbsent=true",
      clinicIcon: "https://api.builder.io/api/v1/image/assets/TEMP/42cc8425ab2bbb1620eb029ddb06c36d22bd80f2?placeholderIfAbsent=true",
      timeIcon: "https://api.builder.io/api/v1/image/assets/TEMP/6a76054f615e0ac0851c4c4a2938cea4bc19eb7d?placeholderIfAbsent=true"
    }
  ];

  const clinicCards = [
    {
      name: "Central Medical Center",
      address: "456 Oak Avenue, Suburb",
      type: "Medical Center",
      services: [
        { name: "General Medicine", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0678807531022174230ccdef75b23ab0e00ebd73?placeholderIfAbsent=true" },
        { name: "Pediatrics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/4e372a066ba413333951a22ee2b3141eb45645d6?placeholderIfAbsent=true" },
        { name: "Orthopedics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/2526d3dcb5f6ff1819819411edf8cfba7ff309cc?placeholderIfAbsent=true" },
        { name: "Emergency Care", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0254cc92113d67bb61b90eecb83e3db232fd2248?placeholderIfAbsent=true" }
      ],
      doctorCount: "18 Doctor available",
      daysOpen: "Mon – Fri",
      timing: "9:30 AM – 12:30 AM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/eababc4cfc9b8dff4a46e824ad2fb21e1453b080?placeholderIfAbsent=true",
      doctorAvatars: "https://api.builder.io/api/v1/image/assets/TEMP/1427b50db626e222185fa3fbc4fc6128aecb8ccc?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true"
    },
    {
      name: "Green Valley Hospital",
      address: "789 Maple Street, Townsville",
      type: "Hospital",
      services: [
        { name: "Cardiology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/f51781fee441fbe2c5816df27e7258e6f8a00b92?placeholderIfAbsent=true" },
        { name: "Maternity Care", icon: "https://api.builder.io/api/v1/image/assets/TEMP/b2d1ef3b4e58b8f7649ec48acfb93ca0a3e9ae32?placeholderIfAbsent=true" },
        { name: "Neurology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/ef2c216a1e831a8b96e2a864fe104dcfd0d0af5a?placeholderIfAbsent=true" },
        { name: "Oncology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/a1877dac1615ad3f837f3f9e74506af3cc28f231?placeholderIfAbsent=true" }
      ],
      doctorCount: "30 Doctors available",
      daysOpen: "Mon – Sun",
      timing: "8:00 AM – 10:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/2eb4771432582a9a78fd15f6acf0415df0cd933b?placeholderIfAbsent=true",
      doctorAvatars: "https://api.builder.io/api/v1/image/assets/TEMP/c5a070d34e3fe862f7d0e05205414423cb39ba9f?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/526777c9061a4c3515d51b72c418673fd2d49d66?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/5cae8cfaf36687f1dba212d0868d625367a19974?placeholderIfAbsent=true"
    },
    {
      name: "Sunrise Health Clinic",
      address: "321 Pine Road, Village",
      type: "Clinic",
      services: [
        { name: "Dermatology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true" },
        { name: "Gynecology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/fe39b153c852b4408c74f864631bb123dc030526?placeholderIfAbsent=true" },
        { name: "Gastroenterology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/632209998a4d7dc59a41cbde006e3f96b55d49ed?placeholderIfAbsent=true" },
        { name: "Psychiatry", icon: "https://api.builder.io/api/v1/image/assets/TEMP/fd65996b62e21131fdaa60425c8ef06375371ae0?placeholderIfAbsent=true" },
        { name: "More", icon: "https://api.builder.io/api/v1/image/assets/TEMP/6c3fb934dc9976408fd4171ddda651c95f1c7c63?placeholderIfAbsent=true" }
      ],
      doctorCount: "5 Doctors available",
      daysOpen: "Mon – Sat",
      timing: "10:00 AM – 6:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/0eda78af93b2aa8948c7d7bc8f142cbb7bb940cb?placeholderIfAbsent=true",
      doctorAvatars: "https://api.builder.io/api/v1/image/assets/TEMP/8e56e14793369a1ac3bf99381e090b847becb7c7?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/8237fc4aa983b224301359c5a386d7dfbf1c0de7?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/faa7f0a43558699e2c5d63340e5ec1ec32f3efe9?placeholderIfAbsent=true"
    },
    {
      name: "Sunset Medical Center",
      address: "144 Maple Drive, City",
      type: "Hospital",
      services: [
        { name: "Pediatrics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0678807531022174230ccdef75b23ab0e00ebd73?placeholderIfAbsent=true" },
        { name: "Cardiology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/4e372a066ba413333951a22ee2b3141eb45645d6?placeholderIfAbsent=true" },
        { name: "Orthopedics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/f67b415b2fad6be12e05e6f7da32bf13402850bc?placeholderIfAbsent=true" },
        { name: "Neurology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/0254cc92113d67bb61b90eecb83e3db232fd2248?placeholderIfAbsent=true" },
        { name: "More", icon: "https://api.builder.io/api/v1/image/assets/TEMP/11ed68343948aed58a8dee6e931125145ce5e8a7?placeholderIfAbsent=true" }
      ],
      doctorCount: "10 Doctors available",
      daysOpen: "Mon – Fri",
      timing: "8:00 AM – 8:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/e497bc291b663898a61854b8c0ee6a78ec503465?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true"
    },
    {
      name: "Sunset Medical Center",
      address: "144 Maple Drive, City",
      type: "Hospital",
      services: [
        { name: "Pediatrics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/f51781fee441fbe2c5816df27e7258e6f8a00b92?placeholderIfAbsent=true" },
        { name: "Cardiology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/5cc296decf7d204892a712d06f267a61593f7a71?placeholderIfAbsent=true" },
        { name: "Orthopedics", icon: "https://api.builder.io/api/v1/image/assets/TEMP/773f55ab32be04baf644ce5877ea01d4f92fb881?placeholderIfAbsent=true" },
        { name: "Neurology", icon: "https://api.builder.io/api/v1/image/assets/TEMP/b2d1ef3b4e58b8f7649ec48acfb93ca0a3e9ae32?placeholderIfAbsent=true" },
        { name: "More", icon: "https://api.builder.io/api/v1/image/assets/TEMP/884ad743078544c631a4e9df3d1b2b7109b3a04a?placeholderIfAbsent=true" }
      ],
      doctorCount: "10 Doctors available",
      daysOpen: "Mon – Fri",
      timing: "8:00 AM – 8:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/c44df649f5dfdd36697f713f08a0531d6209c2d3?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true"
    },
    {
      name: "Lakeside Wellness Center",
      address: "267 River Lane, Town",
      type: "Wellness",
      services: [
        { name: "Nutrition", icon: "https://api.builder.io/api/v1/image/assets/TEMP/167cf20a85528f7b30a107496f66cf315880b522?placeholderIfAbsent=true" },
        { name: "Physical Therapy", icon: "https://api.builder.io/api/v1/image/assets/TEMP/fe39b153c852b4408c74f864631bb123dc030526?placeholderIfAbsent=true" },
        { name: "Chiropractic", icon: "https://api.builder.io/api/v1/image/assets/TEMP/632209998a4d7dc59a41cbde006e3f96b55d49ed?placeholderIfAbsent=true" },
        { name: "Acupuncture", icon: "https://api.builder.io/api/v1/image/assets/TEMP/1be7a1ffed610ca72836f6a3de8f0a9eb24d320d?placeholderIfAbsent=true" },
        { name: "More", icon: "https://api.builder.io/api/v1/image/assets/TEMP/c83950a613573292f4969d0887ea863401551486?placeholderIfAbsent=true" }
      ],
      doctorCount: "3 Doctors available",
      daysOpen: "Tue – Sun",
      timing: "9:00 AM – 5:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/0eda78af93b2aa8948c7d7bc8f142cbb7bb940cb?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true"
    },
    {
      name: "Lakeside Wellness Center",
      address: "267 River Lane, Town",
      type: "Wellness",
      services: [
        { name: "Nutrition", icon: "" },
        { name: "Physical Therapy", icon: "" },
        { name: "Chiropractic", icon: "" },
        { name: "Acupuncture", icon: "" },
        { name: "More", icon: "" }
      ],
      doctorCount: "3 Doctors available",
      daysOpen: "Tue – Sun",
      timing: "9:00 AM – 5:00 PM",
      logo: "https://api.builder.io/api/v1/image/assets/TEMP/8559cde1d85afa8752521dd1ea31d0054ba77f05?placeholderIfAbsent=true",
      daysIcon: "https://api.builder.io/api/v1/image/assets/TEMP/785f5ffc2826d77b0acd4a7daf2c2399dd96c3fa?placeholderIfAbsent=true",
      timingIcon: "https://api.builder.io/api/v1/image/assets/TEMP/cf0135087d9fd9cac8a10d7fae222ff9d6d7795d?placeholderIfAbsent=true",
      isCallOnly: true,
      phoneNumber: "+123 456 7890"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <HeroSection />
      
      <main>
        <ServicesFilter />
        
        <section className="flex w-full flex-col items-stretch mt-6 px-8 max-md:max-w-full max-md:px-5">
          <h2 className="text-2xl text-black font-normal tracking-[-1px]">
            Services & Specialists
          </h2>
          <div className="flex w-full items-center gap-[18px] mt-4 max-md:max-w-full overflow-x-auto">
            {serviceCards.map((card, index) => (
              <ServiceCard
                key={index}
                {...card}
                isSpecial={index === 6}
              />
            ))}
            
            {/* Special Physical Therapy Card */}
            <article className="bg-white relative overflow-hidden w-[220px] px-[18px] py-[23px] rounded-[18px]">
              <div className="text-black text-lg font-semibold tracking-[-1px] z-0">
                Physical Therapy
              </div>
              <div className="z-0 w-full mt-7">
                <div className="flex w-full flex-col items-center">
                  <div className="flex w-[102px] max-w-full gap-2">
                    <div className="flex w-[102px] gap-[-25px]">
                      <img
                        src="https://api.builder.io/api/v1/image/assets/TEMP/8559cde1d85afa8752521dd1ea31d0054ba77f05?placeholderIfAbsent=true"
                        className="aspect-[1] object-contain w-[102px] rounded-[21248px]"
                        alt="Care Clinic"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-xs font-normal justify-center mt-2">
                    <div className="text-black text-xl tracking-[-0.4px]">
                      Care Clinic
                    </div>
                    <div className="items-center border flex text-black font-medium whitespace-nowrap text-center bg-neutral-50 mt-1 px-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
                      <div className="text-xs leading-[18px] self-stretch my-auto">
                        Physiotherapist
                      </div>
                    </div>
                    <div className="text-[rgba(98,98,98,1)] mt-1">
                      456 Oak Avenue, Suburb
                    </div>
                  </div>
                </div>
                <div className="w-full text-xs mt-1.5">
                  <div className="text-[rgba(98,98,98,1)] font-normal">
                    Time
                  </div>
                  <div className="w-full text-black font-medium text-center mt-1.5">
                    <div className="items-center border flex gap-0.5 bg-neutral-50 pl-1.5 pr-2 py-0.5 rounded-full border-solid border-[#E9EAEB]">
                      <div className="text-xs leading-[18px] self-stretch my-auto">
                        8:30 AM – 6:00 PM • Mon–Fri
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[rgba(0,255,162,1)] absolute z-0 flex min-h-[34px] items-center gap-[7px] justify-center w-[34px] h-[34px] py-[7px] rounded-[112px] right-[9px] top-[11px]" />
              <button className="bg-[rgba(14,36,68,1)] z-0 flex min-h-[42px] w-full items-center text-sm text-white font-normal text-center tracking-[-0.28px] leading-none justify-center mt-7 px-[18px] py-[13px] rounded-[40px] hover:bg-[rgba(14,36,68,0.9)] transition-colors">
                <span className="self-stretch my-auto">
                  Book Appointment
                </span>
              </button>
            </article>
          </div>
        </section>
        
        <section className="flex w-full flex-col items-stretch mt-6 px-8 max-md:max-w-full max-md:px-5">
          <h2 className="text-2xl text-black font-normal whitespace-nowrap tracking-[-1px]">
            Clinic
          </h2>
          <div className="flex w-full items-center gap-[18px] flex-wrap mt-4 max-md:max-w-full">
            {clinicCards.map((clinic, index) => (
              <ClinicCard key={index} {...clinic} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
