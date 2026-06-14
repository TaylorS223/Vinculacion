import { Role } from '../../users/models/user.model';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  role: Role;
  tokenMock: string;
  expiresAt: string;
}
