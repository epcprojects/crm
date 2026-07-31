import { ClockIcon } from '../../../public/icons';

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
    <div className="border border-white/20  shadow-[0_14px_44px_0_rgb(0_0_0/0.25)] py-1 xl:py-2 pl-2 pr-4 rounded-full">
      <div className="flex flex-row gap-1 2xl:gap-3 items-center">
        <div className="bg-white/24 w-6 h-6 xl:w-12 xl:h-12 rounded-full shadow-[0_0_30px_0_rgb(0_0_0/0.08)] flex items-center justify-center">
          {icon}
        </div>
        <div className="flex flex-row items-center justify-between flex-1">
          <p className="text-xs 2xl:text-base text-white">{title}</p>
          <p className="text-white text-base 2xl:text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
}
