# AGENTS.md

Guia para trabajar en este repositorio.

## Objetivo actual

El proyecto es una plataforma de formularios dinamicos y recoleccion de datos para ULEAM, inspirada en KoboToolbox / Google Forms.

## Estructura

- `backend/`: Laravel 12 API.
- `frontend/`: Angular 21 SPA con SSR.
- `scripts/`: wrappers de desarrollo para PowerShell, Bash y CMD.
- `docs/`: documentacion actual del proyecto.
- `docker-compose.yml`: PostgreSQL 16.

## Flujo de desarrollo

Usar los scripts del repositorio antes que comandos directos.

```powershell
.\scripts\install.ps1
.\scripts\start.ps1 all
```

Comandos principales:

```powershell
.\scripts\backend.ps1 install
.\scripts\backend.ps1 migrate
.\scripts\backend.ps1 routes
.\scripts\backend.ps1 start

.\scripts\frontend.ps1 install
.\scripts\frontend.ps1 build
.\scripts\frontend.ps1 start
```

## Docker

- PostgreSQL corre con `docker-compose.yml`.
- Backend corre dentro de Docker con imagen `backend-backend`.
- Los scripts detectan la red real del contenedor `observatorio_db`; usan `DB_HOST=postgres`/`DB_PORT=5432` dentro de Docker y `host.docker.internal`/`5433` como fallback.
- El frontend corre en el host con Bun.

## Frontend

- Package manager canonico: Bun 1.2.18.
- No usar npm para instalar dependencias salvo emergencia explicita.
- `bun.lock` es el lockfile vigente.
- No existe script de lint.
- TypeScript no usa `baseUrl`; los aliases se configuran con `paths` relativos a la raiz.
- `tsconfig.app.json` declara `rootDir: ./src`.

Rutas activas:

- `/auth/login`
- `/admin/dashboard`
- `/admin/proyectos`
- `/admin/forms/builder`
- `/admin/forms/:id/edit`
- `/admin/forms/:id/responses`
- `/admin/usuarios`
- `/perfil`
- `/collect/:uuid`

## Backend

Rutas activas orientadas a formularios:

- Auth: login, logout, user.
- Forms: CRUD, preguntas, deploy, archive, responses, stats, export.
- Projects: CRUD de proyectos y asignacion de lideres.
- Public collect: fetch/submit por `link_uuid`.
- Users: administracion de usuarios.
- Seed: super admin inicial.

El registro publico esta deshabilitado. Los usuarios se crean desde el panel administrativo.

Roles globales y permisos:

- `SUPER_ADMIN`: control total de usuarios, proyectos, formularios, configuracion y datos.
- `ADMIN`: gestiona proyectos, asigna lideres de proyecto y crea/gestiona formularios dentro de proyectos.
- `PROJECT_LEADER`: gestiona formularios dentro de proyectos asignados.
- `USER`: usuario recolector/editor movil; solo ve formularios asignados y recolecta o edita segun permiso.

Los permisos `EDITOR` y `RECOLECTOR` pertenecen a la comparticion de formularios, no al rol global del usuario.
Todo formulario debe pertenecer a un proyecto. Los usuarios `USER` no acceden al proyecto completo: solo a los formularios que tengan asignados.

## Convenciones

- Mantener el foco en formularios dinamicos.
- No reintroducir rutas, modelos o carpetas del observatorio anterior salvo instruccion explicita.
- Preferir ViewModels para estado de pantallas Angular.
- Usar signals de Angular cuando aplique.
- Mantener scripts y documentacion sincronizados con cambios operativos.
- No conservar artefactos generados como `frontend/dist`, `frontend/.angular` o caches locales.

## Validacion recomendada

```powershell
.\scripts\frontend.ps1 build
.\scripts\backend.ps1 routes
.\scripts\backend.ps1 migrate
```
