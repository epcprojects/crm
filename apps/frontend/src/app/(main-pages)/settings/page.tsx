/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@headlessui/react';
import SettingsItemModal, {
  type SettingsItemFormValues,
} from '../../../components/modals/SettingsItemModal';
import ConfirmActionModal from '../../../components/modals/ConfirmActionModal';
import SettingsConfigCard, {
  type SettingsConfigItem,
} from '../../../components/settings/SettingsConfigCard';
import { appToast } from '../../../components/toast/AppToast';
import { useIsMobile } from '../../../components/hooks/useIsMobile';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import { usePermissions } from '../../providers/PermissionProvider';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { PlusIcon } from 'apps/frontend/public/icons';

type ApiTicketStatus = {
  id: string;
  createdAt: string;
  updatedAt: string;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  isClosed?: boolean;
};

type ApiTicketPriority = ApiTicketStatus;

type ApiEmailPreference = {
  id: string;
  entityType: string;
  notificationType: string;
  enabled: boolean;
  title?: string | null;
};

type EmailNotificationPreferenceItem = {
  id: string;
  entityType: string;
  notificationType: string;
  label: string;
  enabled: boolean;
};

type EmailNotificationGroupRecord = {
  key: string;
  title: string;
  items: EmailNotificationPreferenceItem[];
};

type EmailPreferenceEntityAccess = {
  project: boolean;
  thread: boolean;
  ticket: boolean;
};

