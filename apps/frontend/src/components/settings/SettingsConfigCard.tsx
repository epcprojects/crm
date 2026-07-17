'use client';

import ThemeButton from '../ui/ThemeButton';
import { PlusIcon, TrashIcon } from '../../../public/icons';

export type SettingsConfigItem = {
  id: string;
  label: string;
  value: string;
  countLabel: string;
  colorHex?: string;
};

type SettingsConfigCardProps = {
  title: string;
  subtitle: string;
  buttonLabel: string;
  items: SettingsConfigItem[];
  badgeVariant?: 'status' | 'priority';
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (item: SettingsConfigItem) => void;
  onDelete?: (item: SettingsConfigItem) => void;
};

export default function SettingsConfigCard({
  title,
  subtitle,
  buttonLabel,
  items,
  badgeVariant = 'status',
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
}: SettingsConfigCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-2.5 md:p-5">
      <div className="flex items-start flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-700">{subtitle}</p>
        </div>

        {onAdd ? (
          <ThemeButton icon={<PlusIcon />} onClick={onAdd}>
            {buttonLabel}
          </ThemeButton>
        ) : null}
      </div>

      <div className="mt-3 space-y-0">
        {isLoading ? (
          <SettingsConfigSkeleton />
        ) : items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-gray-200 py-3 last:border-b-0 last:pb-0"
            >
              <div className="grid min-w-0 flex-1 grid-cols-3 items-center gap-3">
                <SettingsBadge
                  label={item.label}
                  colorHex={item.colorHex ?? '#667085'}
                  variant={badgeVariant}
                />
                <p className="text-sm text-gray-800 text-end">
                  {item.countLabel}
                </p>

                {onEdit || onDelete ? (
                  <div className="flex items-center justify-end gap-3">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="flex md:h-10 md:w-10 h-8.5 w-8.5 items-center justify-center rounded-lg border border-gray-200 text-primary-dark transition hover:bg-gray-50"
                        aria-label={`Edit ${item.label}`}
                      >
                        <EditIcon />
                      </button>
                    ) : null}

                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="flex md:h-10 md:w-10 h-8.5 w-8.5 items-center justify-center rounded-lg border border-red-500 text-red-500 transition hover:bg-red-50"
                        aria-label={`Delete ${item.label}`}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
              <SettingsEmptyIcon />
            </div>
            <p className="text-base font-medium text-gray-900">No items yet.</p>
            <p className="max-w-56 text-sm text-gray-500">
              Add a new {badgeVariant === 'priority' ? 'priority' : 'status'} to
              start managing it across the app.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsConfigSkeleton() {
  return (
    <div className="space-y-0" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 border-b border-gray-200 py-3 last:border-b-0 last:pb-0"
        >
          <div className="grid min-w-0 flex-1 grid-cols-3 items-center gap-3">
            <div className="h-8 w-28 animate-pulse rounded-full bg-gray-100" />
            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100" />
            <div className="flex items-center justify-end gap-3">
              <div className="md:h-10 md:w-10 h-8.5 w-8.5 animate-pulse rounded-lg bg-gray-100" />
              <div className="md:h-10 md:w-10 h-8.5 w-8.5 animate-pulse rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsBadge({
  label,
  colorHex,
  variant,
}: {
  label: string;
  colorHex: string;
  variant: 'status' | 'priority';
}) {
  const color = normalizeHexColor(colorHex);

  return (
    <span
      className={`inline-flex w-fit whitespace-nowrap items-center gap-1.5 border text-sm ${
        variant === 'priority'
          ? 'rounded-md px-2 py-1 font-semibold shadow-xs'
          : 'rounded-full px-2 py-1 font-medium'
      }`}
      style={{
        color: variant === 'priority' ? '#344054' : color,
        backgroundColor:
          variant === 'priority' ? '#FFFFFF' : withAlpha(color, 0.075),
        borderColor:
          variant === 'priority' ? '#D0D5DD' : withAlpha(color, 0.34),
      }}
    >
      {variant === 'priority' ? (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </span>
  );
}

function normalizeHexColor(colorHex: string | undefined) {
  const trimmedColor = colorHex?.trim() || '#667085';
  const color = trimmedColor.startsWith('#')
    ? trimmedColor
    : `#${trimmedColor}`;

  return /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color) ? color : '#667085';
}

function withAlpha(colorHex: string, alpha: number) {
  const hex = colorHex.slice(1);
  const expandedHex =
    hex.length === 3
      ? hex
          .split('')
          .map((part) => part + part)
          .join('')
      : hex;
  const red = Number.parseInt(expandedHex.slice(0, 2), 16);
  const green = Number.parseInt(expandedHex.slice(2, 4), 16);
  const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function EditIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.06226 4.875C5.06226 2.70038 6.82513 0.9375 8.99975 0.9375C11.1744 0.9375 12.9373 2.70038 12.9373 4.875C12.9373 7.04962 11.1744 8.8125 8.99975 8.8125C6.82513 8.8125 5.06226 7.04962 5.06226 4.875ZM8.99975 2.0625C7.44645 2.0625 6.18726 3.3217 6.18726 4.875C6.18726 6.4283 7.44645 7.6875 8.99975 7.6875C10.5531 7.6875 11.8123 6.4283 11.8123 4.875C11.8123 3.3217 10.5531 2.0625 8.99975 2.0625Z"
        fill="#020F52"
      />
      <path
        d="M10.3421 11.361C8.39252 10.7914 6.2461 11.0374 4.47085 12.0945C4.34499 12.1694 4.20708 12.2477 4.06262 12.3296C3.52816 12.6328 2.90393 12.987 2.46886 13.4128C2.19877 13.6772 2.08363 13.8953 2.06522 14.0638C2.05059 14.1976 2.08441 14.4182 2.42238 14.7401C3.19927 15.4803 3.9887 15.9375 4.94304 15.9375H7.87489C8.18555 15.9375 8.43739 16.1893 8.43739 16.5C8.43739 16.8106 8.18555 17.0625 7.87489 17.0625H4.94304C3.57931 17.0625 2.52497 16.3917 1.64638 15.5547C1.13712 15.0695 0.883272 14.5234 0.946877 13.9415C1.00669 13.3944 1.33568 12.9478 1.68193 12.6089C2.23555 12.067 3.04369 11.611 3.5783 11.3094C3.70027 11.2406 3.80807 11.1798 3.89529 11.1279C5.94576 9.90693 8.41583 9.6262 10.6576 10.2811C10.9558 10.3682 11.1269 10.6806 11.0398 10.9788C10.9527 11.277 10.6403 11.4481 10.3421 11.361Z"
        fill="#020F52"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.6557 9.39062C15.1528 9.11139 14.5423 9.12066 14.0479 9.41468C13.8416 9.53736 13.6619 9.73256 13.4577 9.95435L10.2228 13.4592C9.86759 13.8436 9.60133 14.1317 9.44426 14.4933C9.28759 14.8539 9.25721 15.247 9.21647 15.774L9.19952 15.9919C9.19247 16.0813 9.18337 16.1969 9.18903 16.2984C9.19594 16.4225 9.2275 16.6121 9.3761 16.7808C9.52638 16.9513 9.71273 17.0058 9.83863 17.0268C9.93938 17.0436 10.0552 17.0465 10.1425 17.0487L10.3529 17.0543C10.953 17.0704 11.4097 17.0828 11.8335 16.9172C12.2562 16.7521 12.5867 16.4333 13.0232 16.0122L16.3158 12.841C16.5336 12.6316 16.7241 12.4486 16.8434 12.2394C17.1266 11.7423 17.1353 11.1319 16.8666 10.6269C16.7536 10.4143 16.5685 10.2257 16.3567 10.0099L16.3093 9.96157L16.2614 9.91248C16.0509 9.69697 15.8656 9.50713 15.6557 9.39062ZM14.623 10.3816C14.7734 10.2921 14.957 10.2894 15.1096 10.3742C15.1557 10.3998 15.2176 10.4545 15.5054 10.7485C15.7925 11.0418 15.8472 11.106 15.8735 11.1553C15.9611 11.3199 15.9581 11.5207 15.866 11.6823C15.8384 11.7307 15.7819 11.7931 15.4865 12.0776L12.3128 15.1344C11.7737 15.6537 11.611 15.7964 11.4242 15.8693C11.2427 15.9402 11.0359 15.9462 10.3329 15.9283C10.3823 15.2959 10.4045 15.1063 10.4761 14.9415C10.5478 14.7765 10.6705 14.6329 11.1045 14.1628L14.2379 10.7679C14.5171 10.4654 14.5775 10.4086 14.623 10.3816Z"
        fill="#020F52"
      />
    </svg>
  );
}

function SettingsEmptyIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.33366 8.25H14.667M7.33366 11.9167H11.917M7.70033 18.3333H14.3003C15.8405 18.3333 16.6105 18.3333 17.1988 18.0336C17.7163 17.7699 18.1369 17.3493 18.4006 16.8318C18.7003 16.2435 18.7003 15.4735 18.7003 13.9333V8.06667C18.7003 6.52652 18.7003 5.75645 18.4006 5.16819C18.1369 4.6507 17.7163 4.23007 17.1988 3.96639C16.6105 3.66667 15.8405 3.66667 14.3003 3.66667H7.70033C6.16018 3.66667 5.39011 3.66667 4.80185 3.96639C4.28437 4.23007 3.86373 4.6507 3.60005 5.16819C3.30033 5.75645 3.30033 6.52652 3.30033 8.06667V13.9333C3.30033 15.4735 3.30033 16.2435 3.60005 16.8318C3.86373 17.3493 4.28437 17.7699 4.80185 18.0336C5.39011 18.3333 6.16018 18.3333 7.70033 18.3333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
