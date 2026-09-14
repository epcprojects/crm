'use client';

import { useState } from 'react';
import AppModal from './AppModal';
import ThemeButton from '../ui/ThemeButton';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';

type DeleteContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
  onConfirm?: () => void | Promise<void>;
};

export default function DeleteContactModal({
  isOpen,
  onClose,
  contactName,
  onConfirm,
}: DeleteContactModalProps) {
  const { setLoading } = useAppLoader();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setLoading(true);
      await onConfirm?.();
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      showHeader={false}
      roundedCustom
      outSideClickClose={false}
      scrollNeeded={false}
      size="small"
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <DeleteContactIcon />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
            aria-label="Close delete modal"
          >
            <CloseCrossIcon />
          </button>
        </div>

        <div className="mt-3">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
            Delete Contact?
          </h2>
          <p className="mt-2 text-base leading-6 text-gray-900">
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              &ldquo;{contactName ?? 'this contact'}&rdquo;
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ThemeButton
            variant="secondary"
            className="w-full border-gray-200"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </ThemeButton>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#F04438] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </AppModal>
  );
}

function DeleteContactIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.4">
        <path
          d="M18.1046 4.125C13.2951 4.125 9.39628 8.02386 9.39628 12.8333C9.39628 17.6428 13.2951 21.5417 18.1046 21.5417C22.914 21.5417 26.813 17.6428 26.813 12.8333C26.813 8.02386 22.914 4.125 18.1046 4.125Z"
          fill="#F04438"
        />
        <path
          d="M27.6364 26.857C21.8005 23.4366 14.4085 23.4366 8.57267 26.857C8.3885 26.965 8.15928 27.0923 7.89856 27.237C6.73601 27.8824 4.954 28.8716 3.7343 30.0468C2.97257 30.7809 2.22171 31.7722 2.08463 33.0067C1.93774 34.3295 2.52872 35.5503 3.65864 36.61C5.58379 38.4153 7.90831 39.875 10.9193 39.875H25.2897C28.3008 39.875 30.6253 38.4154 32.5505 36.61C33.6804 35.5503 34.2712 34.3295 34.1244 33.0067C33.9873 31.7722 33.2365 30.7809 32.4748 30.0468C31.2552 28.8718 29.4739 27.8829 28.3141 27.239C28.0522 27.0936 27.8212 26.9654 27.6364 26.857Z"
          fill="#F04438"
        />
      </g>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M29.6414 6.95347C30.3575 6.23752 31.5182 6.23752 32.2343 6.95347L35.5211 10.2405L38.8081 6.95347C39.5242 6.23752 40.6849 6.23752 41.401 6.95347C42.1169 7.66944 42.1169 8.83023 41.401 9.54621L38.114 12.8332L41.401 16.1201C42.1169 16.8361 42.1169 17.9969 41.401 18.7129C40.6849 19.4288 39.5242 19.4288 38.8081 18.7129L35.5211 15.4259L32.2343 18.7129C31.5182 19.4288 30.3575 19.4288 29.6414 18.7129C28.9255 17.9969 28.9255 16.8361 29.6414 16.1201L32.9284 12.8332L29.6414 9.54621C28.9255 8.83023 28.9255 7.66944 29.6414 6.95347Z"
        fill="#F04438"
      />
    </svg>
  );
}

function CloseCrossIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 5L15 15M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
