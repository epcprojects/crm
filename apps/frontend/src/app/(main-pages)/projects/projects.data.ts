import { ticketsData } from '../tickets/tickets.data';
import type { LeadStatusCount } from '../../../lib/tickets';

export type ProjectRecord = {
  id: string;
  initials: string;
  name: string;
  category: string;
  totalCount: number;
  statusCounts: LeadStatusCount[];
  colorHex: string;
  threadPosts: number;
  filesCount: number;
};

export type ProjectNameRecord = {
  id: string;
  name: string;
};

export type ApiProjectRecord = {
  id: string;
  name: string;
  category: string;
  brandColor?: string;
  logoLetter?: string;
  stats?: {
    tickets?: number;
    statuses?: LeadStatusCount[];
  };
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isActive?: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProjectFileRecord = {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'file';
  size?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  storageKey?: string;
  extension?: string;
  mimeType?: string;
  source?: string;
  sourceId?: string;
  status?: string;
};

export const baseProjects: ProjectRecord[] = [
  {
    id: 'acme-corp',
    initials: 'AC',
    name: 'Acme Corp',
    category: 'Marketing',
    totalCount: 2,
    statusCounts: [],
    colorHex: '#F79009',
    threadPosts: 2,
    filesCount: 5,
  },
  {
    id: 'stellar-tech',
    initials: 'ST',
    name: 'Stellar Tech',
    category: 'Technology',
    totalCount: 2,
    statusCounts: [],
    colorHex: '#6172F3',
    threadPosts: 2,
    filesCount: 4,
  },
  {
    id: 'greenleaf-co',
    initials: 'GC',
    name: 'GreenLeaf Co',
    category: 'Agriculture',
    totalCount: 2,
    statusCounts: [],
    colorHex: '#17B26A',
    threadPosts: 1,
    filesCount: 3,
  },
];

export function getProjectById(projectId: string) {
  return baseProjects.find((project) => project.id === projectId);
}

export function getProjectTickets(projectName: string) {
  return ticketsData.filter((ticket) => ticket.project.name === projectName);
}

const projectFilesByProjectId: Record<string, ProjectFileRecord[]> = {
  'acme-corp': [
    {
      id: 'acme-file-1',
      name: 'API_Spec_v2.md',
      type: 'pdf',
      size: '48 KB',
      uploadedBy: 'Bob Lee',
      uploadedAt: '2026-05-06',
    },
    {
      id: 'acme-file-2',
      name: 'Invoice PDF export fails',
      type: 'docx',
    },
  ],
  'stellar-tech': [
    {
      id: 'stellar-file-1',
      name: 'Rate_Limit_Investigation.pdf',
      type: 'pdf',
      size: '96 KB',
      uploadedBy: 'Jane Smith',
      uploadedAt: '2026-05-02',
    },
  ],
  'greenleaf-co': [
    {
      id: 'greenleaf-file-1',
      name: 'Sync_Status_Report.docx',
      type: 'docx',
      size: '56 KB',
      uploadedBy: 'Sara Ngo',
      uploadedAt: '2026-05-01',
    },
  ],
};

export function getProjectFiles(projectId: string, projectName?: string) {
  const projectKey = normalizeProjectLookupKey(projectId);
  const projectNameKey = normalizeProjectLookupKey(projectName);

  return (
    projectFilesByProjectId[projectKey] ??
    (projectNameKey ? projectFilesByProjectId[projectNameKey] : []) ??
    []
  );
}

export function mapApiProjectToProjectRecord(
  project: ApiProjectRecord,
): ProjectRecord {
  const projectTickets = getProjectTickets(project.name);
  const totalCount = project.stats?.tickets ?? projectTickets.length;
  const statusCounts = project.stats?.statuses ?? [];

  return {
    id: project.id,
    initials: getProjectInitials(project),
    name: project.name,
    category: toTitleCase(project.category),
    totalCount,
    statusCounts,
    colorHex: project.brandColor ?? '#6172F3',
    threadPosts: 0,
    filesCount: getProjectFiles(project.id, project.name).length,
  };
}

function getProjectInitials(project: Pick<ApiProjectRecord, 'logoLetter' | 'name'>) {
  const normalizedLogoLetter = project.logoLetter?.trim();

  if (normalizedLogoLetter) {
    return normalizedLogoLetter.slice(0, 2).toUpperCase();
  }

  return project.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function toTitleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeProjectLookupKey(value?: string) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? '';
}
