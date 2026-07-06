import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { User } from '../../models/user.model';
import { UsersFacade } from '../../services/users.facade';

@Component({
  selector: 'app-users-list-page',
  imports: [RouterLink],
  templateUrl: './users-list-page.component.html',
  styleUrl: './users-list-page.component.css',
})
export class UsersListPageComponent {
  private readonly usersFacade = inject(UsersFacade);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.loadUsers();
  }

  protected deleteUser(user: User): void {
    const confirmed = globalThis.confirm(
      `¿Seguro que deseas eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    this.usersFacade.delete(user.id).subscribe({
      next: () => this.loadUsers(),
      error: () => this.error.set('No fue posible eliminar el usuario.'),
    });
  }

  protected roleLabel(role: 'ADMIN' | 'ANALYST' | 'VIEWER'): string {
    if (role === 'ADMIN') {
      return 'Administrador';
    }

    if (role === 'ANALYST') {
      return 'Analista';
    }

    return 'Visualizador';
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.error.set('');

    this.usersFacade.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar los usuarios.');
        this.loading.set(false);
      },
    });
  }
}
