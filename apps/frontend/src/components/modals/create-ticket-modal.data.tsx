'use client';

import { type ReactNode } from 'react';

export type CreateTicketDropdownOption = {
  label: string;
  value: string;
  icon?: ReactNode;
};

type ProjectOptionSource = {
  id: string;
  name: string;
};

export const createTicketAssigneeOptions: CreateTicketDropdownOption[] = [
  {
    label: 'Admin User',
    value: 'admin-user',
  },
  {
    label: 'Jane Smith',
    value: 'jane-smith',
  },
  {
    label: 'Bob Lee',
    value: 'bob-lee',
  },
  {
    label: 'Sara Ngo',
    value: 'sara-ngo',
  },
];

export const createTicketPriorityOptions: CreateTicketDropdownOption[] = [
  {
    label: 'Critical',
    value: 'critical',
    icon: (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-violet-500" />
    ),
  },
  {
    label: 'High',
    value: 'high',
    icon: (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
    ),
  },
  {
    label: 'Medium',
    value: 'medium',
    icon: (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-orange-400" />
    ),
  },
  {
    label: 'Low',
    value: 'low',
    icon: (
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-green-500" />
    ),
  },
];

export function createTicketProjectOptions(
  projects: ProjectOptionSource[],
): CreateTicketDropdownOption[] {
  return projects.map((project) => ({
    label: project.name,
    value: project.id,
  }));
}
