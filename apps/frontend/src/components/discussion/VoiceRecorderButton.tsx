'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { appToast } from '../toast/AppToast';
import {
  MAX_VOICE_NOTE_SECONDS,
  createVoiceNoteFile,
  formatVoiceNoteDuration,
  getSupportedVoiceNoteMimeType,
  getVoiceNoteDuration,
} from '../../lib/voice-notes';

type VoiceRecorderButtonProps = {
  disabled?: boolean;
  onRecorded: (file: File) => void;
  onRecordingChange?: (isRecording: boolean) => void;
};

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Records up to MAX_VOICE_NOTE_SECONDS and hands the result back as a File,
// so it goes through the normal attachment upload (presigned S3) flow.
export default function VoiceRecorderButton({
  disabled = false,
  onRecorded,
  onRecordingChange,
}: VoiceRecorderButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  const onRecordingChangeRef = useRef(onRecordingChange);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
    onRecordingChangeRef.current = onRecordingChange;
  });

  const releaseResources = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsedSeconds(0);
    onRecordingChangeRef.current?.(false);
  }, []);

  useEffect(
    () => () => {
      discardRef.current = true;

      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    },
    [],
  );

  const stopRecording = useCallback((discard: boolean) => {
    discardRef.current = discard;

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const startRecording = async () => {
    if (isRecording || disabled) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      appToast.error(
        'Voice notes need a secure (https) connection and a supported browser.',
      );
      return;
    }

    const mimeType = getSupportedVoiceNoteMimeType();

    if (!mimeType) {
      appToast.error('Voice notes are not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      discardRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const seconds = Math.min(
          (Date.now() - startedAtRef.current) / 1000,
          MAX_VOICE_NOTE_SECONDS,
        );
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const shouldDiscard = discardRef.current;

        releaseResources();

        if (shouldDiscard) {
          return;
        }

        if (seconds < 1 || blob.size === 0) {
          appToast.info('Recording was too short, nothing was saved.');
          return;
        }

        const file = createVoiceNoteFile(
          blob,
          recorder.mimeType,
          Math.round(seconds),
        );

        onRecordedRef.current(file);
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
      onRecordingChangeRef.current?.(true);

      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);

        setElapsedSeconds(Math.min(seconds, MAX_VOICE_NOTE_SECONDS));

        if (seconds >= MAX_VOICE_NOTE_SECONDS) {
          appToast.info('Voice notes are limited to 2 minutes.');
          stopRecording(false);
        }
      }, 250);
    } catch (error) {
      releaseResources();

      const name = error instanceof DOMException ? error.name : '';

      appToast.error(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access is blocked. Allow it in your browser settings and try again.'
          : name === 'NotFoundError'
            ? 'No microphone was found on this device.'
            : 'Could not start recording.',
      );
    }
  };

  if (isRecording) {
    return (
      <div className="flex h-8 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 pr-1 pl-2.5 text-xs font-medium text-red-600">
        <span
          className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500"
          aria-hidden="true"
        />
        <span className="tabular-nums" aria-live="off">
          {formatVoiceNoteDuration(elapsedSeconds)} /{' '}
          {formatVoiceNoteDuration(MAX_VOICE_NOTE_SECONDS)}
        </span>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => stopRecording(true)}
          aria-label="Cancel recording"
          title="Cancel recording"
          className="flex h-6 w-6 items-center justify-center rounded-lg text-red-600 hover:bg-red-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => stopRecording(false)}
          aria-label="Finish recording"
          title="Finish recording"
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect width="10" height="10" rx="1.5" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => void startRecording()}
      disabled={disabled}
      aria-label="Record voice note"
      title="Record voice note (up to 2 minutes)"
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <MicIcon />
    </button>
  );
}

// Compact player for a recorded voice note waiting in the composer.
export function VoiceNotePreview({ file }: { file: File }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = getVoiceNoteDuration(file) ?? 0;

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);

    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const togglePlayback = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-1.5">
      {url ? (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
        />
      ) : null}

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#10175A] text-white"
      >
        {isPlaying ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" width="3" height="10" rx="1" />
            <rect x="6" width="3" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 0.8v8.4a.6.6 0 0 0 .9.5l6.6-4.2a.6.6 0 0 0 0-1L2.9.3A.6.6 0 0 0 2 .8Z" />
          </svg>
        )}
      </button>

      <div className="h-1.5 w-14 min-w-8 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-[#10175A]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span className="shrink-0 text-xs tabular-nums text-gray-600">
        {formatVoiceNoteDuration(isPlaying ? currentTime : duration)}
      </span>
    </div>
  );
}
