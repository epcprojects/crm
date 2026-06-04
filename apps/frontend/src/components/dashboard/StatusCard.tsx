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
        transition-all duration-500 ease-out
        hover:border-transparent hover:shadow-lg hover:shadow-primary/20
        md:gap-4
      "
    >
      {/* Smooth Gradient Layer */}
      <div
        className="
          pointer-events-none absolute inset-0 opacity-0
          bg-linear-to-r from-primary-dark to-[#6719FC]
          transition-opacity duration-700 ease-out
          group-hover:opacity-100
        "
      />

      {/* Icon */}
      <div
        className="
          relative z-10 flex h-9 w-9 items-center justify-center rounded-full
          bg-white text-primary drop-shadow
          transition-all duration-500 ease-out
          group-hover:scale-110 group-hover:bg-white/15 group-hover:text-white
          md:h-12 md:w-12
        "
      >
        {icon}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h2
          className="
            text-sm font-semibold text-black
            transition-colors duration-500 ease-out
            group-hover:text-white
            md:text-lg
          "
        >
          {title}
        </h2>

        <span
          className="
            inline-block text-xs text-gray-700
            transition-colors duration-500 ease-out
            group-hover:text-gray-300
            md:text-sm
          "
        >
          {count}
        </span>
      </div>

      {/* Logo Watermark */}
      <Image
        alt=""
        src={Images.index.logoTransparent}
        className="
          pointer-events-none absolute inset-e-2 top-0 z-0 h-full w-fit
          translate-x-8 scale-105 opacity-0
          transition-all duration-700 ease-out
          group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100
        "
      />
    </div>
  );
}
