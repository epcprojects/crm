import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import {
  EditIcon,
  ThreedotIcon,
  TicketIcon2,
  TrashIcon,
  UserGroup,
  EyeOpenedIcon,
} from '../../../public/icons';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

type ProjectCardProps = {
  id?: string;
  initials: string;
  name: string;
  category: string;
  totalCount: number;
  openCount: number;
  criticalCount: number;
  colorHex?: string;
  onClick?: () => void;
  href?: string;
  onAddTicket?: () => void;
  onViewUsers?: () => void;
  onAssignUsers?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
};

function ProjectMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex  items-center justify-center min-w-21.75 gap-1.5 md:gap-2">
      <p className="truncate text-xs text-gray-600 ">{label}</p>

      <span
        className={`flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-3.5 text-black shadow-[0_0_18px_0_rgb(0_0_0/0.14)]  ${tone}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ProjectCard({
  id,
  initials,
  name,
  category,
  totalCount,
  openCount,
  criticalCount,
  colorHex = '#A855F7',
  onClick,
  href,
  onAddTicket,
  onViewUsers,
  onAssignUsers,
  onEdit,
  onDelete,
  isDeleting = false,
}: ProjectCardProps) {
  const handlePlainClick = (event: MouseEvent<HTMLElement>) => {
    if (
      !onClick ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    onClick();
  };

  const cardContent: ReactNode = (
    <>
      <div
        className="flex relative flex-wrap items-start justify-between gap-3 bg-gray-100 px-2.5 py-3.5 md:gap-4 md:px-4 md:py-4"
        style={{ backgroundColor: `${colorHex}10` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-semibold shadow-[0_0_35px_0_rgb(0_0_0/0.06)] md:h-10.5 md:w-10.5 md:text-base"
            style={{ backgroundColor: colorHex }}
          >
            {initials}
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-gray-950 ">
              {name}
            </h2>

            <p className="truncate text-[10px] font-normal text-gray-600 md:text-xs">
              {category}
            </p>
          </div>
        </div>

        <div className="absolute top-4 end-4 flex flex-wrap items-center gap-2">
          {/* Desktop Add Ticket button */}
          {onAddTicket ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAddTicket();
              }}
              className="hidden shrink-0 items-center justify-center gap-1 rounded-full border border-white/70 bg-white/90 py-0.5 ps-0.5 pe-2.5 text-xs text-primary-dark opacity-0 shadow-sm transition hover:bg-white group-hover:opacity-100 xl:flex md:text-sm data-focus:opacity-100"
              aria-label={`Add lead for ${name}`}
            >
              <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#E1E5FF] md:h-6.5 md:w-6.5">
                <TicketIcon2 />
              </span>
              Add Lead
            </button>
          ) : null}
          {/* Mobile Add Ticket + Edit/Delete actions */}
          {onViewUsers || onAssignUsers || onEdit || onDelete ? (
            <Menu
              as="div"
              className="relative group/menu flex gap-2 z-10"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <MenuButton
                type="button"
                disabled={isDeleting}
                aria-label={`Actions for ${name}`}
                className="
          flex h-6 w-6 md:w-8 md:h-8 items-center bg-white justify-center
          rounded-full text-gray-500 outline-none
          opacity-100 transition
          disabled:cursor-not-allowed disabled:opacity-50
          sm:opacity-0
          sm:group-hover:opacity-100
          sm:data-open:opacity-100
          sm:focus:opacity-100
        "
              >
                <ThreedotIcon width="16" height="16" />
              </MenuButton>

              <MenuItems
                anchor="bottom end"
                transition
                className="
          z-100 mt-1 w-44 origin-top-right
          rounded-lg border border-gray-200
          bg-white p-1
          shadow-[0_10px_30px_rgb(0_0_0/0.12)]
          outline-none transition duration-150
          data-closed:-translate-y-1
          data-closed:scale-95
          data-closed:opacity-0
        "
              >
                {/* Only show Add Ticket inside menu on mobile */}
                {onAddTicket ? (
                  <MenuItem>
                    {({ close }) => (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          close();
                          onAddTicket();
                        }}
                        className="
                flex w-full items-center gap-2
                rounded-md px-2.5 py-2
                text-left text-xs font-medium
                text-gray-700 outline-none transition
                data-focus:bg-gray-50
                xl:hidden
              "
                      >
                        <TicketIcon2 opacity="0" fill="currentColor" />
                        Add Lead
                      </button>
                    )}
                  </MenuItem>
                ) : null}

                {onViewUsers ? (
                  <MenuItem>
                    {({ close }) => (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          close();
                          onViewUsers();
                        }}
                        className="
                flex w-full items-center whitespace-nowrap gap-1 md:gap-2
                rounded-md px-2.5 py-2
                text-left text-xs font-medium
                text-gray-700 outline-none transition
                data-focus:bg-gray-50
              "
                      >
                        <EyeOpenedIcon fill="#374151" width="16" height="16" />
                        View Users
                      </button>
                    )}
                  </MenuItem>
                ) : null}

                {onAssignUsers ? (
                  <MenuItem>
                    {({ close }) => (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          close();
                          onAssignUsers();
                        }}
                        className="
                flex w-full items-center whitespace-nowrap gap-1 md:gap-2
                rounded-md px-2.5 py-2
                text-left text-xs font-medium
                text-gray-700 outline-none transition
                data-focus:bg-gray-50
              "
                      >
                        <UserGroup width="16" height="16" opacity="0" />
                        Assign Users
                      </button>
                    )}
                  </MenuItem>
                ) : null}

                {onEdit ? (
                  <MenuItem>
                    {({ close }) => (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          close();
                          onEdit();
                        }}
                        className="
                flex w-full items-center whitespace-nowrap gap-1 md:gap-2
                rounded-md px-2.5 py-2
                text-left text-xs font-medium
                text-gray-700 outline-none transition
                data-focus:bg-gray-50
              "
                      >
                        <EditIcon />
                        Edit Project
                      </button>
                    )}
                  </MenuItem>
                ) : null}

                {onDelete ? (
                  <MenuItem>
                    {({ close }) => (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          close();
                          onDelete();
                        }}
                        className="
                flex w-full items-center whitespace-nowrap gap-1 md:gap-2
                rounded-md px-2.5 py-2
                text-left text-xs font-medium
                text-red-500 outline-none transition
                data-focus:bg-red-50
                disabled:cursor-not-allowed disabled:opacity-50
              "
                      >
                        <TrashIcon width="16" height="16" />

                        {isDeleting ? 'Deleting...' : 'Delete Project'}
                      </button>
                    )}
                  </MenuItem>
                ) : null}
              </MenuItems>
            </Menu>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 gap-2 bg-white p-2.5">
        <ProjectMetric label="Total" value={totalCount} tone="bg-[#AAEFC6]" />

        <ProjectMetric label="Open" value={openCount} tone="bg-warning-200" />

        <ProjectMetric
          label="Critical"
          value={criticalCount}
          tone="bg-[#FECDCA]"
        />
      </div>
    </>
  );

  const className = `group block overflow-hidden rounded-xl border border-gray-200 shadow-xs transition hover:drop-shadow md:rounded-2xl ${
    onClick || href ? 'cursor-pointer' : ''
  }`;

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        onClick={(event) => handlePlainClick(event)}
        data-project-id={id}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <article className={className} onClick={onClick} data-project-id={id}>
      {cardContent}
    </article>
  );
}
