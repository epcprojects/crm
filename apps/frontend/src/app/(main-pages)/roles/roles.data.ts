import type { RoleRecord } from '../../../components/tables/RolesTable';

export const rolesData: RoleRecord[] = [
  {
    id: 'r1',
    name: 'Admin',
    type: 'Internal',
    usersCount: 1,
    projectsCount: 3,
    updatedAt: '2026-06-08',
  },
  {
    id: 'r2',
    name: 'Project Manager',
    type: 'Internal',
    usersCount: 2,
    projectsCount: 2,
    updatedAt: '2026-06-07',
  },
  {
    id: 'r3',
    name: 'Developer',
    type: 'Internal',
    usersCount: 4,
    projectsCount: 3,
    updatedAt: '2026-06-06',
  },
  {
    id: 'r4',
    name: 'Client',
    type: 'External',
    usersCount: 2,
    projectsCount: 2,
    updatedAt: '2026-06-05',
  },
  {
    id: 'r5',
    name: 'Viewer',
    type: 'External',
    usersCount: 1,
    projectsCount: 1,
    updatedAt: '2026-06-04',
  },
];
