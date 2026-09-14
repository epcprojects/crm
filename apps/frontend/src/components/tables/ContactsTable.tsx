'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EditIcon, ThreedotIcon, TrashIcon } from '../../../public/icons';
import EmptyState from '../EmptyState';

export type TerritoryRef = {
  id: string;
  name: string;
  parent?: { id: string; name: string } | null;
};

export type ContactRecord = {
  id: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  territoryId: string | null;
  territory?: TerritoryRef | null;
  source: string | null;
  notes: string | null;
  createdAt: string;
};

function formatLocation(contact: ContactRecord) {
  if (contact.territory) {
    return contact.territory.parent
      ? `${contact.territory.name}, ${contact.territory.parent.name}`
      : contact.territory.name;
  }

  return contact.city || '—';
}

export type ContactsMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

type ContactsTableProps = {
  contacts: ContactRecord[];
  meta: ContactsMeta;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  onEdit?: (contact: ContactRecord) => void;
  onDelete?: (contact: ContactRecord) => void;
  onAddContact?: () => void;
  searchActive?: boolean;
};

function renderContactActions(
  contact: ContactRecord,
  onEdit?: (contact: ContactRecord) => void,
  onDelete?: (contact: ContactRecord) => void,
) {
  if (!onEdit && !onDelete) {
    return null;
  }

  return (
    <Menu as="div" className="relative flex justify-end">
      <MenuButton
        type="button"
        onClick={(event) => event.stopPropagation()}
        className="flex h-8.5 w-8.5 items-center justify-center rounded-lg text-gray-500 outline-none transition hover:bg-gray-100 hover:text-gray-700 data-open:bg-gray-100"
        aria-label={`Open actions for ${contact.fullName ?? contact.phone}`}
      >
        <ThreedotIcon />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        transition
        className="z-100 mt-1 w-44 origin-top-right rounded-lg border border-gray-200 bg-white p-1 shadow-[0_10px_30px_rgb(0_0_0/0.12)] outline-none transition duration-150 data-closed:-translate-y-1 data-closed:scale-95 data-closed:opacity-0"
      >
        {onEdit ? (
          <MenuItem>
            <button
              type="button"
              onClick={() => onEdit(contact)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-gray-700 outline-none transition data-focus:bg-gray-100"
            >
              <EditIcon width="16" height="16" /> Edit Contact
            </button>
          </MenuItem>
        ) : null}

        {onDelete ? (
          <MenuItem>
            <button
              type="button"
              onClick={() => onDelete(contact)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-red-500 outline-none transition data-focus:bg-gray-100"
            >
              <TrashIcon width="16" height="16" /> Delete Contact
            </button>
          </MenuItem>
        ) : null}
      </MenuItems>
    </Menu>
  );
}

export default function ContactsTable({
  contacts,
  meta,
  onPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  onEdit,
  onDelete,
  onAddContact,
  searchActive,
}: ContactsTableProps) {
  const startRow = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const endRow = Math.min(meta.page * meta.limit, meta.total);
  const visiblePages = getVisiblePageNumbers(meta.page, meta.totalPages);

  if (contacts.length === 0) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center">
        <EmptyState
          imageUrl="/images/NoRolesIcon.svg"
          imageAlt={searchActive ? 'No matching contacts' : 'No contacts'}
          title={searchActive ? 'No Contacts Found' : 'No Contacts Yet'}
          description={
            searchActive
              ? 'No contacts match your search. Try a different keyword.'
              : 'Create your first contact to start tracking leads.'
          }
          buttonLabel={!searchActive && onAddContact ? 'Add Contact' : undefined}
          onButtonClick={!searchActive ? onAddContact : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex h-auto min-h-0 flex-col overflow-visible rounded-xl border border-gray-200 bg-white xl:h-full xl:overflow-hidden">
      <div className="flex-none space-y-3 overflow-visible p-3 scrollbar-hide xl:hidden">
        {contacts.map((contact) => (
          <article
            key={contact.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Name
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {contact.fullName || 'Unknown'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Phone
                </p>
                <p className="mt-1 text-sm text-gray-700">{contact.phone}</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatLocation(contact)}
                  </p>
                </div>

                {renderContactActions(contact, onEdit, onDelete)}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-x-auto overflow-y-auto xl:block">
        <table className="w-full min-w-215 text-left">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Phone', 'Email', 'Location', 'Source', 'Actions'].map(
                (header) => (
                  <th
                    key={header}
                    className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-900"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-b border-gray-200 last:border-0">
                <td className="px-4 py-3 text-sm text-gray-800">
                  {contact.fullName || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {contact.phone}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {contact.email || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {formatLocation(contact)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {contact.source || '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {renderContactActions(contact, onEdit, onDelete)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto flex shrink-0 justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="hidden sm:inline-block">Showing per page</span>
          <select
            value={meta.limit}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 outline-none"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center">
          <span className="hidden sm:inline-block">
            {startRow}-{endRow} of {meta.total}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(meta.page - 1)}
              disabled={!meta.hasPrevious}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </button>

            {visiblePages.map((pageNumber, index) =>
              pageNumber === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => onPageChange(pageNumber)}
                  className={`min-w-8 rounded-md px-2 py-1 text-sm transition ${
                    meta.page === pageNumber
                      ? 'bg-gray-100 font-semibold text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pageNumber}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => onPageChange(meta.page + 1)}
              disabled={!meta.hasNext}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactsTableSkeleton() {
  const headers = ['Name', 'Phone', 'Email', 'Location', 'Source', 'Actions'];

  return (
    <div
      className="overflow-hidden rounded-xl border border-gray-200 bg-white"
      aria-hidden="true"
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-215 text-left">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border-b border-gray-200 px-4 py-3 text-xs font-semibold text-gray-900"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 last:border-0">
                {headers.map((_, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="space-y-3">
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis', totalPages - 1, totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [1, 2, 'ellipsis', totalPages - 2, totalPages - 1, totalPages] as const;
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ] as const;
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 12L6 8L10 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 12L10 8L6 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
