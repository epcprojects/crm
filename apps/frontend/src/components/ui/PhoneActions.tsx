'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { CallIcon, WhatsAppIcon } from '../../../public/icons';

export function sanitizePhoneForLink(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

// Pakistani mobile numbers are commonly entered in local format (03XXXXXXXXX).
// WhatsApp links need the country code instead of the leading 0 (923XXXXXXXXX).
export function toWhatsAppNumber(phone: string) {
  const digitsOnly = phone.replace(/\D/g, '');

  if (/^03\d{9}$/.test(digitsOnly)) {
    return `92${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

type PhoneActionsProps = {
  phone: string;
  size?: 'sm' | 'md';
  variant?: 'light' | 'dark';
  className?: string;
};

// Rendered as role="button" spans (not real <button>/<a> elements) so this can be
// safely nested inside other interactive elements (kanban ticket cards, table row
// links, etc.) without producing invalid HTML (a <button> or <a> cannot contain
// another <button>/<a>, and browsers will silently mangle that nesting).
export default function PhoneActions({
  phone,
  size = 'sm',
  variant = 'light',
  className = '',
}: PhoneActionsProps) {
  const sanitizedPhone = sanitizePhoneForLink(phone);

  if (!sanitizedPhone) {
    return null;
  }

  const iconSize = size === 'sm' ? '14' : '16';
  const buttonSizeClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const colorClass =
    variant === 'dark'
      ? 'text-white/80 hover:bg-white/15 hover:text-white'
      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700';

  const call = () => {
    window.location.href = `tel:${sanitizedPhone}`;
  };

  const whatsApp = () => {
    window.open(
      `https://wa.me/${toWhatsAppNumber(sanitizedPhone)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const stopAndRun = (action: () => void) => ({
    onClick: (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      action();
    },
  });

  return (
    <span className={`flex shrink-0 items-center gap-1 ${className}`}>
      <span
        role="button"
        tabIndex={0}
        {...stopAndRun(call)}
        className={`flex ${buttonSizeClass} cursor-pointer items-center justify-center rounded-md transition ${colorClass}`}
        aria-label={`Call ${phone}`}
        title="Call"
      >
        <CallIcon width={iconSize} height={iconSize} fill="currentColor" />
      </span>
      <span
        role="button"
        tabIndex={0}
        {...stopAndRun(whatsApp)}
        className={`flex ${buttonSizeClass} cursor-pointer items-center justify-center rounded-md transition ${
          variant === 'dark' ? 'hover:bg-white/15' : 'hover:bg-gray-100'
        }`}
        aria-label={`Message ${phone} on WhatsApp`}
        title="WhatsApp"
      >
        <WhatsAppIcon width={iconSize} height={iconSize} />
      </span>
    </span>
  );
}
