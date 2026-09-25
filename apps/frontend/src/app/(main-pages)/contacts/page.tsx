'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddContactModal, {
  type AddContactFormValues,
} from '../../../components/modals/AddContactModal';
import DeleteContactModal from '../../../components/modals/DeleteContactModal';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import { createTicketProjectOptions } from '../../../components/modals/create-ticket-modal.data';
import ContactLeadsModal from '../../../components/modals/ContactLeadsModal';
import type { RecentTicket } from '../../../components/tables/RecentTicketsTable';
import ContactsTable, {
  ContactsTableSkeleton,
  type ContactRecord,
  type ContactsMeta,
} from '../../../components/tables/ContactsTable';
import { CloseIcon, PlusIcon, SearchIcon } from '../../../../public/icons';
import { appToast } from '../../../components/toast/AppToast';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import ThemeButton from '../../../components/ui/ThemeButton';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import { useDebouncedValue } from '../../../components/hooks/useDebouncedValue';
import { createContact, toContactPayload } from '../../../lib/contacts';
import { createTicket } from '../../../lib/tickets';
import { useProjectNamesQuery } from '../projects/projects.queries';
import { getInitials } from '../../../lib/format';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const CONTACTS_PAGE_QUERY_PARAM = 'page';
const CONTACTS_PAGE_SIZE_QUERY_PARAM = 'size';
const CONTACTS_SEARCH_QUERY_PARAM = 'search';
const CONTACTS_TABLE_SCROLL_STORAGE_KEY = 'contacts.table-scroll-position';
const CONTACTS_PAGE_SCROLL_STORAGE_KEY = 'contacts.page-scroll-position';

