'use client';

import { useRef, useState } from 'react';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import AppModal from '../modals/AppModal';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import { CalendarEvent, Ticket, TicketPriority, TicketStatus } from '../types';
import { toDateString } from '../../lib/calendar-utils';
import Dropdown from '../ui/ThemeDropDown';
import {
  PROJECT_EVENT_TYPE_COLORS,
  PROJECT_EVENT_TYPE_OPTIONS,
  type ProjectEventTypeOptionValue,
} from './eventTypeOptions';

const configColors = [
  '#F79009',
  '#0BA5EC',
  '#17B26A',
  '#6172F3',
  '#875BF7',
  '#D444F1',
  '#667085',
  '#F04438',
];

type ModalMode = 'event' | 'ticket';

type EventFormErrors = {
  title?: string;
  eventType?: string;
  date?: string;
  colorHex?: string;
};

interface AddModalProps {
  mode: ModalMode;
  selectedDate: string | null;
  isProjectCalendar?: boolean;
  readOnly?: boolean;
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
  isProjectCalendar = false,
  readOnly = false,
  onClose,
  onAddEvent,
  onAddTicket,
  initialEvent = null,
  onUpdateEvent,
  onDeleteEvent,
}: AddModalProps) {
  const { setLoading } = useAppLoader();
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const isEditingEvent = mode === 'event' && Boolean(initialEvent?.id);
  const defaultDate =
    initialEvent?.date || selectedDate || toDateString(new Date());
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(
    initialEvent?.startTime ?? '09:00',
  );
  const [endTime, setEndTime] = useState(initialEvent?.endTime ?? '10:00');
  const [description, setDescription] = useState(
    initialEvent?.description ?? '',
  );
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [allDay, setAllDay] = useState(initialEvent?.allDay ?? false);
  const [eventType, setEventType] = useState<ProjectEventTypeOptionValue | ''>(
    isProjectCalendar &&
      initialEvent?.type &&
      PROJECT_EVENT_TYPE_OPTIONS.some(
        (option) => option.value === initialEvent.type,
      )
      ? (initialEvent.type as ProjectEventTypeOptionValue)
      : '',
  );
  const [colorHex, setColorHex] = useState(
    initialEvent?.color ??
      (isProjectCalendar && eventType
        ? PROJECT_EVENT_TYPE_COLORS[eventType]
        : '#17B26A'),
  );
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [status, setStatus] = useState<TicketStatus>('open');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [eventErrors, setEventErrors] = useState<EventFormErrors>({});

  function validateEventForm() {
    const nextErrors: EventFormErrors = {};

    if (!title.trim()) {
      nextErrors.title = 'Title is required.';
    }

    if (!date.trim()) {
      nextErrors.date = 'Date is required.';
    }

    if (isProjectCalendar && !eventType) {
      nextErrors.eventType = 'Event type is required.';
    }

    if (
      isProjectCalendar &&
      (!colorHex.trim() || !/^#([0-9A-Fa-f]{6})$/.test(colorHex.trim()))
    ) {
      nextErrors.colorHex = 'Enter a valid hex color like #17B26A.';
    }

    setEventErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (readOnly) {
      return;
    }

    if (mode === 'event' && !validateEventForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setLoading(true);

      if (mode === 'event') {
        const normalizedEventType = isProjectCalendar
          ? (eventType as ProjectEventTypeOptionValue)
          : ('event' as const);
        const eventPayload = {
          title: title.trim(),
          date,
          startTime: !isProjectCalendar && !allDay ? startTime : undefined,
          endTime: !isProjectCalendar && !allDay ? endTime : undefined,
          description: description.trim() || undefined,
          location: !isProjectCalendar
            ? location.trim() || undefined
            : undefined,
          type: normalizedEventType,
          allDay: !isProjectCalendar ? allDay : undefined,
          color: isProjectCalendar ? colorHex : undefined,
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
      setLoading(false);
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialEvent?.id || !onDeleteEvent || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      setLoading(true);
      await onDeleteEvent(initialEvent.id);
      setConfirmDeleteOpen(false);
      onClose();
    } finally {
      setLoading(false);
      setIsDeleting(false);
    }
  }

  return (
    <>
      <AppModal
        isOpen
        onClose={isSubmitting ? () => undefined : onClose}
        title={
          readOnly && mode === 'event'
            ? 'View Event'
            : mode === 'event'
              ? isEditingEvent
                ? 'Edit Event'
                : 'Add Event'
              : 'Add Ticket'
        }
        subtitle={
          readOnly && mode === 'event'
            ? ''
            : mode === 'event'
              ? isEditingEvent
                ? 'Update the selected calendar event.'
                : 'Add a calendar event for the selected date.'
              : 'Add a ticket with date, priority, and status.'
        }
        showFooter={!readOnly}
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
        confimBtnDisable={isSubmitting || isDeleting}
        outSideClickClose={false}
        roundedCustom
        size="medium"
        scrollNeeded={false}
      >
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <FieldLabel label="Title" required={!readOnly} />
            {readOnly ? (
              <FieldValue value={title} />
            ) : (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setEventErrors((current) => ({
                      ...current,
                      title: undefined,
                    }));
                  }}
                  disabled={readOnly}
                  readOnly={readOnly}
                  placeholder={
                    mode === 'event' ? 'Sprint planning' : 'Ticket summary'
                  }
                  className={`h-11 w-full rounded-lg border px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 ${
                    eventErrors.title ? 'border-red-300' : 'border-gray-200'
                  }`}
                  autoFocus
                />
                {mode === 'event' && eventErrors.title ? (
                  <p className="mt-1 text-xs text-red-600">
                    {eventErrors.title}
                  </p>
                ) : null}
              </>
            )}
          </div>

          {mode === 'event' ? (
            <>
              {isProjectCalendar ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Date" required={!readOnly} />
                    {readOnly ? (
                      <FieldValue value={date} />
                    ) : (
                      <>
                        <input
                          type="date"
                          value={date}
                          onChange={(event) => {
                            setDate(event.target.value);
                            setEventErrors((current) => ({
                              ...current,
                              date: undefined,
                            }));
                          }}
                          disabled={readOnly}
                          readOnly={readOnly}
                          className={`h-11 w-full rounded-lg border px-3 text-sm text-gray-900 outline-none ${
                            eventErrors.date
                              ? 'border-red-300'
                              : 'border-gray-200'
                          }`}
                        />
                        {eventErrors.date ? (
                          <p className="mt-1 text-xs text-red-600">
                            {eventErrors.date}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div>
                    <FieldLabel label="Event Type" required={!readOnly} />
                    {readOnly ? (
                      <FieldValue
                        value={
                          PROJECT_EVENT_TYPE_OPTIONS.find(
                            (option) => option.value === eventType,
                          )?.label ?? eventType
                        }
                      />
                    ) : (
                      <Dropdown
                        value={eventType}
                        options={[...PROJECT_EVENT_TYPE_OPTIONS]}
                        placeholder="Select event type"
                        error={Boolean(eventErrors.eventType)}
                        errorMessage={eventErrors.eventType}
                        disabled={readOnly}
                        onChange={(value) => {
                          const nextType = value as ProjectEventTypeOptionValue;
                          setEventType(nextType);
                          setEventErrors((current) => ({
                            ...current,
                            eventType: undefined,
                          }));
                          setColorHex((currentColor) =>
                            currentColor === '#17B26A' ||
                            currentColor ===
                              PROJECT_EVENT_TYPE_COLORS[
                                eventType as ProjectEventTypeOptionValue
                              ]
                              ? PROJECT_EVENT_TYPE_COLORS[nextType]
                              : currentColor,
                          );
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {isProjectCalendar ? (
                <div className="space-y-2">
                  {!readOnly && <FieldLabel label="Color" />}

                  {readOnly ? null : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {configColors.map((color) => {
                          const isSelected =
                            colorHex.toLowerCase() === color.toLowerCase();

                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                setColorHex(color);
                                setEventErrors((current) => ({
                                  ...current,
                                  colorHex: undefined,
                                }));
                              }}
                              disabled={readOnly}
                              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                                isSelected
                                  ? 'border-white ring-2'
                                  : 'border-transparent'
                              }`}
                              style={
                                isSelected
                                  ? { boxShadow: `0 0 0 2px ${color}` }
                                  : undefined
                              }
                              aria-label={`Select color ${color}`}
                            >
                              <span
                                className="h-6.5 min-w-6.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 bg-white">
                        <input
                          ref={colorInputRef}
                          type="color"
                          value={colorHex}
                          onChange={(event) => {
                            setColorHex(event.target.value);
                            setEventErrors((current) => ({
                              ...current,
                              colorHex: undefined,
                            }));
                          }}
                          className="sr-only"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          onClick={() => colorInputRef.current?.click()}
                          disabled={readOnly}
                          className="h-7 min-w-7 shrink-0 rounded-full"
                          style={{ backgroundColor: colorHex }}
                          aria-label="Open color picker"
                        />
                        <div className="w-full rounded-lg border border-gray-200 px-3">
                          <input
                            name="colorHex"
                            value={colorHex}
                            onChange={(event) => {
                              setColorHex(event.target.value);
                              setEventErrors((current) => ({
                                ...current,
                                colorHex: undefined,
                              }));
                            }}
                            disabled={readOnly}
                            readOnly={readOnly}
                            placeholder="#17B26A"
                            className="h-10.5 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {eventErrors.colorHex ? (
                    <p className="text-xs text-red-600">
                      {eventErrors.colorHex}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isProjectCalendar ? (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                  <div>
                    <FieldLabel label="Date" required={!readOnly} />
                    {readOnly ? (
                      <FieldValue value={date} />
                    ) : (
                      <>
                        <input
                          type="date"
                          value={date}
                          onChange={(event) => {
                            setDate(event.target.value);
                            setEventErrors((current) => ({
                              ...current,
                              date: undefined,
                            }));
                          }}
                          disabled={readOnly}
                          readOnly={readOnly}
                          className={`h-11 w-full rounded-lg border px-3 text-sm text-gray-900 outline-none ${
                            eventErrors.date
                              ? 'border-red-300'
                              : 'border-gray-200'
                          }`}
                        />
                        {eventErrors.date ? (
                          <p className="mt-1 text-xs text-red-600">
                            {eventErrors.date}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="flex items-end">
                    {readOnly ? (
                      <div className="w-full">
                        <FieldLabel label="All Day" />
                        <FieldValue value={allDay ? 'Yes' : 'No'} />
                      </div>
                    ) : (
                      <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={allDay}
                          onChange={(event) => setAllDay(event.target.checked)}
                          disabled={readOnly}
                          className="h-4 w-4 rounded border border-gray-300"
                        />
                        All day
                      </label>
                    )}
                  </div>
                </div>
              ) : null}

              {!isProjectCalendar && !allDay ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Start Time" />
                    {readOnly ? (
                      <FieldValue value={startTime} />
                    ) : (
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        disabled={readOnly}
                        readOnly={readOnly}
                        className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <FieldLabel label="End Time" />
                    {readOnly ? (
                      <FieldValue value={endTime} />
                    ) : (
                      <input
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        disabled={readOnly}
                        readOnly={readOnly}
                        className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {!isProjectCalendar ? (
                <div>
                  <FieldLabel label="Location" />
                  {readOnly ? (
                    <FieldValue value={location} />
                  ) : (
                    <input
                      type="text"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      disabled={readOnly}
                      readOnly={readOnly}
                      placeholder="Optional location"
                      className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  )}
                </div>
              ) : null}
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
            {readOnly ? (
              <FieldValue
                value={description}
                className="min-h-28 whitespace-pre-wrap"
              />
            ) : (
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={readOnly}
                readOnly={readOnly}
                placeholder="Optional description"
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            )}
          </div>

          {/* {isEditingEvent && onDeleteEvent ? (
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
          ) : null} */}
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

function FieldValue({
  value,
  className = '',
}: {
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`min-h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 ${className}`}
    >
      {value || '—'}
    </div>
  );
}
