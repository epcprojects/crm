import { ticketsData } from '../tickets/tickets.data';
import type { SettingsConfigItem } from '../../../components/settings/SettingsConfigCard';

const statusDefinitions: Array<{
  id: string;
  label: string;
  value: string;
  match: string;
  colorHex: string;
}> = [
  {
    id: 'open',
    label: 'Open',
    value: 'Open',
    match: 'Open',
    colorHex: '#F04438',
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    value: 'in-progress',
    match: 'In Progress',
    colorHex: '#F79009',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    value: 'resolved',
    match: 'Resolved',
    colorHex: '#12B76A',
  },
  {
    id: 'closed',
    label: 'Closed',
    value: 'closed',
    match: 'Closed',
    colorHex: '#98A2B3',
  },
];

const priorityDefinitions: Array<{
  id: string;
  label: string;
  value: string;
  match: string;
  colorHex: string;
}> = [
  {
    id: 'critical',
    label: 'Critical',
    value: 'Critical',
    match: 'Critical',
    colorHex: '#7A5AF8',
  },
  {
    id: 'high',
    label: 'High',
    value: 'High',
    match: 'High',
    colorHex: '#F04438',
  },
  {
    id: 'medium',
    label: 'Medium',
    value: 'Medium',
    match: 'Medium',
    colorHex: '#F79009',
  },
  {
    id: 'low',
    label: 'Low',
    value: 'Low',
    match: 'Low',
    colorHex: '#12B76A',
  },
];

export const statusSettingsItems: SettingsConfigItem[] = statusDefinitions.map(
  (definition) => {
    const ticketCount = ticketsData.filter(
      (ticket) => ticket.status === definition.match,
    ).length;

    return {
      id: definition.id,
      label: definition.label,
      value: definition.value,
      countLabel: `${ticketCount} tickets`,
      colorHex: definition.colorHex,
    };
  },
);

export const prioritySettingsItems: SettingsConfigItem[] =
  priorityDefinitions.map((definition) => {
    const ticketCount = ticketsData.filter(
      (ticket) => ticket.priority === definition.match,
    ).length;

    return {
      id: definition.id,
      label: definition.label,
      value: definition.value,
      countLabel: `${ticketCount} tickets`,
      colorHex: definition.colorHex,
    };
  });