export default function ContactsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canViewContacts = hasPermission('contacts.view_list');
  const canCreateContact = hasPermission('contacts.create');
  const canEditContact = hasPermission('contacts.edit');
  const canDeleteContact = hasPermission('contacts.delete');
  const canCreateLeadFromContact = hasPermission('tickets.create');
  const canViewContactLeads = hasPermission('tickets.view_list');
  const canViewLeadDetail = hasPermission('tickets.view_detail');

  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(
    null,
  );
  const [deletingContact, setDeletingContact] = useState<ContactRecord | null>(
    null,
  );
  const [creatingLeadForContact, setCreatingLeadForContact] =
    useState<ContactRecord | null>(null);
  const [viewingLeadsForContact, setViewingLeadsForContact] =
    useState<ContactRecord | null>(null);
  const searchValue = searchParams.get(CONTACTS_SEARCH_QUERY_PARAM) ?? '';
  const debouncedSearchValue = useDebouncedValue(searchValue);
  const requestedPage = Number(searchParams.get(CONTACTS_PAGE_QUERY_PARAM));
  const requestedPageSize = Number(
    searchParams.get(CONTACTS_PAGE_SIZE_QUERY_PARAM),
  );
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const mobileScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const clearContactScrollPositions = () => {
    sessionStorage.removeItem(CONTACTS_TABLE_SCROLL_STORAGE_KEY);
    sessionStorage.removeItem(CONTACTS_PAGE_SCROLL_STORAGE_KEY);
  };

  const setSearchValue = (value: string) => {
    clearContactScrollPositions();

    const url = new URL(window.location.href);

    if (value) {
      url.searchParams.set(CONTACTS_SEARCH_QUERY_PARAM, value);
    } else {
      url.searchParams.delete(CONTACTS_SEARCH_QUERY_PARAM);
    }

    url.searchParams.set(CONTACTS_PAGE_QUERY_PARAM, '1');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };

  const updatePaginationQuery = (nextPage: number, nextPageSize: number) => {
    clearContactScrollPositions();

    const params = new URLSearchParams(searchParams.toString());

    params.set(CONTACTS_PAGE_QUERY_PARAM, String(nextPage));
    params.set(CONTACTS_PAGE_SIZE_QUERY_PARAM, String(nextPageSize));

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (nextPage: number) => {
    updatePaginationQuery(nextPage, pageSize);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    updatePaginationQuery(1, nextPageSize);
  };

  const contactsQuery = useQuery({
    queryKey: ['contacts', page, pageSize, debouncedSearchValue.trim()],
    queryFn: () => fetchContacts(page, pageSize, debouncedSearchValue.trim()),
    enabled: canViewContacts,
  });

  const contactLeadsQuery = useQuery({
    queryKey: ['contacts', 'leads', viewingLeadsForContact?.id],
    queryFn: () => fetchContactLeads(viewingLeadsForContact?.id ?? ''),
    enabled: Boolean(viewingLeadsForContact) && canViewContactLeads,
  });

  const createContactMutation = useMutation({
    mutationFn: (values: AddContactFormValues) => createContact(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({
      contactId,
      values,
    }: {
      contactId: string;
      values: AddContactFormValues;
    }) => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(toContactPayload(values)),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update contact.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const projectNamesQuery = useProjectNamesQuery(canCreateLeadFromContact);
  const leadProjectOptions = createTicketProjectOptions(
    projectNamesQuery.data ?? [],
  );

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete contact.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  useEffect(() => {
    if (canCreateContact) {
      setHeaderActionOverride(() => setAddContactOpen(true));
    } else {
      setHeaderActionOverride(null);
    }

    return () => {
      setHeaderActionOverride(null);
    };
  }, [canCreateContact, setHeaderActionOverride]);

  const handleCreateContact = async (values: AddContactFormValues) => {
    if (!canCreateContact) return;

    await createContactMutation.mutateAsync(values);
    appToast.success('Contact created successfully.');
  };

  const handleEditContact = async (values: AddContactFormValues) => {
    if (!editingContact || !canEditContact) return;

    await updateContactMutation.mutateAsync({
      contactId: editingContact.id,
      values,
    });
    setEditingContact(null);
    appToast.success('Contact updated successfully.');
  };

  const handleDeleteContact = async () => {
    if (!deletingContact || !canDeleteContact) return;

    await deleteContactMutation.mutateAsync(deletingContact.id);
    setDeletingContact(null);
    appToast.success('Contact deleted successfully.');
  };

  const handleCreateLeadForContact = async (values: CreateTicketFormValues) => {
    if (!creatingLeadForContact || !canCreateLeadFromContact) return;

    try {
      await createTicket({
        projectId: values.project,
        title: values.title,
        description: values.description,
        statusKey: values.status,
        assigneeId: values.assigneeId || undefined,
        ticketType: values.ticketType,
        contactId: creatingLeadForContact.id,
        attachments: values.attachments,
      });
      appToast.success('Lead created successfully.');
      setCreatingLeadForContact(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create lead.',
      );
    }
  };

  const contacts = contactsQuery.data?.items ?? [];
  const meta: ContactsMeta = contactsQuery.data?.meta ?? {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  };

  useEffect(() => {
    if (contactsQuery.isLoading) return;

    const storedPosition = Number(
      sessionStorage.getItem(CONTACTS_PAGE_SCROLL_STORAGE_KEY),
    );

    if (!Number.isFinite(storedPosition) || storedPosition < 0) {
      sessionStorage.removeItem(CONTACTS_PAGE_SCROLL_STORAGE_KEY);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      mobileScrollContainerRef.current?.scrollTo({ top: storedPosition });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [contactsQuery.isLoading]);

  const editInitialValues = editingContact
    ? {
        fullName: editingContact.fullName ?? '',
        phone: editingContact.phone,
        email: editingContact.email ?? '',
        source: editingContact.source ?? '',
        notes: editingContact.notes ?? '',
      }
    : undefined;

  return (
    <>
      <div className="relative z-100 h-full overflow-hidden pb-0 xl:h-dvh xl:px-0 xl:py-5 xl:pr-5">
        <div
          ref={mobileScrollContainerRef}
          onScroll={(event) => {
            sessionStorage.setItem(
              CONTACTS_PAGE_SCROLL_STORAGE_KEY,
              String(event.currentTarget.scrollTop),
            );
          }}
          className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3"
        >
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/ContactsIconImage.svg"
              imageAlt="Contacts"
              title="Contacts"
              stats={[]}
              showMobileHeading
            />
          </div>

          <div className="mx-3 flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:mx-0 xl:h-full xl:flex-1 xl:overflow-hidden">
            <PermissionGuard
              permission="contacts.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view contacts.
                </div>
              }
            >
              <div className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible xl:h-full xl:flex-1 xl:overflow-hidden">
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 sm:max-w-80">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">
                          <SearchIcon fill="#374151" />
                        </span>

                        <input
                          type="text"
                          value={searchValue}
                          onChange={(event) =>
                            setSearchValue(event.target.value)
                          }
                          placeholder="Search by name, phone, or email"
                          className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                        />

                        <button
                          type="button"
                          onClick={() => setSearchValue('')}
                          disabled={!searchValue}
                          tabIndex={searchValue ? 0 : -1}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                            searchValue
                              ? 'visible hover:bg-gray-100'
                              : 'pointer-events-none invisible'
                          }`}
                          aria-label="Clear search"
                        >
                          <CloseIcon width="15" height="15" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {canCreateContact ? (
                    <ThemeButton
                      className="shrink-0 rounded-full hidden xl:flex"
                      variant="primaryGradient"
                      icon={<PlusIcon width="20" height="20" />}
                      onClick={() => setAddContactOpen(true)}
                    >
                      Add Contact
                    </ThemeButton>
                  ) : null}
                </div>

                <div className="min-h-0 flex-none overflow-visible xl:flex-1 xl:overflow-hidden">
                  {contactsQuery.isLoading ? (
                    <ContactsTableSkeleton />
                  ) : (
                    <ContactsTable
                      contacts={contacts}
                      meta={meta}
                      onPageChange={handlePageChange}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageSizeChange={handlePageSizeChange}
                      scrollRestorationKey={CONTACTS_TABLE_SCROLL_STORAGE_KEY}
                      searchActive={Boolean(debouncedSearchValue.trim())}
                      onEdit={
                        canEditContact
                          ? (contact) => setEditingContact(contact)
                          : undefined
                      }
                      onDelete={
                        canDeleteContact
                          ? (contact) => setDeletingContact(contact)
                          : undefined
                      }
                      onCreateLead={
                        canCreateLeadFromContact
                          ? (contact) => setCreatingLeadForContact(contact)
                          : undefined
                      }
                      onViewLeads={
                        canViewContactLeads
                          ? (contact) => setViewingLeadsForContact(contact)
                          : undefined
                      }
                      onAddContact={
                        canCreateContact
                          ? () => setAddContactOpen(true)
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>

        {canCreateContact ? (
          <button
            type="button"
            onClick={() => setAddContactOpen(true)}
            aria-label="Add contact"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
          >
            <PlusIcon fill="#FFFFFF" width="24" height="24" />
          </button>
        ) : null}
      </div>

      <AddContactModal
        key="create-contact-modal"
        isOpen={addContactOpen && canCreateContact}
        onClose={() => setAddContactOpen(false)}
        onConfirm={handleCreateContact}
      />

      {editingContact ? (
        <AddContactModal
          key={`edit-contact-${editingContact.id}`}
          isOpen={Boolean(editingContact) && canEditContact}
          onClose={() => setEditingContact(null)}
          onConfirm={handleEditContact}
          mode="edit"
          initialValues={editInitialValues}
        />
      ) : null}

      <DeleteContactModal
        isOpen={Boolean(deletingContact) && canDeleteContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDeleteContact}
        contactName={deletingContact?.fullName ?? deletingContact?.phone}
      />

      {creatingLeadForContact ? (
        <CreateTicketModal
          key={`create-lead-${creatingLeadForContact.id}`}
          isOpen={Boolean(creatingLeadForContact) && canCreateLeadFromContact}
          onClose={() => setCreatingLeadForContact(null)}
          onConfirm={handleCreateLeadForContact}
          projectOptions={leadProjectOptions}
          preselectedContactId={creatingLeadForContact.id}
          preselectedContactLabel={
            creatingLeadForContact.fullName
              ? `${creatingLeadForContact.fullName} (${creatingLeadForContact.phone})`
              : creatingLeadForContact.phone
          }
        />
      ) : null}

      <ContactLeadsModal
        isOpen={Boolean(viewingLeadsForContact) && canViewContactLeads}
        onClose={() => setViewingLeadsForContact(null)}
        contactName={
          viewingLeadsForContact?.fullName ||
          viewingLeadsForContact?.phone ||
          ''
        }
        contactSubtitle={
          viewingLeadsForContact?.fullName
            ? viewingLeadsForContact.phone
            : undefined
        }
        leads={contactLeadsQuery.data ?? []}
        isLoading={contactLeadsQuery.isLoading}
        canViewLeadDetail={canViewLeadDetail}
      />
    </>
  );
}

async function fetchContacts(page: number, limit: number, search?: string) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    searchParams.set('search', search);
  }

  const response = await fetch(`/api/contacts?${searchParams}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as {
    items?: ContactRecord[];
    meta?: ContactsMeta;
    message?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to fetch contacts.');
  }

  return {
    items: payload?.items ?? [],
    meta: payload?.meta ?? {
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },
  };
}

type ApiContactLeadTicket = {
  id: string;
  ticketRefNo?: string;
  createdAt: string;
  dueDate: string | null;
  title: string;
  project: {
    id: string;
    name: string;
    brandColor?: string;
  } | null;
  status: {
    key: string;
    label: string;
    color?: string;
  } | null;
  priority: {
    key: string;
    label: string;
    color?: string;
  } | null;
  ticketType?: string | null;
  assignee: {
    id?: string;
    fullName?: string;
    name?: string;
  } | null;
  reporter?: {
    id: string;
    email: string;
    fullName: string;
  };
};

async function fetchContactLeads(contactId: string): Promise<RecentTicket[]> {
  if (!contactId) {
    return [];
  }

  const searchParams = new URLSearchParams({
    contactId,
    page: '1',
    limit: '100',
  });

  const response = await fetch(
    `/api/dashboard/tickets?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    items?: ApiContactLeadTicket[];
    message?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(payload?.message || 'Failed to fetch leads for contact.');
  }

  return payload.items.map((ticket) => {
    const assigneeName =
      ticket.assignee?.fullName ?? ticket.assignee?.name ?? 'Unassigned';
    const statusLabel = ticket.status?.label ?? ticket.status?.key ?? 'Unknown';
    const priorityLabel =
      ticket.priority?.label ?? ticket.priority?.key ?? null;

    return {
      id: ticket.id,
      ticketRefNo: ticket.ticketRefNo,
      title: ticket.title,
      ticketType: ticket.ticketType ?? null,
      project: {
        id: ticket.project?.id,
        name: ticket.project?.name ?? 'No Project',
        initials: getInitials(ticket.project?.name ?? 'No Project'),
        brandColor: ticket.project?.brandColor ?? '#31d81b',
      },
      status: statusLabel,
      statusColor: ticket.status?.color,
      priority: priorityLabel,
      priorityColor: ticket.priority?.color,
      assignee: {
        name: assigneeName,
        initials: getInitials(assigneeName),
      },
      date: ticket.createdAt,
      sortDate: ticket.createdAt,
      reporter: {
        id: ticket.reporter?.id ?? '',
        email: ticket.reporter?.email ?? '',
        fullName: ticket.reporter?.fullName ?? '',
      },
    };
  });
}
