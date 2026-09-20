'use client';

import Image from 'next/image';
import { Fragment, useId, useState } from 'react';

type SummaryItem = {
  title: string;
  count: number | string;
  color: string;
};

type DashboardSummaryBannerProps = {
  imageSrc: string;
  title: string;
  stats?: SummaryItem[];
  // Optional detail stats (e.g. a per-status breakdown) shown in an
  // expandable panel opened from the statistics icon.
  extraStats?: SummaryItem[];
  extraStatsTitle?: string;
  imageAlt?: string;
  onBack?: () => void;
  badge?: string;
  badgeClr?: string;
};

function StatsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 20V12M12 20V5M19 20V9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatDot({ color }: { color: string }) {
  return (
    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/40">
      <span
        className="absolute m-auto inline-block h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: color,
        }}
      />
    </div>
  );
}

export default function DashboardSummaryBanner({
  imageSrc,
  title,
  stats,
  extraStats,
  extraStatsTitle = 'Breakdown',
  imageAlt = '',
  onBack,
  badge,
  badgeClr,
}: DashboardSummaryBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();
  const hasExtraStats = Boolean(extraStats?.length);

  return (
    <div
      style={{
        backgroundImage: `
      url('/images/DashboardComponentBgImage.jpg'),
      linear-gradient(
        to right,
        #335C94 0%,
        #665932 25%,
        #7B398E 50%,
        #003F89 75%,
        #070922 100%
      )
    `,
      }}
      className="relative w-full overflow-hidden rounded-xl bg-cover bg-center bg-no-repeat px-4 py-4 xl:px-7.5 xl:py-6"
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      <div
        className={`${
          badge ? 'items-start' : 'xl:items-center'
        } relative flex w-full flex-col gap-2 xl:flex-row xl:gap-4`}
      >
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
          className={`${badge ? 'flex-wrap' : 'xl:flex-row xl:items-center'} relative flex min-w-0 flex-1 w-full  flex-col md:flex-row gap-3   xl:justify-between xl:gap-4`}
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
          {stats?.length || hasExtraStats ? (
            <div className="grid grid-cols-2 gap-2  sm:w-fit rounded-xl border border-white/12 bg-white/10 p-2 backdrop-blur-3xl drop-shadow-[0_14px_44px_0_rgb(0_0_0/0.45)] xl:flex xl:max-w-full xl:flex-row xl:items-center xl:gap-5.5 xl:px-4">
              {(stats ?? []).map((item, index) => (
                <Fragment key={`${item.title}-${index}`}>
                  {index > 0 ? (
                    <div
                      className="hidden h-5.25 w-0.5 shrink-0 bg-linear-to-b from-white/0 via-white/80 to-white/0 xl:block"
                      aria-hidden="true"
                    />
                  ) : null}

                  <div className="flex min-w-0 items-center justify-between gap-2 xl:shrink-0 xl:justify-start xl:gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <StatDot color={item.color} />

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

              {hasExtraStats ? (
                <>
                  {stats?.length ? (
                    <div
                      className="hidden h-5.25 w-0.5 shrink-0 bg-linear-to-b from-white/0 via-white/80 to-white/0 xl:block"
                      aria-hidden="true"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    aria-label={
                      isExpanded ? 'Hide statistics' : 'Show more statistics'
                    }
                    title={isExpanded ? 'Hide statistics' : 'More statistics'}
                    className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-white outline-none transition duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 xl:shrink-0 ${
                      isExpanded ? 'bg-white/25' : 'bg-white/10'
                    }`}
                  >
                    <StatsIcon />
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                      className={`transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      <path
                        d="M2.5 4.5 6 8l3.5-3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {hasExtraStats ? (
        <div
          id={panelId}
          inert={!isExpanded}
          aria-hidden={!isExpanded}
          className={`relative grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            isExpanded
              ? 'mt-3 grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="rounded-xl border border-white/12 bg-white/10 p-3 backdrop-blur-3xl xl:px-4">
              <p className="mb-2.5 text-xs font-medium tracking-wide text-gray-300 uppercase">
                {extraStatsTitle}
              </p>

              <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {(extraStats ?? []).map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="flex min-w-0 items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <StatDot color={item.color} />

                      <p
                        className="truncate text-xs text-gray-200 sm:text-sm 2xl:text-base"
                        title={item.title}
                      >
                        {item.title}
                      </p>
                    </div>

                    <p className="shrink-0 whitespace-nowrap text-sm font-bold text-white sm:text-base 2xl:text-lg">
                      {item.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
