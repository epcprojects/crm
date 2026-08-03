export const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;

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
  '.html',
];

export const ALLOWED_ATTACHMENT_ACCEPT =
  ALLOWED_ATTACHMENT_EXTENSIONS.join(',');

export const ALLOWED_ATTACHMENT_HELPER_TEXT =
  'JPG, PNG, SVG, Word, Excel, PDF, WEBP,HTML, or ZIP up to 3 MB total';

export const ALLOWED_ATTACHMENT_ERROR_TEXT = `Allowed file types: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`;

export const MAX_ATTACHMENT_SIZE_ERROR_TEXT =
  'Total attachment size must be 3 MB or less.';

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

  const totalAttachmentSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalAttachmentSize > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
    return MAX_ATTACHMENT_SIZE_ERROR_TEXT;
  }

  return '';
}
