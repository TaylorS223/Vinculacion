import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AuthRepository } from '../../repositories/auth.repository';
import { AuthSession, LoginCredentials } from '../../../features/auth/models/auth.model';
import { USERS_MOCK } from '../../mocks/users.mock';

@Injectable()
export class LocalAuthAdapter implements AuthRepository {
  login(credentials: LoginCredentials): Observable<AuthSession> {
    const user = USERS_MOCK.find((item) => item.email === credentials.email);

    if (!user || credentials.password.length < 4) {
      return throwError(() => new Error('Credenciales invalidas'));
    }

    return of({
      userId: user.id,
      role: user.role,
      tokenMock: `mock-token-${user.id}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    });
  }

  logout(): Observable<void> {
    return of(void 0);
  }
}
