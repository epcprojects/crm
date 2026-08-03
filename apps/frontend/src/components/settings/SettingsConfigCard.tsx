'use client';

import ThemeButton from '../ui/ThemeButton';
import { PlusIcon, TrashIcon } from '../../../public/icons';
import EmptyState from '../EmptyState';

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
  emptyImageUrl?: string;
  emptyImageAlt?: string;
  emptyTitle?: string;
  emptyDescription?: string;
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
  emptyImageUrl,
  emptyImageAlt,
  emptyTitle,
  emptyDescription,
}: SettingsConfigCardProps) {
  const itemColumnLabel = badgeVariant === 'priority' ? 'Priority' : 'Status';

  const renderActions = (item: SettingsConfigItem) => {
    if (!onEdit && !onDelete) return null;

    return (
      <div className="flex shrink-0 items-center justify-end gap-3">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-gray-200 text-primary-dark transition hover:bg-gray-50 xl:h-10 xl:w-10"
            aria-label={`Edit ${item.label}`}
          >
            <EditIcon />
          </button>
        ) : null}

        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-red-500 text-red-500 transition hover:bg-red-50 xl:h-10 xl:w-10"
            aria-label={`Delete ${item.label}`}
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <section className="flex h-auto min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-2.5 xl:h-full xl:p-5">
      <div className="flex flex-col items-start gap-1 xl:gap-4 xl:flex-row xl:justify-between">
        <div>
          <h2 className="text-base font-medium text-gray-900 xl:text-lg">
            {title}
          </h2>
        </div>

        {onAdd ? (
          <div className="w-full xl:w-auto">
            <ThemeButton
              className="w-full xl:w-auto hidden xl:block"
              icon={<PlusIcon />}
              onClick={onAdd}
            >
              {buttonLabel}
            </ThemeButton>
          </div>
        ) : null}
      </div>

      {!isLoading && items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            imageUrl={emptyImageUrl}
            imageAlt={emptyImageAlt}
            title={emptyTitle}
            description={emptyDescription}
            buttonLabel={buttonLabel}
            onButtonClick={onAdd}
          />
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200">
          {/* Mobile and tablet cards */}
          <div className="space-y-3 p-3 xl:hidden">
            {isLoading ? (
              <SettingsConfigMobileSkeleton />
            ) : (
              items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {itemColumnLabel}
                      </p>

                      <div className="mt-1.5">
                        <SettingsBadge
                          label={item.label}
                          colorHex={item.colorHex ?? '#667085'}
                          variant={badgeVariant}
                        />
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Slug
                        </p>

                        <p className="mt-1 truncate text-sm text-gray-700">
                          {item.value}
                        </p>
                      </div>

                      {renderActions(item)}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Existing XL desktop table */}
          <div className="hidden min-h-0 flex-1 flex-col xl:flex">
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_300px] items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500">
              <p>{itemColumnLabel}</p>
              <p>Slug</p>
              <p className="text-right">Actions</p>
            </div>

            {isLoading ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SettingsConfigDesktopSkeleton />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0"
                  >
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_300px] items-center gap-3">
                      <SettingsBadge
                        label={item.label}
                        colorHex={item.colorHex ?? '#667085'}
                        variant={badgeVariant}
                      />

                      <p className="truncate text-sm text-gray-700">
                        {item.value}
                      </p>

                      {renderActions(item)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SettingsConfigMobileSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <article
          key={index}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div
                className={`h-8 rounded-full bg-gray-100 ${
                  index % 2 === 0 ? 'w-28' : 'w-24'
                }`}
              />
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-10 rounded bg-gray-100" />
                <div
                  className={`h-4 rounded bg-gray-100 ${
                    index % 2 === 0 ? 'w-24' : 'w-32'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8.5 w-8.5 rounded-lg bg-gray-100" />
                <div className="h-8.5 w-8.5 rounded-lg bg-gray-100" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function SettingsConfigDesktopSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="border-b border-gray-200 px-4 py-3 last:border-b-0"
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_300px] items-center gap-3">
            <div
              className={`h-8 rounded bg-gray-100 ${
                index % 2 === 0 ? 'w-28' : 'w-24'
              }`}
            />

            <div
              className={`h-4 rounded bg-gray-100 ${
                index % 2 === 0 ? 'w-24' : 'w-32'
              }`}
            />

            <div className="flex items-center justify-end gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100" />
              <div className="h-10 w-10 rounded-lg bg-gray-100" />
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
        fill="#464B44"
      />
      <path
        d="M10.3421 11.361C8.39252 10.7914 6.2461 11.0374 4.47085 12.0945C4.34499 12.1694 4.20708 12.2477 4.06262 12.3296C3.52816 12.6328 2.90393 12.987 2.46886 13.4128C2.19877 13.6772 2.08363 13.8953 2.06522 14.0638C2.05059 14.1976 2.08441 14.4182 2.42238 14.7401C3.19927 15.4803 3.9887 15.9375 4.94304 15.9375H7.87489C8.18555 15.9375 8.43739 16.1893 8.43739 16.5C8.43739 16.8106 8.18555 17.0625 7.87489 17.0625H4.94304C3.57931 17.0625 2.52497 16.3917 1.64638 15.5547C1.13712 15.0695 0.883272 14.5234 0.946877 13.9415C1.00669 13.3944 1.33568 12.9478 1.68193 12.6089C2.23555 12.067 3.04369 11.611 3.5783 11.3094C3.70027 11.2406 3.80807 11.1798 3.89529 11.1279C5.94576 9.90693 8.41583 9.6262 10.6576 10.2811C10.9558 10.3682 11.1269 10.6806 11.0398 10.9788C10.9527 11.277 10.6403 11.4481 10.3421 11.361Z"
        fill="#464B44"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.6557 9.39062C15.1528 9.11139 14.5423 9.12066 14.0479 9.41468C13.8416 9.53736 13.6619 9.73256 13.4577 9.95435L10.2228 13.4592C9.86759 13.8436 9.60133 14.1317 9.44426 14.4933C9.28759 14.8539 9.25721 15.247 9.21647 15.774L9.19952 15.9919C9.19247 16.0813 9.18337 16.1969 9.18903 16.2984C9.19594 16.4225 9.2275 16.6121 9.3761 16.7808C9.52638 16.9513 9.71273 17.0058 9.83863 17.0268C9.93938 17.0436 10.0552 17.0465 10.1425 17.0487L10.3529 17.0543C10.953 17.0704 11.4097 17.0828 11.8335 16.9172C12.2562 16.7521 12.5867 16.4333 13.0232 16.0122L16.3158 12.841C16.5336 12.6316 16.7241 12.4486 16.8434 12.2394C17.1266 11.7423 17.1353 11.1319 16.8666 10.6269C16.7536 10.4143 16.5685 10.2257 16.3567 10.0099L16.3093 9.96157L16.2614 9.91248C16.0509 9.69697 15.8656 9.50713 15.6557 9.39062ZM14.623 10.3816C14.7734 10.2921 14.957 10.2894 15.1096 10.3742C15.1557 10.3998 15.2176 10.4545 15.5054 10.7485C15.7925 11.0418 15.8472 11.106 15.8735 11.1553C15.9611 11.3199 15.9581 11.5207 15.866 11.6823C15.8384 11.7307 15.7819 11.7931 15.4865 12.0776L12.3128 15.1344C11.7737 15.6537 11.611 15.7964 11.4242 15.8693C11.2427 15.9402 11.0359 15.9462 10.3329 15.9283C10.3823 15.2959 10.4045 15.1063 10.4761 14.9415C10.5478 14.7765 10.6705 14.6329 11.1045 14.1628L14.2379 10.7679C14.5171 10.4654 14.5775 10.4086 14.623 10.3816Z"
        fill="#464B44"
      />
    </svg>
  );
}