export default function Page() {
  const queryClient = useQueryClient();
  const { setLoading } = useAppLoader();
  const { hasPermission } = usePermissions();
  const canViewStatuses = hasPermission('settings.view_statuses');
  const canCreateStatus = hasPermission('settings.create_status');
  const canEditStatus = hasPermission('settings.edit_status');
  const canDeleteStatus = hasPermission('settings.delete_status');
  const canAccessStatuses =
    canViewStatuses || canCreateStatus || canEditStatus || canDeleteStatus;
  const canViewPriorities = hasPermission('settings.view_priorities');
  const canCreatePriority = hasPermission('settings.create_priority');
  const canEditPriority = hasPermission('settings.edit_priority');
  const canDeletePriority = hasPermission('settings.delete_priority');
  const canAccessPriorities =
    canViewPriorities ||
    canCreatePriority ||
    canEditPriority ||
    canDeletePriority;
  const [statusItems, setStatusItems] = useState<SettingsConfigItem[]>([]);
  const [priorityItems, setPriorityItems] = useState<SettingsConfigItem[]>([]);
  const [emailPreferences, setEmailPreferences] = useState<
    EmailNotificationPreferenceItem[]
  >([]);
  const emailPreferencesQuery = useQuery({
    queryKey: ['settings', 'email-preferences'],
    queryFn: fetchEmailPreferences,
    enabled: true,
  });
  const updateEmailPreferenceMutation = useMutation({
    mutationFn: async ({
      notificationType,
      enabled,
    }: {
      notificationType: string;
      enabled: boolean;
    }) => {
      const response = await fetch(
        `/api/notifications/email-preferences/${encodeURIComponent(
          notificationType,
        )}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ enabled }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message || 'Failed to update email preference.',
        );
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'email-preferences'],
      });
    },
  });
  const ticketStatusesQuery = useQuery({
    queryKey: ['settings', 'ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: canAccessStatuses,
  });
  const ticketPrioritiesQuery = useQuery({
    queryKey: ['settings', 'ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: canAccessPriorities,
  });
  const createTicketPriorityMutation = useMutation({
    mutationFn: async ({
      body,
    }: {
      body: Pick<ApiTicketPriority, 'key' | 'label' | 'color' | 'sortOrder'>;
    }) => {
      const response = await fetch('/api/ticket-priorities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message || 'Failed to create lead priority.',
        );
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'ticket-priorities'],
      });
      await queryClient.invalidateQueries({ queryKey: ['ticket-priorities'] });
    },
  });
  const updateTicketPriorityMutation = useMutation({
    mutationFn: async ({
      priorityId,
      body,
    }: {
      priorityId: string;
      body: Pick<ApiTicketPriority, 'label' | 'color'>;
    }) => {
      const response = await fetch(`/api/ticket-priorities/${priorityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message || 'Failed to update lead priority.',
        );
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'ticket-priorities'],
      });
      await queryClient.invalidateQueries({ queryKey: ['ticket-priorities'] });
    },
  });
  const deleteTicketPriorityMutation = useMutation({
    mutationFn: async (priorityId: string) => {
      const response = await fetch(`/api/ticket-priorities/${priorityId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message || 'Failed to delete lead priority.',
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'ticket-priorities'],
      });
      await queryClient.invalidateQueries({ queryKey: ['ticket-priorities'] });
    },
  });
  const createTicketStatusMutation = useMutation({
    mutationFn: async ({
      body,
    }: {
      body: Pick<
        ApiTicketStatus,
        'key' | 'label' | 'color' | 'sortOrder' | 'isClosed'
      >;
    }) => {
      const response = await fetch('/api/ticket-statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to create lead status.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'ticket-statuses'],
      });
      await queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] });
    },
  });
  const deleteTicketStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      const response = await fetch(`/api/ticket-statuses/${statusId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete lead status.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'ticket-statuses'],
      });
      await queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] });
    },
  });
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({
      statusId,
      body,
    }: {
      statusId: string;
      body: Pick<ApiTicketStatus, 'label' | 'color' | 'isClosed'>;
    }) => {
      const response = await fetch(`/api/ticket-statuses/${statusId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update lead status.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['settings', 'ticket-statuses'],
      });
      await queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] });
    },
  });
  const [statusModalMode, setStatusModalMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [priorityModalMode, setPriorityModalMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(
    null,
  );
  const [statusToDelete, setStatusToDelete] =
    useState<SettingsConfigItem | null>(null);
  const [priorityToDelete, setPriorityToDelete] =
    useState<SettingsConfigItem | null>(null);
  const ticketStatusDetailQuery = useQuery({
    queryKey: ['ticket-statuses', editingStatusId],
    queryFn: () => fetchTicketStatusDetail(editingStatusId!),
    enabled:
      statusModalMode === 'edit' &&
      Boolean(editingStatusId) &&
      editingStatusId !== 'new-status' &&
      canEditStatus,
  });
  const ticketPriorityDetailQuery = useQuery({
    queryKey: ['ticket-priorities', editingPriorityId],
    queryFn: () => fetchTicketPriorityDetail(editingPriorityId!),
    enabled:
      priorityModalMode === 'edit' &&
      Boolean(editingPriorityId) &&
      editingPriorityId !== 'new-priority' &&
      canEditPriority,
  });

  const editingStatus =
    statusItems.find((item) => item.id === editingStatusId) ?? null;
  const editingPriority =
    priorityItems.find((item) => item.id === editingPriorityId) ?? null;

  useEffect(() => {
    if (ticketStatusesQuery.data) {
      setStatusItems(ticketStatusesQuery.data);
    }
  }, [ticketStatusesQuery.data]);

  useEffect(() => {
    if (ticketPrioritiesQuery.data) {
      setPriorityItems(ticketPrioritiesQuery.data);
    }
  }, [ticketPrioritiesQuery.data]);

  useEffect(() => {
    if (emailPreferencesQuery.data) {
      setEmailPreferences(
        mapEmailPreferencesToItems(emailPreferencesQuery.data),
      );
    }
  }, [emailPreferencesQuery.data]);

  const handleCreateStatus = async (values: SettingsItemFormValues) => {
    if (!canCreateStatus) {
      return;
    }

    try {
      setLoading(true);
      await createTicketStatusMutation.mutateAsync({
        body: {
          key: values.value,
          label: values.label,
          color: values.colorHex,
          isClosed: Boolean(values.isClosed),
          sortOrder: statusItems.length,
        },
      });

      await ticketStatusesQuery.refetch();
      appToast.success('Status created successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStatus = async (values: SettingsItemFormValues) => {
    if (!editingStatusId || !canEditStatus) return;

    try {
      setLoading(true);
      await updateTicketStatusMutation.mutateAsync({
        statusId: editingStatusId,
        body: {
          label: values.label,
          color: values.colorHex,
          isClosed: Boolean(values.isClosed),
        },
      });

      await ticketStatusesQuery.refetch();
      setEditingStatusId(null);
      appToast.success('Status updated successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatus = async () => {
    if (!statusToDelete || !canDeleteStatus) {
      return;
    }

    try {
      setLoading(true);
      await deleteTicketStatusMutation.mutateAsync(statusToDelete.id);
      await ticketStatusesQuery.refetch();
      setStatusToDelete(null);
      appToast.success('Status deleted successfully.');
    } catch (error: any) {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete lead status.',
      );
    } finally {
      setStatusToDelete(null);
      setLoading(false);
    }
  };

  const handleCreatePriority = async (values: SettingsItemFormValues) => {
    if (!canCreatePriority) {
      return;
    }

    try {
      setLoading(true);
      await createTicketPriorityMutation.mutateAsync({
        body: {
          key: values.value,
          label: values.label,
          color: values.colorHex,
          sortOrder: priorityItems.length,
        },
      });

      await ticketPrioritiesQuery.refetch();
      appToast.success('Priority created successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPriority = async (values: SettingsItemFormValues) => {
    if (!editingPriorityId || !canEditPriority) return;

    try {
      setLoading(true);
      await updateTicketPriorityMutation.mutateAsync({
        priorityId: editingPriorityId,
        body: {
          label: values.label,
          color: values.colorHex,
        },
      });

      await ticketPrioritiesQuery.refetch();
      setEditingPriorityId(null);
      appToast.success('Priority updated successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePriority = async () => {
    if (!priorityToDelete || !canDeletePriority) {
      return;
    }

    try {
      setLoading(true);
      await deleteTicketPriorityMutation.mutateAsync(priorityToDelete.id);
      await ticketPrioritiesQuery.refetch();
      setPriorityToDelete(null);
      appToast.success('Priority deleted successfully.');
    } catch (error: any) {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete lead priority.',
      );
    } finally {
      setPriorityToDelete(null);
      setLoading(false);
    }
  };

  const handleToggleEmailPreference = async (notificationType: string) => {
    const preference = emailPreferences.find(
      (item) => item.notificationType === notificationType,
    );

    if (!preference) {
      return;
    }

    const nextEnabled = !preference.enabled;
    const previousPreferences = emailPreferences;

    setEmailPreferences((current) =>
      current.map((item) =>
        item.notificationType === notificationType
          ? {
              ...item,
              enabled: nextEnabled,
            }
          : item,
      ),
    );

    try {
      await updateEmailPreferenceMutation.mutateAsync({
        notificationType,
        enabled: nextEnabled,
      });
    } catch (error) {
      setEmailPreferences(previousPreferences);
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update email preference.',
      );
    }
  };

  const isMobile = useIsMobile();

  const visibleSettingsPanelCount =
    1 + Number(canAccessStatuses) + Number(canAccessPriorities);
  const settingsGridColumnsClass =
    visibleSettingsPanelCount >= 3
      ? 'xl:grid-cols-3'
      : visibleSettingsPanelCount === 2
        ? 'xl:grid-cols-2'
        : 'xl:grid-cols-1';
  const emailPreferenceEntityAccess: EmailPreferenceEntityAccess = {
    project:
      hasPermission('projects.view_list') ||
      hasPermission('projects.view_detail') ||
      hasPermission('projects.create') ||
      hasPermission('projects.edit') ||
      hasPermission('projects.delete'),
    thread:
      hasPermission('thread.view') ||
      hasPermission('thread.view_replies') ||
      hasPermission('thread.post_message') ||
      hasPermission('thread.post_reply') ||
      hasPermission('thread.edit') ||
      hasPermission('thread.delete') ||
      hasPermission('thread.attach_file'),
    ticket:
      hasPermission('tickets.view_list') ||
      hasPermission('tickets.view_detail') ||
      hasPermission('tickets.create') ||
      hasPermission('tickets.edit_status') ||
      hasPermission('tickets.edit_assignee') ||
      hasPermission('tickets.edit_title_description'),
  };
  const emailPreferenceGroups = buildEmailPreferenceGroups(
    emailPreferences,
    emailPreferenceEntityAccess,
  );

  return (
    <div className="relative z-100 h-full overflow-hidden pb-0 xl:h-dvh xl:px-0 xl:py-5 xl:pr-5">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
        <div className="shrink-0">
          <DashboardSummaryBanner
            imageSrc="/images/settingsPageIcon.svg"
            title="Settings"
            showMobileHeading
            // stats={projectSummaryStats}
          />
        </div>
        <div className="mx-4 hidden shrink-0 flex-col items-center gap-3 rounded-[10px] border border-warning-200 bg-[#FFFAEB] p-1 text-[#69410A] xl:mx-0 xl:flex-row xl:rounded-full">
          <span className=" bg-white hidden xl:flex items-center justify-center  drop-shadow rounded-full   h-10 min-w-10 ">
            <TipIcon />
          </span>
          <p className="text-sm leading-6 text-gray-700">
            <span className="inline-block pe-2 xl:hidden">
              <TipIcon
                height={isMobile ? '16' : '20'}
                width={isMobile ? '16' : '20'}
              />
            </span>
            <span className="font-semibold text-gray-900">Tip:</span> Statuses
            and priorities defined here appear in every dropdown across the app
            — new leads, lead detail editors, and list filters. You
            can&apos;t delete one that&apos;s currently assigned to a lead;
            reassign those leads first.
          </p>
        </div>
        <div
          className={`mx-4 grid h-auto min-h-0 flex-none auto-rows-max grid-cols-1 gap-2 overflow-visible scrollbar-hide md:gap-4 xl:mx-0 xl:h-full xl:flex-1 xl:auto-rows-fr ${settingsGridColumnsClass} xl:overflow-hidden`}
        >
          {canAccessStatuses ? (
            <SettingsConfigCard
              title="Lead Statuses"
              subtitle={`${statusItems.length} statuses · used across all projects`}
              buttonLabel="Add Status"
              emptyImageUrl="/images/EmptyStatusIcon.svg"
              emptyImageAlt="No lead statuses"
              emptyTitle="No Statuses Yet"
              emptyDescription="Create your first lead status to get started."
              items={statusItems}
              badgeVariant="status"
              isLoading={ticketStatusesQuery.isLoading}
              onAdd={
                canCreateStatus
                  ? () => {
                      setStatusModalMode('create');
                      setEditingStatusId('new-status');
                    }
                  : undefined
              }
              onEdit={
                canEditStatus
                  ? (item) => {
                      setStatusModalMode('edit');
                      setEditingStatusId(item.id);
                    }
                  : undefined
              }
              onDelete={
                canDeleteStatus ? (item) => setStatusToDelete(item) : undefined
              }
            />
          ) : null}

          {canAccessPriorities ? (
            <SettingsConfigCard
              title="Priority Levels"
              subtitle={`${priorityItems.length} levels · used across all projects`}
              buttonLabel="Add Priority"
              items={priorityItems}
              badgeVariant="priority"
              emptyImageUrl="/images/EmptyPriorityIcon.svg"
              emptyImageAlt="No priority levels"
              emptyTitle="No Priority Levels Yet"
              emptyDescription="Create your first priority level to get started."
              isLoading={ticketPrioritiesQuery.isLoading}
              onAdd={
                canCreatePriority
                  ? () => {
                      setPriorityModalMode('create');
                      setEditingPriorityId('new-priority');
                    }
                  : undefined
              }
              onEdit={
                canEditPriority
                  ? (item) => {
                      setPriorityModalMode('edit');
                      setEditingPriorityId(item.id);
                    }
                  : undefined
              }
              onDelete={
                canDeletePriority
                  ? (item) => setPriorityToDelete(item)
                  : undefined
              }
            />
          ) : null}

          <EmailNotificationSettingsCard
            groups={emailPreferenceGroups}
            isLoading={emailPreferencesQuery.isLoading}
            isUpdating={updateEmailPreferenceMutation.isPending}
            onToggle={handleToggleEmailPreference}
          />
        </div>
        {canCreateStatus ? (
          <button
            type="button"
            onClick={() => {
              setStatusModalMode('create');
              setEditingStatusId('new-status');
            }}
            aria-label="Add status"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
          >
            <PlusIcon fill="#FFFFFF" width="24" height="24" />
          </button>
        ) : null}
      </div>

      <SettingsItemModal
        isOpen={
          canCreateStatus && statusModalMode === 'create'
            ? editingStatusId === 'new-status'
            : canEditStatus && Boolean(editingStatusId)
        }
        onClose={() => setEditingStatusId(null)}
        kind="status"
        mode={statusModalMode}
        initialValues={
          statusModalMode === 'edit'
            ? ticketStatusDetailQuery.data
              ? mapTicketStatusDetailToFormValues(ticketStatusDetailQuery.data)
              : editingStatus
                ? {
                    label: editingStatus.label,
                    value: editingStatus.value,
                    colorHex: editingStatus.colorHex ?? '#17B26A',
                    isClosed: editingStatus.isClosed,
                  }
                : undefined
            : undefined
        }
        onConfirm={
          statusModalMode === 'edit' ? handleEditStatus : handleCreateStatus
        }
      />

      <SettingsItemModal
        isOpen={
          canCreatePriority && priorityModalMode === 'create'
            ? editingPriorityId === 'new-priority'
            : canEditPriority && Boolean(editingPriority)
        }
        onClose={() => setEditingPriorityId(null)}
        kind="priority"
        mode={priorityModalMode}
        initialValues={
          priorityModalMode === 'edit'
            ? ticketPriorityDetailQuery.data
              ? mapTicketPriorityDetailToFormValues(
                  ticketPriorityDetailQuery.data,
                )
              : editingPriority
                ? {
                    label: editingPriority.label,
                    value: editingPriority.value,
                    colorHex: editingPriority.colorHex ?? '#875BF7',
                  }
                : undefined
            : undefined
        }
        onConfirm={
          priorityModalMode === 'edit'
            ? handleEditPriority
            : handleCreatePriority
        }
      />

      <ConfirmActionModal
        isOpen={Boolean(statusToDelete) && canDeleteStatus}
        title="Delete Status"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              {statusToDelete?.label ?? 'this status'}
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        variant="danger"
        isSubmitting={deleteTicketStatusMutation.isPending}
        onClose={() => setStatusToDelete(null)}
        onConfirm={handleDeleteStatus}
      />

      <ConfirmActionModal
        isOpen={Boolean(priorityToDelete) && canDeletePriority}
        title="Delete Priority"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              {priorityToDelete?.label ?? 'this priority'}
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        variant="danger"
        isSubmitting={deleteTicketPriorityMutation.isPending}
        onClose={() => setPriorityToDelete(null)}
        onConfirm={handleDeletePriority}
      />
    </div>
  );
}

function EmailNotificationSettingsCard({
  groups,
  onToggle,
  isLoading = false,
  isUpdating = false,
}: {
  groups: EmailNotificationGroupRecord[];
  onToggle: (notificationType: string) => void;
  isLoading?: boolean;
  isUpdating?: boolean;
}) {
  return (
    <section className="flex h-auto min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-2.5 xl:h-full xl:p-5">
      <div>
        <h2 className="text-base font-medium text-gray-900 xl:text-lg">
          Email Notification Settings
        </h2>
      </div>

      <div className="mt-3 md:mt-6 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {isLoading ? (
          <EmailNotificationSettingsSkeleton />
        ) : (
          groups.map((group) => (
            <EmailNotificationGroup
              key={group.key}
              title={group.title}
              items={group.items}
              onToggle={onToggle}
              columns={group.items.length > 2 ? 2 : 1}
              isDisabled={isUpdating}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EmailNotificationSettingsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50/60"
        >
          <div className="border-b border-b-gray-200 bg-gray-50 px-3 py-2">
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
          <div className="grid grid-cols-2 gap-3 bg-white p-4">
            {Array.from({ length: index === 2 ? 5 : 2 }).map(
              (__, itemIndex) => (
                <div key={itemIndex} className="flex items-center gap-2">
                  <div className="h-5 w-10 rounded-full bg-gray-200" />
                  <div
                    className={`h-3 rounded bg-gray-200 ${
                      itemIndex % 2 === 0 ? 'w-20' : 'w-24'
                    }`}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailNotificationGroup({
  title,
  items,
  onToggle,
  columns = 2,
  isDisabled = false,
}: {
  title: string;
  items: EmailNotificationPreferenceItem[];
  onToggle: (notificationType: string) => void;
  columns?: 1 | 2;
  isDisabled?: boolean;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50/60 ">
      <div className="py-2 px-3 bg-gray-50 border-b border-b-gray-200">
        <h3 className="text-sm md:text-base font-semibold text-gray-900">
          {title}
        </h3>
      </div>
      <div
        className={` bg-white grid items-start gap-3 p-2 md:p-3 ${
          columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2'
        }`}
      >
        {items.map((item) => (
          <EmailNotificationToggleRow
            key={item.id}
            label={item.label}
            checked={item.enabled}
            disabled={isDisabled}
            onChange={() => onToggle(item.notificationType)}
          />
        ))}
      </div>
    </div>
  );
}

function EmailNotificationToggleRow({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex md:items-start items-center gap-2">
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`${checked ? 'bg-primary border-primary' : 'bg-gray-100 border-gray-200'}
          relative inline-flex h-5 w-10 shrink-0 rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="sr-only">Use setting</span>
        <span
          aria-hidden="true"
          className={`${checked ? 'translate-x-5' : 'translate-x-0'}
            pointer-events-none inline-block h-4.5 border border-gray-200 w-4.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
        />
      </Switch>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

async function fetchTicketStatuses() {
  const response = await fetch('/api/ticket-statuses', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketStatus[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message
        : 'Failed to fetch lead statuses.',
    );
  }

  return payload
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map(mapTicketStatusToSettingsItem);
}

async function fetchTicketStatusDetail(statusId: string) {
  const response = await fetch(`/api/ticket-statuses/${statusId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketStatus
    | { message?: string }
    | null;

  if (!response.ok || !isApiTicketStatus(payload)) {
    throw new Error(
      isErrorPayload(payload)
        ? payload.message || 'Failed to fetch lead status.'
        : 'Failed to fetch lead status.',
    );
  }

  return payload;
}

async function fetchTicketPriorities() {
  const response = await fetch('/api/ticket-priorities', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketPriority[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message
        : 'Failed to fetch lead priorities.',
    );
  }

  return payload
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map(mapTicketPriorityToSettingsItem);
}

async function fetchTicketPriorityDetail(priorityId: string) {
  const response = await fetch(`/api/ticket-priorities/${priorityId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketPriority
    | { message?: string }
    | null;

  if (!response.ok || !isApiTicketPriority(payload)) {
    throw new Error(
      isErrorPayload(payload)
        ? payload.message || 'Failed to fetch lead priority.'
        : 'Failed to fetch lead priority.',
    );
  }

  return payload;
}

async function fetchEmailPreferences() {
  const response = await fetch('/api/notifications/email-preferences', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiEmailPreference[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch email preferences.'
        : 'Failed to fetch email preferences.',
    );
  }

  return payload;
}

function mapEmailPreferencesToItems(
  preferences: ApiEmailPreference[],
): EmailNotificationPreferenceItem[] {
  return preferences.map((preference) => ({
    id: preference.id,
    entityType: preference.entityType,
    notificationType: preference.notificationType,
    label:
      preference.title?.trim() ||
      formatNotificationTypeLabel(preference.notificationType),
    enabled: preference.enabled,
  }));
}

function buildEmailPreferenceGroups(
  preferences: EmailNotificationPreferenceItem[],
  entityAccess: EmailPreferenceEntityAccess,
): EmailNotificationGroupRecord[] {
  const grouped = preferences.reduce<Map<string, EmailNotificationGroupRecord>>(
    (accumulator, preference) => {
      const groupKey = preference.entityType?.trim().toLowerCase() || 'other';

      if (!shouldShowEmailPreferenceEntityGroup(groupKey, entityAccess)) {
        return accumulator;
      }

      const existingGroup = accumulator.get(groupKey);

      if (existingGroup) {
        existingGroup.items.push(preference);
        return accumulator;
      }

      accumulator.set(groupKey, {
        key: groupKey,
        title: formatEntityTypeTitle(groupKey),
        items: [preference],
      });

      return accumulator;
    },
    new Map(),
  );

  return Array.from(grouped.values()).sort((first, second) =>
    first.title.localeCompare(second.title),
  );
}

function shouldShowEmailPreferenceEntityGroup(
  entityType: string,
  entityAccess: EmailPreferenceEntityAccess,
) {
  if (entityType === 'project') {
    return entityAccess.project;
  }

  if (entityType === 'thread') {
    return entityAccess.thread;
  }

  if (entityType === 'ticket') {
    return entityAccess.ticket;
  }

  return true;
}

function formatEntityTypeTitle(entityType: string) {
  const normalized = entityType.trim().toLowerCase();

  if (normalized === 'project') return 'Projects';
  if (normalized === 'thread') return 'Threads';
  if (normalized === 'ticket') return 'Leads';

  return toTitleCase(normalized.replace(/[_-]+/g, ' '));
}

function formatNotificationTypeLabel(notificationType: string) {
  const suffix = notificationType.split('.').pop() ?? notificationType;
  return toTitleCase(suffix.replace(/[_-]+/g, ' '));
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function mapTicketStatusToSettingsItem(
  status: ApiTicketStatus,
): SettingsConfigItem {
  return {
    id: status.id,
    label: status.label,
    value: status.key,
    countLabel: status.key,
    colorHex: status.color,
    isClosed: status.isClosed,
  };
}

function mapTicketPriorityToSettingsItem(
  priority: ApiTicketPriority,
): SettingsConfigItem {
  return {
    id: priority.id,
    label: priority.label,
    value: priority.key,
    countLabel: priority.key,
    colorHex: priority.color,
  };
}

function mapTicketStatusDetailToFormValues(
  status: ApiTicketStatus,
): SettingsItemFormValues {
  return {
    label: status.label,
    value: status.key,
    colorHex: status.color,
    isClosed: status.isClosed,
  };
}

function mapTicketPriorityDetailToFormValues(
  priority: ApiTicketPriority,
): SettingsItemFormValues {
  return {
    label: priority.label,
    value: priority.key,
    colorHex: priority.color,
  };
}

function isApiTicketStatus(value: unknown): value is ApiTicketStatus {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'key' in value &&
      'label' in value &&
      'color' in value &&
      'sortOrder' in value,
  );
}

function isApiTicketPriority(value: unknown): value is ApiTicketPriority {
  return isApiTicketStatus(value);
}

function isErrorPayload(value: unknown): value is { message?: string } {
  return Boolean(value && typeof value === 'object' && 'message' in value);
}

function TipIcon({ width = '20', height = '20' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g opacity="0.4">
        <path
          d="M16.6673 8.33317C16.6673 10.3243 15.7944 12.1116 14.4104 13.3332H5.59094C4.20691 12.1116 3.33398 10.3243 3.33398 8.33317C3.33398 4.65127 6.31875 1.6665 10.0007 1.6665C13.6825 1.6665 16.6673 4.65127 16.6673 8.33317Z"
          fill="#F79009"
        />
        <path
          d="M12.5007 15.8332L12.3929 16.372C12.275 16.9612 12.2161 17.2558 12.0841 17.4886C11.88 17.8486 11.5492 18.1198 11.1562 18.2494C10.902 18.3332 10.6015 18.3332 10.0007 18.3332C9.39977 18.3332 9.09933 18.3332 8.84514 18.2494C8.45211 18.1198 8.12135 17.8486 7.91721 17.4886C7.78518 17.2558 7.72626 16.9612 7.60842 16.372L7.50065 15.8332H12.5007Z"
          fill="#F79009"
        />
      </g>
      <path
        d="M3.95898 8.26555C3.95898 4.97217 6.65791 2.2915 10.0007 2.2915C13.3434 2.2915 16.0423 4.97217 16.0423 8.26555C16.0423 9.39149 15.7279 10.4432 15.1811 11.3415C15.0016 11.6364 15.0951 12.0209 15.39 12.2004C15.6848 12.3799 16.0693 12.2863 16.2488 11.9915C16.9111 10.9034 17.2923 9.62778 17.2923 8.26555C17.2923 4.26983 14.0217 1.0415 10.0007 1.0415C5.9796 1.0415 2.70898 4.26983 2.70898 8.26555C2.70898 9.62778 3.09015 10.9034 3.7525 11.9915C3.93198 12.2863 4.3165 12.3799 4.61135 12.2004C4.90619 12.0209 4.99971 11.6364 4.82023 11.3415C4.2734 10.4432 3.95898 9.39149 3.95898 8.26555Z"
        fill="#F79009"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.7959 12.7082C6.68737 12.7082 6.58035 12.7082 6.49018 12.7135C6.39497 12.7191 6.26704 12.7326 6.13377 12.7844C5.71902 12.9457 5.43954 13.3363 5.41838 13.7794C5.41158 13.9217 5.43908 14.0471 5.4638 14.1392C5.48723 14.2266 5.52101 14.3283 5.55537 14.4317L5.5815 14.5105C5.70157 14.8727 5.79525 15.1554 5.94622 15.394C6.18921 15.7781 6.53908 16.0786 6.94882 16.261L7.0137 16.5857C7.11321 17.0853 7.19078 17.4748 7.37354 17.797C7.65423 18.292 8.10903 18.6649 8.64944 18.843C9.0013 18.959 9.39843 18.9587 9.90787 18.9583L10.0006 18.9583L10.0934 18.9583C10.6029 18.9587 11 18.959 11.3519 18.843C11.8923 18.6649 12.3471 18.292 12.6278 17.797C12.8105 17.4748 12.8881 17.0853 12.9876 16.5857L13.0525 16.261C13.4622 16.0786 13.8121 15.7781 14.0551 15.394C14.206 15.1554 14.2997 14.8727 14.4198 14.5105L14.4459 14.4318C14.4803 14.3283 14.5141 14.2266 14.5375 14.1392C14.5622 14.0471 14.5897 13.9217 14.5829 13.7794C14.5618 13.3363 14.2823 12.9457 13.8675 12.7844C13.7343 12.7326 13.6063 12.7191 13.5111 12.7135C13.421 12.7082 13.314 12.7082 13.2054 12.7082H10.6257V9.1665C10.6257 8.82133 10.3458 8.5415 10.0007 8.5415C9.65547 8.5415 9.37565 8.82133 9.37565 9.1665V12.7082L6.7959 12.7082ZM8.46087 17.1804C8.39894 17.0712 8.35874 16.9247 8.2634 16.4582H11.7379C11.6425 16.9247 11.6024 17.0712 11.5404 17.1804C11.4128 17.4054 11.2061 17.5749 10.9605 17.6559C10.825 17.7005 10.6479 17.7083 10.0006 17.7083C9.35336 17.7083 9.17628 17.7005 9.04083 17.6559C8.79519 17.5749 8.58846 17.4054 8.46087 17.1804ZM6.74619 14.0514L6.7154 13.9583L6.81029 13.9582H13.191L13.2859 13.9583L13.2551 14.0514C13.1029 14.5096 13.0571 14.6335 12.9987 14.7257C12.8558 14.9516 12.6322 15.1131 12.3746 15.1775C12.2697 15.2037 12.139 15.2082 11.6574 15.2082H8.34387C7.86235 15.2082 7.73156 15.2037 7.62667 15.1775C7.36913 15.1131 7.1455 14.9516 7.00258 14.7257C6.94423 14.6335 6.89837 14.5096 6.74619 14.0514Z"
        fill="#F79009"
      />
    </svg>
  );
}
