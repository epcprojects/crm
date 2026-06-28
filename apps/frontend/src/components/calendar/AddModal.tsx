'use client';

import { useState } from 'react';
import AppModal from '../modals/AppModal';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import { CalendarEvent, Ticket, TicketPriority, TicketStatus } from '../types';
import { toDateString } from '../../lib/calendar-utils';

type ModalMode = 'event' | 'ticket';

interface AddModalProps {
  mode: ModalMode;
  selectedDate: string | null;
  onClose: () => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<unknown> | unknown;
  onAddTicket: (
    ticket: Omit<Ticket, 'id' | 'createdAt'>,
  ) => Promise<unknown> | unknown;
  initialEvent?: CalendarEvent | null;
  onUpdateEvent?: (
    eventId: string,
    event: Omit<CalendarEvent, 'id'>,
  ) => Promise<unknown> | unknown;
  onDeleteEvent?: (eventId: string) => Promise<unknown> | unknown;
}

export default function AddModal({
  mode,
  selectedDate,
  onClose,
  onAddEvent,
  onAddTicket,
  initialEvent = null,
  onUpdateEvent,
  onDeleteEvent,
}: AddModalProps) {
  const isEditingEvent = mode === 'event' && Boolean(initialEvent?.id);
  const defaultDate = initialEvent?.date || selectedDate || toDateString(new Date());
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(initialEvent?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initialEvent?.endTime ?? '10:00');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [allDay, setAllDay] = useState(initialEvent?.allDay ?? false);
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [status, setStatus] = useState<TicketStatus>('open');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function handleSubmit() {
    if (!title.trim() || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === 'event') {
        const eventPayload = {
          title: title.trim(),
          date,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          type: 'event',
          allDay,
        } satisfies Omit<CalendarEvent, 'id'>;

        if (isEditingEvent && initialEvent?.id && onUpdateEvent) {
          await onUpdateEvent(initialEvent.id, eventPayload);
        } else {
          await onAddEvent(eventPayload);
        }
      } else {
        await onAddTicket({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          priority,
          status,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        });
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialEvent?.id || !onDeleteEvent || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteEvent(initialEvent.id);
      setConfirmDeleteOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <AppModal
        isOpen
        onClose={isSubmitting ? () => undefined : onClose}
        title={
          mode === 'event'
            ? isEditingEvent
              ? 'Edit Event'
              : 'Add Event'
            : 'Add Ticket'
        }
        subtitle={
          mode === 'event'
            ? isEditingEvent
              ? 'Update the selected calendar event.'
              : 'Add a calendar event for the selected date.'
            : 'Add a ticket with date, priority, and status.'
        }
        showFooter
        onCancel={onClose}
        onConfirm={() => {
          void handleSubmit();
        }}
        confirmLabel={
          isSubmitting || isDeleting
            ? mode === 'event'
              ? isDeleting
                ? 'Deleting...'
                : isEditingEvent
                  ? 'Saving...'
                  : 'Adding...'
              : 'Creating...'
            : mode === 'event'
              ? isEditingEvent
                ? 'Save Event'
                : 'Add Event'
              : 'Add Ticket'
        }
        confimBtnDisable={isSubmitting || isDeleting || !title.trim()}
        outSideClickClose={!isSubmitting && !isDeleting}
        roundedCustom
        size="medium"
        scrollNeeded={false}
      >
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <FieldLabel label="Title" required />
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={mode === 'event' ? 'Sprint planning' : 'Ticket summary'}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              autoFocus
            />
          </div>

          {mode === 'event' ? (
            <>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <FieldLabel label="Date" required />
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={allDay}
                      onChange={(event) => setAllDay(event.target.checked)}
                      className="h-4 w-4 rounded border border-gray-300"
                    />
                    All day
                  </label>
                </div>
              </div>

              {!allDay ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Start Time" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                    />
                  </div>

                  <div>
                    <FieldLabel label="End Time" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <FieldLabel label="Location" />
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Optional location"
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <FieldLabel label="Due Date" required />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel label="Priority" />
                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as TicketPriority)
                    }
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <FieldLabel label="Status" />
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as TicketStatus)
                    }
                    className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel label="Tags" />
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="bug, feature, urgent"
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
            </>
          )}

          <div>
            <FieldLabel label="Description" />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          {isEditingEvent && onDeleteEvent ? (
            <button
              type="button"
              onClick={() => {
                setConfirmDeleteOpen(true);
              }}
              disabled={isSubmitting || isDeleting}
              className="text-sm font-medium text-red-600 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete event'}
            </button>
          ) : null}
        </div>
      </AppModal>

      <ConfirmActionModal
        isOpen={confirmDeleteOpen}
        title="Delete event?"
        message="This event will be permanently removed from the calendar."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isSubmitting={isDeleting}
        variant="danger"
        onClose={() => {
          if (!isDeleting) {
            setConfirmDeleteOpen(false);
          }
        }}
        onConfirm={handleDelete}
      />
    </>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
      {label}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}
