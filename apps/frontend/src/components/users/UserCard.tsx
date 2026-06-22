'use client';

import {
  AcceptedEmailIcon,
  SentEmailIcon,
  TrashIcon,
} from '../../../public/icons';
import { useIsMobile } from '../hooks/useIsMobile';
import ThemeButton from '../ui/ThemeButton';

export type UserCardProject = {
  id: string;
  initials: string;
  name: string;
  colorHex: string;
};

export type UserCardRole = {
  label: string;
  tone: 'blue' | 'orange' | 'purple' | 'teal';
  value?: string;
};

export type UserCardUser = {
  id: string;
  name: string;
  email: string;
  isInvitationAccepted: boolean;
  initials: string;
  accentColor: string;
  avatarUrl?: string;
  roles: UserCardRole[];
  projects: UserCardProject[];
};

type UserCardProps = {
  user: UserCardUser;
  onEdit?: (user: UserCardUser) => void;
  onDelete?: (user: UserCardUser) => void;
  onResendInvite?: (user: UserCardUser) => void;
};

export default function UserCard({
  user,
  onEdit,
  onDelete,
  onResendInvite,
}: UserCardProps) {
  const isMobile = useIsMobile();

  return (
    <article
      className="rounded-2xl sm:border border-gray-100 bg-white p-4 drop-shadow-sm"
      style={{
        boxShadow: `inset ${isMobile ? '2px' : '4px'} 0 0 ${user.accentColor}, 0px 8px 24px rgba(16,24,40,0.08)`,
      }}
    >
      <div className="flex gap-2 flex-wrap items-start justify-between">
        <div className="flex  flex-wrap flex-col gap-3">
          <div className="flex items-start gap-3 md:gap-4">
            <Avatar user={user} />

            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm md:text-base font-semibold text-gray-900">
                  {user.name}
                </h2>
                {user.email ? (
                  <p className="truncate text-xs text-gray-600">{user.email}</p>
                ) : null}
              </div>
              {onResendInvite ? (
                <div className="text-warning-500 font-semibold text-xs flex items-center gap-1.5">
                  <SentEmailIcon />
                  Invite Sent
                </div>
              ) : (
                <div className="text-green-500 font-semibold text-xs flex items-center gap-1.5">
                  <AcceptedEmailIcon />
                  Invite Accepted
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <Pill key={role.label} label={role.label} tone={role.tone} />
          ))}
        </div>
      </div>

      <div className="my-3 md:my-4 h-px bg-gray-200" />

      <div className="flex flex-col flex-wrap gap-2">
        <span className="block">Assigned Projects</span>
        <div className="flex gap-2 ">
          {user.projects.map((project) => (
            <ProjectPill key={project.id} project={project} />
          ))}
        </div>
      </div>

      {onResendInvite || onEdit || onDelete ? (
        <div className="mt-5 flex items-center gap-3">
          {onResendInvite ? (
            <ThemeButton
              type="button"
              variant="secondary"
              onClick={() => onResendInvite(user)}
              className="w-full"
              size={isMobile ? 'md' : 'lg'}
            >
              Resend Invite
            </ThemeButton>
          ) : onEdit ? (
            <ThemeButton
              type="button"
              onClick={() => onEdit(user)}
              variant="secondary"
              className="w-full"
              size={isMobile ? 'md' : 'lg'}
              icon={
                <EditUserIcon
                  height={isMobile ? '14' : '18'}
                  width={isMobile ? '14' : '18'}
                />
              }
            >
              Edit User
            </ThemeButton>
          ) : null}

          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(user)}
              className="flex md:h-11 h-9 min-w-9 md:min-w-11 items-center justify-center rounded-lg border border-red-500 text-red-500 transition hover:bg-red-50"
              aria-label={`Delete ${user.name}`}
            >
              <TrashIcon
                height={isMobile ? '16' : '18'}
                width={isMobile ? '16' : '18'}
              />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function UserCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="rounded-2xl sm:border border-gray-100 bg-white p-4 drop-shadow-sm"
          style={{
            boxShadow:
              'inset 4px 0 0 #EAECF0, 0px 8px 24px rgba(16,24,40,0.08)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="h-10.5 w-10.5 shrink-0 animate-pulse rounded-full bg-gray-100" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-44 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>

          <div className="my-3 h-px bg-gray-200 md:my-4" />

          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
            <div className="flex gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-gray-100" />
              <div className="h-7 w-28 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-11 flex-1 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-11 w-11 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </article>
      ))}
    </div>
  );
}

function Avatar({ user }: { user: UserCardUser }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className="h-10.5 w-10.5 shrink-0 rounded-full object-cover drop-shadow-sm"
      />
    );
  }

  return (
    <span
      className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-full bg-white text-sm md:text-base font-semibold drop-shadow-sm"
      style={{ color: user.accentColor }}
    >
      {user.initials}
    </span>
  );
}

