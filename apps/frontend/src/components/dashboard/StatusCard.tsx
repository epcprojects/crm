import Image from 'next/image';
import { ClockIcon } from '../../../public/icons';
import { Images } from '../../app/ui/images';

type StatusCardProps = {
  title: string;
  count: number | string;
  icon?: React.ReactNode;
};

export default function StatusCard({
  title,
  count,
  icon = <ClockIcon fill="currentColor" />,
}: StatusCardProps) {
  return (
    <div
      className="
        group relative flex cursor-pointer items-center gap-2 overflow-hidden
        rounded-2xl border border-gray-200 bg-gray-50 px-5.5 py-7
        transition-all duration-500 ease-in-out
        hover:border-transparent hover:bg-linear-to-r hover:from-primary-dark hover:to-[#6719FC]
        md:gap-4
      "
    >
      <div
        className="
          z-10 flex h-9 w-9 items-center justify-center rounded-full
          bg-white text-primary drop-shadow
          transition-all duration-100 ease-in-out
          group-hover:scale-105 group-hover:bg-white/15 group-hover:text-white
          md:h-12 md:w-12
        "
      >
        {icon}
      </div>

      <div className="z-10">
        <h2
          className="
            text-sm font-semibold text-black
            transition-colors duration-300 ease-in-out
            group-hover:text-white
            md:text-lg
          "
        >
          {title}
        </h2>

        <span
          className="
            inline-block text-xs text-gray-700
            transition-colors duration-300 ease-in-out
            group-hover:text-gray-300
            md:text-sm
          "
        >
          {count}
        </span>
      </div>

      <Image
        alt=""
        src={Images.index.logoTransparent}
        className="
          pointer-events-none absolute inset-e-2 h-full w-fit
          opacity-0 transition-all duration-500 ease-in-out
          group-hover:opacity-100 group-hover:translate-x-0
        "
      />
    </div>
  );
}
