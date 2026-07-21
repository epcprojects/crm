'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Images } from '../../app/ui/images';

type PageNotFoundStateProps = {
  className?: string;
  description?: string;
  title?: string;
};

const DEFAULT_TITLE = 'Page not found';
const DEFAULT_DESCRIPTION =
  "Sorry, the page you are looking for doesn't exist.";

export default function PageNotFoundState({
  className,
  description = DEFAULT_DESCRIPTION,
  title = DEFAULT_TITLE,
}: PageNotFoundStateProps) {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div
      className={clsx(
        'flex h-full min-h-0  flex-1 items-center justify-center ',
        className,
      )}
    >
      <section className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center rounded-[32px] bg-[#F8FAFC] px-6 py-10 shadow-[0_0_0_1px_rgba(15,23,42,0.04)] sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="relative mb-8 flex items-center justify-center">
            <Image
              alt="Harper Help logo"
              className=""
              src={'/images/404Logo.svg'}
              width={4000}
              height={4000}
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#101828] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#667085] sm:text-xl">
            {description}
          </p>
          <button
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#3563FF] bg-white px-5 py-2.5 text-sm font-semibold text-[#3563FF] transition hover:bg-[#EEF4FF]"
            onClick={handleGoBack}
            type="button"
          >
            <BackArrowIcon />
            Go back
          </button>
        </div>
      </section>
    </div>
  );
}

function IllustrationSide({
  className,
  mirrored = false,
}: {
  className?: string;
  mirrored?: boolean;
}) {
  return (
    <div
      className={clsx(
        'hidden h-24 w-24 items-center justify-center text-[#3563FF] sm:flex',
        mirrored && '-scale-x-100',
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        viewBox="0 0 96 96"
      >
        <circle
          cx="20"
          cy="68"
          r="14"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="66"
          cy="22"
          r="14"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="66"
          cy="90"
          r="12"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M6 68H54L80 42V10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 54V14H80" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 68L66 22L66 90" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M6.66667 3.33334L2 8.00001M2 8.00001L6.66667 12.6667M2 8.00001H14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
