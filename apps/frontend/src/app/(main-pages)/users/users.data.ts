import { baseProjects } from '../projects/projects.data';
import type { UserCardUser } from '../../../components/users/UserCard';

const [acmeCorp, stellarTech, greenLeafCo] = baseProjects;

export const usersData: UserCardUser[] = [
  {
    id: 'admin-user',
    name: 'Admin User',
    email: 'admin@harperhelp.io',
    initials: 'AU',
    accentColor: '#F79009',
    roles: [
      { label: 'Internal', tone: 'blue' },
      { label: 'Admin', tone: 'orange' },
    ],
    projects: [
      {
        id: acmeCorp.id,
        initials: acmeCorp.initials,
        name: acmeCorp.name,
        colorHex: acmeCorp.colorHex,
      },
      {
        id: stellarTech.id,
        initials: stellarTech.initials,
        name: stellarTech.name,
        colorHex: stellarTech.colorHex,
      },
      {
        id: greenLeafCo.id,
        initials: greenLeafCo.initials,
        name: greenLeafCo.name,
        colorHex: greenLeafCo.colorHex,
      },
    ],
  },
  {
    id: 'jane-smith-pm',
    name: 'Jane Smith',
    email: 'jane@acme.com',
    initials: 'JS',
    accentColor: '#875BF7',
    roles: [
      { label: 'Internal', tone: 'blue' },
      { label: 'Project Manager', tone: 'purple' },
    ],
    projects: [
      {
        id: acmeCorp.id,
        initials: acmeCorp.initials,
        name: acmeCorp.name,
        colorHex: acmeCorp.colorHex,
      },
      {
        id: stellarTech.id,
        initials: stellarTech.initials,
        name: stellarTech.name,
        colorHex: stellarTech.colorHex,
      },
    ],
  },
  {
    id: 'jane-smith-dev',
    name: 'Jane Smith',
    email: 'jane@acme.com',
    initials: 'JS',
    accentColor: '#D444F1',
    roles: [
      { label: 'Internal', tone: 'blue' },
      { label: 'Developer', tone: 'purple' },
    ],
    projects: [
      {
        id: stellarTech.id,
        initials: stellarTech.initials,
        name: stellarTech.name,
        colorHex: stellarTech.colorHex,
      },
      {
        id: greenLeafCo.id,
        initials: greenLeafCo.initials,
        name: greenLeafCo.name,
        colorHex: greenLeafCo.colorHex,
      },
    ],
  },
  {
    id: 'mike-chen',
    name: 'Mike Chen',
    email: 'mike@acme.com',
    initials: 'MC',
    accentColor: '#6172F3',
    roles: [{ label: 'External', tone: 'teal' }],
    projects: [
      {
        id: acmeCorp.id,
        initials: acmeCorp.initials,
        name: acmeCorp.name,
        colorHex: acmeCorp.colorHex,
      },
    ],
  },
  {
    id: 'sara-ngo',
    name: 'Sara Ngo',
    email: 'sara@greenleaf.com',
    initials: 'SN',
    accentColor: '#14B8A6',
    roles: [{ label: 'External', tone: 'teal' }],
    projects: [
      {
        id: greenLeafCo.id,
        initials: greenLeafCo.initials,
        name: greenLeafCo.name,
        colorHex: greenLeafCo.colorHex,
      },
    ],
  },
];
