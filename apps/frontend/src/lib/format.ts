export function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return 'NA';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

// "Sep 20, 2026, 3:45 PM". A date-only value (YYYY-MM-DD) has no time to
// show, so it is rendered as the date alone rather than a misleading 12:00 AM.
export function formatDateTime(value: string) {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00` : value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(isDateOnly ? {} : { hour: 'numeric', minute: '2-digit', hour12: true }),
  }).format(date);
}
