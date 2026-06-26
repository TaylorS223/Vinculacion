import { CommonModule } from '@angular/common';
import { Component, computed, inject, output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { IsAdminDirective } from '../../directives/is-admin.directive';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
    IsAdminDirective,
    TranslateModule,
  ],
  template: `
    <nav class="sidebar">
      <div class="nav-section">
        <span class="nav-label">Formularios</span>

        <a
          class="nav-item"
          routerLink="/admin/dashboard"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          (click)="navigate.emit()"
        >
          <div class="nav-icon-wrapper">
            <mat-icon class="nav-icon">list_alt</mat-icon>
          </div>
          <span class="nav-text">Mis Formularios</span>
        </a>

        <a
          class="nav-item"
          routerLink="/admin/forms/builder"
          routerLinkActive="active"
          (click)="navigate.emit()"
        >
          <div class="nav-icon-wrapper">
            <mat-icon class="nav-icon">add_circle</mat-icon>
          </div>
          <span class="nav-text">Nuevo Formulario</span>
        </a>

        <a
          *isAdmin
          class="nav-item"
          routerLink="/admin/proyectos"
          routerLinkActive="active"
          (click)="navigate.emit()"
        >
          <div class="nav-icon-wrapper">
            <mat-icon class="nav-icon">folder_managed</mat-icon>
          </div>
          <span class="nav-text">Proyectos</span>
        </a>

        <a
          *isAdmin
          class="nav-item"
          routerLink="/admin/usuarios"
          routerLinkActive="active"
          (click)="navigate.emit()"
        >
          <div class="nav-icon-wrapper">
            <mat-icon class="nav-icon">people</mat-icon>
          </div>
          <span class="nav-text">Usuarios</span>
        </a>
      </div>

      <div class="sidebar-footer"></div>
    </nav>
  `,
  styles: [
    `
      .sidebar {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 1rem 0.75rem;
        overflow-y: auto;
      }

      .nav-section {
        margin-bottom: 1.5rem;
      }

      .nav-label {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-tertiary);
        padding: 0 0.75rem;
        margin-bottom: 0.5rem;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.625rem 0.75rem;
        border-radius: var(--radius-lg);
        color: var(--text-secondary);
        text-decoration: none;
        cursor: pointer;
        transition: all var(--transition-fast);
        margin-bottom: 0.25rem;
      }

      .nav-item:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
      }

      .nav-item.active {
        background: var(--primary-50);
        color: var(--primary-700);
      }

      :host-context(.dark) .nav-item.active {
        background: rgba(99, 102, 241, 0.15);
        color: var(--primary-400);
      }

      .nav-icon-wrapper {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
      }

      .nav-item:hover .nav-icon-wrapper {
        background: var(--primary-100);
      }

      .nav-item.active .nav-icon-wrapper {
        background: var(--primary-600);
      }

      .nav-icon {
        font-size: 20px;
        color: var(--text-secondary);
        transition: color var(--transition-fast);
      }

      .nav-item:hover .nav-icon {
        color: var(--primary-600);
      }

      .nav-item.active .nav-icon {
        color: white;
      }

      .nav-text {
        flex: 1;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .sidebar-footer {
        margin-top: auto;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
      }
    `,
  ],
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  navigate = output<void>();
  isAdmin = computed(() => this.authService.isAdmin());
}
