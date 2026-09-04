'use client';
import React from 'react';
import Portal from './portal';
import ThemeButton from '../ui/ThemeButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useIsMobile } from '../hooks/useIsMobile';
import { CloseIcon } from '../../../public/icons';

export enum ModalPosition {
  CENTER = 'center',
  RIGHT = 'right',
}

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onConfirm?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  size?: 'small' | 'medium' | 'large' | 'extraLarge';
  outSideClickClose?: boolean;
  onCancel?: () => void;
  // confirmBtnVarient?: buttonVariant;
  showFooter?: boolean;
  bodyPaddingClasses?: string;
  position?: ModalPosition;
  confimBtnDisable?: boolean;
  btnFullWidth?: boolean;
  hideCancelBtn?: boolean;
  btnIcon?: React.ReactNode;
  scrollNeeded?: boolean;
  hideConfirmButton?: boolean;
  cancelBtnIcon?: React.ReactNode;
  disableCloseButton?: boolean;
  hideCrossButton?: boolean;
  headerTooltip?: string;
  headerTooltipAutoShowOnceKey?: string;
  headerTooltipAutoHideAfter?: number;
  centerFooter?: boolean;
  showHeader?: boolean;
  roundedCustom?: boolean;
  headerAction?: React.ReactNode;
  fullScreen?: boolean;
}

const sizeClasses = {
  small: 'sm:max-w-lg', // ~512px
  medium: 'sm:max-w-[600px]', // ~600px
  large: 'sm:max-w-3xl', // ~768px
  extraLarge: 'sm:max-w-5xl', // ~1024px
};

const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  title = 'Modal Title',
  subtitle,
  icon,
  children,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  size = 'medium',
  outSideClickClose = true,
  onCancel,
  showFooter = false,
  bodyPaddingClasses = '',
  position = ModalPosition.CENTER,
  confimBtnDisable,
  btnFullWidth,
  hideCancelBtn,
  hideConfirmButton,
  roundedCustom = false,
  btnIcon,
  showHeader = true,
  scrollNeeded = true,
  cancelBtnIcon,
  disableCloseButton = false,
  hideCrossButton = false,
  centerFooter = false,
  headerAction,
  fullScreen = false,
}) => {
  useBodyScrollLock(isOpen);
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const baseModalClasses = ' shadow-xl h-full flex flex-col';
  const baseWrapperClasses =
    'fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex';

  const rightModalWidth =
    position === ModalPosition.RIGHT && size === 'extraLarge'
      ? 'md:w-[800px]'
      : 'md:w-[600px]';

  const modalClasses = fullScreen
    ? `${baseModalClasses} container  p-5 mx-auto`
    : position === ModalPosition.RIGHT
      ? `${baseModalClasses} w-full ${rightModalWidth} md:rounded-xl overflow-hidden`
      : `${baseModalClasses} sm:h-fit relative w-full sm:max-h-[90dvh] md:m-auto container md:mx-4 ${sizeClasses[size]}`;

  const wrapperClasses = fullScreen
    ? `${baseWrapperClasses} items-stretch justify-stretch p-0`
    : position === ModalPosition.RIGHT
      ? `${baseWrapperClasses} justify-end items-stretch p-0 md:p-5`
      : `${baseWrapperClasses} min-h-dvh top-0 items-end md:items-center justify-center`;

  return (
    <Portal>
      <div
        className={wrapperClasses}
        onMouseDown={outSideClickClose ? onClose : undefined}
      >
        <div
          className={modalClasses}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {showHeader && (
            <div className="px-4 py-3 bg-white flex sm:rounded-t-xl items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <h2
                    className={`text-base md:text-lg text-black font-semibold`}
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <h3 className="text-gray-800 text-xs font-normal md:text-xs">
                      {subtitle}
                    </h3>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {headerAction}
                {!hideCrossButton && (
                  <button
                    type="button"
                    onMouseDown={
                      disableCloseButton
                        ? undefined
                        : (event) => {
                            event.stopPropagation();
                            onClose();
                          }
                    }
                    onClick={disableCloseButton ? undefined : onClose}
                    disabled={disableCloseButton}
                    className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full ${
                      disableCloseButton
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                    }`}
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            </div>
          )}

          <div
            className={`flex-1 bg-white ${
              scrollNeeded && 'overflow-y-auto scrollbar-thin max-h-dvh'
            } ${!showFooter && (roundedCustom ? 'sm:rounded-b-[20px]' : 'sm:rounded-b-xl')} ${
              !showHeader &&
              (roundedCustom ? 'sm:rounded-t-[20px]' : 'sm:rounded-t-xl')
            } ${bodyPaddingClasses}`}
          >
            {children}
          </div>

          {showFooter && (
            <div
              className={`${
                btnFullWidth && 'gap-6'
              }  bg-white border-t border-t-gray-200  flex gap-2 sm:rounded-b-xl items-center p-2 md:p-4 justify-center`}
            >
              {!hideCancelBtn && (
                <div className=" w-full">
                  <ThemeButton
                    className="border w-full border-gray-200"
                    variant="secondary"
                    onClick={onCancel ? onCancel : onClose}
                    size={isMobile ? 'md' : 'lg'}
                  >
                    {cancelLabel}
                  </ThemeButton>
                </div>
              )}
              {onConfirm && !hideConfirmButton && (
                <div className="w-full">
                  <ThemeButton
                    variant="primaryGradient"
                    size={isMobile ? 'md' : 'lg'}
                    onClick={onConfirm}
                    disabled={confimBtnDisable}
                    className="w-full"
                  >
                    {confirmLabel}
                  </ThemeButton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default AppModal;
