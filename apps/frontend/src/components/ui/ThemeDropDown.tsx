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
  required,
  showSearch = false,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  maxMenuHeight = 260,

  error = false,
  errorMessage = '',

  width = 'w-full',
  variant = 'default',
  showDeleteForOption,
  onDeleteOption,
  disabled = false,
}: DropdownProps) => {
  const selectedValues = isMulti ? (Array.isArray(value) ? value : []) : [];

  const selectedOption = !isMulti
    ? options.find((opt) => opt.value === value)
    : undefined;

  const selectedLabels = isMulti
    ? options
        .filter((opt) => selectedValues.includes(opt.value))
        .map((opt) => opt.label)
    : [];

  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!showSearch) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, showSearch]);

  const handleSelect = (val: string) => {
    if (disabled) return;
    if (isMulti) {
      const exists = selectedValues.includes(val);
      (onChange as (value: string[]) => void)(
        exists
          ? selectedValues.filter((item) => item !== val)
          : [...selectedValues, val],
      );
    } else {
      (onChange as (value: string) => void)(val);
    }
    setQuery('');
  };

  const keepMenuInteractionActive = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };

  const resetQuery = () => setQuery('');

  return (
    <div className={`${width}`}>
      {label && (
        <span
          className={`block text-start ${
            variant === 'input'
              ? 'text-sm font-normal text-gray-800 md:text-sm'
              : 'mb-1 text-sm font-normal text-gray-700'
          }`}
        >
          {label} {required && <span className="text-red-500"> *</span>}
        </span>
      )}

      <Menu as="div" className="relative flex w-full">
        <MenuButton
          disabled={disabled}
          id={selectedOption?.label || placeholder}
          className={`w-full justify-between flex gap-2 items-center outline-none focus:ring-0 text-ggray-900 placeholder:text-gray-400 placeholder:font-normal 
              ${
                variant === 'input'
                  ? 'bg-transparent border-0 border-b h-10 px-0 py-1.5 rounded-none text-sm font-medium md:text-base'
                  : 'bg-white h-10.5 p-3 md:px-3.5 md:py-2.5 border rounded-lg'
              }
              ${
                error
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-200 focus:ring-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}
            `}
        >
          <span className="truncate">
            {isMulti
              ? selectedLabels.length > 0
                ? selectedLabels.join(', ')
                : placeholder
              : selectedOption?.label || placeholder}
          </span>
          <span className={disabled ? 'opacity-60' : ''}>
            <ArrowDownIcon />
          </span>
        </MenuButton>

        <MenuItems
          modal={false}
          transition
          className="absolute left-0 top-full mt-2 z-60 w-full max-h-64 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-[0px_14px_34px_rgba(0,0,0,0.1)] p-1 text-sm transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
          onBlur={resetQuery}
          onKeyDown={(e) => {
            if (e.key === 'Escape') resetQuery();
          }}
        >
          {showSearch && (
            <div className="sticky top-0 z-10 p-1 bg-white">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="w-full h-10 px-3 text-sm border rounded-md outline-none border-gray-200 placeholder:text-gray-400 text-gray-800 focus:ring-0 focus:border-gray-300"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div
            className="space-y-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ maxHeight: maxMenuHeight }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-2 text-xs md:text-sm text-gray-500">
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
                        'flex w-full items-center justify-between gap-2 rounded-md py-1 px-1 text-xs md:text-sm text-gray-800 hover:bg-gray-100',
                        isSelected ? 'bg-gray-100' : '',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onMouseDown={keepMenuInteractionActive}
                        onClick={() => handleSelect(option.value)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 px-1.5 text-left font-medium cursor-pointer"
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

                        <span className="truncate">{option.label}</span>
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
                          'flex w-full items-center justify-between gap-2 rounded-md py-1 px-1 text-xs md:text-sm text-gray-800',
                          focus ? 'bg-gray-100' : '',
                          isSelected ? 'bg-gray-100' : '',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onMouseDown={keepMenuInteractionActive}
                          onClick={() => handleSelect(option.value)}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 px-1.5 text-left font-medium cursor-pointer"
                        >
                          {option.icon ? (
                            <span className="shrink-0" aria-hidden="true">
                              {option.icon}
                            </span>
                          ) : null}
                          <span className="truncate">{option.label}</span>
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
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      )}
    </div>
  );
};

export default Dropdown;
