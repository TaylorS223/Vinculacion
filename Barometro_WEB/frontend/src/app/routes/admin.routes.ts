import { Routes } from '@angular/router';
import { adminGuard, roleGuard } from '../core/guards/role.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../features/forms/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Mis Formularios',
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('../features/profile/profile.component').then((m) => m.ProfileComponent),
    title: 'Configuracion de cuenta',
  },
  {
    path: 'forms/builder',
    loadComponent: () =>
      import('../features/forms/builder/builder.component').then((m) => m.BuilderComponent),
    canActivate: [roleGuard('SUPER_ADMIN', 'ADMIN', 'PROJECT_LEADER')],
    title: 'Nuevo Formulario',
  },
  {
    path: 'forms/:id/edit',
    loadComponent: () =>
      import('../features/forms/builder/builder.component').then((m) => m.BuilderComponent),
    title: 'Editar Formulario',
  },
  {
    path: 'forms/:id/responses',
    loadComponent: () =>
      import('../features/forms/responses/responses.component').then((m) => m.ResponsesComponent),
    title: 'Respuestas de formulario',
  },
  {
    path: 'proyectos',
    loadComponent: () =>
      import('../features/projects/project-list.component').then((m) => m.ProjectListComponent),
    title: 'Proyectos',
  },
  // Usuarios (solo admin)
  {
    path: 'usuarios',
    loadComponent: () =>
      import('../features/usuarios/usuario-list/usuario-list.component').then(
        (m) => m.UsuarioListComponent,
      ),
    canActivate: [roleGuard('SUPER_ADMIN')],
    title: 'Usuarios',
  },
  {
    path: 'usuarios/nuevo',
    loadComponent: () =>
      import('../features/usuarios/usuario-form/usuario-form.component').then(
        (m) => m.UsuarioFormComponent,
      ),
    canActivate: [roleGuard('SUPER_ADMIN')],
    title: 'Nuevo Usuario',
  },
  {
    path: 'usuarios/:id',
    loadComponent: () =>
      import('../features/usuarios/usuario-form/usuario-form.component').then(
        (m) => m.UsuarioFormComponent,
      ),
    canActivate: [roleGuard('SUPER_ADMIN')],
    title: 'Editar Usuario',
  },
];
