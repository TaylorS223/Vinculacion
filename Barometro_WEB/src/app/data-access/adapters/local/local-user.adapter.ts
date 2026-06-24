import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { USERS_MOCK } from '../../mocks/users.mock';
import { UserRepository } from '../../repositories/user.repository';
import { User } from '../../../features/users/models/user.model';

@Injectable()
export class LocalUserAdapter implements UserRepository {
  private readonly users: User[] = structuredClone(USERS_MOCK);

  list(): Observable<User[]> {
    return of([...this.users]);
  }

  findById(id: string): Observable<User | null> {
    return of(this.users.find((user) => user.id === id) ?? null);
  }

  create(user: Omit<User, 'id' | 'createdAt'>): Observable<User> {
    const created: User = {
      ...user,
      id: `u-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };

    this.users.unshift(created);
    return of(created);
  }

  update(id: string, changes: Partial<User>): Observable<User> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index < 0) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    const updated: User = { ...this.users[index], ...changes };
    this.users[index] = updated;
    return of(updated);
  }

  delete(id: string): Observable<void> {
    const index = this.users.findIndex((user) => user.id === id);

    if (index >= 0) {
      this.users.splice(index, 1);
    }

    return of(void 0);
  }
}
