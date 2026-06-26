import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { Project, ProjectService } from '@core/services/project.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <section class="projects-page">
      <header class="page-header">
        <div>
          <h1>Proyectos</h1>
          <p>Consulta proyectos, formularios y miembros asignados.</p>
        </div>
      </header>

      @if (canManageProjects()) {
        <form class="project-form" [formGroup]="projectForm" (ngSubmit)="saveProject()">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descripcion</mat-label>
            <textarea matInput rows="2" formControlName="description"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Lider de proyecto</mat-label>
            <mat-select formControlName="leader_ids" multiple>
              @for (leader of projectLeaders(); track leader.id) {
                <mat-option [value]="leader.id">{{ leader.name }} - {{ leader.email }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="form-actions">
            @if (editingProject()) {
              <button mat-stroked-button type="button" (click)="cancelEdit()">Cancelar</button>
            }
            <button mat-flat-button color="primary" type="submit" [disabled]="projectForm.invalid || saving()">
              <mat-icon>{{ editingProject() ? 'save' : 'add' }}</mat-icon>
              {{ editingProject() ? 'Guardar' : 'Crear' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
        </div>
      } @else {
        <div class="projects-layout">
          <div class="project-list">
            @for (project of projects(); track project.id) {
              <button
                type="button"
                class="project-row"
                [class.active]="selectedProject()?.id === project.id"
                (click)="selectProject(project)"
              >
                <span>
                  <strong>{{ project.name }}</strong>
                  <small>{{ project.description || 'Sin descripcion' }}</small>
                </span>
                <em>{{ project.forms_count ?? 0 }} formulario(s)</em>
              </button>
            } @empty {
              <div class="empty-state">
                <mat-icon>folder_open</mat-icon>
                <p>No hay proyectos visibles</p>
              </div>
            }
          </div>

          @if (selectedProject(); as project) {
            <mat-card class="project-panel">
              <mat-card-header>
                <mat-card-title>{{ project.name }}</mat-card-title>
                <mat-card-subtitle>{{ project.forms?.length ?? project.forms_count ?? 0 }} formulario(s)</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <section class="panel-section">
                  <div class="section-title">
                    <h2>Formularios</h2>
                    @if (canCreateFormsInProject(project)) {
                      <a mat-stroked-button [routerLink]="['/admin/forms/builder']" [queryParams]="{ project_id: project.id }">
                        <mat-icon>add_circle</mat-icon>
                        Nuevo formulario
                      </a>
                    }
                  </div>

                  @if ((project.forms ?? []).length > 0) {
                    <div class="form-list">
                      @for (form of project.forms; track form.id) {
                        <a class="form-item" [routerLink]="['/admin/forms', form.id, 'edit']">
                          <span>{{ form.title }}</span>
                          <small>{{ form.state }}</small>
                        </a>
                      }
                    </div>
                  } @else {
                    <p class="muted">No hay formularios visibles para este proyecto.</p>
                  }
                </section>

                <section class="panel-section">
                  <div class="section-title">
                    <h2>Miembros</h2>
                    <span>{{ project.members?.length ?? 0 }}</span>
                  </div>

                  @if ((project.members ?? []).length > 0) {
                    <div class="members-table">
                      @for (member of project.members; track member.role + '-' + member.user_id + '-' + (member.form_id ?? 'project')) {
                        <div class="member-row">
                          <span>
                            <strong>{{ member.name }}</strong>
                            <small>{{ member.email }}</small>
                          </span>
                          <span class="member-role">{{ roleLabel(member.role) }}</span>
                          <em>{{ member.form_title || member.scope }}</em>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="muted">Aun no hay miembros asignados.</p>
                  }
                </section>
              </mat-card-content>
              @if (canManageProjects()) {
                <mat-card-actions align="end">
                  <button mat-button type="button" (click)="editProject(project)">
                    <mat-icon>edit</mat-icon>
                    Editar proyecto
                  </button>
                </mat-card-actions>
              }
            </mat-card>
          } @else {
            <mat-card class="project-panel empty-panel">
              <mat-icon>ads_click</mat-icon>
              <p>Selecciona un proyecto para ver sus formularios y miembros.</p>
            </mat-card>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .projects-page {
        padding: 2rem;
        display: grid;
        gap: 1.25rem;
      }

      .page-header h1 {
        margin: 0;
        font-size: 1.875rem;
      }

      .page-header p,
      .muted {
        color: var(--text-secondary);
      }

      .project-form {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.4fr) minmax(220px, 1.2fr) auto;
        gap: 1rem;
        align-items: start;
      }

      .form-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        padding-top: 0.35rem;
      }

      .loading-state,
      .empty-state,
      .empty-panel {
        display: grid;
        place-items: center;
        min-height: 220px;
        color: var(--text-secondary);
      }

      .projects-layout {
        display: grid;
        grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }

      .project-list {
        display: grid;
        gap: 0.5rem;
      }

      .project-row {
        width: 100%;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        border-radius: var(--radius-md);
        padding: 0.85rem;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        text-align: left;
        cursor: pointer;
      }

      .project-row.active,
      .project-row:hover {
        border-color: var(--primary-500);
        background: var(--primary-50);
      }

      .project-row span,
      .member-row span {
        display: grid;
        gap: 0.2rem;
      }

      .project-row small,
      .project-row em,
      .member-row small,
      .member-row em {
        color: var(--text-secondary);
        font-size: 0.8rem;
      }

      .project-panel {
        border-radius: var(--radius-md);
      }

      .panel-section {
        display: grid;
        gap: 0.75rem;
        padding: 1rem 0;
        border-top: 1px solid var(--border-color);
      }

      .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .section-title h2 {
        margin: 0;
        font-size: 1rem;
      }

      .form-list,
      .members-table {
        display: grid;
        gap: 0.5rem;
      }

      .form-item,
      .member-row {
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 0.75rem;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 0.75rem;
        align-items: center;
        text-decoration: none;
        color: var(--text-primary);
      }

      .member-role {
        background: var(--bg-tertiary);
        border-radius: var(--radius-full);
        padding: 0.25rem 0.65rem;
        font-size: 0.75rem;
        font-weight: 700;
      }

      @media (max-width: 900px) {
        .project-form,
        .projects-layout,
        .form-item,
        .member-row {
          grid-template-columns: 1fr;
        }

        .form-actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class ProjectListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly snackBar = inject(MatSnackBar);

  projects = signal<Project[]>([]);
  projectLeaders = signal<Array<{ id: number; name: string; email: string }>>([]);
  selectedProject = signal<Project | null>(null);
  loading = signal(true);
  saving = signal(false);
  editingProject = signal<Project | null>(null);

  canManageProjects = computed(() => this.authService.isAdmin());

  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    leader_ids: [[] as number[]],
  });

  ngOnInit(): void {
    this.loadProjects();
    if (this.canManageProjects()) {
      this.loadProjectLeaders();
    }
  }

  loadProjects(): void {
    this.loading.set(true);
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
        if (projects.length > 0 && !this.selectedProject()) {
          this.selectProject(projects[0]);
        }
      },
      error: () => {
        this.snackBar.open('Error al cargar proyectos', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  loadProjectLeaders(): void {
    this.projectService.getProjectLeaders().subscribe({
      next: (leaders) => {
        this.projectLeaders.set(leaders.map((leader) => ({ id: leader.id, name: leader.name, email: leader.email })));
      },
    });
  }

  selectProject(project: Project): void {
    this.projectService.getProject(project.id).subscribe({
      next: (detail) => this.selectedProject.set(detail),
      error: () => this.snackBar.open('Error al cargar el proyecto', 'Cerrar', { duration: 3000 }),
    });
  }

  saveProject(): void {
    if (this.projectForm.invalid || this.saving()) return;

    this.saving.set(true);
    const payload = {
      name: this.projectForm.value.name ?? '',
      description: this.projectForm.value.description ?? null,
      leader_ids: this.projectForm.value.leader_ids ?? [],
    };
    const current = this.editingProject();
    const request = current
      ? this.projectService.updateProject(current.id, payload)
      : this.projectService.createProject(payload);

    request.subscribe({
      next: (project) => {
        this.snackBar.open(current ? 'Proyecto actualizado' : 'Proyecto creado', 'Cerrar', {
          duration: 3000,
        });
        this.cancelEdit();
        this.loadProjects();
        this.selectProject(project);
        this.saving.set(false);
      },
      error: (error) => {
        this.snackBar.open(error?.error?.message || 'Error al guardar proyecto', 'Cerrar', {
          duration: 3000,
        });
        this.saving.set(false);
      },
    });
  }

  editProject(project: Project): void {
    this.editingProject.set(project);
    this.projectForm.patchValue({
      name: project.name,
      description: project.description ?? '',
      leader_ids: (project.leaders ?? []).map((leader) => leader.id),
    });
  }

  cancelEdit(): void {
    this.editingProject.set(null);
    this.projectForm.reset({
      name: '',
      description: '',
      leader_ids: [],
    });
  }

  canCreateFormsInProject(project: Project): boolean {
    return this.authService.isAdmin() || this.authService.isProjectLeader();
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      PROJECT_LEADER: 'Lider de proyecto',
      EDITOR: 'Editor',
      RECOLECTOR: 'Recolector',
    };

    return labels[role] ?? role;
  }
}
