type DashboardSummaryBannerSkeletonProps = {
  statsCount?: number;
  showBadge?: boolean;
  titleWidthClass?: string;
};

export default function DashboardSummaryBannerSkeleton({
  statsCount = 3,
  showBadge = false,
  titleWidthClass = 'w-36',
}: DashboardSummaryBannerSkeletonProps) {
  return (
    <div
      className={`
        relative flex w-full animate-pulse flex-col gap-2
        overflow-hidden rounded-none bg-cover bg-center bg-no-repeat
        px-4 py-4
        xl:flex-row xl:gap-4 xl:rounded-xl xl:px-7.5 xl:py-6
        ${showBadge ? 'items-start' : 'xl:items-center'}
      `}
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
      aria-hidden="true"
    >
      {/* Same overlay used by DashboardSummaryBanner */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative hidden min-w-0 items-center gap-3 xl:contents">
        {/* Page icon/back button */}
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/20 backdrop-blur-3xl xl:h-12 xl:w-12" />

        {/* Mobile title */}
        <div
          className={`h-7 rounded bg-white/25 xl:hidden ${titleWidthClass}`}
        />

        {/* Mobile badge */}
        {showBadge ? (
          <div className="h-6 w-14 shrink-0 rounded-full bg-white/20 xl:hidden" />
        ) : null}
      </div>

      <div className="relative flex min-w-0 w-full flex-1 flex-col gap-3 md:flex-row xl:items-center xl:justify-between xl:gap-4">
        {/* Desktop title and optional badge */}
        <div className="hidden min-w-0 items-center gap-3 xl:flex">
          <div className={`h-8 rounded bg-white/25 ${titleWidthClass}`} />

          {showBadge ? (
            <div className="h-6 w-14 shrink-0 rounded-full bg-white/20" />
          ) : null}
        </div>

        {/* Statistics */}
        {statsCount > 0 ? (
          <div
            className="
              grid w-full grid-cols-2 gap-x-4 gap-y-3
              rounded-xl border border-white/12
              bg-white/10 p-3 backdrop-blur-3xl
              drop-shadow-[0_14px_44px_rgb(0_0_0/0.45)]
              sm:w-fit
              xl:flex xl:max-w-full xl:items-center
              xl:gap-5.5 xl:px-4
            "
          >
            {Array.from({ length: statsCount }).map((_, index) => (
              <div key={index} className="contents">
                {index > 0 ? (
                  <div
                    className="
                      hidden h-5.25 w-px shrink-0
                      bg-linear-to-b
                      from-white/0 via-white/60 to-white/0
                      xl:block
                    "
                  />
                ) : null}

                <div className="flex min-w-0 items-center justify-between gap-3 xl:shrink-0 xl:justify-start xl:gap-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {/* Stat color dot */}
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/40">
                      <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
                    </div>

                    {/* Stat label */}
                    <div
                      className={`h-4 rounded bg-white/25 ${
                        index % 2 === 0 ? 'w-16' : 'w-20'
                      }`}
                    />
                  </div>

                  {/* Stat count */}
                  <div className="h-5 w-6 shrink-0 rounded bg-white/30" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
   );
}
