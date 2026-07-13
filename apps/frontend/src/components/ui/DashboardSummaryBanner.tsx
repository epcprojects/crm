import Image from 'next/image';
import { Fragment } from 'react';

type SummaryItem = {
  title: string;
  count: number | string;
  color: string;
};

type DashboardSummaryBannerProps = {
  imageSrc: string;
  title: string;
  stats: SummaryItem[];
  imageAlt?: string;
};

export default function DashboardSummaryBanner({
  imageSrc,
  title,
  stats,
  imageAlt = '',
}: DashboardSummaryBannerProps) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-[20px] bg-[url('/images/DashboardComponentBgImage.jpg')] bg-cover bg-center bg-no-repeat px-4 py-5 md:flex-row md:items-center md:px-7.5 md:py-6">
      <Image
        alt={imageAlt}
        src={imageSrc}
        width={48}
        height={48}
        className="h-10 w-10 shrink-0 backdrop-blur-3xl drop-shadow md:h-12 md:w-12"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-2xl text-white md:text-[32px]">{title}</p>

        <div className="flex max-w-full items-center gap-4 overflow-x-auto rounded-xl border border-white/12 bg-black/40 backdrop-blur-2xl px-3 py-2.5 drop-shadow-[0_14px_54px_0_rgb(0_0_0/0.25)] md:gap-5.5 md:px-4">
          {stats.map((item, index) => (
            <Fragment key={`${item.title}-${index}`}>
              {index > 0 ? (
                <div
                  className="h-5.25 w-0.5 shrink-0 bg-linear-to-b from-white/0 via-white/80 to-white/0"
                  aria-hidden="true"
                />
              ) : null}

              <div className="flex shrink-0 items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <div className="border h-4 relative flex items-center justify-center w-4 border-white  rounded-full">
                    <span
                      className="w-2.5 h-2.5 inline-block absolute rounded-full m-auto"
                      style={{ backgroundColor: item.color }}
                    ></span>
                  </div>

                  <p className="whitespace-nowrap text-sm text-gray-200 md:text-base">
                    {item.title}
                  </p>
                </div>

                <p className="whitespace-nowrap text-base text-white font-bold md:text-lg">
                  {item.count}
                </p>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
