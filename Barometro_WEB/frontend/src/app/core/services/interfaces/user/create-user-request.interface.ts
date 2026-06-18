export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  rol?: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  is_active?: boolean;
  telefono?: string;
  cargo?: string;
  bio?: string;
}
