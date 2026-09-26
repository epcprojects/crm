export const MAX_VOICE_NOTE_SECONDS = 120;

const VOICE_NOTE_NAME_PREFIX = 'voice-note-';

// Ordered by preference; the first one this browser can record is used.
const VOICE_NOTE_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

// WebM audio uses ".weba" so it is never mistaken for a ".webm" video.
const VOICE_NOTE_EXTENSIONS: Record<string, string> = {
  'audio/webm': 'weba',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

const voiceNoteDurations = new WeakMap<File, number>();

export function getSupportedVoiceNoteMimeType() {
  if (
    typeof window === 'undefined' ||
    typeof window.MediaRecorder === 'undefined'
  ) {
    return undefined;
  }

  return VOICE_NOTE_MIME_CANDIDATES.find((mimeType) =>
    window.MediaRecorder.isTypeSupported(mimeType),
  );
}

export function createVoiceNoteFile(
  blob: Blob,
  recorderMimeType: string,
  durationSeconds: number,
) {
  // Drop codec parameters so the stored MIME type is a plain "audio/webm".
  const mimeType =
    (recorderMimeType || blob.type).split(';')[0] || 'audio/webm';
  const extension = VOICE_NOTE_EXTENSIONS[mimeType] ?? 'weba';
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const file = new File(
    [blob],
    `${VOICE_NOTE_NAME_PREFIX}${timestamp}.${extension}`,
    { type: mimeType },
  );

  voiceNoteDurations.set(file, durationSeconds);

  return file;
}

export function isVoiceNoteFile(file: File) {
  return file.name.startsWith(VOICE_NOTE_NAME_PREFIX);
}

export function getVoiceNoteDuration(file: File) {
  return voiceNoteDurations.get(file);
}

export function formatVoiceNoteDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
