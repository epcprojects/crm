export const PROJECT_EVENT_TYPE_OPTIONS = [
  // { label: 'Due Date', value: 'due_date' },
  { label: 'Launch', value: 'launch' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Milestone', value: 'milestone' },
] as const;

export type ProjectEventTypeOptionValue =
  (typeof PROJECT_EVENT_TYPE_OPTIONS)[number]['value'];

export const PROJECT_EVENT_TYPE_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  ...PROJECT_EVENT_TYPE_OPTIONS,
] as const;

export const PROJECT_EVENT_TYPE_COLORS: Record<
  ProjectEventTypeOptionValue,
  string
> = {
  // due_date: '#0ea5e9',
  launch: '#8b5cf6',
  meeting: '#0f6e56',
  milestone: '#f59e0b',
};
