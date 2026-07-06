import { User } from '../../features/users/models/user.model';

export const USERS_MOCK: User[] = [
  {
    id: 'u-admin',
    name: 'Administrador General',
    email: 'admin@universidad.edu',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u-analyst',
    name: 'Analista Institucional',
    email: 'analyst@universidad.edu',
    role: 'ANALYST',
    isActive: true,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];
