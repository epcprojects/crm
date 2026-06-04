'use client';

import { InputHTMLAttributes, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { EyeClosedIcon, EyeOpenedIcon } from '../../../public/icons';

type ThemeInputType = 'text' | 'email' | 'password' | 'number' | 'date';

type ThemeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  type?: ThemeInputType;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  showNumberSteppers?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
};

export default function ThemeInput({
  label,
  type = 'text',
  required,
  helperText,
  errorText,
  showNumberSteppers = true,
  className,
  wrapperClassName,
  inputClassName,
  ...props
}: ThemeInputProps) {
  const { value, defaultValue, ...restProps } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isNumberType = type === 'number';

  const [passwordVisible, setPasswordVisible] = useState(false);

  const normalizedType = useMemo(
    () => String(type || 'text').toLowerCase(),
    [type],
  );

  const isPassword = normalizedType === 'password';

  const renderedType: React.HTMLInputTypeAttribute = isPassword
    ? passwordVisible
      ? 'text'
      : 'password'
    : (normalizedType as React.HTMLInputTypeAttribute);

  const triggerNativeChange = () => {
    const input = inputRef.current;
    if (!input) return;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const handleStep = (direction: 'up' | 'down') => {
    const input = inputRef.current;
    if (!input) return;
    if (direction === 'up') input.stepUp();
    else input.stepDown();
    triggerNativeChange();
  };

  const hasValueProp = Object.prototype.hasOwnProperty.call(props, 'value');
  const normalizedValue = hasValueProp ? (value ?? '') : undefined;

  return (
    <div className={clsx('w-full', wrapperClassName)}>
      {label && (
        <label className="block text-sm font-normal text-gray-800 md:text-base">
          {label} {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type={renderedType}
          value={normalizedValue}
          defaultValue={!hasValueProp ? defaultValue : undefined}
          className={clsx(
            'w-full border-0 border-b border-gray-200 bg-transparent px-0 py-1.5 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-400 md:text-base',
            errorText && 'border-red-300 focus:border-red-400',
            isNumberType &&
              `[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                showNumberSteppers ? 'pr-8' : ''
              }`,
            inputClassName,
            className,
          )}
          {...restProps}
        />

        {isNumberType && showNumberSteppers && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col">
            <button
              type="button"
              onClick={() => handleStep('up')}
              className="h-3.5 w-6 text-gray-500 hover:text-gray-700 leading-none"
              aria-label="Increase value"
            >
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path
                  d="M1 6L6 1L11 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleStep('down')}
              className="h-3.5 w-6 text-gray-500 hover:text-gray-700 leading-none"
              aria-label="Decrease value"
            >
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path
                  d="M1 2L6 7L11 2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            className="absolute p-1.5 -translate-y-1/2 rounded-md cursor-pointer hover:bg-gray-200 right-2 top-1/2"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          >
            {passwordVisible ? <EyeOpenedIcon /> : <EyeClosedIcon />}
          </button>
        )}
      </div>

      {errorText ? (
        <p className="mt-1 text-xs text-red-600">{errorText}</p>
      ) : (
        helperText && (
          <p className="mt-1  text-gray-600 text-[10px] md:text-xs">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
