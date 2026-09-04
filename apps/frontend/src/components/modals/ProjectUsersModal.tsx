'use client';

import { useEffect, useMemo, useState } from 'react';
import AppModal from './AppModal';
import { SearchIcon, UserAdd, UserGroup } from '../../../public/icons';
import EmptyState from '../EmptyState';

export type ProjectUserRecord = {
  id: string;
  email: string;
  fullName: string;
  roleName?: string | null;
};

export function formatProjectUserRoleName(roleName: string) {
  return roleName
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ProjectUsersModalProps = {
  isOpen: boolean;
  projectName: string;
  projectInitials: string;
  projectColorHex?: string;
  users: ProjectUserRecord[];
  isLoading?: boolean;
  removingUserId?: string | null;
  onClose: () => void;
  onSearchChange?: (value: string) => void;
  onAssignUsers?: () => void;
  onRemoveUser?: (userId: string) => void;
};

function getUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProjectUsersModal({
  isOpen,
  projectName,
  projectInitials,
  projectColorHex = '#17B26A',
  users,
  isLoading = false,
  removingUserId,
  onClose,
  onSearchChange,
  onAssignUsers,
  onRemoveUser,
}: ProjectUsersModalProps) {
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchValue('');
      onSearchChange?.('');
    }
  }, [isOpen, onSearchChange]);

  const hasSearch = Boolean(searchValue.trim());
  const emptyStateImage = hasSearch
    ? '/images/UsersSearchIcon.svg'
    : '/images/UsersEmptyIcon.svg';
  const emptyStateTitle = hasSearch ? 'No Users Found' : 'No Users Assigned';
  const emptyStateDescription = hasSearch
    ? 'No assigned users match your search. Try a different name or email.'
    : 'No users have been assigned to this project yet.';
  const showAssignButton =
    Boolean(onAssignUsers) && !hasSearch && !isLoading && users.length === 0;
  const userRows = useMemo(() => users, [users]);
  const showInlineAssignAction =
    Boolean(onAssignUsers) && !isLoading && userRows.length > 0;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={projectName}
      subtitle="Manage users assigned to this project."
      size="medium"
      showFooter={false}
      bodyPaddingClasses="p-0"
      icon={
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: projectColorHex }}
        >
          {projectInitials}
        </span>
      }
    >
      <div className="flex h-120 flex-col">
        <div className="border-b border-gray-100 px-3 py-3 md:px-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <SearchIcon fill="#667085" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchValue(nextValue);
                onSearchChange?.(nextValue);
              }}
              placeholder="Search users..."
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showInlineAssignAction ? (
            <button
              type="button"
              onClick={onAssignUsers}
              className="flex items-center gap-3 px-4 py-2 text-left transition hover:bg-gray-50 md:px-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-[271deg] from-[#304FFD] to-[#40C3FF] text-white">
                <UserAdd />
              </span>
              <span className="text-sm font-semibold text-gray-900">
                Assign Users
              </span>
            </button>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 px-3 py-2 md:px-4" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex animate-pulse items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 rounded bg-gray-200" />
                      <div className="h-3 w-36 rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : userRows.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {userRows.map((user) => (
                  <div
                    key={user.id}
                    className="group cursor-pointer hover:bg-gray-100 flex items-center gap-3 px-3 py-3 md:px-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-medium text-[#6941C6]">
                      {getUserInitials(user.fullName)}{' '}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {user.fullName}{' '}
                        {user.roleName ? (
                          <p className=" text-[10px] inline-block w-fit capitalize px-1.5 py-0.25 font-medium text-gray-700 rounded-full bg-gray-50 border border-gray-200">
                            {formatProjectUserRoleName(user.roleName)}
                          </p>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-gray-600">
                        {user.email}
                      </p>
                    </div>
                    {onRemoveUser ? (
                      <button
                        type="button"
                        onClick={() => onRemoveUser(user.id)}
                        disabled={removingUserId === user.id}
                        className={`shrink-0 text-sm font-medium text-[#F04438] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${
                          removingUserId === user.id
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {removingUserId === user.id ? 'Removing...' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                buttonLabel={showAssignButton ? 'Assign Users' : undefined}
                imageUrl={emptyStateImage}
                title={emptyStateTitle}
                buttonIcon={
                  showAssignButton ? (
                    <UserGroup width="16" height="16" />
                  ) : undefined
                }
                description={emptyStateDescription}
                onButtonClick={showAssignButton ? onAssignUsers : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
