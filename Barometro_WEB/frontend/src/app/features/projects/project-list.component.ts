import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Project, ProjectService } from '@core/services/project.service';
import { UserService } from '@core/services/user.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
          <p>Gestiona proyectos y asigna lideres responsables.</p>
        </div>
      </header>

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
          <mat-label>Lideres de proyecto</mat-label>
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
            {{ editingProject() ? 'Guardar cambios' : 'Crear proyecto' }}
          </button>
        </div>
      </form>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="36"></mat-spinner>
        </div>
      } @else {
        <div class="project-grid">
          @for (project of projects(); track project.id) {
            <mat-card class="project-card">
              <mat-card-header>
                <mat-card-title>{{ project.name }}</mat-card-title>
                <mat-card-subtitle>{{ project.forms_count ?? 0 }} formulario(s)</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>{{ project.description || 'Sin descripcion' }}</p>
                <div class="leaders">
                  <span>Lideres</span>
                  @if ((project.leaders ?? []).length > 0) {
                    @for (leader of project.leaders; track leader.id) {
                      <strong>{{ leader.name }}</strong>
                    }
                  } @else {
                    <em>Sin lider asignado</em>
                  }
                </div>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-button type="button" (click)="editProject(project)">
                  <mat-icon>edit</mat-icon>
                  Editar
                </button>
              </mat-card-actions>
            </mat-card>
          } @empty {
            <div class="empty-state">
              <mat-icon>folder_open</mat-icon>
              <p>No hay proyectos registrados</p>
            </div>
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
        gap: 1.5rem;
      }

      .page-header h1 {
        margin: 0;
        font-size: 1.875rem;
      }

      .page-header p {
        margin: 0.35rem 0 0;
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
      .empty-state {
        display: grid;
        place-items: center;
        min-height: 180px;
        color: var(--text-secondary);
      }

      .project-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }

      .project-card {
        border-radius: var(--radius-md);
      }

      .project-card p {
        min-height: 2.5rem;
        color: var(--text-secondary);
      }

      .leaders {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        align-items: center;
      }

      .leaders span {
        flex-basis: 100%;
        font-size: 0.75rem;
        color: var(--text-tertiary);
        text-transform: uppercase;
        font-weight: 700;
      }

      .leaders strong,
      .leaders em {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      @media (max-width: 900px) {
        .project-form {
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
  private readonly projectService = inject(ProjectService);
  private readonly userService = inject(UserService);
  private readonly snackBar = inject(MatSnackBar);

  projects = signal<Project[]>([]);
  projectLeaders = signal<Array<{ id: number; name: string; email: string }>>([]);
  loading = signal(true);
  saving = signal(false);
  editingProject = signal<Project | null>(null);

  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    leader_ids: [[] as number[]],
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadProjectLeaders();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Error al cargar proyectos', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  loadProjectLeaders(): void {
    this.userService.getUsers(100, 1).subscribe({
      next: (response) => {
        this.projectLeaders.set(
          response.data
            .filter((user) => user.rol === 'PROJECT_LEADER')
            .map((user) => ({ id: user.id, name: user.name, email: user.email })),
        );
      },
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
      next: () => {
        this.snackBar.open(current ? 'Proyecto actualizado' : 'Proyecto creado', 'Cerrar', {
          duration: 3000,
        });
        this.cancelEdit();
        this.loadProjects();
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
}
