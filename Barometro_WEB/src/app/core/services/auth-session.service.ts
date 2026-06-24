import { Injectable, signal } from '@angular/core';
import { AuthSession } from '../../features/auth/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly sessionSignal = signal<AuthSession | null>(null);

  readonly session = this.sessionSignal.asReadonly();

  setSession(session: AuthSession): void {
    this.sessionSignal.set(session);
  }

  clearSession(): void {
    this.sessionSignal.set(null);
  }

  get isAuthenticated(): boolean {
    return this.sessionSignal() !== null;
  }
}
