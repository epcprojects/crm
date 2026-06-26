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

export function createTicketProjectOptions(
  projects: ProjectOptionSource[],
): CreateTicketDropdownOption[] {
  return projects.map((project) => ({
    label: project.name,
    value: project.id,
  }));
}
