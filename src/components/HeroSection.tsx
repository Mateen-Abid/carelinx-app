import React from 'react';
import SearchInput from './SearchInput';

const HeroSection = () => {
  const handleSearch = (value: string) => {
    console.log('Searching for:', value);
    // Implement search functionality here
  };

  return (
    <section className="bg-[rgba(12,34,67,1)] w-full overflow-hidden">
      <div className="relative flex w-full flex-col py-[74px] max-md:max-w-full">
        {/* Background Pattern */}
        <div className="absolute z-0 w-[1372px] max-w-full left-[23px] bottom-0 opacity-20">
          <div className="flex w-full gap-[40px_62px] flex-wrap max-md:max-w-full">
            {/* First row of pattern icons */}
            {[
              "https://api.builder.io/api/v1/image/assets/TEMP/8691badb429f030e6f81946f485ace6ebff15519?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/044066845b52b7bd7608421d8c29eee31d9d7197?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/1c7fb65545256dda41558d30844310f94c3ea304?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/a30cd8d8a0872735ded6b3eded0ef395f89f9907?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/34591e4c35be8c048b79a393b3b9fdb98a02f8ce?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/703a68c521a4c6183104e5b4379b7e51cb3ad781?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/f8afc59e353bf1b5cbae2b512b5fa88dc0dbf8e8?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/3491b2ef26dc04402f33ee0698efcfbc3045d768?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/58836a542d4d79160439370f0174c11474aa18ad?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/bb63c4c5f7814ef16c0e572c695807c0a8e9ff35?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/3b49c65b781e9bdb033125fd2a69d6f35c15d578?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/f4f02f8fd22d1bb7acd82c58de96c8c0c6c8dde7?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/112ed23539389d4bc22b91d8180152260c6f5dd1?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/6d917361cd23785886400ada5747c885c5ad8740?placeholderIfAbsent=true",
              "https://api.builder.io/api/v1/image/assets/TEMP/0aa69a8eb34ebfd99c822cb264738ebb25137e2f?placeholderIfAbsent=true"
            ].map((src, index) => (
              <img
                key={`row1-${index}`}
                src={src}
                className={`aspect-[1] object-contain ${index < 10 ? 'w-[33px]' : 'w-9'} shrink-0`}
                alt=""
              />
            ))}
          </div>
          
          {/* Additional rows with similar pattern */}
          <div className="flex w-full gap-[40px_62px] flex-wrap mt-12 pl-[53px] max-md:max-w-full max-md:mt-10 max-md:pl-5">
            {/* Second row pattern - simplified for brevity */}
            {Array.from({ length: 14 }, (_, index) => (
              <img
                key={`row2-${index}`}
                src={`https://api.builder.io/api/v1/image/assets/TEMP/fa3c32dfd01808ce8d50b995507aa1beba1e135a?placeholderIfAbsent=true`}
                className="aspect-[0.97] object-contain w-8 shrink-0"
                alt=""
              />
            ))}
          </div>
          
          {/* Third and fourth rows with similar patterns */}
          <div className="flex w-full gap-[40px_62px] flex-wrap mt-12 max-md:max-w-full max-md:mt-10">
            {Array.from({ length: 15 }, (_, index) => (
              <img
                key={`row3-${index}`}
                src={`https://api.builder.io/api/v1/image/assets/TEMP/447972b465517e57839415fe774c8801b4eb6917?placeholderIfAbsent=true`}
                className="aspect-[1.03] object-contain w-[33px] shrink-0"
                alt=""
              />
            ))}
          </div>
          
          <div className="flex w-full gap-[40px_62px] mt-12 pl-[53px] max-md:max-w-full max-md:mt-10 max-md:pl-5">
            {Array.from({ length: 15 }, (_, index) => (
              <img
                key={`row4-${index}`}
                src={`https://api.builder.io/api/v1/image/assets/TEMP/a0005fe56e6bbaee0804e066c985d2970da7d331?placeholderIfAbsent=true`}
                className="aspect-[3.56] object-contain w-8 shrink-0"
                alt=""
              />
            ))}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="self-center z-0 flex w-[576px] max-w-full flex-col items-center">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-white text-[38px] font-medium tracking-[-0.76px]">
              Search to get matched
            </h1>
            <p className="text-neutral-300 text-base font-normal tracking-[-0.32px] mt-2">
              Quickly find doctors, clinics, or services you need.
            </p>
          </div>
          <div className="mt-6 w-full">
            <SearchInput onSearch={handleSearch} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
