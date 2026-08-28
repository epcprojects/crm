'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import AppModal from './AppModal';
import {
  CheckedBoxIcon,
  SearchIcon,
  UncheckedBoxIcon,
  UserAdd,
  UserGroup,
} from '../../../public/icons';
import type { ProjectUserRecord } from './ProjectUsersModal';
import EmptyState from '../EmptyState';

type AssignProjectUsersModalProps = {
  isOpen: boolean;
  projectName: string;
  users: ProjectUserRecord[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSearchChange?: (value: string) => void;
  onAssign: (userIds: string[]) => void;
};

function getUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function AssignProjectUsersModal({
  isOpen,
  projectName,
  users,
  isLoading = false,
  isSubmitting = false,
  onClose,
  onSearchChange,
  onAssign,
}: AssignProjectUsersModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchValue('');
      setSelectedUserIds([]);
      onSearchChange?.('');
    }
  }, [isOpen, onSearchChange]);

  const hasSearch = Boolean(searchValue.trim());
  const selectedCount = selectedUserIds.length;
  const assignLabel =
    selectedCount > 0 ? `Assign Selected ${selectedCount}` : 'Assign Selected';
  const emptyStateTitle = hasSearch ? 'No Users Found' : 'No Users Available';
  const emptyStateDescription = hasSearch
    ? 'No available users match your search. Try a different name or email.'
    : 'All available users are already assigned to this project.';
  const userRows = useMemo(() => users, [users]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign users to ${projectName}`}
      subtitle="Select one or more existing users to assign to this project."
      size="medium"
      showFooter
      confirmLabel={isSubmitting ? 'Assigning...' : assignLabel}
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => onAssign(selectedUserIds)}
      confimBtnDisable={selectedCount === 0 || isSubmitting}
      bodyPaddingClasses="p-0"
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF4FF] text-[#3B82F6]">
          <UserAdd opacity="0" fill="#3B82F6" />
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

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="space-y-3 px-3 py-3 md:px-4" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse items-center gap-3"
                >
                  <div className="h-4 w-4 rounded bg-gray-200" />
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
              {userRows.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);

                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-gray-50 md:px-4"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUserSelection(user.id)}
                      className="hidden"
                    />
                    {isSelected ? (
                      <CheckedBoxIcon width="16" height="16" />
                    ) : (
                      <UncheckedBoxIcon width="16" height="16" bgFill="white" />
                    )}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FEF3F2] text-xs font-medium text-[#F79009]">
                      {getUserInitials(user.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {user.fullName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <EmptyState
              buttonLabel="Assign Users"
              imageUrl="/images/UsersSearchIcon.svg"
              title={emptyStateTitle}
              buttonIcon={<UserGroup width="16" height="16" />}
              description={emptyStateDescription}
            />
          )}
        </div>
      </div>
    </AppModal>
  );
}
