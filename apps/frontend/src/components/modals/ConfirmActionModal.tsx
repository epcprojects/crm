'use client';

import type { ReactNode } from 'react';
import AppModal from './AppModal';
import ThemeButton from '../ui/ThemeButton';

type ConfirmActionModalVariant = 'danger' | 'primary';

type ConfirmActionModalProps = {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  variant?: ConfirmActionModalVariant;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  variant = 'primary',
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  const isDanger = variant === 'danger';

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
          <ConfirmIcon isDanger={isDanger} />
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close confirmation modal"
          >
            <CloseCrossIcon />
          </button>
        </div>

        <div className="mt-3">
          <h2 className="text-xl font-semibold text-gray-900 md:text-2xl">
            {title}
          </h2>
          <div className="mt-2 text-base leading-6 text-gray-900">{message}</div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ThemeButton
            variant="secondary"
            className="w-full border-gray-200"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </ThemeButton>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 ${
              isDanger ? 'bg-[#F04438]' : 'bg-primary-dark'
            }`}
          >
            {isSubmitting ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </AppModal>
  );
}

function ConfirmIcon({ isDanger }: { isDanger: boolean }) {
  const color = isDanger ? '#F04438' : '#18226D';

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 8V12.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 16H12.01"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M10.29 3.86L2.82 16.34C1.98 17.74 2.99 19.5 4.62 19.5H19.38C21.01 19.5 22.02 17.74 21.18 16.34L13.71 3.86C12.9 2.51 11.1 2.51 10.29 3.86Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
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
      aria-hidden="true"
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
