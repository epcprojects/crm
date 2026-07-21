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
  stats?: SummaryItem[];
  imageAlt?: string;
  onBack?: () => void;
  badge?: string;
  badgeClr?: string;
};

export default function DashboardSummaryBanner({
  imageSrc,
  title,
  stats,
  imageAlt = '',
  onBack,
  badge,
  badgeClr,
}: DashboardSummaryBannerProps) {
  return (
    <div
      className={`${badge ? 'items-start' : ' xl:items-center'} relative flex w-full flex-col gap-2 xl:gap-3 overflow-hidden rounded-[10px] bg-[url('/images/DashboardComponentBgImage.jpg')] bg-cover bg-center bg-no-repeat px-4 py-4 xl:flex-row xl:gap-4 xl:rounded-[20px] xl:px-7.5 xl:py-6`}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      {/* Mobile icon and title */}
      <div className="relative flex min-w-0 items-center gap-3 xl:contents">
        {onBack ? (
          <button onClick={() => onBack()}>
            <Image
              alt={imageAlt}
              src={imageSrc}
              width={48}
              height={48}
              className="h-10 w-10 shrink-0 rounded-full  backdrop-blur-3xl drop-shadow xl:h-12 xl:w-12"
            />
          </button>
        ) : (
          <Image
            alt={imageAlt}
            src={imageSrc}
            width={48}
            height={48}
            className="h-10 w-10 shrink-0 rounded-full backdrop-blur-3xl drop-shadow xl:h-12 xl:w-12"
          />
        )}

        <p className="min-w-0 truncate text-xl xl:text-2xl text-white xl:hidden">
          {title}
        </p>
        {badge && (
          <span
            style={{
              backgroundColor: `${badgeClr}`,
            }}
            className="rounded-full xl:hidden block  bg-green-50 px-2.5 py-0.5 text-xs font-medium text-white sm:text-sm"
          >
            {badge}
          </span>
        )}
      </div>

      <div
        className={`${badge ? 'flex-wrap' : 'xl:flex-row xl:items-center'} relative flex min-w-0 flex-1  flex-col md:flex-row gap-3   xl:justify-between xl:gap-4`}
      >
        {/* Desktop title */}
        <div className="flex items-center gap-4">
          <p className="hidden text-[32px] text-white xl:block">{title}</p>
          {badge && (
            <span
              style={{
                backgroundColor: `${badgeClr}`,
              }}
              className="rounded-full xl:block hidden  bg-green-50 px-2.5 py-0.5 text-xs font-medium text-white sm:text-sm"
            >
              {badge}
            </span>
          )}
        </div>
        {stats?.length ? (
          <div className="grid grid-cols-2 gap-2  sm:w-fit rounded-xl border border-white/12 bg-white/10 p-2 backdrop-blur-3xl drop-shadow-[0_14px_44px_0_rgb(0_0_0/0.45)] xl:flex xl:max-w-full xl:flex-row xl:items-center xl:gap-5.5 xl:px-4">
            {stats.map((item, index) => (
              <Fragment key={`${item.title}-${index}`}>
                {index > 0 ? (
                  <div
                    className="hidden h-5.25 w-0.5 shrink-0 bg-linear-to-b from-white/0 via-white/80 to-white/0 xl:block"
                    aria-hidden="true"
                  />
                ) : null}

                <div className="flex min-w-0 items-center justify-between gap-2 xl:shrink-0 xl:justify-start xl:gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white">
                      <span
                        className="absolute m-auto inline-block h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: item.color,
                        }}
                      />
                    </div>

                    <p className="truncate text-xs text-gray-200 sm:text-sm xl:whitespace-nowrap 2xl:text-base">
                      {item.title}
                    </p>
                  </div>

                  <p className="shrink-0 whitespace-nowrap text-sm font-bold text-white sm:text-base 2xl:text-lg">
                    {item.count}
                  </p>
                </div>
              </Fragment>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
