export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.pdf',
  '.zip',
  '.webp',
];

export const ALLOWED_ATTACHMENT_ACCEPT =
  ALLOWED_ATTACHMENT_EXTENSIONS.join(',');

export const ALLOWED_ATTACHMENT_HELPER_TEXT =
  'JPG, PNG, SVG, Word, Excel, PDF, webp, or ZIP up to 5MB';

export const ALLOWED_ATTACHMENT_ERROR_TEXT = `Allowed file types: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`;

export const MAX_ATTACHMENT_SIZE_ERROR_TEXT =
  'Each file must be 5MB or smaller.';

export function isAllowedAttachmentFile(file: File) {
  const lowerCaseName = file.name.toLowerCase();

  return ALLOWED_ATTACHMENT_EXTENSIONS.some((extension) =>
    lowerCaseName.endsWith(extension),
  );
}

export function validateAttachments(files: File[]) {
  if (files.some((file) => !isAllowedAttachmentFile(file))) {
    return ALLOWED_ATTACHMENT_ERROR_TEXT;
  }

  if (files.some((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES)) {
    return MAX_ATTACHMENT_SIZE_ERROR_TEXT;
  }

  return '';
}
