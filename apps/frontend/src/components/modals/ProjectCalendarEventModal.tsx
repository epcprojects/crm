'use client';

import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ConfirmActionModal from './ConfirmActionModal';
import type {
  ProjectCalendarEvent,
  ProjectCalendarEventInput,
  ProjectCalendarEventType,
} from '../projects/project-calendar.types';

type ProjectCalendarEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ProjectCalendarEventInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  event?: ProjectCalendarEvent | null;
  initialRange?: {
    start: string;
    end: string;
    allDay: boolean;
  } | null;
  isSubmitting?: boolean;
  isDeleting?: boolean;
};

const schema = yup.object({
  title: yup.string().trim().required('Title is required'),
  description: yup.string().default(''),
  start: yup.string().required('Start is required'),
  end: yup.string().required('End is required'),
  allDay: yup.boolean().required(),
  type: yup
    .string<ProjectCalendarEventType>()
    .oneOf(['due_date', 'launch', 'meeting', 'milestone'])
    .required('Lead type is required'),
});

export default function ProjectCalendarEventModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  event,
  initialRange,
  isSubmitting = false,
  isDeleting = false,
}: ProjectCalendarEventModalProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const formik = useFormik<ProjectCalendarEventInput>({
    initialValues: createInitialValues(event, initialRange),
    validationSchema: schema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      await onSubmit(values);
      onClose();
    },
  });

  useEffect(() => {
    if (!isOpen) {
      formik.resetForm();
    }
  }, [isOpen]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? 'Edit Event' : 'Add Event'}
      subtitle="This event will be stored locally and synced to Google when connected."
      showFooter
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confirmLabel={
        isSubmitting ? 'Saving...' : event ? 'Save Event' : 'Create Event'
      }
      confimBtnDisable={isSubmitting || isDeleting}
      outSideClickClose={false}
      roundedCustom
      size="medium"
      scrollNeeded={false}
    >
      <div className="space-y-4 p-4 md:p-6">
        <FieldLabel label="Title" required />
        <input
          name="title"
          value={formik.values.title}
          onChange={formik.handleChange}
          placeholder="Design review"
          className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <FieldError
          error={formik.touched.title ? formik.errors.title : undefined}
        />

        <FieldLabel label="Type" required />
        <select
          name="type"
          value={formik.values.type}
          onChange={formik.handleChange}
          className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
        >
          <option value="due_date">Due Date</option>
          <option value="launch">Launch</option>
          <option value="meeting">Meeting</option>
          <option value="milestone">Milestone</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            id="allDay"
            name="allDay"
            type="checkbox"
            checked={formik.values.allDay}
            onChange={(event) => {
              const nextAllDay = event.target.checked;
              formik.setFieldValue('allDay', nextAllDay);
              const normalized = normalizeDateFields(
                formik.values.start,
                formik.values.end,
                nextAllDay,
              );
              formik.setFieldValue('start', normalized.start);
              formik.setFieldValue('end', normalized.end);
            }}
            className="h-4 w-4 rounded border border-gray-300"
          />
          <label htmlFor="allDay" className="text-sm text-gray-700">
            All day event
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Start" required />
            <input
              name="start"
              type={formik.values.allDay ? 'date' : 'datetime-local'}
              value={formatInputValue(
                formik.values.start,
                formik.values.allDay,
              )}
              onChange={(event) =>
                formik.setFieldValue(
                  'start',
                  parseInputValue(event.target.value, formik.values.allDay),
                )
              }
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
            />
            <FieldError
              error={formik.touched.start ? formik.errors.start : undefined}
            />
          </div>

          <div>
            <FieldLabel label="End" required />
            <input
              name="end"
              type={formik.values.allDay ? 'date' : 'datetime-local'}
              value={formatInputValue(formik.values.end, formik.values.allDay)}
              onChange={(event) =>
                formik.setFieldValue(
                  'end',
                  parseInputValue(event.target.value, formik.values.allDay),
                )
              }
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none"
            />
            <FieldError
              error={formik.touched.end ? formik.errors.end : undefined}
            />
          </div>
        </div>

        <div>
          <FieldLabel label="Description" />
          <textarea
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            rows={4}
            placeholder="Optional notes for this event"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>

        {/* {event ? (
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isDeleting || isSubmitting}
            className="text-sm font-medium text-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete event'}
          </button>
        ) : null} */}
      </div>

      <ConfirmActionModal
        isOpen={confirmDeleteOpen}
        title="Delete event?"
        message="This event will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setConfirmDeleteOpen(false);
          }
        }}
        onConfirm={async () => {
          await onDelete?.();
          setConfirmDeleteOpen(false);
        }}
      />
    </AppModal>
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

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-600">{error}</p>;
}

function createInitialValues(
  event?: ProjectCalendarEvent | null,
  initialRange?: { start: string; end: string; allDay: boolean } | null,
): ProjectCalendarEventInput {
  if (event) {
    return {
      title: event.title,
      description: event.description,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      type: event.type,
    };
  }

  if (initialRange) {
    return {
      title: '',
      description: '',
      start: initialRange.start,
      end: initialRange.end,
      allDay: initialRange.allDay,
      type: 'meeting',
    };
  }

  const now = roundDateToNextHour(new Date());
  const end = new Date(now);
  end.setHours(end.getHours() + 1);

  return {
    title: '',
    description: '',
    start: now.toISOString(),
    end: end.toISOString(),
    allDay: false,
    type: 'meeting',
  };
}

function roundDateToNextHour(value: Date) {
  const next = new Date(value);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

function formatInputValue(value: string, allDay: boolean) {
  if (!value) {
    return '';
  }

  if (allDay) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function parseInputValue(value: string, allDay: boolean) {
  if (!value) {
    return value;
  }

  if (allDay) {
    return `${value}T00:00:00.000Z`;
  }

  return new Date(value).toISOString();
}

function normalizeDateFields(start: string, end: string, allDay: boolean) {
  if (allDay) {
    return {
      start: `${start.slice(0, 10)}T00:00:00.000Z`,
      end: `${end.slice(0, 10)}T00:00:00.000Z`,
    };
  }

  const nextStart = start.includes('T') ? start : new Date(start).toISOString();
  const nextEnd = end.includes('T') ? end : new Date(end).toISOString();

  return {
    start: nextStart,
    end: nextEnd,
  };
}
