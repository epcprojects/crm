'use client';

import React, { Fragment, useMemo, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  ArrowDownIcon,
  CheckedBoxIcon,
  TrashIcon,
  UncheckedBoxIcon,
} from '../../../public/icons';

type DropdownOption = {
  label: string;
  value: string;
  isSystem?: boolean;
  icon?: React.ReactNode;
};

interface DropdownBaseProps {
  options: DropdownOption[];
  placeholder?: string;
  label?: string;
  labelAction?: React.ReactNode;
  required?: boolean;

  showSearch?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;

  maxMenuHeight?: number;

  error?: boolean;
  errorMessage?: string;

  width?: string;
  variant?: 'default' | 'input';

  showDeleteForOption?: (option: DropdownOption) => boolean;

  onDeleteOption?: (option: DropdownOption) => void;

  disabled?: boolean;
  applyHeight?: boolean;
  minHeight?: string;
  menuScrollable?: boolean;
}

type DropdownSingleProps = {
  isMulti?: false;
  value?: string;
  onChange: (value: string) => void;
};

type DropdownMultiProps = {
  isMulti: true;
  value?: string[];
  onChange: (value: string[]) => void;
};

type DropdownProps = DropdownBaseProps &
  (DropdownSingleProps | DropdownMultiProps);

const Dropdown = ({
  options,
  value,
  placeholder = 'Select option',
  onChange,
  isMulti = false,
  label,
  labelAction,
  required,
  showSearch = false,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  maxMenuHeight = 240,

  error = false,
  errorMessage = '',

  width = 'w-full',
  variant = 'default',
  showDeleteForOption,
  onDeleteOption,
  disabled = false,
  applyHeight = true,
  minHeight,
  menuScrollable = true,
}: DropdownProps) => {
  const selectedValues = isMulti ? (Array.isArray(value) ? value : []) : [];

  const selectedOption = !isMulti
    ? options.find((option) => option.value === value)
    : undefined;

  const selectedLabels = isMulti
    ? options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label)
    : [];

  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!showSearch) {
      return options;
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query, showSearch]);

  const handleSelect = (selectedValue: string) => {
    if (disabled) {
      return;
    }

    if (isMulti) {
      const isAlreadySelected = selectedValues.includes(selectedValue);

      (onChange as (nextValue: string[]) => void)(
        isAlreadySelected
          ? selectedValues.filter((item) => item !== selectedValue)
          : [...selectedValues, selectedValue],
      );
    } else {
      (onChange as (nextValue: string) => void)(selectedValue);
    }

    setQuery('');
  };

  const keepMenuInteractionActive = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };

  const resetQuery = () => {
    setQuery('');
  };

  return (
    <div className={width}>
      {label ? (
        <div
          className={
            labelAction ? 'flex items-end justify-between gap-2' : undefined
          }
        >
          <span
            className={`block text-start ${
              variant === 'input'
                ? 'text-sm font-normal text-gray-800 md:text-base'
                : 'mb-1 text-base font-normal text-gray-800'
            }`}
          >
            {label}

            {required ? <span className="text-red-500"> *</span> : null}
          </span>
          {labelAction ? (
            <span className="mb-1 shrink-0">{labelAction}</span>
          ) : null}
        </div>
      ) : null}

      <Menu as="div" className="relative flex w-full">
        <MenuButton
          disabled={disabled}
          id={selectedOption?.label || placeholder}
          className={`flex w-full min-w-[180px] items-center justify-between gap-2 text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 focus:ring-0
            ${
              variant === 'input'
                ? 'h-10 rounded-none border-0 border-b bg-transparent px-0 py-1.5 text-sm font-medium'
                : `rounded-lg border bg-white p-3 md:px-3.5 md:py-2 ${
                    applyHeight ? 'h-10.5' : ''
                  }`
            }
            ${
              error
                ? 'border-red-500 focus:ring-red-200'
                : 'border-gray-200 focus:ring-gray-200'
            }
            ${disabled ? 'cursor-not-allowed bg-gray-200! opacity-60' : ''}
          `}
        >
          <span className="flex min-w-0 items-center gap-2 text-sm">
            {selectedOption?.icon ? (
              <span className="shrink-0" aria-hidden="true">
                {selectedOption.icon}
              </span>
            ) : null}
            <span className="truncate">
              {isMulti
                ? selectedLabels.length > 0
                  ? selectedLabels.join(', ')
                  : placeholder
                : selectedOption?.label || placeholder}
            </span>
          </span>

          <span className={`shrink-0 ${disabled ? 'opacity-60' : ''}`}>
            <ArrowDownIcon />
          </span>
        </MenuButton>

        <MenuItems
          portal
          modal={false}
          anchor="bottom start"
          transition
          className={`z-[9999] w-[var(--button-width)] rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-[0px_14px_34px_rgba(0,0,0,0.1)] outline-none transition duration-100 ease-out [--anchor-gap:8px] [--anchor-padding:8px] data-closed:scale-95 data-closed:opacity-0 ${
            minHeight ?? ''
          } ${
            menuScrollable
              ? 'max-h-64 overflow-hidden'
              : 'max-h-none overflow-visible'
          }`}
          onBlur={resetQuery}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              resetQuery();
            }
          }}
        >
          {showSearch ? (
            <div className="sticky top-0 z-10 bg-white p-1">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-0"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                }}
              />
            </div>
          ) : null}

          <div
            className={`space-y-1 ${
              menuScrollable
                ? 'overflow-y-auto overscroll-contain tiny-scrollbar'
                : 'overflow-visible'
            }`}
            style={
              menuScrollable
                ? {
                    maxHeight: maxMenuHeight,
                  }
                : undefined
            }
            onWheel={
              menuScrollable
                ? (event) => {
                    event.stopPropagation();
                  }
                : undefined
            }
            onTouchMove={
              menuScrollable
                ? (event) => {
                    event.stopPropagation();
                  }
                : undefined
            }
          >
            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-2 text-xs text-gray-500 md:text-sm">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = isMulti
                  ? selectedValues.includes(option.value)
                  : option.value === value;

                const isDeleteVisible = Boolean(
                  showDeleteForOption?.(option) && onDeleteOption,
                );

                if (isMulti) {
                  return (
                    <div
                      key={option.value}
                      className={[
                        'flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-xs text-gray-800 hover:bg-gray-100 md:text-sm',
                        isSelected ? 'bg-gray-100' : '',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onMouseDown={keepMenuInteractionActive}
                        onClick={() => handleSelect(option.value)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left font-medium"
                      >
                        <span className="shrink-0" aria-hidden="true">
                          {isSelected ? (
                            <CheckedBoxIcon />
                          ) : (
                            <UncheckedBoxIcon />
                          )}
                        </span>

                        {option.icon ? (
                          <span className="shrink-0" aria-hidden="true">
                            {option.icon}
                          </span>
                        ) : null}

                        <span className="truncate text-sm">{option.label}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {isDeleteVisible ? (
                          <button
                            type="button"
                            aria-label={`Delete ${option.label}`}
                            onMouseDown={keepMenuInteractionActive}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();

                              onDeleteOption?.(option);
                            }}
                            className="shrink-0 rounded-md p-1 transition hover:bg-red-50"
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <MenuItem key={option.value} as={Fragment}>
                    {({ focus }) => (
                      <div
                        className={[
                          'flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-xs text-gray-800 md:text-sm',
                          focus ? 'bg-gray-100' : '',
                          isSelected ? 'bg-gray-100' : '',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onMouseDown={keepMenuInteractionActive}
                          onClick={() => handleSelect(option.value)}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left font-medium"
                        >
                          {option.icon ? (
                            <span className="shrink-0" aria-hidden="true">
                              {option.icon}
                            </span>
                          ) : null}

                          <span className="truncate text-sm">
                            {option.label}
                          </span>
                        </button>

                        <div className="flex items-center gap-1">
                          {isDeleteVisible ? (
                            <button
                              type="button"
                              aria-label={`Delete ${option.label}`}
                              onMouseDown={keepMenuInteractionActive}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();

                                onDeleteOption?.(option);
                              }}
                              className="shrink-0 rounded-md p-1 transition hover:bg-red-50"
                            >
                              <TrashIcon />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </MenuItem>
                );
              })
            )}
          </div>
        </MenuItems>
      </Menu>

      {error && errorMessage ? (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      ) : null}
    </div>
  );
};

export default Dropdown;
