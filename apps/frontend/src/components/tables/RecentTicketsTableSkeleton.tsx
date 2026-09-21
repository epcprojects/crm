export function RecentTicketsTableSkeleton() {
  return (
    <div
      className="flex h-auto min-h-0 animate-pulse flex-col overflow-visible rounded-xl bg-white xl:h-full xl:w-full xl:overflow-hidden xl:border xl:border-gray-200"
      aria-hidden="true"
    >
      {/* Mobile: current TicketMobileCard layout */}
      <div className="flex-none space-y-3 overflow-visible xl:hidden xl:p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <div className="flex flex-col gap-2 bg-gray-50 p-2.5">
              {/* Title */}
              <div
                className={`h-4 rounded bg-gray-200 ${
                  index % 2 === 0 ? 'w-2/3' : 'w-3/4'
                }`}
              />

              {/* Reference and status */}
              <div className="flex items-center gap-2">
                <div className="h-3 w-14 rounded bg-gray-200" />

                <div className="ml-auto h-5 w-14 rounded-full bg-gray-200" />
              </div>
            </div>

            {/* Project, creator and dates */}
            <div className="grid grid-cols-2 gap-2.5 p-2.5">
              <div className="space-y-1.5">
                <div className="h-2.5 w-10 rounded bg-gray-100" />
                <div className="flex h-6 w-28 items-center gap-1 rounded-full bg-gray-100 p-0.5">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-gray-200" />
                  <div className="h-3 w-18 rounded bg-gray-200" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-2.5 w-14 rounded bg-gray-100" />
                <div className="flex h-6 items-center gap-1">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-gray-200" />
                  <div className="h-3 w-20 rounded bg-gray-200" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="h-2.5 w-14 rounded bg-gray-100" />
                <div className="h-3 w-20 rounded bg-gray-200" />
              </div>

              <div className="space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-gray-100" />
                <div className="h-3 w-20 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: actual 7-column table */}
      <div className="hidden min-h-0 flex-1 overflow-hidden xl:block">
        <div className="grid grid-cols-[110px_1.5fr_1.2fr_100px_100px_1.2fr_110px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-gray-200" />
          ))}
        </div>

        <div>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-[110px_1.5fr_1.2fr_100px_100px_1.2fr_110px] items-center gap-4 border-b border-gray-200 px-4 py-4 last:border-b-0"
            >
              {Array.from({ length: 7 }).map((_, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`rounded bg-gray-100 ${
                    cellIndex === 2 || cellIndex === 5 ? 'h-7' : 'h-5'
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
