export function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function normalizeEmailKey(value?: string | null) {
  return normalizeEmail(value).toUpperCase();
}
