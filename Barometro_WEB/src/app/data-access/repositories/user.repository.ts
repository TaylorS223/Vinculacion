import { Observable } from 'rxjs';
import { User } from '../../features/users/models/user.model';

export interface UserRepository {
  list(): Observable<User[]>;
  findById(id: string): Observable<User | null>;
  create(user: Omit<User, 'id' | 'createdAt'>): Observable<User>;
  update(id: string, changes: Partial<User>): Observable<User>;
  delete(id: string): Observable<void>;
}
