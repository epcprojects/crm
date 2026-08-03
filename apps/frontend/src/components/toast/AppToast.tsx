'use client';

import React from 'react';
import {
  ToastContainer,
  toast,
  type ToastOptions,
  type ToastPosition,
} from 'react-toastify';

export type AppToastType = 'success' | 'error' | 'warning' | 'info';

type AppToastConfig = {
  backgroundClass: string;
  defaultMessage: string;
};

export type ShowAppToastOptions = {
  message?: string;
  type?: AppToastType;
  position?: ToastPosition;
  autoClose?: number | false;
  toastId?: string;
};

const toastConfig: Record<AppToastType, AppToastConfig> = {
  success: {
    backgroundClass: 'bg-[#079455]',
    defaultMessage: 'Community updated successfully',
  },
  error: {
    backgroundClass: 'bg-[#F04438]',
    defaultMessage: 'Changes saved successfully',
  },
  warning: {
    backgroundClass: 'bg-warning-500',
    defaultMessage: 'Some changes may affect existing members',
  },
  info: {
    backgroundClass: 'bg-blue-500',
    defaultMessage: 'Information updated successfully',
  },
};

function AppToastContent({
  message,
  type,
}: {
  message: string;
  type: AppToastType;
}) {
  const config = toastConfig[type];

  return (
    <div
      className={`${config.backgroundClass} flex w-fit max-w-[calc(100vw-32px)] items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
        {type === 'success' ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.25 12C1.25 17.937 6.063 22.75 12 22.75C17.937 22.75 22.75 17.937 22.75 12C22.75 6.063 17.937 1.25 12 1.25C6.063 1.25 1.25 6.063 1.25 12ZM16.676 8.26299C17.083 8.63599 17.11 9.26898 16.737 9.67598L11.237 15.676C11.053 15.877 10.794 15.994 10.522 16C10.249 16.006 9.98599 15.9 9.79299 15.707L7.29299 13.207C6.90199 12.817 6.90199 12.183 7.29299 11.793C7.68299 11.402 8.31701 11.402 8.70701 11.793L10.469 13.554L15.263 8.32402C15.636 7.91702 16.269 7.88999 16.676 8.26299Z"
              fill="white"
            />
          </svg>
        ) : type === 'error' ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75ZM15.7071 9.70713C16.0976 9.31662 16.0976 8.68345 15.7071 8.29292C15.3166 7.90238 14.6835 7.90236 14.2929 8.29287L11.9998 10.5858L9.70708 8.29326C9.31655 7.90275 8.68338 7.90277 8.29287 8.29331C7.90236 8.68385 7.90238 9.31701 8.29292 9.70752L10.5855 12L8.29292 14.2925C7.90238 14.683 7.90236 15.3162 8.29287 15.7067C8.68338 16.0972 9.31655 16.0972 9.70708 15.7067L11.9998 13.4142L14.2929 15.7071C14.6835 16.0976 15.3166 16.0976 15.7071 15.7071C16.0976 15.3165 16.0976 14.6834 15.7071 14.2929L13.4141 12L15.7071 9.70713Z"
              fill="white"
            />
          </svg>
        ) : type === 'warning' ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.362 2.015C11.4264 1.66167 12.5736 1.66167 13.638 2.015C14.6981 2.36687 15.5304 3.20141 16.3665 4.37395C17.1999 5.5426 18.1208 7.17206 19.3078 9.2725L19.3544 9.35496C20.5417 11.4557 21.4625 13.0851 22.0364 14.4065C22.613 15.7343 22.9002 16.8807 22.6711 17.9821C22.4403 19.0911 21.8714 20.0995 21.0428 20.8617C20.2162 21.622 19.0907 21.9428 17.6736 22.0968C16.2645 22.25 14.4212 22.25 12.0488 22.25H11.9513C9.57882 22.25 7.73554 22.25 6.32642 22.0968C4.90927 21.9428 3.78379 21.622 2.95722 20.8617C2.12862 20.0995 1.55968 19.0911 1.32895 17.9821C1.0998 16.8807 1.387 15.7343 1.96365 14.4065C2.53752 13.0851 3.45835 11.4557 4.64558 9.35495L4.69218 9.2725C5.87921 7.17207 6.80008 5.5426 7.63347 4.37395C8.46963 3.20141 9.30194 2.36687 10.362 2.015ZM11 17C11 16.4477 11.4457 16 11.9955 16H12.0045C12.5543 16 13 16.4477 13 17C13 17.5523 12.5543 18 12.0045 18H11.9955C11.4457 18 11 17.5523 11 17ZM11 13C11 13.5523 11.4477 14 12 14C12.5523 14 13 13.5523 13 13V9C13 8.44772 12.5523 8 12 8C11.4477 8 11 8.44772 11 9V13Z"
              fill="white"
            />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25C6.06294 1.25 1.25 6.06294 1.25 12ZM11.6819 11.0273C11.9289 11.0605 12.2707 11.1494 12.5607 11.4394C12.8507 11.7294 12.9396 12.0711 12.9728 12.3182C13.0003 12.5228 13.0001 12.7608 13 12.9606L13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V13C10.4477 13 10 12.5523 10 12C10 11.4477 10.4477 11 11 11L11.0394 11C11.2393 10.9999 11.4772 10.9997 11.6819 11.0273ZM11.9954 7C11.4456 7 10.9999 7.44772 10.9999 8C10.9999 8.55228 11.4456 9 11.9954 9H12.0044C12.5542 9 12.9999 8.55228 12.9999 8C12.9999 7.44772 12.5542 7 12.0044 7H11.9954Z"
              fill="white"
            />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium line-clamp-3">{message}</span>
    </div>
  );
}

export function showAppToast({
  message,
  type = 'success',
  position = 'top-center',
  autoClose = 2500,
  toastId,
}: ShowAppToastOptions) {
  const config = toastConfig[type];
  const options: ToastOptions = {
    position,
    autoClose,
    closeButton: false,
    hideProgressBar: true,
    icon: false,
    className: 'app-toast-shell',
    toastId,
  };

  return toast(
    <AppToastContent message={message || config.defaultMessage} type={type} />,
    options,
  );
}

export const appToast = {
  success: (message: string, options?: Omit<ShowAppToastOptions, 'type'>) =>
    showAppToast({ ...options, message, type: 'success' }),
  error: (message: string, options?: Omit<ShowAppToastOptions, 'type'>) =>
    showAppToast({ ...options, message, type: 'error' }),
  warning: (message: string, options?: Omit<ShowAppToastOptions, 'type'>) =>
    showAppToast({ ...options, message, type: 'warning' }),
  info: (message: string, options?: Omit<ShowAppToastOptions, 'type'>) =>
    showAppToast({ ...options, message, type: 'info' }),
};

export function AppToastProvider() {
  return (
    <ToastContainer
      closeButton={false}
      draggable={false}
      hideProgressBar
      newestOnTop
      pauseOnFocusLoss={false}
      pauseOnHover
      position="top-center"
      toastClassName="app-toast-shell"
    />
  );
}