function Pill({ label, tone }: { label: string; tone: UserCardRole['tone'] }) {
  const toneClasses: Record<UserCardRole['tone'], string> = {
    blue: 'border-[#B2DDFF] bg-[#F0F9FF] text-[#0BA5EC]',
    orange: 'border-[#FEC84B] bg-[#FFFAEB] text-[#F79009]',
    purple: 'border-[#E9D7FE] bg-[#F9F5FF] text-[#875BF7]',
    teal: 'border-[#99F6E4] bg-[#ECFDF3] text-[#14B8A6]',
  };

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs md:text-sm font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

function ProjectPill({ project }: { project: UserCardProject }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-2 rounded-full pe-2.5 ps-0.5 py-0.5  text-xs md:text-sm font-medium"
      style={{
        color: project.colorHex,
        backgroundColor: `${project.colorHex}1A`,
      }}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium shadow-sm">
        {project.initials}
      </span>
      {project.name}
    </span>
  );
}

function EditUserIcon({ width = '18', height = '18' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.06238 4.875C5.06238 2.70038 6.82526 0.9375 8.99988 0.9375C11.1745 0.9375 12.9374 2.70038 12.9374 4.875C12.9374 7.04962 11.1745 8.8125 8.99988 8.8125C6.82526 8.8125 5.06238 7.04962 5.06238 4.875ZM8.99988 2.0625C7.44658 2.0625 6.18738 3.3217 6.18738 4.875C6.18738 6.4283 7.44658 7.6875 8.99988 7.6875C10.5532 7.6875 11.8124 6.4283 11.8124 4.875C11.8124 3.3217 10.5532 2.0625 8.99988 2.0625Z"
        fill="#020F52"
      />
      <path
        d="M10.3423 11.361C8.39264 10.7914 6.24622 11.0374 4.47097 12.0945C4.34511 12.1694 4.2072 12.2477 4.06274 12.3296C3.52828 12.6328 2.90405 12.987 2.46898 13.4128C2.19889 13.6772 2.08376 13.8953 2.06534 14.0638C2.05071 14.1976 2.08453 14.4182 2.42251 14.7401C3.19939 15.4803 3.98883 15.9375 4.94316 15.9375H7.87501C8.18567 15.9375 8.43751 16.1893 8.43751 16.5C8.43751 16.8106 8.18567 17.0625 7.87501 17.0625H4.94316C3.57943 17.0625 2.52509 16.3917 1.64651 15.5547C1.13724 15.0695 0.883394 14.5234 0.946999 13.9415C1.00681 13.3944 1.3358 12.9478 1.68205 12.6089C2.23567 12.067 3.04381 11.611 3.57842 11.3094C3.70039 11.2406 3.80819 11.1798 3.89541 11.1279C5.94588 9.90693 8.41596 9.6262 10.6577 10.2811C10.9559 10.3682 11.1271 10.6806 11.0399 10.9788C10.9528 11.277 10.6405 11.4481 10.3423 11.361Z"
        fill="#020F52"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.6558 9.39062C15.1529 9.11139 14.5424 9.12066 14.048 9.41468C13.8417 9.53736 13.662 9.73256 13.4578 9.95435L10.223 13.4592C9.86771 13.8436 9.60145 14.1317 9.44438 14.4933C9.28771 14.8539 9.25733 15.247 9.21659 15.774L9.19964 15.9919C9.19259 16.0813 9.18349 16.1969 9.18915 16.2984C9.19606 16.4225 9.22762 16.6121 9.37622 16.7808C9.5265 16.9513 9.71285 17.0058 9.83875 17.0268C9.9395 17.0436 10.0553 17.0465 10.1427 17.0487L10.353 17.0543C10.9531 17.0704 11.4098 17.0828 11.8337 16.9172C12.2563 16.7521 12.5868 16.4333 13.0233 16.0122L16.3159 12.841C16.5337 12.6316 16.7243 12.4486 16.8435 12.2394C17.1268 11.7423 17.1355 11.1319 16.8668 10.6269C16.7537 10.4143 16.5686 10.2257 16.3569 10.0099L16.3095 9.96157L16.2615 9.91248C16.0511 9.69697 15.8657 9.50713 15.6558 9.39062ZM14.6231 10.3816C14.7736 10.2921 14.9571 10.2894 15.1098 10.3742C15.1558 10.3998 15.2177 10.4545 15.5055 10.7485C15.7926 11.0418 15.8474 11.106 15.8736 11.1553C15.9612 11.3199 15.9582 11.5207 15.8661 11.6823C15.8385 11.7307 15.7821 11.7931 15.4867 12.0776L12.3129 15.1344C11.7738 15.6537 11.6111 15.7964 11.4244 15.8693C11.2428 15.9402 11.0361 15.9462 10.333 15.9283C10.3824 15.2959 10.4046 15.1063 10.4762 14.9415C10.5479 14.7765 10.6706 14.6329 11.1046 14.1628L14.238 10.7679C14.5172 10.4654 14.5776 10.4086 14.6231 10.3816Z"
        fill="#020F52"
      />
    </svg>
  );
}
