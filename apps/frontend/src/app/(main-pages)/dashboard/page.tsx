import React from 'react';
import StatusCard from '../../../components/dashboard/StatusCard';

const Page = () => {
  return (
    <div className="max-h-dvh min-h-[calc(100dvh-97px)]">
      <div className="grid grid-cols-4 gap-3 md:gap-5">
        {/* <div className="rounded-2xl relative py-7 cursor-pointer group px-5.5 hover:bg-linear-to-r from-primary-dark to-[#6719FC] bg-gray-50 border border-gray-200 flex items-center gap-2 md:gap-4">
          <div className="bg-white group-hover:bg-white/15 group-hover:text-white text-primary rounded-full drop-shadow w-9 h-9 md:h-12 md:w-12 flex items-center justify-center">
            <ClockIcon fill="currentColor" />
          </div>
          <div>
            <h2 className="text-black group-hover:text-white font-semibold text-sm md:text-lg">
              In Progress
            </h2>
            <span className="inline-block text-gray-700 group-hover:text-gray-300 text-xs md:text-sm">
              83
            </span>
          </div>

          <Image
            alt=""
            src={Images.index.logoTransparent}
            className="absolute inset-e-2 w-fit opacity-0 group-hover:opacity-100 h-full"
          />
        </div> */}
        <StatusCard title="In Progress" count={83} />
        <StatusCard title="In Progress" count={83} />
        <StatusCard title="In Progress" count={83} />
        <StatusCard title="In Progress" count={83} />
      </div>
    </div>
  );
};

export default Page;
