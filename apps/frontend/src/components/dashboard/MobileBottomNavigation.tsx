'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ArrowRightIcon, CrossIcon, MoreIcon } from '../../../public/icons';

export type MobileNavigationItem = {
  href: string;
  label: string;
  icon: (isActive: boolean) => ReactNode;
};

type MobileBottomNavigationProps = {
  items: MobileNavigationItem[];
  isLoading?: boolean;
};

type NavigationElement = HTMLAnchorElement | HTMLButtonElement;

type MobileIconProps = {
  width?: string;
  height?: string;
  fill?: string;
};

export default function MobileBottomNavigation({
  items,
  isLoading = false,
}: MobileBottomNavigationProps) {
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<NavigationElement | null>>([]);

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [selectedMoreHref, setSelectedMoreHref] = useState<string | null>(null);

  const hasMoreItems = items.length > 4;
  const visibleItems = hasMoreItems ? items.slice(0, 3) : items;
  const moreItems = hasMoreItems ? items.slice(3) : [];

  const slotCount = visibleItems.length + (hasMoreItems ? 1 : 0);

  const isItemActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const activeVisibleIndex = visibleItems.findIndex((item) =>
    isItemActive(item.href),
  );

  const isMoreActive = moreItems.some((item) => isItemActive(item.href));

  const isMoreSelectionPending = selectedMoreHref !== null;

  const shouldHighlightMore =
    isMoreActive || isMoreOpen || isMoreSelectionPending;

  const activeIndex =
    isMoreOpen || isMoreSelectionPending
      ? visibleItems.length
      : activeVisibleIndex >= 0
        ? activeVisibleIndex
        : isMoreActive
          ? visibleItems.length
          : -1;

  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    transform: 'translateX(0px)',
    opacity: 0,
  });

  /*
   * Sheet ko route change se pehle close nahi karte.
   * Jab selected route load ho jaye, tab sheet close hoti hai.
   * Isse indicator Home par wapas flicker nahi karta.
   */
  useEffect(() => {
    if (!selectedMoreHref) {
      return;
    }

    const hasReachedSelectedRoute =
      pathname === selectedMoreHref ||
      pathname.startsWith(`${selectedMoreHref}/`);

    if (hasReachedSelectedRoute) {
      setIsMoreOpen(false);
      setSelectedMoreHref(null);
    }
  }, [pathname, selectedMoreHref]);

  useEffect(() => {
    const activeItem = itemRefs.current[activeIndex];
    const container = containerRef.current;

    if (!activeItem || !container || activeIndex < 0) {
      setIndicatorStyle((current) => ({
        ...current,
        opacity: 0,
      }));

      return;
    }

    const updateIndicator = () => {
      const activeItemRect = activeItem.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const relativeLeft = activeItemRect.left - containerRect.left;

      setIndicatorStyle({
        width: activeItemRect.width,
        transform: `translateX(${relativeLeft}px)`,
        opacity: 1,
      });
    };

    updateIndicator();

    const resizeObserver = new ResizeObserver(updateIndicator);

    resizeObserver.observe(container);
    resizeObserver.observe(activeItem);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeIndex, pathname]);

  if (isLoading) {
    return <MobileBottomNavigationSkeleton />;
  }

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className="relative z-40 shrink-0 px-3 py-2 xl:hidden"
      aria-label="Mobile navigation"
    >
      <div
        ref={containerRef}
        className="relative grid w-full gap-2 rounded-xl bg-white/20 p-1 shadow-[0_0_36px_-3px_rgb(0_0_0/0.20)] backdrop-blur-3xl"
        style={{
          gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))`,
        }}
      >
        {/* Smooth moving white selection */}
        <div
          className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-lg bg-white transition-all duration-300 ease-out"
          style={{
            width: indicatorStyle.width,
            transform: indicatorStyle.transform,
            opacity: indicatorStyle.opacity,
          }}
          aria-hidden="true"
        />

        {visibleItems.map((item, index) => {
          const isActive = isItemActive(item.href);

          return (
            <MobileNavigationLink
              key={item.href}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              item={item}
              isActive={isActive}
            />
          );
        })}

        {hasMoreItems ? (
          <div className="relative z-10 min-w-0">
            <button
              ref={(element) => {
                itemRefs.current[visibleItems.length] = element;
              }}
              type="button"
              onClick={() => setIsMoreOpen(true)}
              className="flex w-full min-w-0 flex-col items-center gap-0.5 rounded-full px-4 py-1 outline-none"
              aria-label="Open more navigation options"
              aria-expanded={isMoreOpen}
            >
              <MoreIcon
                width="18"
                height="18"
                fill={shouldHighlightMore ? '#3165F6' : '#374151'}
              />

              <p
                className={`text-xs font-medium transition-colors duration-300 ${
                  shouldHighlightMore ? 'text-primary' : 'text-gray-700'
                }`}
              >
                More
              </p>
            </button>

            <Dialog
              open={isMoreOpen}
              onClose={setIsMoreOpen}
              className="relative z-200 xl:hidden"
            >
              <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/60 transition-opacity duration-300 data-closed:opacity-0"
              />

              <div className="fixed inset-0 flex items-end ">
                <DialogPanel
                  transition
                  className="w-full  origin-bottom rounded-t-[20px] bg-white p-4 flex flex-col gap-3 transition duration-300 ease-out data-closed:translate-y-full data-closed:opacity-0"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 justify-between">
                    <DialogTitle className="text-lg font-medium text-gray-900">
                      More
                    </DialogTitle>

                    <button
                      type="button"
                      onClick={() => setIsMoreOpen(false)}
                      className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-[0_0px_24px_0_rgb(0_0_0/0.08)] transition hover:bg-gray-50"
                      aria-label="Close more navigation"
                    >
                      <CrossIcon />
                    </button>
                  </div>

                  {/* Navigation items */}
                  <div>
                    {moreItems.map((item, index) => {
                      const isActive = isItemActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            /*
                             * Sirf pending href set karte hain.
                             * Sheet pathname update hone ke baad effect mein close hogi.
                             */
                            setSelectedMoreHref(item.href);
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center justify-between gap-2 py-4 ${
                            index < moreItems.length - 1
                              ? 'border-b border-gray-200'
                              : ''
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={
                                isActive ? 'text-primary' : 'text-gray-700'
                              }
                            >
                              {renderSheetIcon(
                                item,
                                isActive,
                                isActive ? '#3165F6' : '#374151',
                              )}
                            </span>

                            <span
                              className={`text-base font-medium ${
                                isActive ? 'text-primary' : 'text-gray-700'
                              }`}
                            >
                              {item.label}
                            </span>
                          </div>

                          <span className="flex h-5 w-7.5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-700">
                            <ArrowRightIcon />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </DialogPanel>
              </div>
            </Dialog>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function renderSheetIcon(
  item: MobileNavigationItem,
  isActive: boolean,
  fill: string,
) {
  const icon = item.icon(isActive);

  if (!isValidElement(icon)) {
    return icon;
  }

  return cloneElement(icon as ReactElement<MobileIconProps>, {
    width: '20',
    height: '20',
    fill,
  });
}

const MobileNavigationLink = forwardRef<
  HTMLAnchorElement,
  {
    item: MobileNavigationItem;
    isActive: boolean;
  }
>(function MobileNavigationLink({ item, isActive }, ref) {
  return (
    <Link
      ref={ref}
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className="relative z-10 flex w-full min-w-0 flex-col items-center gap-0.5 rounded-full px-4 py-1 outline-none"
    >
      {renderMobileIcon(item, isActive, isActive ? '#3165F6' : '#374151')}

      <p
        className={`text-[11px] font-medium transition-colors duration-300 ${
          isActive ? 'text-primary' : 'text-gray-700'
        }`}
      >
        {getMobileLabel(item.label)}
      </p>
    </Link>
  );
});

function getMobileLabel(label: string) {
  if (label === 'All Leads') {
    return 'Leads';
  }

  return label;
}

function renderMobileIcon(
  item: MobileNavigationItem,
  isActive: boolean,
  fill: string,
) {
  const icon = item.icon(isActive);

  if (!isValidElement(icon)) {
    return icon;
  }

  return cloneElement(icon as ReactElement<MobileIconProps>, {
    width: '18',
    height: '18',
    fill,
  });
}

function MobileBottomNavigationSkeleton() {
  return (
    <div
      className="relative z-40 shrink-0 px-3 py-2 xl:hidden"
      aria-hidden="true"
    >
      <div className="grid w-full grid-cols-4 gap-2 rounded-full bg-white/20 p-1 shadow-[0_0_36px_-3px_rgb(0_0_0/0.20)] backdrop-blur-3xl">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex min-w-0 animate-pulse flex-col items-center gap-0.5 rounded-full px-4 py-1"
          >
            <div className="h-4.5 w-4.5 rounded bg-gray-200" />
            <div className="h-3 w-8 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
